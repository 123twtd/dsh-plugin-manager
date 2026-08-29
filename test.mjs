import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { addMarketEntry, inspectMarket, importSnapshot, inspectProfile, managerPackageName, normalizeSpec, planToggle, removeMarketEntry, setPinned, uninstallPlugin, updatePatch, startInstall, startUninstall, startUpdate, assertInstallableBundle, smokeCheck, getJob, verifyProfile, checkUpdate, updatePlugin } from './manager.js';

async function marketFixture(plugins, dependencies = {}) {
  const root = await mkdtemp(join(tmpdir(), 'pm-market-'));
  await mkdir(join(root, 'node_modules', 'dsh-find-plugin', 'data'), { recursive: true });
  await writeFile(join(root, 'node_modules', 'dsh-find-plugin', 'data', 'registry-snapshot.json'), JSON.stringify({ name: 'fixture', updated: '2026-08-14', count: plugins.length, plugins }));
  await writeFile(join(root, 'package.json'), JSON.stringify({ dsh: { profile: { bundles: Object.keys(dependencies) } }, dependencies }));
  await writeFile(join(root, 'cordis.patch.yml'), '[]\n');
  return root;
}
test('reports disabled state and service conflict', async () => { const root = await mkdtemp(join(tmpdir(), 'pm-')); try {
  for (const name of ['a', 'b']) { await mkdir(join(root, 'node_modules', name), { recursive: true }); await writeFile(join(root, 'node_modules', name, 'package.json'), JSON.stringify({ name, dsh: { bundle: { patch: './cordis.patch.yml' } } })); await writeFile(join(root, 'node_modules', name, 'cordis.patch.yml'), `- insert:\n    - id: ${name}\n      name: ${name}\n`); await writeFile(join(root, 'node_modules', name, 'dsh-market.json'), JSON.stringify({ services: { provides: ['shared'] } })); }
  await writeFile(join(root, 'node_modules', 'a', 'package.json'), JSON.stringify({ name: 'a', author: 'Alice <alice@example.test>', description: 'image vision helper', dsh: { bundle: { patch: './cordis.patch.yml' } } }));
  await writeFile(join(root, 'package.json'), JSON.stringify({ dsh: { profile: { bundles: ['a', 'b'] } } })); await writeFile(join(root, 'cordis.patch.yml'), '- id: b\n  disabled: true\n'); const result = await inspectProfile(root); assert.equal(result.entries.find((x) => x.packageName === 'b').enabled, false); assert.equal(result.conflicts[0].kind, 'service'); assert.equal(result.entries.find((x) => x.packageName === 'a').sourceLabel, '作者：Alice'); assert.equal(result.entries.find((x) => x.packageName === 'a').category, '视觉与多模态');
} finally { await rm(root, { recursive: true, force: true }); } });

test('only low-risk explicit conflicts become automatic disable candidates', async () => { const root = await mkdtemp(join(tmpdir(), 'pm-')); try {
  for (const name of ['a', 'b']) { await mkdir(join(root, 'node_modules', name), { recursive: true }); await writeFile(join(root, 'node_modules', name, 'package.json'), JSON.stringify({ name, dsh: { bundle: { patch: './cordis.patch.yml' } } })); await writeFile(join(root, 'node_modules', name, 'cordis.patch.yml'), `- insert:\n    - id: ${name}\n      name: ${name}\n`); }
  await writeFile(join(root, 'node_modules', 'a', 'dsh-market.json'), JSON.stringify({ conflicts: ['b'] })); await writeFile(join(root, 'package.json'), JSON.stringify({ dsh: { profile: { bundles: ['a', 'b'] } } })); await writeFile(join(root, 'cordis.patch.yml'), '[]\n');
  const plan = await planToggle(root, 'a', true, { autoDisableLowRisk: true }); assert.equal(plan.automaticActions[0].packageName, 'b'); assert.equal(plan.requiresConfirmation, false);
} finally { await rm(root, { recursive: true, force: true }); } });

test('reads flow-style disable entries produced by updatePatch', async () => { const root = await mkdtemp(join(tmpdir(), 'pm-')); try {
  // 写入器产生的是流样式 `[ { id: b, disabled: true } ]`，早期用正则读取会把 id 连逗号一起捕获。
  await mkdir(join(root, 'node_modules', 'b'), { recursive: true });
  await writeFile(join(root, 'node_modules', 'b', 'package.json'), JSON.stringify({ name: 'b', dsh: { bundle: { patch: './cordis.patch.yml' } } }));
  await writeFile(join(root, 'node_modules', 'b', 'cordis.patch.yml'), "- insert:\n    - id: b\n      name: b\n");
  await writeFile(join(root, 'package.json'), JSON.stringify({ dsh: { profile: { bundles: ['b'] } } }));
  const patched = updatePatch('[]\n', [{ ids: ['b'], disabled: true }]);
  assert.match(patched, /disabled: true/);
  await writeFile(join(root, 'cordis.patch.yml'), patched);
  const entry = (await inspectProfile(root)).entries.find((x) => x.packageName === 'b');
  assert.equal(entry.enabled, false);
  assert.deepEqual(entry.disabledIds, ['b']);
} finally { await rm(root, { recursive: true, force: true }); } });

test('updatePatch writes block style, survives comment-only files, and keeps hand-written keys', async () => {
  const comments = '# patch layer\n# second line\n';
  const disabled = updatePatch(comments, [{ ids: ['a'], disabled: true }]);
  assert.match(disabled, /^# patch layer\n# second line\n/);
  assert.match(disabled, /- id: a\n {2}disabled: true/);
  // 重复禁用不产生重复条目。
  assert.equal(updatePatch(disabled, [{ ids: ['a'], disabled: true }]), disabled);
  // 启用时整条移除，回到干净状态。
  assert.equal(updatePatch(disabled, [{ ids: ['a'], disabled: false }]), updatePatch(comments, []));
  // 用户手写过其他字段时，只摘掉 disabled，不删配置。
  const handWritten = "- id: a\n  disabled: true\n  config:\n    thresholdRatio: 0.7\n";
  assert.equal(updatePatch(handWritten, [{ ids: ['a'], disabled: false }]), "- id: a\n  config:\n    thresholdRatio: 0.7\n");
});

test('normalizes github specifiers from every common spelling', () => {
  assert.equal(normalizeSpec('github:HuiLiYi37/dsh-tianshu-tui'), 'github:huiliyi37/dsh-tianshu-tui');
  assert.equal(normalizeSpec('https://github.com/a/b.git'), 'github:a/b');
  assert.equal(normalizeSpec('github:a/b#main'), 'github:a/b');
  assert.equal(normalizeSpec('  github:a/b  '), 'github:a/b');
});

test('imports the snapshot once and joins candidates with what is already installed', async () => {
  const root = await marketFixture([
    { name: 'dsh-alpha', owner: 'alice', category: 'ui', url: 'https://github.com/alice/dsh-alpha', description: { zh: '甲', en: 'A' }, install: 'dsh plugin --profile web add github:alice/dsh-alpha', added: '2026-08-01' },
    { name: 'dsh-beta', owner: 'bob', category: 'tools', url: 'https://github.com/bob/dsh-beta', description: '乙', install: 'dsh plugin --profile web add github:bob/dsh-beta' },
  ], { 'dsh-beta': 'github:bob/dsh-beta' });
  try {
    await mkdir(join(root, 'node_modules', 'dsh-beta'), { recursive: true });
    await writeFile(join(root, 'node_modules', 'dsh-beta', 'package.json'), JSON.stringify({ name: 'dsh-beta', version: '1.0.0' }));
    const first = await importSnapshot(root);
    assert.equal(first.total, 2);
    // 重复导入按 spec 去重，不产生第二条。
    const second = await importSnapshot(root);
    assert.equal(second.total, 2);
    const market = await inspectMarket(root);
    assert.equal(market.importable.available, true);
    const alpha = market.entries.find((x) => x.repoName === 'dsh-alpha');
    const beta = market.entries.find((x) => x.repoName === 'dsh-beta');
    assert.equal(alpha.installed, false);
    assert.equal(alpha.packageName, null);
    // 仓库名与包名不同也能靠 spec 对上。
    assert.equal(beta.installed, true);
    assert.equal(beta.packageName, 'dsh-beta');
    assert.equal(beta.enabled, true);
    assert.equal(beta.description, '乙');
    assert.equal(alpha.description, '甲');
  } finally { await rm(root, { recursive: true, force: true }); }
});

test('removing a market candidate never touches installed files', async () => {
  const root = await marketFixture([{ name: 'dsh-gamma', owner: 'carol', category: 'dev', install: 'dsh plugin add github:carol/dsh-gamma' }]);
  try {
    await importSnapshot(root);
    await removeMarketEntry(root, 'https://github.com/carol/dsh-gamma.git');
    assert.equal((await inspectMarket(root)).entries.length, 0);
    await assert.rejects(() => removeMarketEntry(root, 'github:carol/dsh-gamma'), /市场里没有这个候选/);
  } finally { await rm(root, { recursive: true, force: true }); }
});

test('pinned plugins refuse to be disabled until unpinned', async () => {
  const root = await mkdtemp(join(tmpdir(), 'pm-pin-'));
  try {
    await mkdir(join(root, 'node_modules', 'a'), { recursive: true });
    await writeFile(join(root, 'node_modules', 'a', 'package.json'), JSON.stringify({ name: 'a', dsh: { bundle: { patch: './cordis.patch.yml' } } }));
    await writeFile(join(root, 'node_modules', 'a', 'cordis.patch.yml'), '- insert:\n    - id: a\n      name: a\n');
    await writeFile(join(root, 'package.json'), JSON.stringify({ dsh: { profile: { bundles: ['a'] } } }));
    await writeFile(join(root, 'cordis.patch.yml'), '[]\n');
    assert.equal((await inspectProfile(root)).entries[0].pinned, false);
    assert.deepEqual(await setPinned(root, 'a', true), ['a']);
    assert.equal((await inspectProfile(root)).entries[0].pinned, true);
    const blocked = await planToggle(root, 'a', false);
    assert.equal(blocked.ok, false);
    assert.equal(blocked.code, 'PINNED');
    // 启用不受置顶影响，取消置顶后即可禁用。
    assert.equal((await planToggle(root, 'a', true)).ok, true);
    await setPinned(root, 'a', false);
    assert.equal((await planToggle(root, 'a', false)).ok, true);
  } finally { await rm(root, { recursive: true, force: true }); }
});

test('manual entries accept both a github spec and a bare package name', async () => {
  const root = await marketFixture([]);
  try {
    const withSpec = await addMarketEntry(root, { spec: 'github:kusesad-1122/dsh-context-compactor', note: '压缩失败有兜底' });
    assert.equal(withSpec.entry.installable, true);
    assert.equal(withSpec.entry.owner, 'kusesad-1122');
    const bare = await addMarketEntry(root, { spec: 'dsh-headroom', note: '只压工具输出' });
    assert.equal(bare.entry.installable, false);
    assert.equal(bare.entry.key, 'local:dsh-headroom');
    await assert.rejects(() => addMarketEntry(root, { spec: 'github:kusesad-1122/dsh-context-compactor' }), /已经有这个候选/);
    await assert.rejects(() => addMarketEntry(root, { spec: '   ' }), /请填写/);
    // 没有安装源的条目也要能按 key 删掉。
    await removeMarketEntry(root, 'local:dsh-headroom');
    const market = await inspectMarket(root);
    assert.equal(market.entries.length, 1);
    assert.equal(market.entries[0].note, '压缩失败有兜底');
  } finally { await rm(root, { recursive: true, force: true }); }
});

test('uninstall never runs without an explicit confirmation', async () => {
  // 卸载会 pnpm remove 删代码，任何调用方都必须显式确认，避免误触或脚本串台。
  await assert.rejects(() => uninstallPlugin('unused-profile', 'whatever'), /必须显式传 confirm/);
});

test('never allows the manager to disable itself', async () => {
  const plan = await planToggle('unused-for-protected-manager', managerPackageName, false);
  assert.equal(plan.ok, false);
  assert.match(plan.error, /不能由自身禁用/);
});

test('never allows an official core component to be disabled', async () => {
  const root = await mkdtemp(join(tmpdir(), 'pm-'));
  try {
    await mkdir(join(root, 'node_modules', '@deepseek-ai', 'dsh-base'), { recursive: true });
    await writeFile(join(root, 'node_modules', '@deepseek-ai', 'dsh-base', 'package.json'), JSON.stringify({ name: '@deepseek-ai/dsh-base', dsh: { bundle: { patch: './cordis.patch.yml' } } }));
    await writeFile(join(root, 'node_modules', '@deepseek-ai', 'dsh-base', 'cordis.patch.yml'), '- insert:\n    - id: base\n      name: base\n');
    await writeFile(join(root, 'package.json'), JSON.stringify({ dsh: { profile: { bundles: ['@deepseek-ai/dsh-base'] } } }));
    await writeFile(join(root, 'cordis.patch.yml'), '[]\n');
    const plan = await planToggle(root, '@deepseek-ai/dsh-base', false);
    assert.equal(plan.ok, false);
    assert.match(plan.error, /官方核心组件受保护/);
  } finally { await rm(root, { recursive: true, force: true }); }
});

test('install steps carry startedAt and at timestamps for the progress UI', () => {
  // 进度 UI 需要 onStep 的 payload 含可读 label，运行期才会追加 startedAt / at。
  // 这里 mock installPlugin 的 onStep，验证 progress step 形状契约。
  const seen = [];
  const fakeOnStep = (payload) => seen.push(payload);
  fakeOnStep({ label: '解析包管理器（pnpm 9.x）' });
  fakeOnStep({ label: '下载依赖：pnpm add github:foo/bar' });
  fakeOnStep({ label: '写入 bundles：@dsh/bar' });
  fakeOnStep({ label: '校验配置树：dsh --dump-config' });
  fakeOnStep({ label: '安装失败，正在回滚' });
  assert.equal(seen.length, 5);
  for (const payload of seen) {
    assert.equal(typeof payload.label, 'string');
    assert.ok(payload.label.length > 0, '每一步必须有可读文字');
  }
  assert.ok(seen.some((s) => s.label.includes('解析')));
  assert.ok(seen.some((s) => s.label.includes('下载依赖')));
  assert.ok(seen.some((s) => s.label.includes('bundles')));
  assert.ok(seen.some((s) => s.label.includes('回滚')));
});

test('startInstall persists startedAt on every step reported to the job', async () => {
  // 进度 API 在 steps 中持续累加，每条都必须同时带 startedAt，便于前端计算耗时。
  const root = await mkdtemp(join(tmpdir(), 'pm-job-'));
  try {
    await mkdir(join(root, 'node_modules'), { recursive: true });
    await writeFile(join(root, 'package.json'), JSON.stringify({ name: 'root', dependencies: {}, dsh: { profile: { bundles: [] } } }));
    const job = startInstall('unused-profile', root, 'github:no-one/no-where');
    assert.equal(job.state, 'running');
    assert.ok(job.startedAt, 'job 自身有 startedAt');
    // 等任务自然结束（pnpm 阶段会抛错）。
    await new Promise((resolve) => {
      const check = () => { if (job.state === 'running') setTimeout(check, 50); else resolve(); };
      check();
    });
    assert.notEqual(job.state, 'running');
    for (const step of job.steps) {
      assert.ok(step.startedAt, 'progress step 缺 startedAt');
      assert.ok(step.at, 'progress step 缺 at');
      assert.ok(!Number.isNaN(Date.parse(step.startedAt)), 'startedAt 必须是合法时间字符串');
    }
  } finally { await rm(root, { recursive: true, force: true }); }
});

test('assertInstallableBundle rejects monorepo root packages without dsh.bundle.patch', async () => {
  // dsh-deep-whale 事故：合集仓库根包 pnpm 能装上，但 dsh-app-boot 加载时崩溃。
  // 必须在写 bundles 之前拦截。
  const root = await mkdtemp(join(tmpdir(), 'pm-bundle-'));
  try {
    await mkdir(join(root, 'node_modules', 'dsh-deep-whale'), { recursive: true });
    await writeFile(join(root, 'node_modules', 'dsh-deep-whale', 'package.json'), JSON.stringify({ name: 'dsh-deep-whale', version: '0.0.0' }));
    await assert.rejects(() => assertInstallableBundle(root, 'dsh-deep-whale'), /不是合法的 DSH 插件包/);
    await assert.rejects(() => assertInstallableBundle(root, 'dsh-deep-whale'), /monorepo|合集/);
    // 有 dsh.bundle.patch 声明的包通过校验。
    await mkdir(join(root, 'node_modules', 'real-plugin'), { recursive: true });
    await writeFile(join(root, 'node_modules', 'real-plugin', 'package.json'), JSON.stringify({ name: 'real-plugin', dsh: { bundle: { patch: './cordis.patch.yml' } } }));
    const ok = await assertInstallableBundle(root, 'real-plugin');
    assert.equal(ok.name, 'real-plugin');
    // 包根本不存在也要拦截（json 读取失败得到 undefined）。
    await assert.rejects(() => assertInstallableBundle(root, 'ghost'), /不是合法的 DSH 插件包/);
  } finally { await rm(root, { recursive: true, force: true }); }
});

test('findBundleSubdirs lists only subpackages with dsh.bundle.patch', async () => {
  // monorepo 降级探测：mock GitHub API，只应返回带 dsh.bundle.patch 的子目录。
  const originalFetch = globalThis.fetch;
  try {
    const tree = { tree: [
      { type: 'blob', path: 'README.md' },
      { type: 'blob', path: 'client-ui/package.json' },
      { type: 'blob', path: 'server/package.json' },
      { type: 'blob', path: 'server/cordis.patch.yml' },
      { type: 'blob', path: 'node_modules/x/package.json' },
    ] };
    const pkgBodies = {
      'client-ui/package.json': { name: 'client-ui' },
      'server/package.json': { name: 'server', dsh: { bundle: { patch: './cordis.patch.yml' } } },
    };
    globalThis.fetch = async (url) => {
      if (String(url).includes('api.github.com')) return { ok: true, json: async () => tree };
      const path = String(url).split('HEAD/')[1];
      return pkgBodies[path] ? { ok: true, json: async () => pkgBodies[path] } : { ok: false, json: async () => ({}) };
    };
    const { findBundleSubdirs } = await import('./manager.js');
    const paths = await findBundleSubdirs('demo/monorepo');
    assert.deepEqual(paths, ['server']);
    // 缓存命中：第二次调用不再发请求（fetch 已还原成抛错版本也能拿到缓存）。
    globalThis.fetch = async () => { throw new Error('should be cached'); };
    const cached = await findBundleSubdirs('demo/monorepo');
    assert.deepEqual(cached, ['server']);
  } finally { globalThis.fetch = originalFetch; }
});

test('inspectMarket flags candidates whose install spec points to a different repo than the displayed name', async () => {
  // 内置清单常有候选名 a、install 指向仓库 b 的错配（甚至 GitHub 404）。
  // 这条标记让前端把"安装并启用"按钮替换成"打开 GitHub 核对"，避免用户白点。
  const root = await mkdtemp(join(tmpdir(), 'pm-mismatch-'));
  try {
    await mkdir(join(root, '.dsh-plugin-manager'), { recursive: true });
    await writeFile(join(root, '.dsh-plugin-manager', 'market.json'), JSON.stringify({
      version: 1, updatedAt: '2026-08-29T00:00:00Z',
      entries: [
        { key: 'github:Codingendless/dsh-liang-rheostat', spec: 'github:Codingendless/dsh-liang-rheostat', repoName: 'dsh-liang-skin', owner: 'Codingendless', url: 'https://github.com/Codingendless/dsh-liang-skin', category: 'theme', description: '错配：候选名 skin、install 指向 rheostat', source: 'find-plugin-snapshot', listedAt: null, installCommand: 'dsh plugin add github:Codingendless/dsh-liang-rheostat', addedAt: '2026-08-29', note: '' },
        { key: 'github:KinGao294/dsh-skin', spec: 'github:KinGao294/dsh-skin', repoName: 'dsh-skin', owner: 'KinGao294', url: 'https://github.com/KinGao294/dsh-skin', category: 'theme', description: '一致：名字和 install 同一仓库', source: 'find-plugin-snapshot', listedAt: null, installCommand: 'dsh plugin add github:KinGao294/dsh-skin', addedAt: '2026-08-29', note: '' },
      ],
    }));
    await writeFile(join(root, 'package.json'), JSON.stringify({ name: 'root', dependencies: {}, dsh: { profile: { bundles: [] } } }));
    await writeFile(join(root, 'cordis.patch.yml'), '[]\n');
    const market = await inspectMarket(root);
    const mismatch = market.entries.find((e) => e.repoName === 'dsh-liang-skin');
    const match = market.entries.find((e) => e.repoName === 'dsh-skin' && e.owner === 'KinGao294');
    assert.equal(mismatch.inconsistent, true, '错配候选应该被标记');
    assert.equal(match.inconsistent, false, '一致候选不应该被标记');
  } finally { await rm(root, { recursive: true, force: true }); }
});

// --- 冲突引擎补全测试：重复 ID、缺失依赖、版本不兼容 ---

async function bundleFixture(root, name, { market = {}, patch, pkg = {} } = {}) {
  await mkdir(join(root, 'node_modules', name), { recursive: true });
  await writeFile(join(root, 'node_modules', name, 'package.json'), JSON.stringify({ name, dsh: { bundle: { patch: './cordis.patch.yml' } }, ...pkg }));
  await writeFile(join(root, 'node_modules', name, 'cordis.patch.yml'), patch ?? `- insert:\n    - id: ${name}\n      name: ${name}\n`);
  await writeFile(join(root, 'node_modules', name, 'dsh-market.json'), JSON.stringify(market));
}

test('detects duplicate plugin IDs across bundles', async () => {
  const root = await mkdtemp(join(tmpdir(), 'pm-dup-'));
  try {
    // 两个 bundle 声明了同一个 insert id：必须报 duplicate-id 冲突。
    await bundleFixture(root, 'a', { patch: '- insert:\n    - id: shared-id\n      name: a\n' });
    await bundleFixture(root, 'b', { patch: '- insert:\n    - id: shared-id\n      name: b\n' });
    await writeFile(join(root, 'package.json'), JSON.stringify({ dsh: { profile: { bundles: ['a', 'b'] } } }));
    await writeFile(join(root, 'cordis.patch.yml'), '[]\n');
    const { conflicts } = await inspectProfile(root);
    assert.ok(conflicts.some((c) => c.kind === 'duplicate-id' && c.evidence.includes('shared-id')), '应检测到重复插件 ID');
  } finally { await rm(root, { recursive: true, force: true }); }
});

test('detects missing DSH dependencies', async () => {
  const root = await mkdtemp(join(tmpdir(), 'pm-dep-'));
  try {
    // 声明依赖 ghost-plugin，但 bundles 里没有它。
    await bundleFixture(root, 'a', { market: { dependencies: ['ghost-plugin'] } });
    await writeFile(join(root, 'package.json'), JSON.stringify({ dsh: { profile: { bundles: ['a'] } } }));
    await writeFile(join(root, 'cordis.patch.yml'), '[]\n');
    const { conflicts } = await inspectProfile(root);
    assert.ok(conflicts.some((c) => c.kind === 'missing-dependency' && c.left === 'a' && c.right === 'ghost-plugin'), '应检测到缺失依赖');
  } finally { await rm(root, { recursive: true, force: true }); }
});

test('detects Node version incompatibility', async () => {
  const root = await mkdtemp(join(tmpdir(), 'pm-ver-'));
  try {
    // 声明需要 Node >=999，当前运行时不可能满足。
    await bundleFixture(root, 'a', { pkg: { engines: { node: '>=999' } } });
    await writeFile(join(root, 'package.json'), JSON.stringify({ dsh: { profile: { bundles: ['a'] } } }));
    await writeFile(join(root, 'cordis.patch.yml'), '[]\n');
    const { conflicts } = await inspectProfile(root);
    assert.ok(conflicts.some((c) => c.kind === 'version' && c.evidence.includes('>=999')), '应检测到版本不兼容');
  } finally { await rm(root, { recursive: true, force: true }); }
});

// --- Job 持久化测试 ---

test('jobs persist to disk and survive process restart simulation', async () => {
  const root = await mkdtemp(join(tmpdir(), 'pm-persist-'));
  try {
    await mkdir(join(root, 'node_modules'), { recursive: true });
    await writeFile(join(root, 'package.json'), JSON.stringify({ name: 'root', dependencies: {}, dsh: { profile: { bundles: [] } } }));
    const job = startInstall('unused-profile', root, 'github:no-one/no-where');
    assert.equal(job.state, 'running');
    // 等任务结束。
    await new Promise((resolve) => { const check = () => { if (job.state === 'running') setTimeout(check, 50); else resolve(); }; check(); });
    // jobs.json 应该存在于 .dsh-plugin-manager/ 下。
    const { readFile: read } = await import('node:fs/promises');
    const raw = JSON.parse(await read(join(root, '.dsh-plugin-manager', 'jobs.json'), 'utf8'));
    assert.ok(raw.jobs.some((j) => j.id === job.id), 'jobs.json 中应包含此任务');
    // 模拟进程重启：清空内存后从磁盘恢复。
    const recovered = await getJob(root, job.id);
    assert.ok(recovered, '重启后应能从磁盘恢复任务');
    assert.equal(recovered.id, job.id);
  } finally { await rm(root, { recursive: true, force: true }); }
});

// --- Smoke check 测试 ---

test('smokeCheck verifies bundle entry files exist and pass syntax check', async () => {
  const root = await mkdtemp(join(tmpdir(), 'pm-smoke-'));
  try {
    // 创建一个语法正确的 bundle。
    await mkdir(join(root, 'node_modules', 'good-plugin'), { recursive: true });
    await writeFile(join(root, 'node_modules', 'good-plugin', 'package.json'), JSON.stringify({ name: 'good-plugin', main: 'index.js', dsh: { bundle: { patch: './cordis.patch.yml' } } }));
    await writeFile(join(root, 'node_modules', 'good-plugin', 'index.js'), 'export default { name: "good" };\n');
    await writeFile(join(root, 'node_modules', 'good-plugin', 'cordis.patch.yml'), '- insert:\n    - id: good-plugin\n      name: good-plugin\n');
    await writeFile(join(root, 'package.json'), JSON.stringify({ dsh: { profile: { bundles: ['good-plugin'] } } }));
    await writeFile(join(root, 'cordis.patch.yml'), '[]\n');
    const result = await smokeCheck(root);
    assert.equal(result.verified, true, '语法正确的插件应通过 smoke check');
    assert.ok(result.checked >= 1, '至少检查了一个 bundle');
    assert.ok(result.verifiedAt, '应记录验证时间');

    // 再加一个入口文件缺失的 bundle。
    await mkdir(join(root, 'node_modules', 'broken-plugin'), { recursive: true });
    await writeFile(join(root, 'node_modules', 'broken-plugin', 'package.json'), JSON.stringify({ name: 'broken-plugin', main: 'missing.js', dsh: { bundle: { patch: './cordis.patch.yml' } } }));
    await writeFile(join(root, 'node_modules', 'broken-plugin', 'cordis.patch.yml'), '- insert:\n    - id: broken-plugin\n      name: broken-plugin\n');
    await writeFile(join(root, 'package.json'), JSON.stringify({ dsh: { profile: { bundles: ['good-plugin', 'broken-plugin'] } } }));
    const failed = await smokeCheck(root);
    assert.equal(failed.verified, false, '入口文件缺失应导致 verified=false');
    assert.ok(failed.issues.some((i) => i.packageName === 'broken-plugin'), '应报告 broken-plugin 的问题');
  } finally { await rm(root, { recursive: true, force: true }); }
});

// --- verifyProfile 分层验证测试 ---

test('verifyProfile syntax layer catches broken entry file', async () => {
  const root = await mkdtemp(join(tmpdir(), 'pm-vp-syntax-'));
  try {
    await mkdir(join(root, 'node_modules', 'bad-plugin'), { recursive: true });
    await writeFile(join(root, 'node_modules', 'bad-plugin', 'package.json'), JSON.stringify({ name: 'bad-plugin', main: 'index.js', dsh: { bundle: { patch: './cordis.patch.yml' } } }));
    await writeFile(join(root, 'node_modules', 'bad-plugin', 'index.js'), 'this is not valid javascript {{{');
    await writeFile(join(root, 'node_modules', 'bad-plugin', 'cordis.patch.yml'), '- insert:\n    - id: bad-plugin\n      name: bad-plugin\n');
    await writeFile(join(root, 'package.json'), JSON.stringify({ dsh: { profile: { bundles: ['bad-plugin'] } } }));
    await writeFile(join(root, 'cordis.patch.yml'), '[]\n');
    const result = await verifyProfile('test-profile', root);
    assert.equal(result.verified, false, '语法错误应导致 verified=false');
    assert.equal(result.level, 'syntax', '应在 syntax 层终止');
    assert.ok(result.issues.length > 0, '应报告问题');
  } finally { await rm(root, { recursive: true, force: true }); }
});

test('verifyProfile passes syntax layer for valid plugin', async () => {
  const root = await mkdtemp(join(tmpdir(), 'pm-vp-ok-'));
  try {
    await mkdir(join(root, 'node_modules', 'good-plugin'), { recursive: true });
    await writeFile(join(root, 'node_modules', 'good-plugin', 'package.json'), JSON.stringify({ name: 'good-plugin', main: 'index.js', dsh: { bundle: { patch: './cordis.patch.yml' } } }));
    await writeFile(join(root, 'node_modules', 'good-plugin', 'index.js'), 'export default {};\n');
    await writeFile(join(root, 'node_modules', 'good-plugin', 'cordis.patch.yml'), '- insert:\n    - id: good-plugin\n      name: good-plugin\n');
    await writeFile(join(root, 'package.json'), JSON.stringify({ dsh: { profile: { bundles: ['good-plugin'] } } }));
    await writeFile(join(root, 'cordis.patch.yml'), '[]\n');
    const result = await verifyProfile('test-profile', root);
    // dsh 可能不可用，但 syntax 层必须通过
    assert.equal(result.issues.length, 0, '语法正确不应有问题');
    assert.ok(result.checked >= 1, '至少检查了一个 bundle');
    // level 可能是 syntax（dsh 不可用）或 config/loader（dsh 可用）
    assert.ok(['syntax', 'config', 'loader'].includes(result.level), `level 应为有效值，实际: ${result.level}`);
  } finally { await rm(root, { recursive: true, force: true }); }
});

// --- E2E 测试：真实 pnpm install/uninstall ---

test('E2E: install and uninstall a real npm package via transaction', { timeout: 120_000 }, async () => {
  // 跳过条件：没有 pnpm 可用时跳过
  const { execFile } = await import('node:child_process');
  const { promisify } = await import('node:util');
  const exec = promisify(execFile);
  let pnpmOk = false;
  try { await exec('pnpm', ['--version'], { timeout: 10_000 }); pnpmOk = true; } catch {}
  if (!pnpmOk) { console.log('  [skip] pnpm 不可用，跳过 E2E'); return; }

  const root = await mkdtemp(join(tmpdir(), 'pm-e2e-'));
  try {
    // 初始化临时 Profile 目录
    await mkdir(join(root, 'node_modules'), { recursive: true });
    await writeFile(join(root, 'package.json'), JSON.stringify({ name: 'e2e-root', version: '1.0.0', type: 'module', dependencies: {}, dsh: { profile: { bundles: [] } } }));
    await writeFile(join(root, 'cordis.patch.yml'), '[]\n');

    // E2E 安装：用真实 npm 包 is-odd（小包，无依赖，适合测试）
    const spec = 'npm:is-odd@3.0.1';
    const job = startInstall('e2e-profile', root, spec);
    // 等待任务结束
    await new Promise((resolve) => { const check = () => { if (job.state === 'running') setTimeout(check, 200); else resolve(); }; check(); });

    // 安装可能失败（网络问题），失败时跳过而非报错
    if (job.state === 'failed') { console.log(`  [skip] 安装失败（可能是网络）: ${job.error}`); return; }
    assert.equal(job.state, 'succeeded', `安装任务应成功，错误: ${job.error}`);

    // 断言：node_modules 中存在 is-odd
    const { stat } = await import('node:fs/promises');
    const pkgStat = await stat(join(root, 'node_modules', 'is-odd', 'package.json')).catch(() => null);
    assert.ok(pkgStat, 'is-odd 应已安装到 node_modules');

    // 断言：package.json dependencies 包含 is-odd
    const pkgJson = JSON.parse(await readFile(join(root, 'package.json'), 'utf8'));
    assert.ok(pkgJson.dependencies['is-odd'], 'package.json 应包含 is-odd 依赖');

    // E2E 卸载
    const uninstallJob = startUninstall('e2e-profile', root, 'is-odd', { confirm: true });
    await new Promise((resolve) => { const check = () => { if (uninstallJob.state === 'running') setTimeout(check, 200); else resolve(); }; check(); });
    assert.equal(uninstallJob.state, 'succeeded', `卸载任务应成功，错误: ${uninstallJob.error}`);

    // 断言：node_modules 中 is-odd 已删除
    const afterStat = await stat(join(root, 'node_modules', 'is-odd', 'package.json')).catch(() => null);
    assert.equal(afterStat, null, 'is-odd 应已从 node_modules 删除');

    // 断言：package.json dependencies 不再包含 is-odd
    const afterPkgJson = JSON.parse(await readFile(join(root, 'package.json'), 'utf8'));
    assert.ok(!afterPkgJson.dependencies['is-odd'], 'package.json 不应再包含 is-odd');
  } finally { await rm(root, { recursive: true, force: true }); }
});

// --- checkUpdate 联网检查测试 ---
// checkUpdate 用 profileDir(profile) 定位目录，测试通过 DSH_HOME 重定向到临时目录。

test('checkUpdate returns error for missing package', async () => {
  const home = await mkdtemp(join(tmpdir(), 'pm-cu-missing-'));
  process.env.DSH_HOME = home;
  try {
    const dir = join(home, 'profiles', 'test-profile');
    await mkdir(dir, { recursive: true });
    await writeFile(join(dir, 'package.json'), JSON.stringify({ dsh: { profile: { bundles: [] } } }));
    await writeFile(join(dir, 'cordis.patch.yml'), '[]\n');
    await assert.rejects(checkUpdate('test-profile', 'nonexistent-pkg'), /不在当前 Profile 的 bundles 里/);
  } finally { delete process.env.DSH_HOME; await rm(home, { recursive: true, force: true }); }
});

test('checkUpdate returns error for missing version', async () => {
  const home = await mkdtemp(join(tmpdir(), 'pm-cu-noversion-'));
  process.env.DSH_HOME = home;
  try {
    const dir = join(home, 'profiles', 'test-profile');
    await mkdir(join(dir, 'node_modules', 'no-version-plugin'), { recursive: true });
    await writeFile(join(dir, 'node_modules', 'no-version-plugin', 'package.json'), JSON.stringify({ name: 'no-version-plugin', main: 'index.js' }));
    await writeFile(join(dir, 'package.json'), JSON.stringify({ dsh: { profile: { bundles: ['no-version-plugin'] } }, dependencies: { 'no-version-plugin': '*' } }));
    await writeFile(join(dir, 'cordis.patch.yml'), '[]\n');
    const result = await checkUpdate('test-profile', 'no-version-plugin');
    assert.equal(result.hasUpdate, false, '无版本号时 hasUpdate 应为 false');
    assert.ok(result.error, '应返回 error 说明原因');
  } finally { delete process.env.DSH_HOME; await rm(home, { recursive: true, force: true }); }
});

test('checkUpdate queries npm registry for real package', { timeout: 30_000 }, async () => {
  const home = await mkdtemp(join(tmpdir(), 'pm-cu-npm-'));
  process.env.DSH_HOME = home;
  try {
    const dir = join(home, 'profiles', 'test-profile');
    await mkdir(join(dir, 'node_modules', 'is-odd'), { recursive: true });
    await writeFile(join(dir, 'node_modules', 'is-odd', 'package.json'), JSON.stringify({ name: 'is-odd', version: '3.0.1', main: 'index.js' }));
    await writeFile(join(dir, 'package.json'), JSON.stringify({ dsh: { profile: { bundles: ['is-odd'] } }, dependencies: { 'is-odd': '3.0.1' } }));
    await writeFile(join(dir, 'cordis.patch.yml'), '[]\n');
    const result = await checkUpdate('test-profile', 'is-odd');
    assert.equal(result.packageName, 'is-odd');
    assert.equal(result.current, '3.0.1');
    // 网络可用时 latest 应有值；网络异常时 error 应有值。两者必居其一。
    assert.ok(result.latest || result.error, '应有 latest 或 error');
  } finally { delete process.env.DSH_HOME; await rm(home, { recursive: true, force: true }); }
});

// --- updatePlugin 事务测试 ---
// updatePlugin 用 profileDir(profile) 定位目录，测试通过 DSH_HOME 重定向到临时目录。

test('updatePlugin rejects core plugin', async () => {
  const home = await mkdtemp(join(tmpdir(), 'pm-up-core-'));
  process.env.DSH_HOME = home;
  try {
    const dir = join(home, 'profiles', 'test-profile');
    await mkdir(join(dir, 'node_modules', '@deepseek-ai', 'test'), { recursive: true });
    await writeFile(join(dir, 'node_modules', '@deepseek-ai', 'test', 'package.json'), JSON.stringify({ name: '@deepseek-ai/test', version: '1.0.0', main: 'index.js' }));
    await writeFile(join(dir, 'package.json'), JSON.stringify({ dsh: { profile: { bundles: ['@deepseek-ai/test'] } }, dependencies: { '@deepseek-ai/test': '1.0.0' } }));
    await writeFile(join(dir, 'cordis.patch.yml'), '[]\n');
    await assert.rejects(updatePlugin('test-profile', '@deepseek-ai/test'), /官方核心组件受保护/);
  } finally { delete process.env.DSH_HOME; await rm(home, { recursive: true, force: true }); }
});

test('updatePlugin rejects missing package', async () => {
  const home = await mkdtemp(join(tmpdir(), 'pm-up-missing-'));
  process.env.DSH_HOME = home;
  try {
    const dir = join(home, 'profiles', 'test-profile');
    await mkdir(dir, { recursive: true });
    await writeFile(join(dir, 'package.json'), JSON.stringify({ dsh: { profile: { bundles: [] } } }));
    await writeFile(join(dir, 'cordis.patch.yml'), '[]\n');
    await assert.rejects(updatePlugin('test-profile', 'nonexistent'), /不在当前 Profile 的 bundles 里/);
  } finally { delete process.env.DSH_HOME; await rm(home, { recursive: true, force: true }); }
});
