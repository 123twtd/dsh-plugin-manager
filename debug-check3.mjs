// 直接调 inspectProfile 看 entry.repository 是什么
const { inspectProfile } = await import('./manager.js');
const dir = 'C:/Users/Lenovo/.dsh/profiles/web';
const inv = await inspectProfile(dir);
const pm = inv.entries.find(e => e.packageName === '@dsh/plugin-manager');
console.log('pm entry:', JSON.stringify(pm, null, 2));
console.log('pm.repository:', pm?.repository);
console.log('pm.source:', pm?.source);
