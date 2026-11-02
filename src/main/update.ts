import { app, shell } from 'electron'
import { promises as fs } from 'fs'
import { join } from 'path'

const RELEASES_API_URL = 'https://api.github.com/repos/Garlanded-Apollo/ADBTrans/releases/latest'
const RELEASES_PAGE_URL = 'https://github.com/Garlanded-Apollo/ADBTrans/releases'
const UPDATE_CACHE_MS = 10 * 60 * 1000
const FORCE_THROTTLE_MS = 15 * 1000
const UPDATE_TIMEOUT_MS = 10 * 1000
const DEFAULT_RATE_LIMIT_COOLDOWN_MS = 60 * 1000
const HTTP_ERROR_COOLDOWN_MS = 30 * 1000

const STATE_FILE_NAME = 'update-check.json'
const STATE_SCHEMA = 1

const TIMEOUT_MESSAGE = '检查更新超时，请检查网络连接后重试'
const NETWORK_MESSAGE = '检查更新失败，请检查网络连接后重试'
const RATE_LIMIT_FALLBACK_MESSAGE = 'GitHub 暂时限制了更新检查，请稍后重试'

export type AppPlatform = 'mac' | 'win' | 'unsupported'
export type AppArchitecture = 'arm64' | 'x64' | 'ia32' | 'unsupported'

export interface AppRuntimeInfo {
  version: string
  platform: AppPlatform
  architecture: AppArchitecture
  platformLabel: string
}

export interface UpdateCheckResult extends AppRuntimeInfo {
  latestVersion: string | null
  updateAvailable: boolean
  assetAvailable: boolean
  downloadUrl: string | null
  releaseUrl: string
  releaseNotes: string
  publishedAt: string | null
  noRelease: boolean
}

interface GitHubReleaseAsset {
  name: string
  browser_download_url: string
}

interface GitHubRelease {
  tag_name: string
  html_url: string
  body: string | null
  published_at: string | null
  assets: GitHubReleaseAsset[]
}

interface CachedCheck {
  checkedAt: number
  etag: string | null
  result: UpdateCheckResult
}

interface PersistedState {
  schema: number
  appVersion: string
  platform: AppPlatform
  architecture: AppArchitecture
  checkedAt: number
  etag: string | null
  result: UpdateCheckResult | null
  cooldownUntil: number
  cooldownMessage: string | null
}

interface RateLimitInfo {
  message: string
  retryAt: number
}

let cachedCheck: CachedCheck | null = null
let cooldownUntil = 0
let cooldownMessage: string | null = null
let statePromise: Promise<void> | null = null
let inFlight: Promise<UpdateCheckResult> | null = null

function normalizeVersion(version: string): string {
  const match = version.trim().match(/^v?(\d+\.\d+\.\d+)$/i)
  if (!match) throw new Error(`无法识别版本号：${version}`)
  return match[1]
}

function compareVersions(left: string, right: string): number {
  const parse = (value: string): number[] => {
    const normalized = normalizeVersion(value)
    return normalized.split('.').map(Number)
  }

  const a = parse(left)
  const b = parse(right)
  const length = Math.max(a.length, b.length)

  for (let i = 0; i < length; i++) {
    const difference = (a[i] || 0) - (b[i] || 0)
    if (difference !== 0) return difference
  }

  return 0
}

function getPlatform(): AppPlatform {
  if (process.platform === 'darwin') return 'mac'
  if (process.platform === 'win32') return 'win'
  return 'unsupported'
}

function getArchitecture(): AppArchitecture {
  if (process.arch === 'arm64' || process.arch === 'x64' || process.arch === 'ia32') {
    return process.arch
  }
  return 'unsupported'
}

function getPlatformLabel(platform: AppPlatform, architecture: AppArchitecture): string {
  if (platform === 'mac') {
    if (architecture === 'arm64') return 'macOS · Apple Silicon'
    if (architecture === 'x64') return 'macOS · Intel'
    return `macOS · ${architecture}`
  }

  if (platform === 'win') {
    if (architecture === 'arm64') return 'Windows · ARM64'
    if (architecture === 'x64') return 'Windows · 64 位'
    if (architecture === 'ia32') return 'Windows · 32 位'
    return `Windows · ${architecture}`
  }

  return `${process.platform} · ${process.arch}`
}

export function getAppRuntimeInfo(): AppRuntimeInfo {
  const platform = getPlatform()
  const architecture = getArchitecture()

  return {
    version: app.getVersion(),
    platform,
    architecture,
    platformLabel: getPlatformLabel(platform, architecture)
  }
}

function selectPlatformAsset(
  assets: GitHubReleaseAsset[],
  platform: AppPlatform,
  architecture: AppArchitecture,
  version: string
): GitHubReleaseAsset | null {
  if (platform === 'unsupported' || architecture === 'unsupported') return null

  const extension = platform === 'mac' ? '.dmg' : '.exe'
  const expectedName = `adbtrans-${version}-${platform}-${architecture}${extension}`
  return assets.find((asset) => asset.name.toLowerCase() === expectedName) || null
}

function createNoReleaseResult(): UpdateCheckResult {
  return {
    ...getAppRuntimeInfo(),
    latestVersion: null,
    updateAvailable: false,
    assetAvailable: false,
    downloadUrl: null,
    releaseUrl: RELEASES_PAGE_URL,
    releaseNotes: '',
    publishedAt: null,
    noRelease: true
  }
}

function getStatePath(): string {
  return join(app.getPath('userData'), STATE_FILE_NAME)
}

function formatClock(timestamp: number): string {
  return new Date(timestamp).toLocaleTimeString('zh-CN', {
    hour: '2-digit',
    minute: '2-digit'
  })
}

function isUpdateResult(value: unknown): value is UpdateCheckResult {
  if (!value || typeof value !== 'object') return false
  const record = value as Record<string, unknown>
  return (
    typeof record.version === 'string' &&
    (typeof record.latestVersion === 'string' || record.latestVersion === null)
  )
}

async function loadStateFromDisk(): Promise<void> {
  try {
    const raw = await fs.readFile(getStatePath(), 'utf8')
    const stored = JSON.parse(raw) as PersistedState
    const runtime = getAppRuntimeInfo()

    if (
      stored.schema !== STATE_SCHEMA ||
      stored.appVersion !== runtime.version ||
      stored.platform !== runtime.platform ||
      stored.architecture !== runtime.architecture
    ) {
      return
    }

    if (stored.result && isUpdateResult(stored.result) && typeof stored.checkedAt === 'number') {
      cachedCheck = {
        checkedAt: stored.checkedAt,
        etag: typeof stored.etag === 'string' ? stored.etag : null,
        result: stored.result
      }
    }

    if (typeof stored.cooldownUntil === 'number' && stored.cooldownUntil > Date.now()) {
      cooldownUntil = stored.cooldownUntil
      cooldownMessage = typeof stored.cooldownMessage === 'string' ? stored.cooldownMessage : null
    }
  } catch {
    // 没有缓存文件或缓存损坏时按首次检查处理
  }
}

function ensureStateLoaded(): Promise<void> {
  if (!statePromise) statePromise = loadStateFromDisk()
  return statePromise
}

async function persistState(): Promise<void> {
  try {
    const runtime = getAppRuntimeInfo()
    const state: PersistedState = {
      schema: STATE_SCHEMA,
      appVersion: runtime.version,
      platform: runtime.platform,
      architecture: runtime.architecture,
      checkedAt: cachedCheck?.checkedAt ?? 0,
      etag: cachedCheck?.etag ?? null,
      result: cachedCheck?.result ?? null,
      cooldownUntil,
      cooldownMessage
    }
    await fs.mkdir(app.getPath('userData'), { recursive: true })
    await fs.writeFile(getStatePath(), JSON.stringify(state), 'utf8')
  } catch {
    // 缓存写入失败不影响检查结果
  }
}

async function readRateLimitInfo(response: Response, now: number): Promise<RateLimitInfo | null> {
  if (response.status !== 403 && response.status !== 429) return null

  let bodyText = ''
  try {
    bodyText = await response.text()
  } catch {
    // 忽略响应体读取失败
  }

  let bodyMessage = ''
  try {
    const parsed = JSON.parse(bodyText) as { message?: unknown }
    if (typeof parsed.message === 'string') bodyMessage = parsed.message
  } catch {
    // 响应体不是 JSON 时忽略
  }

  const normalizedMessage = bodyMessage.toLowerCase()
  const remaining = response.headers.get('x-ratelimit-remaining')
  const resetSeconds = Number(response.headers.get('x-ratelimit-reset'))
  const retryAfterSeconds = Number(response.headers.get('retry-after'))
  const resetAt = Number.isFinite(resetSeconds) && resetSeconds > 0 ? resetSeconds * 1000 : null

  // 主限流：GitHub 明确告知当前网络（含共享出口 IP）的配额已用完
  if (remaining === '0') {
    const retryAt = resetAt && resetAt > now ? resetAt : now + DEFAULT_RATE_LIMIT_COOLDOWN_MS
    return {
      message: resetAt && resetAt > now
        ? `GitHub 接口访问额度已用完（同一网络共享），预计 ${formatClock(resetAt)} 后可重试`
        : 'GitHub 接口访问额度已用完（同一网络共享），请稍后重试',
      retryAt
    }
  }

  // 副限流：GitHub 要求降低请求速度，通常几十秒后即可恢复
  if (
    response.status === 429 ||
    normalizedMessage.includes('secondary rate limit') ||
    normalizedMessage.includes('abuse detection')
  ) {
    const retryAt = Number.isFinite(retryAfterSeconds) && retryAfterSeconds > 0
      ? now + retryAfterSeconds * 1000
      : now + DEFAULT_RATE_LIMIT_COOLDOWN_MS
    const minutes = Math.max(1, Math.ceil((retryAt - now) / 60000))
    return {
      message: `GitHub 暂时限制了更新检查，请约 ${minutes} 分钟后重试`,
      retryAt
    }
  }

  if (normalizedMessage.includes('rate limit')) {
    const retryAt = resetAt && resetAt > now ? resetAt : now + DEFAULT_RATE_LIMIT_COOLDOWN_MS
    return {
      message: `GitHub 暂时限制了更新检查，预计 ${formatClock(retryAt)} 后可重试`,
      retryAt
    }
  }

  return null
}

async function performCheck(force: boolean): Promise<UpdateCheckResult> {
  await ensureStateLoaded()

  const now = Date.now()
  const cacheAge = cachedCheck ? now - cachedCheck.checkedAt : Number.POSITIVE_INFINITY

  // 缓存仍然有效时优先返回缓存，避免限流期间反复弹出同样的提示
  if (cachedCheck && !force && cacheAge < UPDATE_CACHE_MS) return cachedCheck.result

  if (cooldownUntil > now) {
    throw new Error(cooldownMessage || RATE_LIMIT_FALLBACK_MESSAGE)
  }

  if (cachedCheck && force && cacheAge < FORCE_THROTTLE_MS) return cachedCheck.result

  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), UPDATE_TIMEOUT_MS)

  try {
    let response: Response
    try {
      response = await fetch(RELEASES_API_URL, {
        headers: {
          Accept: 'application/vnd.github+json',
          'User-Agent': `ADBTrans/${app.getVersion()}`,
          ...(cachedCheck?.etag ? { 'If-None-Match': cachedCheck.etag } : {})
        },
        signal: controller.signal
      })
    } catch (error) {
      if (error instanceof Error && error.name === 'AbortError') {
        throw new Error(TIMEOUT_MESSAGE)
      }
      throw new Error(NETWORK_MESSAGE)
    }

    // 条件请求返回 304 时内容未变化，且不会消耗 GitHub 的访问额度
    if (response.status === 304) {
      if (!cachedCheck) throw new Error('检查更新失败，请稍后重试')
      cachedCheck.checkedAt = Date.now()
      const etag = response.headers.get('etag')
      if (etag) cachedCheck.etag = etag
      cooldownUntil = 0
      cooldownMessage = null
      await persistState()
      return cachedCheck.result
    }

    if (response.status === 404) {
      const result = createNoReleaseResult()
      cachedCheck = { checkedAt: Date.now(), etag: response.headers.get('etag'), result }
      cooldownUntil = 0
      cooldownMessage = null
      await persistState()
      return result
    }

    if (!response.ok) {
      const rateLimit = await readRateLimitInfo(response, Date.now())
      if (rateLimit) {
        cooldownUntil = rateLimit.retryAt
        cooldownMessage = rateLimit.message
        await persistState()
        throw new Error(rateLimit.message)
      }

      // 非限流的 4xx/5xx：短暂退避，避免用户连续点击时反复打到 GitHub
      cooldownUntil = Date.now() + HTTP_ERROR_COOLDOWN_MS
      cooldownMessage = `GitHub 请求失败（${response.status}），请稍后重试`
      await persistState()
      throw new Error(cooldownMessage)
    }

    let release: GitHubRelease
    try {
      release = await response.json() as GitHubRelease
    } catch {
      throw new Error('GitHub 返回的数据格式异常，请稍后重试')
    }

    const runtime = getAppRuntimeInfo()
    if (!release || typeof release.tag_name !== 'string') {
      throw new Error('GitHub 返回的数据格式异常，请稍后重试')
    }

    const latestVersion = normalizeVersion(release.tag_name)
    const asset = selectPlatformAsset(
      release.assets || [],
      runtime.platform,
      runtime.architecture,
      latestVersion
    )
    const updateAvailable = compareVersions(latestVersion, runtime.version) > 0

    const result: UpdateCheckResult = {
      ...runtime,
      latestVersion,
      updateAvailable,
      assetAvailable: asset !== null,
      downloadUrl: asset?.browser_download_url || null,
      releaseUrl: release.html_url || RELEASES_PAGE_URL,
      releaseNotes: release.body || '',
      publishedAt: release.published_at,
      noRelease: false
    }

    cachedCheck = {
      checkedAt: Date.now(),
      etag: response.headers.get('etag'),
      result
    }
    cooldownUntil = 0
    cooldownMessage = null
    await persistState()
    return result
  } finally {
    clearTimeout(timeout)
  }
}

export async function checkForUpdates(force = false): Promise<UpdateCheckResult> {
  // 合并同时发出的检查请求，避免自动检查和手动检查重复请求 GitHub
  if (inFlight) return inFlight

  inFlight = performCheck(force)
  try {
    return await inFlight
  } finally {
    inFlight = null
  }
}

function validateReleaseUrl(rawUrl: string): string {
  const url = new URL(rawUrl)
  const expectedPath = '/garlanded-apollo/adbtrans/releases'
  const normalizedPath = url.pathname.toLowerCase()

  if (
    url.protocol !== 'https:' ||
    url.hostname.toLowerCase() !== 'github.com' ||
    (normalizedPath !== expectedPath && !normalizedPath.startsWith(`${expectedPath}/`))
  ) {
    throw new Error('拒绝打开非 ADBTrans Release 地址')
  }

  return url.toString()
}

export async function openUpdateUrl(url: string): Promise<void> {
  await shell.openExternal(validateReleaseUrl(url))
}
