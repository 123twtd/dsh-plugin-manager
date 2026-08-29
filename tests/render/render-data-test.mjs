// 带数据的完整渲染：jsdom + mock fetch，驱动「已装插件 / 发现市场」两个 tab 的数据态渲染。
import { createRequire } from 'node:module';
import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const require = createRequire(import.meta.url);
const { JSDOM } = require('jsdom');

const dom = new JSDOM('<!doctype html><html><body><div id="root"></div></body></html>', { url: 'http://localhost/', pretendToBeVisual: true });
global.window = dom.window;
global.document = dom.window.document;
Object.defineProperty(global, 'navigator', { value: dom.window.navigator, configurable: true });
global.HTMLElement = dom.window.HTMLElement;
global.Node = dom.window.Node;

const React = require('react');
global.IS_REACT_ACT_ENVIRONMENT = true;
const { createRoot } = require('react-dom/client');
const { act } = require('react-dom/test-utils');
const jsxRuntime = require('react/jsx-runtime');

const here = dirname(fileURLToPath(import.meta.url));
const src = readFileSync(join(here, '..', '..', 'client', 'client.js'), 'utf8');

// ---- mock 后端数据 ----
const inventory = {
  ok: true, entries: [
    { packageName: '@dsh/plugin-manager', version: '0.1.0', description: '管理器', source: 'local', sourceLabel: '本地自建', category: '管理工具', installed: true, enabled: true, protected: true, pinned: false, entryIds: ['x'], disabledIds: [], services: {}, resources: {}, declaredConflicts: [] },
    { packageName: '@deepseek-ai/dsh-base', version: '1.0', description: '官方基础', source: 'official', sourceLabel: 'DeepSeek 官方', category: 'DeepSeek 官方', installed: true, enabled: true, protected: true, pinned: false, entryIds: ['base'], disabledIds: [], services: {}, resources: {}, declaredConflicts: [] },
    { packageName: 'dsh-chat-import', version: '0.2', description: '会话导入', source: 'author', sourceLabel: 'GitHub：foo/dsh-chat-import', category: '会话与迁移', installed: true, enabled: true, protected: false, pinned: true, entryIds: ['ci'], disabledIds: [], services: {}, resources: {}, declaredConflicts: [], repository: 'foo/dsh-chat-import' },
    { packageName: 'modlens', version: '0.3', description: '模型透镜', source: 'author', sourceLabel: '作者：Bob', category: '模型', installed: true, enabled: false, protected: false, pinned: false, entryIds: ['ml'], disabledIds: ['ml'], services: {}, resources: {}, declaredConflicts: [] },
  ], conflicts: [],
};
const market = {
  ok: true, updatedAt: '2026-08-29T00:00:00Z',
  entries: [
    { key: 'github:foo/dsh-alpha', spec: 'github:foo/dsh-alpha', repoName: 'dsh-alpha', owner: 'foo', url: 'https://github.com/foo/dsh-alpha', category: 'ui', description: '界面增强候选', source: 'find-plugin-snapshot', installed: false, installable: true, packageName: null, enabled: false, protected: false },
    { key: 'github:foo/dsh-chat-import', spec: 'github:foo/dsh-chat-import', repoName: 'dsh-chat-import', owner: 'foo', url: 'https://github.com/foo/dsh-chat-import', category: 'session', description: '已装候选', source: 'find-plugin-snapshot', installed: true, installable: true, packageName: 'dsh-chat-import', enabled: true, protected: false },
    { key: 'local:dsh-headroom', spec: '', repoName: 'dsh-headroom', owner: '', url: '', category: 'dev', description: '无源备忘', source: 'manual', installed: false, installable: false, packageName: null, enabled: false, protected: false },
  ],
  importable: { available: true, count: 176, updated: '2026-08-14' },
};

global.fetch = async (url, options = {}) => {
  const body = url.includes('/inventory') ? inventory : url.includes('/market') && (options.method === 'GET' || !options.method) ? market : { ok: true };
  return { ok: true, status: 200, json: async () => body };
};

function fakeRequire(id) {
  if (id === 'react') return React;
  if (id === 'react/jsx-runtime') return jsxRuntime;
  throw new Error('unexpected require: ' + id);
}

let captured = null;
const fakeCtx = { slots: { inject: (s, fn) => fn(), register: (meta, comp) => { captured = comp; } } };
const fakeModuleLoader = { load: (payload) => { const exports = payload.factory(fakeRequire); exports.apply(fakeCtx); } };
new Function('window', 'require', src)({ __ModuleLoader__: fakeModuleLoader }, fakeRequire);

if (!captured) { console.error('FAIL: 没有捕获到组件'); process.exit(1); }

const container = document.getElementById('root');
const root = createRoot(container);

await act(async () => { root.render(React.createElement(captured)); });
await act(async () => { await new Promise((r) => setTimeout(r, 50)); });

const html = container.innerHTML;
const checks = [
  ['tab 已装的插件', html.includes('已装的插件')],
  ['tab 发现市场', html.includes('发现市场')],
  ['管理器区', html.includes('固定管理器')],
  ['官方区', html.includes('DeepSeek 官方')],
  ['已置顶分区', html.includes('已置顶')],
  ['置顶行渲染', html.includes('dsh-chat-import')],
  ['禁用态插件渲染', html.includes('modlens')],
];

// 切到「发现市场」tab，验证市场面板数据态渲染
const marketTab = [...container.querySelectorAll('button')].find((b) => b.textContent === '发现市场');
if (!marketTab) { console.error('FAIL 找不到「发现市场」tab'); process.exit(1); }
await act(async () => { marketTab.dispatchEvent(new dom.window.MouseEvent('click', { bubbles: true })); });
await act(async () => { await new Promise((r) => setTimeout(r, 20)); });
const marketHtml = container.innerHTML;
checks.push(
  ['市场候选渲染', marketHtml.includes('dsh-alpha')],
  ['待补源标记', marketHtml.includes('待补源')],
  ['精简说明文案', marketHtml.includes('清单只登记不下载')],
  ['手动添加折叠按钮', marketHtml.includes('手动添加候选 / 从内置清单导入')],
);

// 点开折叠的「手动添加候选」区，再断言高级工具（默认隐藏，避免主界面冗余）
const toolsToggle = [...container.querySelectorAll('button')].find((b) => b.textContent.includes('手动添加候选'));
if (!toolsToggle) { console.error('FAIL 找不到「手动添加候选」折叠按钮'); process.exit(1); }
await act(async () => { toolsToggle.dispatchEvent(new dom.window.MouseEvent('click', { bubbles: true })); });
await act(async () => { await new Promise((r) => setTimeout(r, 20)); });
const marketHtml2 = container.innerHTML;
checks.push(
  ['AI 小贴士（展开后）', marketHtml2.includes('让 AI 帮忙')],
  ['内置清单导入按钮（展开后）', marketHtml2.includes('从内置清单补全候选')],
  ['手动 spec 输入框（展开后）', marketHtml2.includes('GitHub 仓库地址或 owner/repo')],
);

let failed = 0;
for (const [name, pass] of checks) { console.log((pass ? 'PASS' : 'FAIL') + ' ' + name); if (!pass) failed += 1; }
console.log(failed === 0 ? 'ALL_RENDER_CHECKS_OK' : 'RENDER_CHECKS_FAILED');
process.exit(failed === 0 ? 0 : 1);
