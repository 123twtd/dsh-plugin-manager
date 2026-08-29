// 生成一个可用真实浏览器打开的预览页：React UMD + client.js + mock loader/fetch。
// 用法：node tests/render/build-preview.mjs → 输出 tests/render/preview.html，
// 再用 Edge headless 截图验证真实布局（含 container query 断点）。
import { readFileSync, writeFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const ws = 'C:/Users/Lenovo/.workbuddy/binaries/node/workspace/node_modules';
const reactSrc = readFileSync(join(ws, 'react', 'umd', 'react.production.min.js'), 'utf8');
const reactDomSrc = readFileSync(join(ws, 'react-dom', 'umd', 'react-dom.production.min.js'), 'utf8');
const clientSrc = readFileSync(join(here, '..', '..', 'client', 'client.js'), 'utf8');

// 与 render-data-test.mjs 相同的 mock 数据
const inventory = {
  ok: true, entries: [
    { packageName: '@dsh/plugin-manager', version: '0.1.0', description: '管理器', source: 'local', sourceLabel: '本地自建', category: '管理工具', installed: true, enabled: true, protected: true, pinned: false, entryIds: ['x'], disabledIds: [], services: {}, resources: {}, declaredConflicts: [] },
    { packageName: '@deepseek-ai/dsh-base', version: '1.0', description: '官方基础', source: 'official', sourceLabel: 'DeepSeek 官方', category: 'DeepSeek 官方', installed: true, enabled: true, protected: true, pinned: false, entryIds: ['base'], disabledIds: [], services: {}, resources: {}, declaredConflicts: [] },
    { packageName: '@deepseek-ai/dsh-web-app', version: '1.0', description: 'Web 应用', source: 'official', sourceLabel: 'DeepSeek 官方', category: 'DeepSeek 官方', installed: true, enabled: true, protected: true, pinned: false, entryIds: ['web'], disabledIds: [], services: {}, resources: {}, declaredConflicts: [] },
    { packageName: 'dsh-chat-import', version: '0.8.1', description: '会话导入', source: 'author', sourceLabel: '作者：Nwflower', category: '会话与迁移', installed: true, enabled: true, protected: false, pinned: false, entryIds: ['ci'], disabledIds: [], services: {}, resources: {}, declaredConflicts: [], repository: 'Nwflower/dsh-chat-import' },
    { packageName: 'dsh-find-plugin', version: '0.3.7', description: '插件发现', source: 'author', sourceLabel: 'GitHub：awesome-dsh-plugins', category: '插件发现', installed: true, enabled: true, protected: false, pinned: false, entryIds: ['fp'], disabledIds: [], services: {}, resources: {}, declaredConflicts: [] },
    { packageName: '@liustack/modlens', version: '3.25.2', description: '模型透镜', source: 'author', sourceLabel: '作者：Leon Liu', category: '视觉与多模态', installed: true, enabled: true, protected: false, pinned: false, entryIds: ['ml'], disabledIds: [], services: {}, resources: {}, declaredConflicts: [] },
    { packageName: '@dsh-external/dsh-context-compactor', version: '0.5.7', description: '上下文压缩', source: 'author', sourceLabel: 'GitHub：kusesad-1122/dsh-context-compactor', category: '上下文管理', installed: true, enabled: true, protected: false, pinned: false, entryIds: ['cc'], disabledIds: [], services: {}, resources: {}, declaredConflicts: [] },
  ], conflicts: [],
};
const market = {
  ok: true, updatedAt: '2026-08-29T00:00:00Z',
  entries: [
    { key: 'github:Codingendless/dsh-liang-rheostat', spec: 'github:Codingendless/dsh-liang-rheostat', repoName: 'dsh-liang-skin', owner: 'Codingendless', url: 'https://github.com/Codingendless/dsh-liang-skin', category: 'theme', description: '皮肤合集（内置清单数据错配：候选名 skin、install 指向 rheostat）', source: 'find-plugin-snapshot', installed: false, installable: true, packageName: null, enabled: false, protected: false, inconsistent: true },
    { key: 'github:foo/dsh-alpha', spec: 'github:foo/dsh-alpha', repoName: 'dsh-alpha', owner: 'foo', url: 'https://github.com/foo/dsh-alpha', category: 'ui', description: '界面增强候选', source: 'find-plugin-snapshot', installed: false, installable: true, packageName: null, enabled: false, protected: false },
    { key: 'github:KinGao294/dsh-skin', spec: 'github:Kingao294/dsh-skin', repoName: 'dsh-skin', owner: 'KinGao294', url: 'https://github.com/KinGao294/dsh-skin', category: 'theme', description: '皮肤切换 + 自定义壁纸', source: 'find-plugin-snapshot', installed: true, installable: true, packageName: 'dsh-skin', enabled: true, protected: false },
    { key: 'local:dsh-headroom', spec: '', repoName: 'dsh-headroom', owner: '', url: '', category: 'dev', description: '无源备忘', source: 'manual', installed: false, installable: false, packageName: null, enabled: false, protected: false },
  ],
  importable: { available: true, count: 176, updated: '2026-08-14' },
};

const html = `<!doctype html>
<html lang="zh-CN">
<head>
<meta charset="utf-8">
<title>dsh-plugin-manager 布局预览</title>
<style>
  :root{
    --dsw-alias-label-primary:#1f2328;--dsw-alias-label-secondary:#59636e;--dsw-alias-label-tertiary:#8a9199;
    --dsw-alias-bg-layer-1:#ffffff;--dsw-alias-bg-layer-2:#f6f8fa;--dsw-alias-bg-layer-3:#eaeef2;
    --dsw-alias-border-l2:#d1d9e0;--dsw-alias-brand-primary:#4c6ef5;
  }
  body{margin:0;font:14px/1.5 -apple-system,"Segoe UI","Microsoft YaHei",sans-serif;background:#fff}
</style>
</head>
<body>
<div id="root"></div>
<script>${reactSrc}</script>
<script>${reactDomSrc}</script>
<script>
// jsx-runtime shim（UMD 无单独 jsx-runtime，等价实现）
window.__jsxrt = {
  jsx: (type, props, key) => key == null ? React.createElement(type, props) : React.createElement(type, { ...(props || {}), key }),
  jsxs: (type, props, key) => key == null ? React.createElement(type, props) : React.createElement(type, { ...(props || {}), key }),
};
let __captured = null;
window.__ModuleLoader__ = {
  load: (payload) => {
    const exports = payload.factory((id) => {
      if (id === 'react') return React;
      if (id === 'react/jsx-runtime') return window.__jsxrt;
      throw new Error('unexpected require: ' + id);
    });
    exports.apply({ slots: { inject: (s, fn) => fn(), register: (meta, comp) => { __captured = comp; } } });
  },
};
window.fetch = (url, options = {}) => Promise.resolve({
  ok: true, status: 200,
  json: async () => {
    if (url.includes('/inventory')) return ${JSON.stringify(inventory)};
    if (url.includes('/market') && (!options.method || options.method === 'GET')) return ${JSON.stringify(market)};
    if (url.includes('/install') && options.method === 'POST') return { ok: true, jobId: 'demo-task' };
    if (url.includes('/install?jobId=')) {
      if (location.hash === '#failed') return { ok: true, job: {
        id: 'demo-task', state: 'failed', error: '安装失败，已回滚 package.json（node_modules 中可能残留文件，可手动执行 pnpm install 修复）。原因：dsh-deep-whale 不是合法的 DSH 插件包：package.json 缺少 dsh.bundle.patch 声明。该仓库可能是一个合集（monorepo）或纯主题/文档仓库，不能直接作为插件安装。',
        startedAt: new Date(Date.now() - 20000).toISOString(),
        steps: [
          { label: '解析包管理器（corepack pnpm 11.22.0）', startedAt: new Date(Date.now() - 20000).toISOString(), at: new Date(Date.now() - 19000).toISOString() },
          { label: '下载依赖：pnpm add github:Small-tailqwq/dsh-deep-whale', startedAt: new Date(Date.now() - 19000).toISOString(), at: new Date(Date.now() - 8000).toISOString(), detail: 'resolved 5, reused 5, downloaded 0, added 1' },
          { label: '安装失败，正在回滚', startedAt: new Date(Date.now() - 8000).toISOString(), at: new Date(Date.now() - 3000).toISOString() },
        ] } };
      return { ok: true, job: {
        id: 'demo-task', state: 'running', startedAt: new Date(Date.now() - 95000).toISOString(),
        steps: [
          { label: '解析包管理器（corepack pnpm 11.22.0）', startedAt: new Date(Date.now() - 95000).toISOString(), at: new Date(Date.now() - 90000).toISOString() },
          { label: '下载依赖：pnpm add github:Small-tailqwq/dsh-deep-whale', startedAt: new Date(Date.now() - 90000).toISOString(), at: new Date(Date.now() - 1000).toISOString(), detail: 'resolved 3, reused 2, downloaded 1, added 0' },
        ] } };
    }
    return { ok: true };
  },
});
</script>
<script>
${clientSrc}
</script>
<script>
  const rootEl = document.getElementById('root');
  ReactDOM.createRoot(rootEl).render(React.createElement(__captured));
  window.__ready = false;
  setTimeout(() => {
    // 场景开关由 URL hash 控制：#market 市场 tab；#task 市场 tab + 点安装；#failed 市场 tab + 安装失败；#detail 已装 tab + 点详情
    const click = (text) => { const btn = [...document.querySelectorAll('button')].find((b) => b.textContent === text || b.title === text); if (btn) btn.click(); };
    if (location.hash === '#market' || location.hash === '#task' || location.hash === '#failed') click('发现市场');
    if (location.hash === '#task' || location.hash === '#failed') setTimeout(() => click('安装并启用 dsh-alpha'), 150);
    if (location.hash === '#detail') setTimeout(() => {
      const row = [...document.querySelectorAll('.dshpm-row')].find((r) => r.textContent.includes('dsh-chat-import'));
      const btn = row && [...row.querySelectorAll('button')].find((b) => b.title === '详情');
      if (btn) btn.click();
    }, 150);
    setTimeout(() => { window.__ready = true; }, 400);
  }, 150);
</script>
</body>
</html>`;

const out = join(here, 'preview.html');
writeFileSync(out, html);
console.log('预览页已生成:', out);
