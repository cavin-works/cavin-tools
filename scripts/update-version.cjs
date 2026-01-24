const fs = require('fs');
const path = require('path');

const VERSION = process.argv[2];

if (!VERSION) {
  console.error('Error: VERSION argument is required');
  process.exit(1);
}

console.log('Updating version to:', VERSION);

// Update package.json
const pkgPath = path.join(process.cwd(), 'package.json');
const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf-8'));
pkg.version = VERSION;
fs.writeFileSync(pkgPath, JSON.stringify(pkg, null, 2) + '\n');
console.log('✓ Updated package.json');

// Update tauri.conf.json
const tauriConfPath = path.join(process.cwd(), 'src-tauri', 'tauri.conf.json');
const config = JSON.parse(fs.readFileSync(tauriConfPath, 'utf-8'));
config.version = VERSION;
fs.writeFileSync(tauriConfPath, JSON.stringify(config, null, 2) + '\n');
console.log('✓ Updated tauri.conf.json');

console.log('Version update completed successfully');
