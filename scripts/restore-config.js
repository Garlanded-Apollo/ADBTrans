const fs = require('fs')
const path = require('path')

const pkgPath = path.join(__dirname, '..', 'package.json')
const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf-8'))

// 恢复原始配置
if (pkg._originalBuild) {
  pkg.build = pkg._originalBuild
  delete pkg._originalBuild
  fs.writeFileSync(pkgPath, JSON.stringify(pkg, null, 2))
  console.log('[restore-config] Restored original build config')
}

// 清理临时目录
const adbTempDir = path.join(__dirname, '..', 'resources', 'adb-temp')
if (fs.existsSync(adbTempDir)) {
  fs.rmSync(adbTempDir, { recursive: true })
  console.log('[restore-config] Cleaned up temp directory')
}
