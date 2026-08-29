const fs = require('fs');
function showPlugin(name) {
  try {
    const pkg = JSON.parse(fs.readFileSync(`C:/Users/Lenovo/.dsh/profiles/web/node_modules/${name}/package.json`, 'utf8'));
    console.log(`\n=== ${name} ===`);
    console.log('  version:', pkg.version);
    console.log('  repository:', JSON.stringify(pkg.repository));
  } catch(e) { console.log(`\n=== ${name} === ERR: ${e.message}`); }
}
const root = JSON.parse(fs.readFileSync('C:/Users/Lenovo/.dsh/profiles/web/package.json', 'utf8'));
console.log('Root deps:');
for (const [k,v] of Object.entries(root.dependencies || {})) {
  console.log(`  ${k}: ${v}`);
}
console.log('Root bundles:', JSON.stringify(root.dsh?.profile?.bundles));
showPlugin('@dsh/plugin-manager');
showPlugin('dsh-find-plugin');
showPlugin('dsh-chat-import');
showPlugin('dsh-skin-picker');
