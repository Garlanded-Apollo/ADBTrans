import { app, shell } from 'electron'

const RELEASES_API_URL = 'https://api.github.com/repos/Garlanded-Apollo/ADBTrans/releases/latest'
const RELEASES_PAGE_URL = 'https://github.com/Garlanded-Apollo/ADBTrans/releases'
const UPDATE_CACHE_MS = 5 * 60 * 1000
const UPDATE_TIMEOUT_MS = 10 * 1000

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

let updateCache: { checkedAt: number; result: UpdateCheckResult } | null = null

function normalizeVersion(version: string): string {
  const match = version.trim().match(/^v?(\d+\.\d+\.\d+)$/i)
  if (!match) throw new Error(`无法识别版本号：${version}`)
  return match[1]
}

function getReleaseVersion(tagName: string): string {
  const match = tagName.trim().match(/^v(\d+\.\d+\.\d+)$/i)
  if (!match) throw new Error(`无法识别版本号：${tagName}`)
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

export async function checkForUpdates(force = false): Promise<UpdateCheckResult> {
  if (!force && updateCache && Date.now() - updateCache.checkedAt < UPDATE_CACHE_MS) {
    return updateCache.result
  }

  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), UPDATE_TIMEOUT_MS)

  try {
    const response = await fetch(RELEASES_API_URL, {
      headers: {
        Accept: 'application/vnd.github+json',
        'User-Agent': 'ADBTrans'
      },
      signal: controller.signal
    })

    if (response.status === 404) {
      const result = createNoReleaseResult()
      updateCache = { checkedAt: Date.now(), result }
      return result
    }

    if (!response.ok) {
      if (response.status === 403) {
        throw new Error('GitHub API 暂时限制了检查频率，请稍后重试')
      }
      throw new Error(`GitHub API 请求失败（${response.status}）`)
    }

    const release = await response.json() as GitHubRelease
    const runtime = getAppRuntimeInfo()
    const latestVersion = getReleaseVersion(release.tag_name)
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

    updateCache = { checkedAt: Date.now(), result }
    return result
  } catch (error) {
    if (error instanceof Error && error.name === 'AbortError') {
      throw new Error('检查更新超时，请检查网络连接后重试')
    }
    throw error
  } finally {
    clearTimeout(timeout)
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
