const fs = require('fs')
const os = require('os')
const path = require('path')
const { spawnSync } = require('child_process')

const platform = process.argv[2]
if (!platform || !['mac', 'win'].includes(platform)) {
  console.error('Usage: node build-dist.js [mac|win]')
  process.exit(1)
}

const builderTarget = platform === 'mac' ? '--mac' : '--win'

if (platform === 'win') {
  process.env.CSC_IDENTITY_AUTO_DISCOVERY = 'false'
}

function canCreateSymlink() {
  const testDir = fs.mkdtempSync(path.join(os.tmpdir(), 'adbtrans-symlink-'))
  const target = path.join(testDir, 'target.txt')
  const link = path.join(testDir, 'link.txt')

  try {
    fs.writeFileSync(target, '')
    fs.symlinkSync(target, link, 'file')
    return true
  } catch {
    return false
  } finally {
    fs.rmSync(testDir, { recursive: true, force: true })
  }
}

function run(command, args) {
  const result = spawnSync(command, args, {
    stdio: 'inherit',
    shell: process.platform === 'win32'
  })

  if (result.error) {
    throw result.error
  }

  return result.status || 0
}

let status = 0

try {
  if (platform === 'win' && !canCreateSymlink()) {
    console.error([
      '[build-dist] Windows executable icons require electron-builder to edit the exe resource.',
      '[build-dist] Your current shell cannot create symbolic links, so winCodeSign cannot be extracted.',
      '[build-dist] Run this command from an Administrator terminal, or enable Windows Developer Mode and try again.'
    ].join('\n'))
    process.exit(1)
  }

  status = run('node', ['scripts/prepare-adb.js', platform])
  if (status === 0) {
    status = run('electron-builder', [builderTarget])
  }
} catch (error) {
  console.error(error.message)
  status = 1
} finally {
  const restoreStatus = run('node', ['scripts/restore-config.js'])
  if (status === 0 && restoreStatus !== 0) {
    status = restoreStatus
  }
}

process.exit(status)
