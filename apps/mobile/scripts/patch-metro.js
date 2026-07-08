/**
 * Patches all metro-* packages to remove restrictive exports maps.
 * @expo/cli 0.24.x (SDK 53) accesses metro internals directly, but
 * metro 0.82+ added exports maps that block those internal paths.
 * Removing the exports field restores pre-0.82 behavior for all metro packages.
 *
 * Runs automatically after every `npm install` via postinstall.
 */
const fs = require('fs');
const path = require('path');

const nodeModules = path.join(__dirname, '../node_modules');

const metroPackages = fs.readdirSync(nodeModules).filter(
  (name) => name === 'metro' || name.startsWith('metro-')
);

let patched = 0;
for (const pkg of metroPackages) {
  const pkgJsonPath = path.join(nodeModules, pkg, 'package.json');
  if (!fs.existsSync(pkgJsonPath)) continue;

  const pkgJson = JSON.parse(fs.readFileSync(pkgJsonPath, 'utf8'));
  if (pkgJson.exports) {
    delete pkgJson.exports;
    fs.writeFileSync(pkgJsonPath, JSON.stringify(pkgJson, null, 2));
    console.log(`patch-metro: removed exports restriction from ${pkg} ✓`);
    patched++;
  }
}

if (patched === 0) {
  console.log('patch-metro: all metro packages already patched, skipping');
} else {
  console.log(`patch-metro: patched ${patched} package(s) ✓`);
}
