import { cp, mkdir, readFile, readdir, writeFile } from 'node:fs/promises';
import { execFile, spawn } from 'node:child_process';
import { basename, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { promisify } from 'node:util';
import { isMap, isScalar, isSeq, parseDocument } from 'yaml';

const exec = promisify(execFile);
export const name = 'dsh-plugin-manager';
export const inject = [];
export const managerPackageName = '@dsh/plugin-manager';

const isCore = (entry) => entry.source === 'official' || (entry.services.provides ?? []).some((x) => ['agentLoop', 'sandbox', 'approval'].includes(x));
const authorName = (author) => typeof author === 'string' ? author.replace(/\s*<.*$/, '').trim() : author?.name?.trim();
const githubRepo = (repository) => {
  const value = typeof repository === 'string' ? repository : repository?.url;
  const match = typeof value === 'string' ? value.match(/github\.com[/:]([^/]+\/[^/#]+?)(?:\.git)?(?:[#?].*)?$/i) : undefined;
  return match?.[1];
};
function githubRepoFromSpecifier(specifier) {
  const match = typeof specifier === 'string' ? specifier.match(/^github:([^#]+?)(?:#.*)?$/i) : undefined;
  return match?.[1];
}
function provenanceOf(packageName, pkg, dependencySpecifier) {
  if (packageName.startsWith('@deepseek-ai/')) return { source: 'official', sourceLabel: 'DeepSeek 官方' };
  if (packageName === managerPackageName) return { source: 'local', sourceLabel: '本地自建' };
  const author = authorName(pkg?.author);
  if (author) return { source: 'author', sourceLabel: `作者：${author}` };
  const repository = githubRepo(pkg?.repository);
  if (repository) return { source: 'author', sourceLabel: `GitHub：${repository}` };
  const installedFrom = githubRepoFromSpecifier(dependencySpecifier);
  if (installedFrom) return { source: 'author', sourceLabel: `GitHub：${installedFrom}` };
  return { source: 'author', sourceLabel: '第三方（未署名）' };
}
function categoryOf(packageName, pkg, market) {
  if (packageName === managerPackageName) return '管理工具';
  if (packageName.startsWith('@deepseek-ai/')) return 'DeepSeek 官方';
  if (market.category || market.architectureRole && market.architectureRole !== 'unknown') return market.category ?? market.architectureRole;
  const description = `${packageName} ${pkg?.description ?? ''}`.toLowerCase();
  if (/import|conversation|session|chat/.test(description)) return '会话与迁移';
  if (/compact|compression|context|token/.test(description)) return '上下文管理';
  if (/find|search|plugin/.test(description)) return '插件发现';
  if (/vision|image|ocr|multimodal/.test(description)) return '视觉与多模态';
  return '其他';
}
function profileDir(profile) {
  if (!/^[A-Za-z0-9_-]+$/.test(profile)) throw new Error('Profile 名称只能包含字母、数字、下划线和连字符。');
  const home = process.env.DSH_HOME || join(process.env.USERPROFILE || process.cwd(), '.dsh');
  return join(home, 'profiles', profile);
}
function profileFromContext(ctx) {
  const anchor = ctx.baseUrl ? fileURLToPath(ctx.baseUrl) : '';
  const profile = anchor ? basename(resolve(anchor)) : 'web';
  if (!/^[A-Za-z0-9_-]+$/.test(profile)) throw new Error('无法识别当前 Profile。');
  return profile;
}
function moduleDir(dir, name) { return join(dir, 'node_modules', ...name.split('/')); }
async function json(file, fallback) { try { return JSON.parse(await readFile(file, 'utf8')); } catch { return fallback; } }

// Patch 必须按 YAML 结构读取。流样式 `[ { id: foo, disabled: true } ]` 里的 id 后面跟着逗号，
// 块状样式里的 id 后面跟着换行，正则无法同时正确处理两者，因此统一走 AST。
function walk(node, visit) {
  if (isMap(node)) { visit(node); for (const pair of node.items ?? []) { walk(pair.key, visit); walk(pair.value, visit); } }
  else if (isSeq(node)) { for (const item of node.items ?? []) walk(item, visit); }
}
function mapId(map) {
  const pair = (map.items ?? []).find((item) => item.key?.value === 'id' || item.key === 'id');
  const value = pair?.value;
  if (isScalar(value)) return typeof value.value === 'string' ? value.value : String(value.value ?? '');
  return typeof value === 'string' ? value : undefined;
}
const isDisabledFlag = (value) => value === true || (isScalar(value) && value.value === true);
function patchDocument(text) { const doc = parseDocument(text ?? ''); return doc.errors.length ? undefined : doc; }
function declaredIds(text) {
  const doc = patchDocument(text); if (!doc) return [];
  const ids = new Set();
  walk(doc.contents, (map) => { const id = mapId(map); if (id) ids.add(id); });
  return [...ids];
}
function disabledIds(text) {
  const doc = patchDocument(text); if (!doc) return [];
  const ids = new Set();
  walk(doc.contents, (map) => { const id = mapId(map); if (id && isDisabledFlag(map.get('disabled'))) ids.add(id); });
  return [...ids];
}

async function entriesFor(dir) {
  const profile = await json(join(dir, 'package.json'), {});
  const patch = await readFile(join(dir, 'cordis.patch.yml'), 'utf8').catch(() => '');
  const disabled = new Set(disabledIds(patch));
  // 已装插件的类别优先继承发现市场候选的类别（市场快照有人工归类，而插件的 dsh-market.json
  // 经常缺失，导致装完后类别从「主题」退化成「未声明类别」）。按归一化 spec join。
  const storedMarket = await readMarket(dir);
  const marketCategoryBySpec = new Map();
  for (const candidate of storedMarket.entries) if (candidate.spec) marketCategoryBySpec.set(normalizeSpec(candidate.spec), candidate.category);
  const entries = [];
  for (const packageName of profile.dsh?.profile?.bundles ?? []) {
    const root = moduleDir(dir, packageName); const pkg = await json(join(root, 'package.json'), undefined); const market = await json(join(root, 'dsh-market.json'), {});
    const bundlePatch = pkg?.dsh?.bundle?.patch ? await readFile(join(root, pkg.dsh.bundle.patch), 'utf8').catch(() => '') : '';
    const ids = declaredIds(bundlePatch);
    const ownDisabled = ids.length ? ids.filter((id) => disabled.has(id)) : disabled.has(packageName) ? [packageName] : [];
    const enabled = ids.length ? ownDisabled.length < ids.length : !disabled.has(packageName);
    const provenance = provenanceOf(packageName, pkg, profile.dependencies?.[packageName]);
    const specifier = profile.dependencies?.[packageName] ?? null;
    const inheritedCategory = specifier ? marketCategoryBySpec.get(normalizeSpec(specifier)) : undefined;
    entries.push({ packageName, specifier, version: pkg?.version, description: pkg?.description ?? '作者未提供插件介绍。', homepage: pkg?.homepage, repository: githubRepo(pkg?.repository), ...provenance, category: inheritedCategory || categoryOf(packageName, pkg, market), installed: Boolean(pkg) || provenance.source === 'official', enabled, protected: provenance.source === 'official' || packageName === managerPackageName, entryIds: ids, disabledIds: ownDisabled, services: market.services ?? {}, resources: market.resources ?? {}, declaredConflicts: market.conflicts ?? [], dshDependencies: market.dependencies ?? [], engines: pkg?.engines ?? {} });
  }
  return entries;
}

// engines.node 的 >=X 模式是最常见的；复杂 semver 范围不做完整解析，避免引入 semver 依赖。
// 不认识的模式一律放行（不误报），只对 >=X.Y.Z 做精确比较。
function satisfiesNodeVersion(current, required) {
  const m = String(required).match(/^>=\s*(\d+)(?:\.(\d+))?(?:\.(\d+))?$/);
  if (!m) return true;
  const cur = String(current).replace(/^v/, '').split('.').map(Number);
  if (cur[0] !== Number(m[1])) return cur[0] > Number(m[1]);
  if (m[2] && cur[1] < Number(m[2])) return false;
  if (m[3] && cur[2] < Number(m[3])) return false;
  return true;
}

export async function inspectProfile(dir) {
  const entries = await entriesFor(dir); const pinned = new Set(await readPins(dir));
  for (const entry of entries) entry.pinned = pinned.has(entry.packageName);
  const conflicts = [];
  // 两两检测：显式冲突、重复 Service、路由、命令、端口、重复插件 ID。
  for (let i = 0; i < entries.length; i += 1) for (let j = i + 1; j < entries.length; j += 1) {
    const left = entries[i], right = entries[j];
    const add = (kind, evidence, severity = 'high') => conflicts.push({ kind, left: left.packageName, right: right.packageName, evidence, severity, canAutoDisable: false, recommendation: '保留当前状态并要求用户确认；核心组件不会自动关闭。' });
    if (left.declaredConflicts.includes(right.packageName) || right.declaredConflicts.includes(left.packageName)) add('explicit', '作者声明冲突');
    for (const service of left.services.provides ?? []) if ((right.services.provides ?? []).includes(service)) add('service', `重复 Provider: ${service}`, 'critical');
    for (const route of left.resources.routes ?? []) if ((right.resources.routes ?? []).includes(route)) add('route', `重复路由: ${route}`);
    for (const command of left.resources.commands ?? []) if ((right.resources.commands ?? []).includes(command)) add('command', `重复命令: ${command}`);
    for (const port of left.resources.ports ?? []) if ((right.resources.ports ?? []).includes(port)) add('port', `重复端口: ${port}`, 'critical');
    for (const id of left.entryIds ?? []) if ((right.entryIds ?? []).includes(id)) add('duplicate-id', `重复插件 ID: ${id}`, 'critical');
  }
  // 全局检测：缺失依赖、Node 版本不兼容。这两类不是两两关系，独立追加。
  const bundleNames = new Set(entries.map((entry) => entry.packageName));
  const nodeVersion = process.version;
  for (const entry of entries) {
    for (const dep of entry.dshDependencies ?? []) {
      if (!bundleNames.has(dep)) conflicts.push({ kind: 'missing-dependency', left: entry.packageName, right: dep, evidence: `缺少 DSH 依赖: ${dep}`, severity: 'high', canAutoDisable: false, recommendation: '安装缺失的依赖插件，或禁用此插件。' });
    }
    const requiredNode = entry.engines?.node;
    if (requiredNode && !satisfiesNodeVersion(nodeVersion, requiredNode)) {
      conflicts.push({ kind: 'version', left: entry.packageName, right: 'node', evidence: `Node 版本不兼容: 需要 ${requiredNode}, 当前 ${nodeVersion}`, severity: 'high', canAutoDisable: false, recommendation: '升级 Node 运行时或禁用此插件。' });
    }
  }
  return { profileDir: dir, generatedAt: new Date().toISOString(), entries, conflicts };
}

export async function planToggle(dir, packageName, enabled, { autoDisableLowRisk = false } = {}) {
  if (packageName === managerPackageName && !enabled) return { ok: false, error: '插件管理器受保护，不能由自身禁用。请先安装并启用其他管理工具后再移除它。', conflicts: [], automaticActions: [] };
  const inventory = await inspectProfile(dir); const target = inventory.entries.find((x) => x.packageName === packageName);
  if (!target?.installed) return { ok: false, error: '插件未安装。', inventory, conflicts: [], automaticActions: [] };
  if (!enabled && isCore(target)) return { ok: false, error: '官方核心组件受保护，不能在插件管理器中禁用。', inventory, conflicts: [], automaticActions: [] };
  if (!enabled && target.pinned) return { ok: false, code: 'PINNED', error: `${packageName} 已置顶，取消置顶后才能禁用或卸载。`, inventory, conflicts: [], automaticActions: [] };
  const conflicts = enabled ? inventory.conflicts.filter((x) => x.left === packageName || x.right === packageName) : [];
  const counterpart = (conflict) => conflict.left === packageName ? conflict.right : conflict.left;
  const automaticActions = autoDisableLowRisk ? conflicts.filter((x) => x.kind === 'explicit').map((x) => inventory.entries.find((e) => e.packageName === counterpart(x))).filter((x) => x && !isCore(x)).map((x) => ({ action: 'disable', packageName: x.packageName, reason: '低风险显式冲突' })) : [];
  return { ok: true, target: packageName, action: enabled ? 'enable' : 'disable', conflicts, automaticActions, requiresConfirmation: conflicts.length > automaticActions.length, inventory };
}

// 只删掉 disabled 标记：整条 `{ id, disabled }` 是我们写的，可以直接移除；
// 用户手写过 config 等其他字段时保留其余内容，避免误删配置。
function setDisabled(items, id, disabled, doc) {
  const kept = [];
  for (const item of items) {
    if (!isMap(item) || mapId(item) !== id || !isDisabledFlag(item.get('disabled'))) { kept.push(item); continue; }
    const keys = (item.items ?? []).map((pair) => pair.key?.value ?? pair.key).filter((key) => key !== 'disabled');
    if (keys.length > 1) { item.delete('disabled'); kept.push(item); }
  }
  if (disabled) { const node = doc.createNode({ id, disabled: true }); if (isMap(node)) node.flow = false; kept.push(node); }
  return kept;
}

async function dump(profile, dir) { await exec(process.platform === 'win32' ? 'dsh.cmd' : 'dsh', ['--profile', profile, '--dump-config'], { cwd: dir, timeout: 30_000, shell: process.platform === 'win32' }); }
// 分层验证：verified 状态的证据基础。三层逐级加深，任一层失败即终止并返回问题。
//   level 'syntax' : node --check 校验入口文件语法（最轻量，不需要 dsh）
//   level 'config' : dsh --dump-config 验证配置树合法（需要 dsh 在 PATH）
//   level 'loader' : 真实 Loader 启动，等待 ready 信号或超时崩溃检测（完整 verified 证据）
// dsh 不可用时降级到 syntax 层，但 verificationLevel 会如实标注。
// 失败不回滚：插件仍处于 enabled，但 issues 会提示用户。
export async function verifyProfile(profile, dir) {
  const inventory = await inspectProfile(dir);
  const issues = [];
  let checked = 0;
  let level = 'syntax';
  // 第一层：入口文件存在 + node --check 语法校验
  for (const entry of inventory.entries) {
    if (!entry.enabled || !entry.installed) continue;
    const pkgPath = join(dir, 'node_modules', entry.packageName, 'package.json');
    const pkg = await json(pkgPath, null);
    const mainFile = pkg?.main ?? 'index.js';
    const mainPath = join(dir, 'node_modules', entry.packageName, mainFile);
    try { await readFile(mainPath, 'utf8'); await exec('node', ['--check', mainPath], { timeout: 10_000 }); checked += 1; }
    catch (error) { issues.push({ packageName: entry.packageName, file: mainFile, level: 'syntax', error: (error.stderr ?? error.message ?? String(error)).slice(0, 200) }); }
  }
  if (issues.length > 0) return { verified: false, level, checked, issues, verifiedAt: null };
  // 第二层：dump-config 验证配置树合法。dsh 不可用时降级到 syntax 层，不报 issue。
  try { await dump(profile, dir); level = 'config'; }
  catch (error) { return { verified: false, level, checked, issues, verifiedAt: null, degraded: 'dsh 不可用，仅完成 syntax 层验证' }; }
  // 第三层：真实 Loader 启动验证。启动 dsh 进程，等待 ready 信号或超时崩溃。
  level = await loaderSmokeTest(profile, dir) ? 'loader' : level;
  return { verified: level === 'loader', level, checked, issues, verifiedAt: level === 'loader' ? new Date().toISOString() : null };
}
// 兼容旧调用方：smokeCheck 保留为 verifyProfile 的语法层子集。
export async function smokeCheck(dir) {
  const inventory = await inspectProfile(dir);
  const issues = [];
  let checked = 0;
  for (const entry of inventory.entries) {
    if (!entry.enabled || !entry.installed) continue;
    const pkgPath = join(dir, 'node_modules', entry.packageName, 'package.json');
    const pkg = await json(pkgPath, null);
    const mainFile = pkg?.main ?? 'index.js';
    const mainPath = join(dir, 'node_modules', entry.packageName, mainFile);
    try { await readFile(mainPath, 'utf8'); await exec('node', ['--check', mainPath], { timeout: 10_000 }); checked += 1; }
    catch (error) { issues.push({ packageName: entry.packageName, file: mainFile, error: (error.stderr ?? error.message ?? String(error)).slice(0, 200) }); }
  }
  return { verified: issues.length === 0, checked, issues, verifiedAt: issues.length === 0 ? new Date().toISOString() : null };
}
// Loader 启动验证：启动 dsh 进程，等待 ready 信号或检测崩溃退出。
// 返回 true 表示 Loader 成功启动（verified）；false 表示 dsh 不可用或启动失败。
async function loaderSmokeTest(profile, dir) {
  const bin = process.platform === 'win32' ? 'dsh.cmd' : 'dsh';
  return new Promise((resolve) => {
    let settled = false;
    const done = (result) => { if (!settled) { settled = true; try { child.kill('SIGTERM'); } catch {} resolve(result); } };
    let child;
    try {
      child = spawn(bin, ['--profile', profile], { cwd: dir, shell: process.platform === 'win32', stdio: ['pipe', 'pipe', 'pipe'] });
    } catch { resolve(false); return; }
    const timer = setTimeout(() => done(false), 15_000);
    let stderrBuf = '';
    child.stderr?.on('data', (chunk) => {
      stderrBuf += chunk.toString();
      // ready 信号：dsh 启动成功后输出 "ready" / "harness ready" / "listening"
      if (/ready|listening|harness\s+(ready|started)/i.test(stderrBuf)) { clearTimeout(timer); done(true); }
    });
    child.on('exit', (code) => { clearTimeout(timer); done(code === 0); });
    child.on('error', () => { clearTimeout(timer); done(false); });
  });
}
export function updatePatch(before, changes) {
  const doc = parseDocument(before);
  if (doc.errors.length) throw new Error('Profile Patch 格式无效。');
  if (!isSeq(doc.contents)) {
    // 只有注释的文件解析后 contents 为 null，此时补一个空数组即可，注释由 doc 自己保留。
    if (doc.contents != null) throw new Error('Profile Patch 根节点必须是数组。');
    doc.contents = doc.createNode([]);
  }
  doc.contents.flow = false;
  let items = [...doc.contents.items];
  for (const change of changes) for (const id of change.ids) items = setDisabled(items, id, change.disabled, doc);
  doc.contents.items = items;
  return String(doc);
}
export async function applyToggle(profile, packageName, enabled, options = {}) {
  const dir = profileDir(profile); const plan = await planToggle(dir, packageName, enabled, options);
  if (!plan.ok) throw new Error(plan.error);
  if (plan.requiresConfirmation && !options.acceptConflicts) throw new Error('存在冲突，必须显式确认。');
  const patchPath = join(dir, 'cordis.patch.yml'), snapshotDir = join(dir, '.dsh-plugin-manager', 'snapshots', `snapshot-${Date.now()}`), before = await readFile(patchPath, 'utf8');
  await mkdir(snapshotDir, { recursive: true }); await cp(patchPath, join(snapshotDir, 'cordis.patch.yml'));
  const changes = [...plan.automaticActions, { action: enabled ? 'enable' : 'disable', packageName }].map((request) => {
    const entry = plan.inventory.entries.find((x) => x.packageName === request.packageName);
    return { ids: entry?.entryIds.length ? entry.entryIds : [request.packageName], disabled: request.action === 'disable' };
  });
  await writeFile(patchPath, updatePatch(before, changes), 'utf8');
  try { await dump(profile, dir); } catch (error) { await writeFile(patchPath, before, 'utf8'); throw new Error(`配置校验失败，已回滚：${error.stderr ?? error}`); }
  const verification = await verifyProfile(profile, dir).catch(() => ({ verified: false, level: 'syntax', checked: 0, issues: [], error: '验证执行异常' }));
  const inventory = await inspectProfile(dir);
  return { ok: true, plan, snapshotDir, entry: inventory.entries.find((x) => x.packageName === packageName), restartRequired: true, verification };
}

// ---------------------------------------------------------------------------
// 发现市场：只登记候选，不下载。已装状态在读取时与 inventory 按 spec 归一化后 join。
// ---------------------------------------------------------------------------
const marketVersion = 1;
const marketPath = (dir) => join(dir, '.dsh-plugin-manager', 'market.json');
const findPluginDir = (dir) => moduleDir(dir, 'dsh-find-plugin');

// github:owner/repo、https://github.com/owner/repo、带 .git 或 #ref 的写法都归一到 github:owner/repo。
export function normalizeSpec(spec) {
  const value = String(spec ?? '').trim();
  const shorthand = value.match(/^github:([^#]+?)(?:\.git)?(?:#.*)?$/i);
  if (shorthand) return `github:${shorthand[1].toLowerCase()}`;
  const url = value.match(/^https?:\/\/github\.com\/([^/]+\/[^/#]+?)(?:\.git)?(?:[#?].*)?$/i);
  if (url) return `github:${url[1].toLowerCase()}`;
  return value.toLowerCase();
}
function specFromInstallCommand(command) { return String(command ?? '').match(/\badd\s+(\S+)/)?.[1]; }
const specRepo = (spec) => normalizeSpec(spec).match(/^github:(.+)$/)?.[1];
const isInstallableSpec = (spec) => Boolean(specRepo(spec));
function descriptionText(description) {
  if (typeof description === 'string') return description;
  return description?.zh ?? description?.en ?? '';
}

// 置顶：持久化在 pins.json，与 market.json 并列。置顶项只能先取消置顶再禁用/卸载。
const pinsPath = (dir) => join(dir, '.dsh-plugin-manager', 'pins.json');
async function readPins(dir) {
  const stored = await json(pinsPath(dir), {});
  return Array.isArray(stored.pinned) ? stored.pinned : [];
}
export async function setPinned(dir, packageName, pinned) {
  const current = await readPins(dir);
  const next = pinned ? [...new Set([...current, packageName])] : current.filter((name) => name !== packageName);
  await mkdir(join(dir, '.dsh-plugin-manager'), { recursive: true });
  await writeFile(pinsPath(dir), `${JSON.stringify({ version: 1, pinned: next, updatedAt: new Date().toISOString() }, null, 2)}\n`, 'utf8');
  return next;
}

async function readMarket(dir) {
  const stored = await json(marketPath(dir), {});
  return { version: marketVersion, updatedAt: stored.updatedAt ?? null, entries: Array.isArray(stored.entries) ? stored.entries : [] };
}
async function writeMarket(dir, market) {
  await mkdir(join(dir, '.dsh-plugin-manager'), { recursive: true });
  await writeFile(marketPath(dir), `${JSON.stringify({ ...market, version: marketVersion, updatedAt: new Date().toISOString() }, null, 2)}\n`, 'utf8');
}

export async function findPluginSnapshot(dir) {
  const data = await json(join(findPluginDir(dir), 'data', 'registry-snapshot.json'), undefined);
  if (!Array.isArray(data?.plugins)) return undefined;
  return { name: data.name ?? 'dsh-find-plugin registry snapshot', count: data.plugins.length, updated: data.updated ?? null, source: data.source ?? null, plugins: data.plugins };
}

export async function importSnapshot(dir, { replace = false } = {}) {
  const snapshot = await findPluginSnapshot(dir);
  if (!snapshot) throw new Error('未找到 dsh-find-plugin 的 registry-snapshot.json，请先安装 dsh-find-plugin。');
  const market = await readMarket(dir);
  const merged = new Map(replace ? [] : market.entries.map((entry) => [normalizeSpec(entry.spec), entry]));
  for (const raw of snapshot.plugins) {
    const spec = specFromInstallCommand(raw.install) ?? (raw.owner && raw.name ? `github:${raw.owner}/${raw.name}` : undefined);
    if (!spec) continue;
    const key = normalizeSpec(spec), previous = merged.get(key);
    merged.set(key, { key, spec, repoName: raw.name ?? key.split('/').pop(), owner: raw.owner ?? '', url: raw.url ?? `https://github.com/${raw.owner}/${raw.name}`, category: raw.category ?? '未分类', description: descriptionText(raw.description), source: 'find-plugin-snapshot', listedAt: raw.added ?? null, installCommand: raw.install ?? `dsh plugin add ${spec}`, addedAt: previous?.addedAt ?? new Date().toISOString(), note: previous?.note ?? '' });
  }
  const entries = [...merged.values()];
  await writeMarket(dir, { entries });
  return { ok: true, imported: snapshot.plugins.length, total: entries.length, snapshot: { name: snapshot.name, count: snapshot.count, updated: snapshot.updated } };
}

// 手动录入：允许只给包名（无法一键安装，只作备忘），也允许给完整 github:owner/repo。
export async function addMarketEntry(dir, { spec, note = '', description = '', category = '' } = {}) {
  const raw = String(spec ?? '').trim();
  if (!raw) throw new Error('请填写 github:owner/repo 或包名。');
  const repo = specRepo(raw);
  const key = repo ? normalizeSpec(raw) : `local:${raw.toLowerCase()}`;
  const market = await readMarket(dir);
  if (market.entries.some((entry) => normalizeSpec(entry.spec) === key)) throw new Error('市场里已经有这个候选了。');
  const name = repo ? repo.split('/').pop() : raw.split('/').pop();
  const entry = { key, spec: repo ? raw : '', repoName: name, owner: repo?.split('/')[0] ?? '', url: repo ? `https://github.com/${repo}` : '', category: category || '未分类', description: description || '手动录入，快照未提供介绍。', source: 'manual', listedAt: null, installCommand: repo ? `dsh plugin add ${raw}` : '未声明安装源，需手动确认包名后再安装', addedAt: new Date().toISOString(), note };
  await writeMarket(dir, { entries: [...market.entries, entry] });
  return { ok: true, entry: { ...entry, installable: isInstallableSpec(entry.spec) }, total: market.entries.length + 1 };
}

// 卸载回流：不在市场里的插件卸载后补一条候选，免得「装过一次就再也找不回来」。
async function returnToMarket(dir, { packageName, spec, target }) {
  const repo = specRepo(spec) ?? githubRepo(target?.repository);
  const key = repo ? normalizeSpec(spec) : `local:${packageName.toLowerCase()}`;
  const market = await readMarket(dir);
  if (market.entries.some((entry) => normalizeSpec(entry.spec) === key)) return { returned: false, reason: '市场里已有该候选，无需重复登记。' };
  const entry = { key, spec: repo ? spec : '', repoName: packageName.split('/').pop(), owner: repo?.split('/')[0] ?? '', url: repo ? `https://github.com/${repo}` : (target?.homepage ?? ''), category: target?.category ?? '未分类', description: target?.description ?? '', source: 'uninstalled', listedAt: null, installCommand: repo ? `dsh plugin add ${spec}` : '未声明安装源', addedAt: new Date().toISOString(), note: `${new Date().toISOString().slice(0, 10)} 从本 Profile 卸载，原包名 ${packageName}` };
  await writeMarket(dir, { entries: [...market.entries, entry] });
  return { returned: true, entry };
}

export async function removeMarketEntry(dir, spec) {
  const market = await readMarket(dir), key = normalizeSpec(spec);
  // 没有安装源的手动条目 spec 为空，只能靠 key 命中，所以两条路都要比。
  const entries = market.entries.filter((entry) => normalizeSpec(entry.spec) !== key && entry.key !== key && entry.key !== spec);
  if (entries.length === market.entries.length) throw new Error('市场里没有这个候选。');
  await writeMarket(dir, { entries });
  return { ok: true, total: entries.length };
}

export async function inspectMarket(dir) {
  const [market, inventory, snapshot] = await Promise.all([readMarket(dir), inspectProfile(dir), findPluginSnapshot(dir)]);
  const installedBySpec = new Map();
  for (const entry of inventory.entries) if (entry.specifier) installedBySpec.set(normalizeSpec(entry.specifier), entry);
  const entries = market.entries.map((candidate) => {
    const installed = installedBySpec.get(normalizeSpec(candidate.spec));
    // 候选名 vs spec 实际指向的仓库：内置清单常有错配（候选名 a，但 install 指向仓库 b），
    // 在这里打标，前端把不一致的标出来，避免用户装下来一头雾水。
    const expectedRepo = specRepo(candidate.spec);
    const actualRepo = candidate.owner && candidate.repoName ? `${candidate.owner}/${candidate.repoName}`.toLowerCase() : '';
    const inconsistent = Boolean(expectedRepo) && Boolean(actualRepo) && expectedRepo.toLowerCase() !== actualRepo;
    return { ...candidate, installable: isInstallableSpec(candidate.spec), installed: Boolean(installed), bundled: Boolean(installed), packageName: installed?.packageName ?? null, enabled: installed ? installed.enabled : false, protected: Boolean(installed?.protected), inconsistent };
  });
  return { profileDir: dir, generatedAt: new Date().toISOString(), updatedAt: market.updatedAt, entries, importable: snapshot ? { available: true, name: snapshot.name, count: snapshot.count, updated: snapshot.updated, source: snapshot.source } : { available: false } };
}

// ---------------------------------------------------------------------------
// 安装事务：pnpm 可能只在 corepack 缓存里，逐级回退，别让 PATH 缺失变成静默失败。
// ---------------------------------------------------------------------------
export async function detectPnpm() {
  const localAppData = process.env.LOCALAPPDATA || join(process.env.USERPROFILE ?? '', 'AppData', 'Local');
  const cacheRoot = join(localAppData, 'node', 'corepack', 'v1', 'pnpm');
  const cached = await readdir(cacheRoot).catch(() => []);
  const versions = cached.filter((entry) => /^\d+\.\d+\.\d+$/.test(entry)).sort((a, b) => a.localeCompare(b, undefined, { numeric: true })).reverse();
  const candidates = [{ label: 'pnpm', command: process.platform === 'win32' ? 'pnpm.cmd' : 'pnpm', prefix: [] },
    { label: 'corepack pnpm', command: process.platform === 'win32' ? 'corepack.cmd' : 'corepack', prefix: ['pnpm'] },
    ...versions.map((version) => ({ label: `corepack 缓存中的 pnpm ${version}`, command: process.execPath, prefix: [join(cacheRoot, version, 'bin', 'pnpm.cjs')] }))];
  for (const candidate of candidates) {
    try { const { stdout } = await exec(candidate.command, [...candidate.prefix, '--version'], { timeout: 30_000, shell: process.platform === 'win32' }); const version = String(stdout).trim().split(/\s+/).pop(); if (/^\d+\.\d+\.\d+/.test(version ?? '')) return { ...candidate, version }; } catch { /* 继续找下一个候选 */ }
  }
  throw new Error('本机找不到可用的 pnpm。请先执行 `corepack enable` 或 `npm i -g pnpm` 后重试。');
}
// pnpm 输出流式透传：安装动辄几十秒到几分钟，用户需要看到实时的 resolved/reused/downloaded 进度。
// spawn 收集全部 stdout/stderr（兼容 exec 时代的返回值），同时把每个非空行回调给 onOutput。
function runPnpm(pnpm, args, cwd, { onOutput } = {}) {
  return new Promise((resolvePromise, reject) => {
    const child = spawn(pnpm.command, [...pnpm.prefix, ...args], { cwd, shell: process.platform === 'win32' });
    let stdout = '', stderr = '';
    const feed = (chunk, bucket) => {
      const text = chunk.toString();
      if (bucket === 'stdout') stdout += text; else stderr += text;
      // pnpm 的 Progress 行用 \r 覆盖同一行，拆分时两种换行都要处理。
      for (const line of text.split(/[\r\n]+/).map((l) => l.trim()).filter(Boolean)) {
        if (line.startsWith('Progress:')) onOutput?.(line.replace(/^Progress:\s*/, ''));
        else onOutput?.(line);
      }
    };
    child.stdout.on('data', (chunk) => feed(chunk, 'stdout'));
    child.stderr.on('data', (chunk) => feed(chunk, 'stderr'));
    const timer = setTimeout(() => { child.kill(); reject(new Error('pnpm 执行超过 10 分钟，已中止。请检查网络后重试。')); }, 600_000);
    child.on('error', (error) => { clearTimeout(timer); reject(error); });
    child.on('close', (code) => {
      clearTimeout(timer);
      if (code === 0) resolvePromise({ stdout, stderr });
      else reject(Object.assign(new Error(`pnpm 退出码 ${code}`), { stdout, stderr }));
    });
  });
}
// pnpm 失败时 stderr 常常是空字符串，`??` 遇到空串不会回退到 message，所以自己挑第一个非空文案。
function errorDetail(error) {
  const candidates = [error?.stderr, error?.message, typeof error === 'string' ? error : ''];
  const text = candidates.map((value) => (typeof value === 'string' ? value.trim() : '')).find(Boolean);
  return (text || String(error ?? '').trim() || '未知错误').slice(-600);
}
async function bundlePatchIds(dir, packageName) {
  const pkg = await json(join(moduleDir(dir, packageName), 'package.json'), undefined);
  const relative = pkg?.dsh?.bundle?.patch;
  if (!relative) return [];
  return declaredIds(await readFile(join(moduleDir(dir, packageName), relative), 'utf8').catch(() => ''));
}

// 写入 bundles 前的合法性校验：monorepo 合集仓库的根包没有 dsh.bundle.patch 声明，
// pnpm 能装上但 dsh-app-boot 加载时会崩（loadProfile 对无 bundle 结构的包取 map）。
// 在这里拦截比写 bundles 后让 dump-config 爆炸更干净，错误信息也能给出可操作指引。
export async function assertInstallableBundle(dir, packageName, spec) {
  const pkg = await json(join(moduleDir(dir, packageName), 'package.json'), undefined);
  if (!pkg?.dsh?.bundle?.patch) {
    const repo = specRepo(spec);
    const repoUrl = repo ? `https://github.com/${repo}` : '';
    const lines = [
      `${packageName} 不是合法的 DSH 插件包：package.json 缺少 dsh.bundle.patch 声明。`,
    ];
    if (spec) lines.push(`你请求的安装源：${spec}${repoUrl ? `（${repoUrl}）` : ''}`);
    lines.push('可能的原因：');
    lines.push('  ① 该仓库是一个合集（monorepo）/ 主题/文档仓库，根目录不作为插件；请去 GitHub 找真正的子包（多在 packages/、skins/ 等子目录里）');
    lines.push('  ② 内置候选清单数据有错配：候选名与 install 实际指向的仓库不一致（pnpm 装下来是个完全不同的包）');
    lines.push('  ③ 仓库不存在或没发布 package.json');
    lines.push('建议：用「手动添加」直接录入你想要的 GitHub owner/repo，或让 AI 调 POST /dsh-plugin-manager/market/add?spec=github:owner/repo 精准登记。');
    throw new Error(lines.join('\n'));
  }
  return pkg;
}

// 探测 monorepo 合集仓库里的合法插件子包：GitHub API 列树 → 逐个 raw package.json 验证 dsh.bundle.patch。
// 结果按调用缓存 30 分钟，避免同一仓库反复探测烧 API 限额。
const subdirCache = new Map();
export async function findBundleSubdirs(ownerRepo) {
  const cached = subdirCache.get(ownerRepo);
  if (cached && Date.now() - cached.at < 30 * 60_000) return cached.paths;
  const headers = { 'User-Agent': 'dsh-plugin-manager', Accept: 'application/vnd.github+json' };
  const tree = await fetch(`https://api.github.com/repos/${ownerRepo}/git/trees/HEAD?recursive=1`, { headers }).then((r) => r.ok ? r.json() : null).catch(() => null);
  const pkgPaths = (tree?.tree ?? []).filter((t) => t.type === 'blob' && t.path.endsWith('/package.json') && !t.path.includes('node_modules/')).slice(0, 20);
  const good = [];
  for (const entry of pkgPaths) {
    const pkg = await fetch(`https://raw.githubusercontent.com/${ownerRepo}/HEAD/${entry.path}`, { headers: { 'User-Agent': 'dsh-plugin-manager' } }).then((r) => r.ok ? r.json() : null).catch(() => null);
    if (pkg?.dsh?.bundle?.patch) good.push(entry.path.replace(/\/package\.json$/, ''));
  }
  subdirCache.set(ownerRepo, { at: Date.now(), paths: good });
  return good;
}

export async function installPlugin(profile, spec, { onStep } = {}) {
  const dir = profileDir(profile), key = normalizeSpec(spec);
  if (!/^github:[^/]+\/[^/]+$/.test(key)) throw new Error(`暂不支持的安装源：${spec}。目前只支持 github:owner/repo。`);
  const pnpm = await detectPnpm();
  onStep?.({ label: `解析包管理器（${pnpm.label} ${pnpm.version}）` });
  const packagePath = join(dir, 'package.json'), lockPath = join(dir, 'pnpm-lock.yaml'), patchPath = join(dir, 'cordis.patch.yml');
  const snapshotDir = join(dir, '.dsh-plugin-manager', 'snapshots', `install-${Date.now()}`);
  await mkdir(snapshotDir, { recursive: true });
  const beforePackage = await readFile(packagePath, 'utf8');
  await cp(packagePath, join(snapshotDir, 'package.json'));
  const lockBacked = await cp(lockPath, join(snapshotDir, 'pnpm-lock.yaml')).then(() => true).catch(() => false);
  const onPnpmOutput = (label) => (line) => onStep?.({ label, detail: line });
  let installedName, mutated = false;
  try {
    onStep?.({ label: `下载依赖：pnpm add ${spec}` });
    const added = await runPnpm(pnpm, ['add', spec], dir, { onOutput: onPnpmOutput(`下载依赖：pnpm add ${spec}`) });
    mutated = true;
    let after = await json(packagePath, {});
    const beforeNames = new Set(Object.keys(JSON.parse(beforePackage).dependencies ?? {}));
    const dependencies = after.dependencies ?? {};
    installedName = Object.keys(dependencies).find((name) => !beforeNames.has(name) && normalizeSpec(dependencies[name]) === key)
      ?? Object.keys(dependencies).find((name) => normalizeSpec(dependencies[name]) === key);
    if (!installedName) throw new Error(`pnpm 已执行，但 package.json 里没有出现 ${spec}。pnpm 输出：${(added.stderr || added.stdout).trim().slice(-600)}`);
    // 根包不是合法插件（monorepo 合集很常见）时，自动探测合法子包并改装；
    // pnpm 支持 github:owner/repo#path:subdir 子目录安装，探测到唯一合法子包即可无缝降级。
    let bundleOk = true;
    try { await assertInstallableBundle(dir, installedName); } catch { bundleOk = false; }
    if (!bundleOk) {
      onStep?.({ label: '根目录不是插件包，正在探测子包…' });
      const subdirs = await findBundleSubdirs(key.replace(/^github:/, ''));
      if (subdirs.length === 0) {
        throw new Error(`${installedName} 不是合法的 DSH 插件包：package.json 缺少 dsh.bundle.patch 声明，且仓库里也没有找到可安装的插件子包。它可能是一个文档/资源仓库，不能作为插件安装。`);
      }
      if (subdirs.length > 1) {
        throw new Error(`${installedName} 是一个合集仓库，包含 ${subdirs.length} 个插件子包：${subdirs.join('、')}。请逐个添加安装，例如 github:${key.replace(/^github:/, '')}#path:${subdirs[0]}。`);
      }
      const subdir = subdirs[0];
      const subSpec = `${key}#path:${subdir}`;
      onStep?.({ label: `改装子包：pnpm add ${subSpec}` });
      await runPnpm(pnpm, ['remove', installedName], dir, { onOutput: onPnpmOutput(`改装子包：pnpm add ${subSpec}`) });
      const midPackage = await readFile(packagePath, 'utf8');
      const midNames = new Set(Object.keys(JSON.parse(midPackage).dependencies ?? {}));
      await runPnpm(pnpm, ['add', subSpec], dir, { onOutput: onPnpmOutput(`改装子包：pnpm add ${subSpec}`) });
      after = await json(packagePath, {});
      const deps = after.dependencies ?? {};
      installedName = Object.keys(deps).find((name) => !midNames.has(name))
        ?? Object.keys(deps).find((name) => normalizeSpec(deps[name]) === key);
      if (!installedName) throw new Error(`子包安装后 package.json 里没有出现新依赖（${subSpec}）。`);
      await assertInstallableBundle(dir, installedName);
    }
    onStep?.({ label: `写入 bundles：${installedName}` });
    const bundles = after.dsh?.profile?.bundles ?? [];
    if (!bundles.includes(installedName)) {
      after.dsh ??= {}; after.dsh.profile ??= {}; after.dsh.profile.bundles = [...bundles, installedName];
      await writeFile(packagePath, `${JSON.stringify(after, null, 2)}\n`, 'utf8');
    }
    const ids = await bundlePatchIds(dir, installedName);
    if (ids.length) {
      onStep?.({ label: '清除既往禁用标记，确保自动启用' });
      await writeFile(patchPath, updatePatch(await readFile(patchPath, 'utf8').catch(() => ''), [{ ids, disabled: false }]), 'utf8');
    }
    onStep?.({ label: '校验配置树：dsh --dump-config' });
    await dump(profile, dir);
  } catch (error) {
    onStep?.({ label: '安装失败，正在回滚' });
    await writeFile(packagePath, beforePackage, 'utf8');
    // 补偿性 pnpm 操作会重写甚至删掉 lockfile，所以必须放在它之后、dump 之前兜底恢复。
    if (mutated && installedName) await runPnpm(pnpm, ['remove', installedName], dir).catch(() => ({ stdout: '', stderr: '' }));
    const lockRestored = await cp(join(snapshotDir, 'pnpm-lock.yaml'), lockPath).then(() => true).catch(() => false);
    await dump(profile, dir).catch(() => {});
    const lockNote = !lockBacked ? '快照未能备份 pnpm-lock.yaml。' : lockRestored ? '' : 'pnpm-lock.yaml 未能自动恢复，请从 .dsh-plugin-manager/snapshots 手动取回。';
    throw new Error(`安装失败，已回滚 package.json（node_modules 中可能残留文件，可手动执行 pnpm install 修复）。${lockNote}原因：${errorDetail(error)}`);
  }
  const verification = await verifyProfile(profile, dir).catch(() => ({ verified: false, level: 'syntax', checked: 0, issues: [], error: '验证执行异常' }));
  return { ok: true, spec, packageName: installedName, restartRequired: true, snapshotDir, pnpm: `${pnpm.label} ${pnpm.version}`, verification };
}

// 卸载事务：先禁用并校验，确认不会拖垮 Profile，再真正 pnpm remove。
export async function uninstallPlugin(profile, packageName, { onStep, unpin = false, confirm = false } = {}) {
  const dir = profileDir(profile);
  if (!confirm) throw new Error('卸载会调用 pnpm remove 删除代码，必须显式传 confirm: true。');
  const target = (await inspectProfile(dir)).entries.find((entry) => entry.packageName === packageName);
  if (!target) throw new Error(`${packageName} 不在当前 Profile 的 bundles 里。`);
  if (packageName === managerPackageName) throw new Error('插件管理器不能卸载自身。');
  if (isCore(target)) throw new Error('官方核心组件受保护，不能卸载。');
  if (target.pinned && !unpin) { const error = new Error(`${packageName} 已置顶，取消置顶后才能卸载。`); error.code = 'PINNED'; throw error; }
  const pnpm = await detectPnpm();
  onStep?.({ label: `解析包管理器（${pnpm.label} ${pnpm.version}）` });
  const packagePath = join(dir, 'package.json'), lockPath = join(dir, 'pnpm-lock.yaml'), patchPath = join(dir, 'cordis.patch.yml');
  const snapshotDir = join(dir, '.dsh-plugin-manager', 'snapshots', `uninstall-${Date.now()}`);
  await mkdir(snapshotDir, { recursive: true });
  const beforePackage = await readFile(packagePath, 'utf8'), beforePatch = await readFile(patchPath, 'utf8').catch(() => '');
  await cp(packagePath, join(snapshotDir, 'package.json'));
  const lockBacked = await cp(lockPath, join(snapshotDir, 'pnpm-lock.yaml')).then(() => true).catch(() => false);
  if (beforePatch) await cp(patchPath, join(snapshotDir, 'cordis.patch.yml')).catch(() => {});
  const spec = JSON.parse(beforePackage).dependencies?.[packageName] ?? null;
  const manifest = JSON.parse(beforePackage);
  let mutated = false;
  try {
    if (unpin) { onStep?.({ label: '按确认取消置顶' }); await setPinned(dir, packageName, false); }
    if (target.enabled) {
      const ids = target.entryIds.length ? target.entryIds : [packageName];
      onStep?.({ label: '先禁用，确认不会拖垮 Profile' });
      await writeFile(patchPath, updatePatch(beforePatch, [{ ids, disabled: true }]), 'utf8');
      await dump(profile, dir);
    }
    onStep?.({ label: `移出 bundles：${packageName}` });
    manifest.dsh ??= {}; manifest.dsh.profile ??= {};
    manifest.dsh.profile.bundles = (manifest.dsh.profile.bundles ?? []).filter((name) => name !== packageName);
    await writeFile(packagePath, `${JSON.stringify(manifest, null, 2)}\n`, 'utf8');
    onStep?.({ label: `彻底卸载：pnpm remove ${packageName}` });
    await runPnpm(pnpm, ['remove', packageName], dir, { onOutput: (line) => onStep?.({ label: `彻底卸载：pnpm remove ${packageName}`, detail: line }) });
    mutated = true;
    onStep?.({ label: '校验配置树：dsh --dump-config' });
    await dump(profile, dir);
  } catch (error) {
    onStep?.({ label: '卸载失败，正在回滚' });
    await writeFile(packagePath, beforePackage, 'utf8');
    if (beforePatch) await writeFile(patchPath, beforePatch, 'utf8');
    // 只有 remove 真的成功过才需要补偿重装；补偿操作会重写或删掉 lockfile，所以放在最后兜底恢复。
    if (mutated && spec) await runPnpm(pnpm, ['add', spec], dir).catch(() => ({ stdout: '', stderr: '' }));
    const lockRestored = await cp(join(snapshotDir, 'pnpm-lock.yaml'), lockPath).then(() => true).catch(() => false);
    await dump(profile, dir).catch(() => {});
    if (unpin) await setPinned(dir, packageName, true).catch(() => {});
    const lockNote = !lockBacked ? '快照未能备份 pnpm-lock.yaml。' : lockRestored ? '' : 'pnpm-lock.yaml 未能自动恢复，请从 .dsh-plugin-manager/snapshots 手动取回。';
    throw new Error(`卸载失败，已回滚 package.json / cordis.patch.yml（node_modules 中可能残留文件，可手动执行 pnpm install 修复）。${lockNote}原因：${errorDetail(error)}`);
  }
  const market = await returnToMarket(dir, { packageName, spec, target });
  const verification = await verifyProfile(profile, dir).catch(() => ({ verified: false, level: 'syntax', checked: 0, issues: [], error: '验证执行异常' }));
  return { ok: true, packageName, spec, restartRequired: true, market, snapshotDir, verification };
}

// 任务持久化：运行中的任务存在内存 Map 里以便高频读写，同时落盘到 jobs.json。
// 进程重启后内存清空，getJob 会从磁盘恢复已完成任务的状态，前端不再拿到 404。
const jobs = new Map();
const jobsFile = (dir) => join(dir, '.dsh-plugin-manager', 'jobs.json');
async function loadJobsFromDisk(dir) {
  const data = await json(jobsFile(dir), { jobs: [] });
  const map = new Map();
  for (const job of data.jobs ?? []) map.set(job.id, job);
  return map;
}
async function persistJob(dir, job) {
  const map = await loadJobsFromDisk(dir);
  map.set(job.id, job);
  const now = Date.now();
  for (const [id, old] of map) if (old.finishedAt && now - Date.parse(old.finishedAt) > 30 * 60_000) map.delete(id);
  await mkdir(join(dir, '.dsh-plugin-manager'), { recursive: true });
  await writeFile(jobsFile(dir), `${JSON.stringify({ version: 1, jobs: [...map.values()] }, null, 2)}\n`, 'utf8');
}
function trackJob(job, dir, run) {
  jobs.set(job.id, job);
  persistJob(dir, job).catch(() => {});
  for (const [id, old] of jobs) if (old.finishedAt && Date.now() - Date.parse(old.finishedAt) > 30 * 60_000) jobs.delete(id);
  run().then((result) => { job.state = 'succeeded'; job.result = result; }).catch((error) => { job.state = 'failed'; job.error = error instanceof Error ? error.message : String(error); job.code = error?.code; }).finally(() => { job.finishedAt = new Date().toISOString(); persistJob(dir, job).catch(() => {}); });
  return job;
}
const newJob = (kind, profile, subject) => ({ id: `${kind}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`, kind, profile, subject, state: 'running', steps: [], startedAt: new Date().toISOString(), finishedAt: null, result: null, error: null, code: null });
export function startInstall(profile, dir, spec) {
  const job = newJob('install', profile, spec);
  return trackJob(job, dir, () => installPlugin(profile, spec, { onStep: pushStep(job, dir) }));
}
export function startUninstall(profile, dir, packageName, options = {}) {
  const job = newJob('uninstall', profile, packageName);
  return trackJob(job, dir, () => uninstallPlugin(profile, packageName, { ...options, onStep: pushStep(job, dir) }));
}
// 同一步骤带 detail 的连续回调视为"进度更新"：就地更新最后一步，不再追加新步骤，
// 前端轮询时就能看到 resolved/reused/downloaded 的实时行。
// detail 更新不落盘（太频繁）；新步骤是里程碑，落盘以便重启后恢复。
function pushStep(job, dir) {
  return (payload) => {
    const now = new Date().toISOString();
    const last = job.steps[job.steps.length - 1];
    if (payload.detail && last && last.label === payload.label) {
      last.detail = payload.detail.slice(0, 300);
      last.at = now;
      return;
    }
    job.steps.push({ label: payload.label, detail: payload.detail ? payload.detail.slice(0, 300) : undefined, startedAt: payload.startedAt ?? now, at: now });
    persistJob(dir, job).catch(() => {});
  };
}
export async function getJob(dir, id) {
  if (jobs.has(id)) return jobs.get(id);
  const map = await loadJobsFromDisk(dir);
  return map.get(id);
}

function send(res, status, value) { const body = JSON.stringify(value); res.statusCode = status; res.setHeader('Content-Type', 'application/json; charset=utf-8'); res.end(body); }
export function apply(ctx) { ctx.inject?.(['webServer'], ({ webServer }) => webServer?.register({ kind: 'prefix', path: '/dsh-plugin-manager', handler: async (req, res) => { try {
  const url = new URL(req.url ?? '/', 'http://localhost'), profile = profileFromContext(ctx), dir = profileDir(profile);
  if (req.method === 'GET' && url.pathname === '/dsh-plugin-manager/inventory') return send(res, 200, { ok: true, ...(await inspectProfile(dir)) });
  if (req.method === 'GET' && url.pathname === '/dsh-plugin-manager/plan') { const pkg = url.searchParams.get('package'); if (!pkg) return send(res, 400, { ok: false, error: '缺少 package。' }); return send(res, 200, await planToggle(dir, pkg, url.searchParams.get('enabled') === 'true', { autoDisableLowRisk: url.searchParams.get('autoDisableLowRisk') === 'true' })); }
  if (req.method === 'POST' && url.pathname === '/dsh-plugin-manager/toggle') { const pkg = url.searchParams.get('package'); if (!pkg) return send(res, 400, { ok: false, error: '缺少 package。' }); return send(res, 200, await applyToggle(profile, pkg, url.searchParams.get('enabled') === 'true', { autoDisableLowRisk: url.searchParams.get('autoDisableLowRisk') === 'true', acceptConflicts: url.searchParams.get('acceptConflicts') === 'true' })); }
  if (req.method === 'GET' && url.pathname === '/dsh-plugin-manager/market') return send(res, 200, { ok: true, ...(await inspectMarket(dir)) });
  if (req.method === 'POST' && url.pathname === '/dsh-plugin-manager/market/import') return send(res, 200, await importSnapshot(dir, { replace: url.searchParams.get('replace') === 'true' }));
  if (req.method === 'DELETE' && url.pathname === '/dsh-plugin-manager/market') { const spec = url.searchParams.get('spec'); if (!spec) return send(res, 400, { ok: false, error: '缺少 spec。' }); return send(res, 200, await removeMarketEntry(dir, spec)); }
  if (req.method === 'POST' && url.pathname === '/dsh-plugin-manager/market/add') { const spec = url.searchParams.get('spec'); if (!spec) return send(res, 400, { ok: false, error: '缺少 spec。' }); return send(res, 200, await addMarketEntry(dir, { spec, note: url.searchParams.get('note') ?? '', description: url.searchParams.get('description') ?? '', category: url.searchParams.get('category') ?? '' })); }
  if (req.method === 'POST' && url.pathname === '/dsh-plugin-manager/pin') { const pkg = url.searchParams.get('package'); if (!pkg) return send(res, 400, { ok: false, error: '缺少 package。' }); return send(res, 200, { ok: true, pinned: await setPinned(dir, pkg, url.searchParams.get('pinned') === 'true') }); }
  if (req.method === 'POST' && url.pathname === '/dsh-plugin-manager/install') { const spec = url.searchParams.get('spec'); if (!spec) return send(res, 400, { ok: false, error: '缺少 spec。' }); const job = startInstall(profile, dir, spec); return send(res, 200, { ok: true, jobId: job.id }); }
  if (req.method === 'POST' && url.pathname === '/dsh-plugin-manager/uninstall') { const pkg = url.searchParams.get('package'); if (!pkg) return send(res, 400, { ok: false, error: '缺少 package。' }); if (url.searchParams.get('confirm') !== 'true') return send(res, 400, { ok: false, error: '卸载是破坏性操作，必须带 confirm=true。' }); const job = startUninstall(profile, dir, pkg, { unpin: url.searchParams.get('unpin') === 'true', confirm: true }); return send(res, 200, { ok: true, jobId: job.id }); }
  if (req.method === 'GET' && url.pathname === '/dsh-plugin-manager/install') { const job = await getJob(dir, url.searchParams.get('jobId')); if (!job) return send(res, 404, { ok: false, error: '任务不存在或已过期。' }); return send(res, 200, { ok: true, job }); }
  if (req.method === 'GET' && url.pathname === '/dsh-plugin-manager/uninstall') { const job = await getJob(dir, url.searchParams.get('jobId')); if (!job) return send(res, 404, { ok: false, error: '任务不存在或已过期。' }); return send(res, 200, { ok: true, job }); }
  return send(res, 404, { ok: false, error: '未知接口。' });
} catch (error) { return send(res, 500, { ok: false, error: error instanceof Error ? error.message : String(error) }); } } })); }
export default { name, inject, apply };
