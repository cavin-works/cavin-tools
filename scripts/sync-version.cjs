const fs = require('fs');
const path = require('path');

const version = process.argv[2];

if (!version) {
  console.error('❌ 错误：请提供版本号');
  process.exit(1);
}

console.log(`📦 同步版本号: ${version}`);

// 1. 更新 package.json
const packageJsonPath = './package.json';
const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf-8'));
packageJson.version = version;
fs.writeFileSync(
  packageJsonPath,
  JSON.stringify(packageJson, null, 2) + '\n'
);
console.log('✅ 已更新 package.json');

// 2. 更新 Cargo.toml
const cargoTomlPath = './src-tauri/Cargo.toml';
let cargoToml = fs.readFileSync(cargoTomlPath, 'utf-8');
cargoToml = cargoToml.replace(
  /^version = ".*"/m,
  `version = "${version}"`
);
fs.writeFileSync(cargoTomlPath, cargoToml);
console.log('✅ 已更新 src-tauri/Cargo.toml');

// 3. 更新 tauri.conf.json
const tauriConfPath = './src-tauri/tauri.conf.json';
const tauriConf = JSON.parse(fs.readFileSync(tauriConfPath, 'utf-8'));
tauriConf.version = version;
fs.writeFileSync(
  tauriConfPath,
  JSON.stringify(tauriConf, null, 2) + '\n'
);
console.log('✅ 已更新 src-tauri/tauri.conf.json');

console.log(`✨ 所有配置文件已同步至版本 ${version}`);
