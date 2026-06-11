const fs = require('fs')
const path = require('path')

const platform = process.argv[2]
if (!platform || !['mac', 'win'].includes(platform)) {
  console.error('Usage: node prepare-adb.js [mac|win]')
  process.exit(1)
}

function copyDirSync(src, dest) {
  fs.mkdirSync(dest, { recursive: true })
  const entries = fs.readdirSync(src, { withFileTypes: true })
  for (const entry of entries) {
    const srcPath = path.join(src, entry.name)
    const destPath = path.join(dest, entry.name)
    if (entry.name === '.DS_Store') continue
    if (entry.isDirectory()) {
      copyDirSync(srcPath, destPath)
    } else {
      fs.copyFileSync(srcPath, destPath)
    }
  }
}

const resourcesDir = path.join(__dirname, '..', 'resources')
const adbTempDir = path.join(resourcesDir, 'adb-temp')

// 清理临时目录
if (fs.existsSync(adbTempDir)) {
  fs.rmSync(adbTempDir, { recursive: true })
}

// 复制对应平台的 adb 文件
const sourceDir = path.join(resourcesDir, 'adb', platform === 'mac' ? 'mac' : 'win')
copyDirSync(sourceDir, adbTempDir)

console.log(`[prepare-adb] Copied ${platform} adb files to temp directory`)

// 修改 package.json 中的 files 配置
const pkgPath = path.join(__dirname, '..', 'package.json')
const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf-8'))

// 保存原始配置
if (!pkg._originalBuild) {
  pkg._originalBuild = JSON.parse(JSON.stringify(pkg.build))
}

// 修改 files 和 extraResources 配置
pkg.build.files = [
  'out/**/*',
  'resources/icon.icns',
  'resources/icon.ico',
  'resources/icon.png'
]
pkg.build.extraResources = [
  {
    from: 'resources/icon.png',
    to: 'icon.png'
  },
  {
    from: 'resources/icon.ico',
    to: 'icon.ico'
  },
  {
    from: 'resources/icon.icns',
    to: 'icon.icns'
  },
  {
    from: 'resources/adb-temp',
    to: 'adb'
  }
]

fs.writeFileSync(pkgPath, JSON.stringify(pkg, null, 2))
console.log(`[prepare-adb] Updated package.json for ${platform} build`)
