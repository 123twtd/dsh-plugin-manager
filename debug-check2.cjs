// 直接模拟 checkUpdate 对 plugin-manager 的调用链路
const pkg = {
  packageName: '@dsh/plugin-manager',
  version: '0.2.0',
  specifier: 'link:C:/Users/Lenovo/.dsh/plugin-manager-src',
  source: 'local',
  protected: true,
  repository: { type: 'git', url: 'https://github.com/123twtd/dsh-plugin-manager.git' }
};

function githubRepo(repo) {
  if (!repo) return null;
  const value = typeof repo === 'string' ? repo : repo?.url;
  const match = typeof value === 'string' ? value.match(/github\.com[/:]([^/]+\/[^/#]+?)(?:\.git)?(?:[#?].*)?$/i) : undefined;
  return match?.[1];
}
function githubRepoFromSpecifier(s) {
  const m = typeof s === 'string' ? s.match(/^github:([^#]+?)(?:#.*)?$/i) : undefined;
  return m?.[1];
}

const repo = githubRepo(pkg.repository);
console.log('1. githubRepo from entry:', repo);  // 应该是 123twtd/dsh-plugin-manager

// 模拟 npm registry 查询
console.log('2. specifier starts with github:', pkg.specifier.startsWith('github:'));
console.log('   → 走 npm registry 查询...');

fetch(`https://registry.npmjs.org/${encodeURIComponent(pkg.packageName)}/latest`, { headers: { 'Accept': 'application/json' } })
  .then(r => {
    console.log('3. npm registry status:', r.status);
    if (r.status === 404) {
      console.log('4. 404, fallback to githubRepoFromEntry →', repo);
      if (repo) {
        return fetch(`https://api.github.com/repos/${repo}/tags`, { headers: { 'Accept': 'application/vnd.github+json', 'User-Agent': 'dsh-plugin-manager' } });
      }
    }
    return null;
  })
  .then(r => r ? r.json() : null)
  .then(j => {
    if (!j) { console.log('NO RESULT'); return; }
    console.log('5. GitHub tags count:', j.length);
    console.log('   latest tag:', j[0]?.name);
    const latest = j[0]?.name?.replace(/^v/, '');
    console.log('   current:', pkg.version, 'latest:', latest);
    console.log('   hasUpdate:', latest && latest !== pkg.version);
  })
  .catch(e => console.error('ERROR:', e.message));
