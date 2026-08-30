window.__ModuleLoader__.load({
  id: '@dsh/plugin-manager',
  factory: (require) => {
    const module = { exports: {} };
    const exports = module.exports;
    const React = require('react');
    const { jsx, jsxs } = require('react/jsx-runtime');
    const managerPackageName = '@dsh/plugin-manager';
    const cell = { minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' };
    const conflictLabel = { explicit: '作者声明冲突', service: '重复 Service Provider', route: '重复路由', command: '重复命令', port: '重复端口' };
    const categoryLabel = { ui: '界面增强', tools: '工具', workflow: '工作流', session: '会话管理', memory: '记忆', model: '模型', dev: '开发', theme: '主题', notify: '通知', fun: '趣味' };
    const ACTION_COPY = { detail: '详情', pin: '置顶', pinned: '已置顶', enable: '启用', disable: '禁用', uninstall: '卸载', remove: '舍弃', install: '安装并启用', installing: '安装中…', opening: '打开仓库', checkUpdate: '检查更新', updating: '检查中…', update: '更新' };
    const formatRelative = (ms) => {
      if (!Number.isFinite(ms) || ms < 0) return '';
      const seconds = Math.round(ms / 1000);
      if (seconds < 60) return `${seconds} 秒`;
      const minutes = Math.floor(seconds / 60), rest = seconds % 60;
      return rest ? `${minutes} 分 ${rest} 秒` : `${minutes} 分钟`;
    };
    const css = `
      .dshpm{max-width:980px;min-width:0;padding:22px;container-type:inline-size;container-name:dshpm;color:var(--dsw-alias-label-primary)}
      .dshpm-top{display:flex;align-items:center;justify-content:space-between;gap:14px;margin-bottom:18px}.dshpm-title{margin:0;font-size:22px}.dshpm-sub{margin:4px 0 0;color:var(--dsw-alias-label-secondary);font-size:12px;line-height:1.55}.dshpm-counts{display:flex;gap:7px;flex-wrap:wrap;justify-content:flex-end}.dshpm-count{padding:4px 8px;border-radius:999px;background:var(--dsw-alias-bg-layer-3);color:var(--dsw-alias-label-secondary);font-size:12px}.dshpm-count b{color:var(--dsw-alias-label-primary)}
      .dshpm-tabs{display:flex;gap:6px;padding:4px;border:1px solid var(--dsw-alias-border-l2);border-radius:10px;background:var(--dsw-alias-bg-layer-2);margin-bottom:18px;width:fit-content}.dshpm-tab{font:inherit;font-size:13px;border:0;background:transparent;color:var(--dsw-alias-label-secondary);border-radius:7px;padding:7px 14px;cursor:pointer}.dshpm-tab:hover{color:var(--dsw-alias-label-primary)}.dshpm-tab.active{background:var(--dsw-alias-brand-primary);color:#fff}
      .dshpm-tools{display:flex;gap:8px;flex-wrap:wrap;margin-bottom:18px}.dshpm-search{flex:1 1 220px;min-width:0;border:1px solid var(--dsw-alias-border-l2);background:var(--dsw-alias-bg-layer-2);color:inherit;border-radius:8px;padding:8px 10px;font:inherit;font-size:13px}.dshpm-search:focus{outline:2px solid color-mix(in srgb,var(--dsw-alias-brand-primary) 30%,transparent);border-color:var(--dsw-alias-brand-primary)}
      .dshpm-chip,.dshpm-button{font:inherit;font-size:12px;border:1px solid var(--dsw-alias-border-l2);background:var(--dsw-alias-bg-layer-2);color:var(--dsw-alias-label-secondary);border-radius:7px;padding:6px 8px;cursor:pointer;line-height:1.2}.dshpm-chip:hover,.dshpm-button:hover{border-color:var(--dsw-alias-brand-primary);color:var(--dsw-alias-label-primary)}.dshpm-chip.active{background:var(--dsw-alias-brand-primary);color:#fff;border-color:var(--dsw-alias-brand-primary)}
      .dshpm-button:disabled{opacity:.55;cursor:progress}.dshpm-button:disabled:hover{border-color:var(--dsw-alias-border-l2);color:var(--dsw-alias-label-secondary)}
      .dshpm-button.primary{background:var(--dsw-alias-brand-primary);color:#fff;border-color:var(--dsw-alias-brand-primary)}.dshpm-button.primary:hover{color:#fff;filter:brightness(1.06)}
      .dshpm-button.danger{color:#b3352f;border-color:color-mix(in srgb,#d74747 45%,var(--dsw-alias-border-l2))}.dshpm-button.danger:hover{border-color:#d74747;color:#b3352f}
      .dshpm-button.pin.on{background:color-mix(in srgb,var(--dsw-alias-brand-primary) 14%,var(--dsw-alias-bg-layer-2));border-color:var(--dsw-alias-brand-primary);color:var(--dsw-alias-brand-primary)}
      .dshpm-button.compact{padding:5px 7px;font-size:12px}
      .dshpm-icon{display:inline-flex;align-items:center;justify-content:center;width:24px;height:24px;border-radius:6px;border:1px solid var(--dsw-alias-border-l2);background:var(--dsw-alias-bg-layer-2);color:var(--dsw-alias-label-secondary);font-size:13px;line-height:1;padding:0;cursor:pointer;font-family:inherit}.dshpm-icon:hover{border-color:var(--dsw-alias-brand-primary);color:var(--dsw-alias-label-primary)}.dshpm-icon:disabled{opacity:.55;cursor:progress}.dshpm-icon.danger{color:#b3352f;border-color:color-mix(in srgb,#d74747 45%,var(--dsw-alias-border-l2))}.dshpm-icon.danger:hover{border-color:#d74747;color:#b3352f}.dshpm-icon svg{width:14px;height:14px;display:block}
      .dshpm-section{margin-top:20px}.dshpm-section-title{display:flex;align-items:baseline;gap:8px;margin:0 0 8px;font-size:14px}.dshpm-section-title small{color:var(--dsw-alias-label-tertiary);font-size:12px;font-weight:400}
      .dshpm-table{border:1px solid var(--dsw-alias-border-l2);border-radius:10px;overflow:hidden;background:var(--dsw-alias-bg-layer-2)}
      .dshpm-head{display:grid;grid-template-columns:minmax(150px,1.7fr) minmax(80px,.8fr) minmax(110px,1fr) 70px minmax(0,220px);gap:10px;padding:8px 12px;background:var(--dsw-alias-bg-layer-3);font-size:11px;color:var(--dsw-alias-label-tertiary)}
      .dshpm-row{display:grid;grid-template-columns:minmax(150px,1.7fr) minmax(80px,.8fr) minmax(110px,1fr) 70px minmax(0,220px);gap:10px;align-items:center;min-height:49px;padding:7px 12px;border-top:1px solid var(--dsw-alias-border-l2);cursor:default}.dshpm-row:hover{background:color-mix(in srgb,var(--dsw-alias-brand-primary) 4%,transparent)}
      .dshpm-table.market .dshpm-head,.dshpm-table.market .dshpm-row{grid-template-columns:minmax(150px,1.7fr) minmax(76px,.72fr) minmax(104px,1fr) 64px minmax(0,200px)}
      .dshpm-row.manager{background:color-mix(in srgb,var(--dsw-alias-brand-primary) 8%,var(--dsw-alias-bg-layer-2));border-radius:10px;border:1px solid color-mix(in srgb,var(--dsw-alias-brand-primary) 40%,var(--dsw-alias-border-l2))}
      .dshpm-row.pinned{background:color-mix(in srgb,var(--dsw-alias-brand-primary) 10%,var(--dsw-alias-bg-layer-2));box-shadow:inset 3px 0 0 var(--dsw-alias-brand-primary)}
      .dshpm-row.pinned-sep{border-top:2px dashed color-mix(in srgb,var(--dsw-alias-brand-primary) 35%,transparent)}
      .dshpm-name{font-size:13px;font-weight:600}.dshpm-version{margin-left:6px;color:var(--dsw-alias-label-tertiary);font-size:11px;font-weight:400}.dshpm-meta{color:var(--dsw-alias-label-secondary);font-size:12px}
      .dshpm-state{font-size:12px;font-weight:600}.dshpm-state.on{color:#258a49}.dshpm-state.off{color:var(--dsw-alias-label-tertiary)}.dshpm-protected{font-size:12px;color:var(--dsw-alias-brand-primary);font-weight:600;white-space:nowrap}.dshpm-protected{font-size:12px;color:var(--dsw-alias-brand-primary);font-weight:600;white-space:nowrap}.dshpm-alias{margin-left:6px;font-size:11px;font-weight:400;color:var(--dsw-alias-brand-primary);background:color-mix(in srgb,var(--dsw-alias-brand-primary) 10%,transparent);padding:1px 6px;border-radius:4px;white-space:nowrap}.dshpm-alias-name{font-size:13px;font-weight:600;color:var(--dsw-alias-brand-primary)}.dshpm-alias-orig{font-size:11px;font-weight:400;color:var(--dsw-alias-label-tertiary);margin-left:4px}
      .dshpm-actions{display:flex;justify-content:flex-end;gap:5px;flex-wrap:nowrap;align-items:center}
      .dshpm-actions .dshpm-icon{width:26px;height:26px;flex:none}
      .dshpm-action-label{display:none}
      .dshpm-pager{display:flex;align-items:center;justify-content:flex-end;gap:8px;margin-top:10px;color:var(--dsw-alias-label-secondary);font-size:12px}
      .dshpm-empty{padding:20px;color:var(--dsw-alias-label-tertiary);font-size:13px;text-align:center}
      .dshpm-empty .dshpm-tip{margin-top:8px;font-size:12px;color:var(--dsw-alias-label-secondary);line-height:1.6}
      .dshpm-notice{margin:0 0 14px;padding:10px 12px;border-radius:9px;font-size:13px;line-height:1.65;border:1px solid transparent}.dshpm-notice.ok{background:color-mix(in srgb,#25a25a 12%,transparent);border-color:color-mix(in srgb,#25a25a 40%,transparent);color:#1c7a43}.dshpm-notice.error{background:color-mix(in srgb,#d74747 12%,transparent);border-color:color-mix(in srgb,#d74747 40%,transparent);color:#b3352f}.dshpm-notice.info{background:var(--dsw-alias-bg-layer-3);border-color:var(--dsw-alias-border-l2);color:var(--dsw-alias-label-secondary)}
      .dshpm-modal-backdrop{position:fixed;inset:0;background:rgba(15,23,42,.4);display:flex;align-items:center;justify-content:center;padding:24px;z-index:100}.dshpm-modal{width:min(640px,100%);max-height:min(680px,90vh);overflow:auto;background:var(--dsw-alias-bg-layer-1);border:1px solid var(--dsw-alias-border-l2);border-radius:14px;padding:20px;box-shadow:0 20px 60px rgba(0,0,0,.22)}.dshpm-modal-head{display:flex;justify-content:space-between;gap:12px;align-items:flex-start}.dshpm-modal h3{margin:0;font-size:17px;word-break:break-word}.dshpm-close{font-size:20px;line-height:1;padding:2px 7px}.dshpm-description{margin:14px 0;color:var(--dsw-alias-label-secondary);line-height:1.65;font-size:13px}.dshpm-detail-grid{display:grid;grid-template-columns:110px minmax(0,1fr);gap:9px 14px;border-top:1px solid var(--dsw-alias-border-l2);padding-top:14px;font-size:13px}.dshpm-detail-grid dt{color:var(--dsw-alias-label-tertiary)}.dshpm-detail-grid dd{margin:0;overflow-wrap:anywhere}
      .dshpm-conflict-list{margin:0;padding-left:18px;color:var(--dsw-alias-label-secondary);font-size:13px;line-height:1.75}.dshpm-conflict-list b{color:var(--dsw-alias-label-primary)}.dshpm-modal-foot{display:flex;justify-content:flex-end;gap:8px;margin-top:18px}
      .dshpm-detail-grid svg{width:13px;height:13px;vertical-align:-2px;flex:none}
      .dshpm-step-detail{margin-top:6px;padding:6px 9px;border-radius:7px;background:var(--dsw-alias-bg-layer-3);font-family:ui-monospace,Menlo,Consolas,monospace;font-size:11.5px;line-height:1.5;color:var(--dsw-alias-label-secondary);white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
      .dshpm-steps{margin:14px 0 0;padding:0;list-style:none;font-size:13px}.dshpm-step{padding:10px 0;border-top:1px solid var(--dsw-alias-border-l2)}.dshpm-step:last-child{border-bottom:1px solid var(--dsw-alias-border-l2)}.dshpm-step-head{display:flex;align-items:flex-start;gap:10px}.dshpm-step-dot{width:9px;height:9px;border-radius:50%;margin-top:6px;flex:none;background:var(--dsw-alias-label-tertiary)}.dshpm-step-dot.done{background:#258a49}.dshpm-step-dot.failed{background:#d74747}.dshpm-step-dot.running{background:var(--dsw-alias-brand-primary)}
      .dshpm-step-body{flex:1;min-width:0}.dshpm-step-label{font-weight:500;color:var(--dsw-alias-label-primary);display:flex;flex-wrap:wrap;gap:6px;align-items:baseline}.dshpm-step-meta{margin-top:3px;color:var(--dsw-alias-label-tertiary);font-size:11px;display:flex;flex-wrap:wrap;gap:8px}
      .dshpm-progress{height:6px;border-radius:999px;background:var(--dsw-alias-bg-layer-3);overflow:hidden;margin-top:10px}.dshpm-progress-bar{height:100%;width:0;background:var(--dsw-alias-brand-primary);transition:width .35s ease}
      @keyframes dshpm-pulse{0%{opacity:.35}50%{opacity:1}100%{opacity:.35}}@media (prefers-reduced-motion:no-preference){.dshpm-step-dot.running{animation:dshpm-pulse 1.1s ease-in-out infinite}}
      @container dshpm (max-width:720px){.dshpm{padding:16px}.dshpm-top{align-items:flex-start;flex-direction:column}.dshpm-counts{justify-content:flex-start}.dshpm-head{display:none}.dshpm-row,.dshpm-table.market .dshpm-row{grid-template-columns:minmax(0,1fr) auto;gap:6px 10px;min-height:0;padding:10px}.dshpm-name{grid-column:1/-1}.dshpm-category{grid-column:1;grid-row:2}.dshpm-source{grid-column:1;grid-row:3}.dshpm-state{grid-column:2;grid-row:2;text-align:right}.dshpm-actions{grid-column:2;grid-row:3;flex-wrap:nowrap;justify-content:flex-end}.dshpm-tools{gap:6px}.dshpm-detail-grid{grid-template-columns:88px minmax(0,1fr)}}
      @container dshpm (max-width:520px){.dshpm-action-label{display:none}.dshpm-actions{gap:4px}}
      @container dshpm (min-width:521px){.dshpm-tab .dshpm-action-label{display:none}}
      .dshpm-restart-banner{margin:0 0 14px;padding:12px 14px;border-radius:9px;font-size:13px;line-height:1.6;border:1px solid transparent;background:color-mix(in srgb,#2563eb 10%,transparent);border-color:color-mix(in srgb,#2563eb 35%,transparent);color:#1e40af;display:flex;flex-wrap:wrap;gap:10px;align-items:center;justify-content:space-between}
      .dshpm-restart-banner.danger{background:color-mix(in srgb,#d97706 12%,transparent);border-color:color-mix(in srgb,#d97706 40%,transparent);color:#92400e}
      .dshpm-restart-banner b{font-weight:600}
      .dshpm-restart-actions{display:flex;gap:8px;flex-wrap:wrap}
      .dshpm-restart-actions .dshpm-button{white-space:nowrap}
    `;
    const readBody = async (response) => {
      const body = await response.json().catch(() => ({}));
      if (!response.ok || body.ok === false) throw new Error(body.error || `请求失败（HTTP ${response.status}）`);
      return body;
    };
    const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
    const GithubIcon = () => jsx('svg', { viewBox:'0 0 16 16', fill:'currentColor', 'aria-hidden':'true', children: jsx('path', { d:'M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38v-1.34c-2.22.48-2.69-1.07-2.69-1.07-.36-.92-.89-1.17-.89-1.17-.73-.5.06-.49.06-.49.8.06 1.23.83 1.23.83.72 1.23 1.88.88 2.34.67.07-.52.28-.88.51-1.08-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82a7.66 7.66 0 0 1 4 0c1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.74.54 1.5v2.22c0 .21.15.46.55.38A8 8 0 0 0 16 8c0-4.42-3.58-8-8-8z' }) });
    const ExternalIcon = () => jsx('svg', { viewBox:'0 0 16 16', fill:'currentColor', 'aria-hidden':'true', children: jsx('path', { d:'M10 1.5h4.5V6h-1.4V3.56L8.56 8.06 7.44 6.94 11.94 2.5H10v-1zM3 4h5v1.5H4.5v6h6V7H12v4.5A1.5 1.5 0 0 1 10.5 13h-7A1.5 1.5 0 0 1 2 11.5v-7A1.5 1.5 0 0 1 3.5 2H8v1.5H3z' }) });
    const IconButton = (props) => {
      const { title, onClick, disabled = false, danger = false, children } = props;
      return jsx('button', { className:`dshpm-icon${danger ? ' danger' : ''}`, type:'button', title, 'aria-label':title, disabled, onClick, children });
    };
    const openExternal = (url) => () => { if (url) window.open(url, '_blank', 'noopener,noreferrer'); };

    function PluginManagerSection() {
      const [tab, setTab] = React.useState('installed');
      const [state, setState] = React.useState({ loading: true, entries: [], conflicts: [], error: '' });
      const [market, setMarket] = React.useState({ loading: true, entries: [], importable: { available: false }, error: '' });
      const [query, setQuery] = React.useState('');
      const [category, setCategory] = React.useState('全部');
      const [status, setStatus] = React.useState('全部');
      const [page, setPage] = React.useState(0);
      const [detail, setDetail] = React.useState(null);
      const [notice, setNotice] = React.useState(null);
      const [pending, setPending] = React.useState([]);
      const [confirmation, setConfirmation] = React.useState(null);
      const [guard, setGuard] = React.useState(null);
      const [task, setTask] = React.useState(null);
      const [now, setNow] = React.useState(() => Date.now());
      const [marketQuery, setMarketQuery] = React.useState('');
      const [marketCategory, setMarketCategory] = React.useState('全部');
      const [marketStatus, setMarketStatus] = React.useState('全部');
      const [marketPage, setMarketPage] = React.useState(0);
      const [marketDetail, setMarketDetail] = React.useState(null);
      const [manualSpec, setManualSpec] = React.useState('');
      const [manualNote, setManualNote] = React.useState('');
      const [marketToolsOpen, setMarketToolsOpen] = React.useState(false);
      const [updateInfo, setUpdateInfo] = React.useState({});  // { [packageName]: { loading, hasUpdate, latest, current, error } }
      const [restartPrompt, setRestartPrompt] = React.useState(null);  // { kind: 'install'|'update'|'uninstall', label, isManager } 或 null
      const [restartPref] = React.useState(() => { try { return localStorage.getItem('dshpm-restart-pref') || ''; } catch { return ''; } });  // 'auto' | 'manual' | ''
      const confirmRef = React.useRef(null);
      const guardRef = React.useRef(null);
      const timerRef = React.useRef(null);
      const pageSize = 20;
      const reload = React.useCallback(async () => { try { const body = await fetch('/dsh-plugin-manager/inventory').then(readBody); setState({ loading:false, entries:body.entries || [], conflicts:body.conflicts || [], error:'' }); setDetail((old) => old ? (body.entries || []).find((entry) => entry.packageName === old.packageName) ?? null : null); } catch (error) { setState((old) => ({ ...old, loading:false, error:error instanceof Error ? error.message : String(error) })); } }, []);
      const reloadMarket = React.useCallback(async () => { try { const body = await fetch('/dsh-plugin-manager/market').then(readBody); setMarket({ loading:false, entries:body.entries || [], importable:body.importable || { available:false }, updatedAt:body.updatedAt ?? null, error:'' }); } catch (error) { setMarket((old) => ({ ...old, loading:false, error:error instanceof Error ? error.message : String(error) })); } }, []);
      const checkUpdate = React.useCallback(async (entry) => {
        setUpdateInfo((old) => ({ ...old, [entry.packageName]: { loading: true } }));
        try { const body = await fetch(`/dsh-plugin-manager/check-update?package=${encodeURIComponent(entry.packageName)}`).then(readBody); setUpdateInfo((old) => ({ ...old, [entry.packageName]: { loading: false, ...body } })); }
        catch (error) { setUpdateInfo((old) => ({ ...old, [entry.packageName]: { loading: false, error: error instanceof Error ? error.message : String(error) } })); }
      }, []);
      React.useEffect(() => { reload(); reloadMarket(); }, [reload, reloadMarket]);
      React.useEffect(() => { if (tab !== 'installed') return undefined; setPage(0); }, [tab, query, category, status]);
      React.useEffect(() => { if (tab !== 'market') return undefined; setMarketPage(0); }, [tab, marketQuery, marketCategory, marketStatus]);
      React.useEffect(() => { if (!notice) return undefined; const timer = setTimeout(() => setNotice(null), notice.kind === 'error' ? 9000 : 6000); return () => clearTimeout(timer); }, [notice]);
      React.useEffect(() => {
        if (!task || task.job.state !== 'running') return undefined;
        timerRef.current = setInterval(() => setNow(Date.now()), 1000);
        return () => { if (timerRef.current) clearInterval(timerRef.current); timerRef.current = null; };
      }, [task]);
      const askConfirm = (payload) => new Promise((resolve) => { confirmRef.current = resolve; setConfirmation(payload); });
      const closeConfirm = (value) => { const done = confirmRef.current; confirmRef.current = null; setConfirmation(null); if (done) done(value); };
      const askGuard = (payload) => new Promise((resolve) => { guardRef.current = resolve; setGuard(payload); });
      const closeGuard = (value) => { const done = guardRef.current; guardRef.current = null; setGuard(null); if (done) done(value); };
      const toggle = React.useCallback(async (entry, unpin = false) => {
        const enabled = !entry.enabled;
        const args = `package=${encodeURIComponent(entry.packageName)}&enabled=${enabled}&autoDisableLowRisk=true`;
        setNotice(null); setPending((old) => [...old, entry.packageName]);
        try {
          if (unpin) await fetch(`/dsh-plugin-manager/pin?package=${encodeURIComponent(entry.packageName)}&pinned=false`, { method:'POST' }).then(readBody);
          const plan = await fetch(`/dsh-plugin-manager/plan?${args}`).then(readBody);
          if (plan.requiresConfirmation && !await askConfirm({ entry, enabled, conflicts: plan.conflicts || [] })) { setNotice({ kind:'info', text:'已取消，Profile 未做任何修改。' }); return; }
          const result = await fetch(`/dsh-plugin-manager/toggle?${args}&acceptConflicts=true`, { method:'POST' }).then(readBody);
          await reload();
          const automatic = (result.plan?.automaticActions ?? []).map((action) => action.packageName);
          const suffix = automatic.length ? `，并自动禁用 ${automatic.join('、')}` : '';
          const verifyNote = result.verification?.verified === false ? `（smoke check 发现 ${result.verification.issues.length} 个入口文件问题）` : '';
          setNotice({ kind:'ok', text:`已${enabled ? '启用' : '禁用'} ${entry.packageName}${suffix}${verifyNote}。改动已写入 Profile 的 cordis.patch.yml，重启 Harness 后完全生效。` });
        } catch (error) {
          setNotice({ kind:'error', text:`${enabled ? '启用' : '禁用'} ${entry.packageName} 失败：${error instanceof Error ? error.message : String(error)}` });
        } finally {
          setPending((old) => old.filter((name) => name !== entry.packageName));
        }
      }, [reload]);
      const pin = React.useCallback(async (entry, pinned) => {
        setNotice(null);
        try {
          await fetch(`/dsh-plugin-manager/pin?package=${encodeURIComponent(entry.packageName)}&pinned=${pinned}`, { method:'POST' }).then(readBody);
          await reload();
          setNotice({ kind:'info', text:`已${pinned ? '置顶' : '取消置顶'} ${entry.packageName}。置顶项会单独排在最前面并高亮，禁用或卸载前需要先取消置顶。` });
        } catch (error) { setNotice({ kind:'error', text:`置顶失败：${error instanceof Error ? error.message : String(error)}` }); }
      }, [reload]);
      const doRestart = React.useCallback(async () => {
        try { const body = await fetch('/dsh-plugin-manager/restart', { method:'POST' }).then(readBody); setRestartPrompt(null); setNotice({ kind: body.restarted ? 'ok' : 'info', text: body.restarted ? '已触发 Harness 重启，页面会自动重连。' : (body.hint || '自动重启不可用，请手动重启 Harness。') }); }
        catch (error) { setNotice({ kind:'error', text:`重启请求失败：${error instanceof Error ? error.message : String(error)}` }); }
      }, []);
      const dismissRestart = React.useCallback(() => setRestartPrompt(null), []);
      const runTask = React.useCallback(async (kind, startUrl, label) => {
        setNotice(null);
        setNow(Date.now());
        setTask({ kind, label, job: { state:'running', steps:[{ id:'dispatch', label:'正在派发任务…', at: new Date().toISOString(), startedAt: new Date().toISOString() }] } });
        try {
          const started = await fetch(startUrl, { method:'POST' }).then(readBody);
          let job = { id:started.jobId, state:'running', steps:[] };
          setTask({ kind, label, job });
          while (job.state === 'running') {
            await sleep(1500);
            const body = await fetch(`/dsh-plugin-manager/${kind}?jobId=${encodeURIComponent(started.jobId)}`).then(readBody);
            job = body.job; setTask({ kind, label, job });
          }
          if (job.state === 'failed') throw new Error(job.error || '任务失败。');
          await Promise.all([reload(), reloadMarket()]);
          if (kind === 'install') { const v = job.result?.verification; setNotice({ kind: v?.verified === false ? 'info' : 'ok', text:`已安装并启用 ${job.result?.packageName ?? label}${v?.verified === false ? `（验证发现 ${v.issues.length} 个问题）` : ''}。重启 Harness 后完全生效。` }); }
          else if (kind === 'update') { const v = job.result?.verification; const ver = job.result?.version; setNotice({ kind: v?.verified === false ? 'info' : 'ok', text:`已更新 ${label}${ver ? `（${ver.before ?? '?'} → ${ver.after ?? '?'}）` : ''}${v?.verified === false ? `（验证发现 ${v.issues.length} 个问题）` : ''}。重启 Harness 后完全生效。` }); }
          else { const v = job.result?.verification; setNotice({ kind: v?.verified === false ? 'info' : 'ok', text:`已彻底卸载 ${label}${job.result?.market?.returned ? '，并已退回发现市场' : ''}${v?.verified === false ? `（验证发现 ${v.issues.length} 个问题）` : ''}。重启 Harness 后完全生效。` }); }
          // 任务成功后触发重启提示横幅。更新管理器自身时标记 isManager，前端给更醒目的提示。
          // 偏好为 auto 时直接调重启接口，不弹横幅。
          if (job.result?.restartRequired !== false) {
            const isManager = kind === 'update' && job.result?.isManager;
            if (restartPref === 'auto') { doRestart(); }
            else { setRestartPrompt({ kind, label, isManager }); }
          }
        } catch (error) {
          setNotice({ kind:'error', text:`${kind === 'install' ? '安装' : kind === 'update' ? '更新' : '卸载'} ${label} 失败：${error instanceof Error ? error.message : String(error)}` });
        } finally {
          // 用函数式更新读最新 state（闭包里的 task 是发起时的旧值）：
          // 失败的弹窗必须保留，让用户看清错误原因并手动关闭；成功的弹窗 1.5 秒后自动关。
          setTask((current) => {
            if (!current) return null;
            if (current.job.state === 'failed') return current;
            if (current.job.state === 'succeeded') setTimeout(() => setTask((now2) => now2 && now2.job.state === 'succeeded' ? null : now2), 1500);
            return current;
          });
        }
      }, [reload, reloadMarket, restartPref, doRestart]);
      const requestToggle = React.useCallback(async (entry) => {
        if (!entry.enabled || !entry.pinned) return toggle(entry);
        if (await askGuard({ entry, action:'disable' })) return toggle(entry, true);
        return undefined;
      }, [toggle]);
      const requestUninstall = React.useCallback(async (entry) => {
        const approved = await askGuard({ entry, action:'uninstall' });
        if (!approved) return;
        await runTask('uninstall', `/dsh-plugin-manager/uninstall?package=${encodeURIComponent(entry.packageName)}&unpin=${entry.pinned}&confirm=true`, entry.packageName);
      }, [runTask]);
      const requestUpdate = React.useCallback(async (entry) => {
        await runTask('update', `/dsh-plugin-manager/update?package=${encodeURIComponent(entry.packageName)}`, entry.packageName);
      }, [runTask]);
      const install = React.useCallback(async (candidate) => {
        await runTask('install', `/dsh-plugin-manager/install?spec=${encodeURIComponent(candidate.spec)}`, candidate.repoName);
      }, [runTask]);
      const importMarket = React.useCallback(async (replace) => {
        setNotice(null);
        try {
          const result = await fetch(`/dsh-plugin-manager/market/import?replace=${replace}`, { method:'POST' }).then(readBody);
          await reloadMarket();
          setNotice({ kind:'ok', text:`已从内置候选清单${replace ? '重新导入' : '导入'} ${result.imported} 条，当前市场共 ${result.total} 条候选。导入只是登记信息，不会下载任何插件。` });
        } catch (error) { setNotice({ kind:'error', text:`导入失败：${error instanceof Error ? error.message : String(error)}` }); }
      }, [reloadMarket]);
      const addManual = React.useCallback(async () => {
        setNotice(null);
        try {
          const args = `spec=${encodeURIComponent(manualSpec.trim())}&note=${encodeURIComponent(manualNote.trim())}`;
          const result = await fetch(`/dsh-plugin-manager/market/add?${args}`, { method:'POST' }).then(readBody);
          setManualSpec(''); setManualNote('');
          await reloadMarket();
          setNotice({ kind:'ok', text:`已录入 ${result.entry.repoName}${result.entry.installable === false ? '（只是备注，没有识别到安装源，不能一键安装）' : '。可以直接「安装并启用」。'}。` });
        } catch (error) { setNotice({ kind:'error', text:`录入失败：${error instanceof Error ? error.message : String(error)}` }); }
      }, [manualSpec, manualNote, reloadMarket]);
      const removeCandidate = React.useCallback(async (candidate) => {
        setNotice(null);
        try {
          await fetch(`/dsh-plugin-manager/market?spec=${encodeURIComponent(candidate.key)}`, { method:'DELETE' }).then(readBody);
          await reloadMarket();
          setNotice({ kind:'info', text:`已从发现市场中移除 ${candidate.repoName}（不影响已经装好的文件）。` });
        } catch (error) { setNotice({ kind:'error', text:`移除失败：${error instanceof Error ? error.message : String(error)}` }); }
      }, [reloadMarket]);
      const matchesTextAndStatus = (entry) => { const text = `${entry.packageName} ${entry.description} ${entry.sourceLabel} ${entry.category}`.toLowerCase(); return (!query || text.includes(query.trim().toLowerCase())) && (status === '全部' || (status === '已启用') === entry.enabled); };
      const manager = state.entries.find((entry) => entry.packageName === managerPackageName);
      const officials = state.entries.filter((entry) => entry.source === 'official' && matchesTextAndStatus(entry));
      const pinned = state.entries.filter((entry) => entry.pinned && entry.packageName !== managerPackageName && matchesTextAndStatus(entry));
      const othersBase = state.entries.filter((entry) => entry.packageName !== managerPackageName && entry.source !== 'official' && !entry.pinned && matchesTextAndStatus(entry) && (category === '全部' || entry.category === category));
      const others = othersBase;
      const categories = ['全部', ...Array.from(new Set(state.entries.filter((entry) => entry.source !== 'official' && entry.packageName !== managerPackageName).map((entry) => entry.category))).sort()];
      const totalPages = Math.max(1, Math.ceil(others.length / pageSize)); const currentPage = Math.min(page, totalPages - 1); const pagedOthers = others.slice(currentPage * pageSize, (currentPage + 1) * pageSize);
      const marketMatches = (candidate) => {
        const text = `${candidate.repoName} ${candidate.owner} ${candidate.description} ${candidate.category}`.toLowerCase();
        return (!marketQuery || text.includes(marketQuery.trim().toLowerCase()))
          && (marketCategory === '全部' || candidate.category === marketCategory)
          && (marketStatus === '全部' || (marketStatus === '已安装') === candidate.installed);
      };
      const marketFiltered = market.entries.filter(marketMatches);
      const marketCategories = ['全部', ...Array.from(new Set(market.entries.map((entry) => entry.category))).sort()];
      const marketTotalPages = Math.max(1, Math.ceil(marketFiltered.length / pageSize)); const marketCurrentPage = Math.min(marketPage, marketTotalPages - 1); const pagedMarket = marketFiltered.slice(marketCurrentPage * pageSize, (marketCurrentPage + 1) * pageSize);
      const busyTask = task?.job.state === 'running' ? task.label : null;
      const githubUrlFor = (entry) => entry?.repository ? `https://github.com/${entry.repository}` : entry?.homepage && /^https?:\/\//.test(entry.homepage) ? entry.homepage : '';
      const githubUrlForCandidate = (candidate) => candidate?.url || (candidate?.owner && candidate?.repoName ? `https://github.com/${candidate.owner}/${candidate.repoName}` : '');
      const repoTitle = (entry) => entry.repository ? `在 GitHub 打开 ${entry.repository}` : entry.homepage ? `访问插件主页 ${entry.homepage}` : '仓库地址未声明';
      const repoTitleCandidate = (candidate) => candidate.url ? `在 GitHub 打开 ${candidate.owner}/${candidate.repoName}` : '仓库地址未声明';

      const row = (entry, protectedEntry = false) => {
        const busy = pending.includes(entry.packageName) || busyTask === entry.packageName;
        const repoUrl = githubUrlFor(entry);
        const baseClass = protectedEntry ? 'dshpm-row manager' : entry.pinned ? 'dshpm-row pinned' : 'dshpm-row';
        return jsxs('div', { className:baseClass, onDoubleClick: () => setDetail(entry), title:'双击查看详情', children:[
          jsxs('div', { className:'dshpm-name', style:cell, children:[entry.alias ? jsxs(React.Fragment, { children:[jsx('span', { className:'dshpm-alias-name', children: entry.alias }), jsx('span', { className:'dshpm-alias-orig', children: entry.packageName })] }) : entry.packageName, entry.version ? jsx('span', { className:'dshpm-version', children:`v${entry.version}` }) : null, updateInfo[entry.packageName] && !updateInfo[entry.packageName].loading ? (updateInfo[entry.packageName].skipped ? jsx('span', { className:'dshpm-version', style:{ opacity:.6 }, title:updateInfo[entry.packageName].reason || '跳过检查', children:'跳过' }) : updateInfo[entry.packageName].hasUpdate ? jsx('span', { className:'dshpm-version', style:{ color:'#2563eb' }, title:`最新 v${updateInfo[entry.packageName].latest}`, children:`→ v${updateInfo[entry.packageName].latest}` }) : updateInfo[entry.packageName].error ? jsx('span', { className:'dshpm-version', style:{ opacity:.6 }, title:updateInfo[entry.packageName].error, children:'检查失败' }) : updateInfo[entry.packageName].note ? jsx('span', { className:'dshpm-version', style:{ opacity:.5 }, title:updateInfo[entry.packageName].note, children:'无版本' }) : jsx('span', { className:'dshpm-version', style:{ opacity:.6 }, children:'已是最新' })) : null] }),
          jsx('span', { className:'dshpm-meta dshpm-category', style:cell, children:categoryLabel[entry.category] ?? entry.category }), jsx('span', { className:'dshpm-meta dshpm-source', style:cell, title:entry.sourceLabel, children:entry.sourceLabel }),
          jsx('span', { className:`dshpm-state ${entry.enabled ? 'on' : 'off'}`, style:cell, children:entry.enabled ? '已启用' : '未启用' }),
          jsxs('div', { className:'dshpm-actions', children:[
            protectedEntry || entry.protected
              ? jsxs(React.Fragment, { children:[
                  IconButton({ title:ACTION_COPY.detail, onClick:() => setDetail(entry), children: jsx('span', { children:'详' }) }),
                  IconButton({ title: entry.alias ? '编辑备注名称（当前：' + entry.alias + '）' : '设置备注名称', onClick:() => setAlias(entry), children: jsx('span', { style:{ color:'#6366f1' }, children:'✎' }) }),
                  jsx('span', { className:'dshpm-protected', children:'受保护' }),
                  repoUrl ? IconButton({ title:repoTitle(entry), onClick:openExternal(repoUrl), children: jsx(ExternalIcon, {}) }) : null,
                  IconButton({ title:entry.enabled ? `禁用 ${entry.packageName}` : `启用 ${entry.packageName}`, danger:!entry.enabled, onClick:() => requestToggle(entry), disabled:busy, children: busy ? jsx('span', { children:'…' }) : entry.enabled ? jsx('span', { style:{ color:'#b3352f' }, children:'停' }) : jsx('span', { style:{ color:'#258a49' }, children:'启' }) }),
                  entry.installed ? IconButton({ title: ACTION_COPY.checkUpdate, onClick: () => checkUpdate(entry), disabled: updateInfo[entry.packageName]?.loading, children: updateInfo[entry.packageName]?.loading ? jsx('span', { children:'…' }) : jsx('span', { style:{ color:'#2563eb' }, children:'检' }) }) : null
                ] })
              : jsxs(React.Fragment, { children:[
                  IconButton({ title:ACTION_COPY.detail, onClick:() => setDetail(entry), children: jsx('span', { children:'详' }) }),
                  IconButton({ title: entry.alias ? '编辑备注名称（当前：' + entry.alias + '）' : '设置备注名称', onClick:() => setAlias(entry), children: jsx('span', { style:{ color:'#6366f1' }, children:'✎' }) }),
                  repoUrl ? IconButton({ title:repoTitle(entry), onClick:openExternal(repoUrl), children: jsx(ExternalIcon, {}) }) : null,
                  IconButton({ title:entry.pinned ? '取消置顶，置顶的插件会被排到独立分区' : '置顶，会单独移到最上面的「已置顶」区', onClick:() => pin(entry, !entry.pinned), disabled:busy, children: entry.pinned ? jsx('span', { style:{ color:'var(--dsw-alias-brand-primary)', fontWeight:600 }, children:'★' }) : jsx('span', { children:'☆' }) }),
                  IconButton({ title:entry.enabled ? `禁用 ${entry.packageName}` : `启用 ${entry.packageName}`, danger:!entry.enabled, onClick:() => requestToggle(entry), disabled:busy, children: busy ? jsx('span', { children:'…' }) : entry.enabled ? jsx('span', { style:{ color:'#b3352f' }, children:'停' }) : jsx('span', { style:{ color:'#258a49' }, children:'启' }) }),
                  entry.installed ? IconButton({ title: ACTION_COPY.checkUpdate, onClick: () => checkUpdate(entry), disabled: updateInfo[entry.packageName]?.loading, children: updateInfo[entry.packageName]?.loading ? jsx('span', { children:'…' }) : jsx('span', { style:{ color:'#2563eb' }, children:'检' }) }) : null,
                  updateInfo[entry.packageName]?.hasUpdate ? IconButton({ title: `更新到 v${updateInfo[entry.packageName].latest}`, onClick: () => requestUpdate(entry), disabled: busy, children: jsx('span', { style:{ color:'#2563eb', fontWeight: 600 }, children:'升' }) }) : null,
                  IconButton({ title:`卸载 ${entry.packageName}（先确认是否取消置顶，会执行 pnpm remove 删除代码）`, danger:true, onClick:() => requestUninstall(entry), disabled:busy, children: jsx('span', { children:'卸' }) })
                ] })
          ] })
        ] }, entry.packageName);
      };

      const marketRow = (candidate) => {
        const busy = busyTask === candidate.repoName;
        const repoUrl = githubUrlForCandidate(candidate);
        const state = candidate.installed ? (candidate.enabled ? '已启用' : '已装未用') : (candidate.installable === false ? '待补源' : (candidate.inconsistent ? '数据错配' : '未安装'));
        const stateClass = candidate.installed && candidate.enabled ? 'on' : 'off';
        return jsxs('div', { className:'dshpm-row', onDoubleClick: () => setMarketDetail(candidate), title:'双击查看候选详情', children:[
          jsxs('div', { className:'dshpm-name', style:cell, children:[candidate.repoName, candidate.packageName && candidate.packageName !== candidate.repoName ? jsx('span', { className:'dshpm-version', children:candidate.packageName }) : null] }),
          jsx('span', { className:'dshpm-meta dshpm-category', style:cell, children:categoryLabel[candidate.category] ?? candidate.category }),
          jsx('span', { className:'dshpm-meta dshpm-source', style:cell, title:candidate.owner, children:candidate.owner }),
          jsx('span', { className:`dshpm-state ${stateClass}`, style:cell, children:state }),
          jsxs('div', { className:'dshpm-actions', children:[
            IconButton({ title:ACTION_COPY.detail, onClick:() => setMarketDetail(candidate), children: jsx('span', { children:'详' }) }),
            repoUrl ? IconButton({ title:repoTitleCandidate(candidate), onClick:openExternal(repoUrl), children: jsx(ExternalIcon, {}) }) : null,
            candidate.installed ? jsx('span', { className:'dshpm-protected', children:'已装' })
              : candidate.inconsistent ? jsx('span', { className:'dshpm-protected', style:{ color:'#b3352f' }, title:`清单里这条候选的 install 命令实际指向 github:${candidate.spec?.startsWith('github:') ? candidate.spec.replace(/^github:/,'') : '?'}（与你看到的 ${candidate.owner}/${candidate.repoName} 不一致），点仓库去核对结构`, children:'错配' })
              : candidate.installable === false ? jsx('span', { className:'dshpm-protected', title:'没有识别到 GitHub 源，请手动补仓库', children:'待补源' })
              : IconButton({ title:`安装并启用 ${candidate.repoName}`, onClick:() => install(candidate), disabled:busy, children: busy ? jsx('span', { children:'…' }) : jsx('span', { style:{ color:'#258a49', fontWeight:600 }, children:'装' }) }),
            candidate.installed ? null : IconButton({ title:`从发现市场移除 ${candidate.repoName}（不动已经装好的文件）`, onClick:() => removeCandidate(candidate), disabled:busy, children: jsx('span', { children:'×' }) })
          ] })
        ] }, candidate.key);
      };

      const table = (items, protectedEntry = false) => jsx('div', { className:protectedEntry ? '' : 'dshpm-table', children:jsxs(React.Fragment, { children:[protectedEntry ? null : jsx('div', { className:'dshpm-head', children:['插件','用途','来源 / 作者','状态','操作'].map((name) => jsx('span', { style:cell, children:name }, name)) }), items.length ? items.map((entry) => row(entry, protectedEntry)) : jsx('div', { className:'dshpm-empty', children:'没有符合当前筛选条件的插件。' })] }) });
      const marketTable = (items) => jsx('div', { className:'dshpm-table market', children:jsxs(React.Fragment, { children:[jsx('div', { className:'dshpm-head', children:['候选插件','用途','作者','状态','操作'].map((name) => jsx('span', { style:cell, children:name }, name)) }), items.length ? items.map(marketRow) : jsx('div', { className:'dshpm-empty', children:market.entries.length ? '没有符合当前筛选条件的候选。' : jsx(React.Fragment, { children:[jsx('div', { children:'发现市场还是空的。' }), jsx('div', { className:'dshpm-tip', children:'在下方「手动添加 GitHub 仓库」输入 owner/repo 或完整 URL（也可以让 AI 直接调用 add 接口来加），或者从内置候选清单导入。导入只是登记名字，不会下载任何代码。' })] }) })] }) });
      const guardText = guard?.action === 'uninstall'
        ? { title: `卸载 ${guard.entry.packageName}？`, body: '这会先把插件禁用并校验当前配置，确认不会拖垮 Profile，再从 bundles 里移走它，最后执行 pnpm remove 真正删除代码。卸载之后这条候选会自动回到「发现市场」，需要时可以重新安装。' }
        : { title: `${guard?.entry.packageName ?? ''} 已置顶`, body: '置顶的插件不能直接禁用或卸载，这是为了防止误操作。继续将先取消置顶，再执行你的操作。' };

      const renderTaskSteps = () => {
        if (!task) return null;
        const job = task.job;
        const startedAt = job.startedAt ? Date.parse(job.startedAt) : now;
        const currentSteps = job.steps.map((s, i) => ({ ...s, index:i, isLast: i === job.steps.length - 1 }));
        const lastIndex = currentSteps.findIndex((s) => s.isLast);
        const isRunning = job.state === 'running';
        const currentStep = isRunning && lastIndex >= 0 ? currentSteps[lastIndex] : null;
        const overallElapsed = isRunning ? now - (isFinite(startedAt) ? startedAt : now) : null;
        const totalSteps = currentSteps.length;
        const completedSteps = currentSteps.filter((s) => !s.isLast || job.state !== 'running').length;
        const progressPct = isRunning && totalSteps > 1 ? Math.min(95, Math.max(8, Math.round((completedSteps / Math.max(totalSteps - 1, 1)) * 100))) : (job.state === 'succeeded' ? 100 : 0);
        return jsxs('div', { children:[
          isRunning && currentStep ? jsxs('div', { style:{ marginTop:14 }, children:[
            jsx('div', { className:'dshpm-progress', children: jsx('div', { className:'dshpm-progress-bar', style:{ width:`${progressPct}%` } }) }),
            jsx('p', { className:'dshpm-sub', style:{ marginTop:8 }, children: task.kind === 'install' ? `正在「${currentStep.label}」，本次任务已用时 ${formatRelative(overallElapsed)}。安装依赖通常 30 秒到 3 分钟，若长时间卡在「下载依赖」请检查网络。` : `正在「${currentStep.label}」，本次任务已用时 ${formatRelative(overallElapsed)}。` })
          ] }) : null,
          jsx('ul', { className:'dsh-steps', children: currentSteps.map((s) => {
            const isCurrent = s.isLast && isRunning;
            // 失败定位：最后一步是「正在回滚」时，真正出错的是它前一步；否则就是最后一步。
            const rollbackTail = job.state === 'failed' && currentSteps.length > 0 && currentSteps[currentSteps.length - 1].label.includes('回滚');
            const failedIndex = job.state === 'failed' ? currentSteps.length - (rollbackTail ? 2 : 1) : -1;
            const toneClass = s.index === failedIndex ? 'failed' : (isCurrent ? 'running' : 'done');
            const completed = job.state === 'succeeded' || s.index < failedIndex;
            // 已完成步骤：at - startedAt；运行中的当前步骤：用本地时钟实时增长，不再停在 0 秒。
            const stepDuration = s.startedAt
              ? (isCurrent ? now - Date.parse(s.startedAt) : (s.at ? Date.parse(s.at) - Date.parse(s.startedAt) : null))
              : null;
            return jsxs('li', { className:`dshpm-step${isCurrent ? ' is-current' : ''}`, children:[
              jsxs('div', { className:'dshpm-step-head', children:[
                jsx('span', { className:`dshpm-step-dot ${toneClass}` }),
                jsxs('div', { className:'dshpm-step-body', children:[
                  jsxs('div', { className:'dshpm-step-label', children:[`${s.index + 1}. ${s.label}`, completed ? jsx('span', { style:{ marginLeft:8, color:'#258a49' }, children:'已完成' }) : null, s.index === failedIndex ? jsx('span', { style:{ marginLeft:8, color:'#d74747' }, children:'失败' }) : null] }),
                  jsxs('div', { className:'dshpm-step-meta', children:[
                    stepDuration != null && stepDuration >= 0 ? jsx('span', { children:`耗时 ${formatRelative(stepDuration)}` }) : null,
                    s.at ? jsx('span', { children:new Date(s.at).toLocaleTimeString() }) : null
                  ] }),
                  isCurrent && s.detail ? jsx('div', { className:'dshpm-step-detail', children:s.detail }) : null,
                  isCurrent && (s.at || s.startedAt) && now - Date.parse(s.at ?? s.startedAt) > 45000 ? jsx('div', { className:'dshpm-step-meta', style:{ color:'#9a6a00' }, children:'这一步已超过 45 秒没有新输出：大概率是网络较慢、pnpm 正在重试，可以继续等；若持续 5 分钟以上，请检查网络或代理后重试。' }) : null,
                ] })
              ] })
            ] }, `${s.index}:${s.label}`);
          }) }),
          job.state === 'failed' ? jsx('p', { className:'dshpm-notice error', role:'alert', children:job.error }) : null,
          job.state === 'succeeded' ? jsx('p', { className:'dshpm-notice ok', role:'status', children:task.kind === 'install' ? `已安装并启用 ${job.result?.packageName ?? task.label}。重启 Harness 后完全生效。` : task.kind === 'update' ? `已更新 ${task.label}。重启 Harness 后完全生效。` : `已彻底卸载 ${task.label}${job.result?.market?.returned ? '，并已退回发现市场' : ''}。重启 Harness 后完全生效。` }) : null,
          job.state === 'running' ? jsx('p', { className:'dshpm-sub', children:task.kind === 'install' ? '请不要关闭设置页：进度会自动刷新，遇到错误会显示在最后一步。' : task.kind === 'update' ? '更新会调用 pnpm update，请等待完成后让进度自然消失。' : '卸载会调用 pnpm remove，请等待完成后让进度自然消失。' }) : null
        ] });
      };

      const installedPanel = jsxs(React.Fragment, { children:[
        jsxs('div', { className:'dshpm-tools', children:[
          jsx('input', { className:'dshpm-search', value:query, onChange:(event) => setQuery(event.target.value), placeholder:'搜索名称、用途、作者或介绍' }),
          ['全部','已启用','未启用'].map((item) => jsx('button', { className:status === item ? 'dshpm-chip active' : 'dshpm-chip', type:'button', onClick:() => setStatus(item), children:item }, item))
        ] }),
        notice ? jsx('p', { className:`dshpm-notice ${notice.kind}`, role:'status', children:notice.text }) : null,
        restartPrompt ? jsxs('div', { className:`dshpm-restart-banner${restartPrompt.isManager ? ' danger' : ''}`, role:'status', children:[
          jsxs('span', { children:[restartPrompt.isManager ? jsx('b', { children:'更新了插件管理器自身。' }) : null, restartPrompt.kind === 'install' ? '安装完成，' : restartPrompt.kind === 'update' ? '更新完成，' : '卸载完成，', '重启 Harness 后变更才完全生效。', restartPrompt.isManager ? ' 重启期间本设置页会短暂中断。' : ''] }),
          jsxs('div', { className:'dshpm-restart-actions', children:[
            jsx('button', { className:'dshpm-button primary', type:'button', onClick:doRestart, children:'现在重启' }),
            jsx('button', { className:'dshpm-button', type:'button', onClick:() => { try { localStorage.setItem('dshpm-restart-pref', 'auto'); } catch {} dismissRestart(); }, children:'以后自动重启' }),
            jsx('button', { className:'dshpm-button', type:'button', onClick:dismissRestart, children:'稍后手动' })
          ] })
        ] }) : null,
        state.error ? jsx('p', { className:'dshpm-notice error', role:'alert', children:state.error }) : null,
        state.loading ? jsx('p', { className:'dshpm-sub', children:'正在读取当前 Profile…' }) : null,
        manager ? jsxs('section', { className:'dshpm-section', children:[jsx('h3', { className:'dshpm-section-title', children:'固定管理器' }), table([manager], true)] }) : null,
        pinned.length ? jsxs('section', { className:'dshpm-section', children:[jsxs('h3', { className:'dshpm-section-title', children:['已置顶 ', jsx('small', { children:`${pinned.length} 个，先在这里可以看到，按钮一键取消置顶` })] }), table(pinned)] }) : null,
        jsxs('section', { className:'dshpm-section', children:[jsxs('h3', { className:'dshpm-section-title', children:['DeepSeek 官方 ', jsx('small', { children:`${officials.length} 个组件` })] }), table(officials)] }),
        jsxs('section', { className:'dshpm-section', children:[jsxs('h3', { className:'dshpm-section-title', children:['其他插件 · 按用途 ', jsx('small', { children:`${others.length} 个结果` })] }), jsx('div', { className:'dshpm-tools', children:categories.map((item) => jsx('button', { className:category === item ? 'dshpm-chip active' : 'dshpm-chip', type:'button', onClick:() => setCategory(item), children:categoryLabel[item] ?? item }, item)) }), table(pagedOthers), others.length > pageSize ? jsxs('div', { className:'dshpm-pager', children:[jsx('button', { className:'dshpm-button', type:'button', disabled:currentPage === 0, onClick:() => setPage(currentPage - 1), children:'上一页' }), jsx('span', { children:`${currentPage + 1} / ${totalPages}` }), jsx('button', { className:'dshpm-button', type:'button', disabled:currentPage >= totalPages - 1, onClick:() => setPage(currentPage + 1), children:'下一页' })] }) : null] })
      ] });

      const marketPanel = jsxs(React.Fragment, { children:[
        jsxs('section', { className:'dshpm-section', children:[
          jsxs('h3', { className:'dshpm-section-title', children:['发现市场 ', jsx('small', { children:'浏览候选，点「装」一键安装；清单只登记不下载。' }), market.importable.available ? jsx('small', { children:`内置清单 ${market.importable.count ?? 0} 条 · ${market.importable.updated ?? ''}` }) : null] }),
          jsxs('div', { className:'dshpm-tools', children:[
            jsx('input', { className:'dshpm-search', value:marketQuery, onChange:(event) => setMarketQuery(event.target.value), placeholder:'搜索候选名称、作者或介绍' }),
            ['全部','未安装','已安装'].map((item) => jsx('button', { className:marketStatus === item ? 'dshpm-chip active' : 'dshpm-chip', type:'button', onClick:() => setMarketStatus(item), children:item }, item))
          ] }),
          jsx('div', { className:'dshpm-tools', children:marketCategories.map((item) => jsx('button', { className:marketCategory === item ? 'dshpm-chip active' : 'dshpm-chip', type:'button', onClick:() => setMarketCategory(item), children:categoryLabel[item] ?? item }, item)) }),
          market.error ? jsx('p', { className:'dshpm-notice error', role:'alert', children:market.error }) : null,
          market.loading ? jsx('p', { className:'dshpm-sub', children:'正在读取发现市场…' }) : marketTable(pagedMarket),
          marketFiltered.length > pageSize ? jsxs('div', { className:'dshpm-pager', children:[jsx('button', { className:'dshpm-button', type:'button', disabled:marketCurrentPage === 0, onClick:() => setMarketPage(marketCurrentPage - 1), children:'上一页' }), jsx('span', { children:`${marketCurrentPage + 1} / ${marketTotalPages}` }), jsx('button', { className:'dshpm-button', type:'button', disabled:marketCurrentPage >= marketTotalPages - 1, onClick:() => setMarketPage(marketCurrentPage + 1), children:'下一页' })] }) : null,
          jsx('div', { className:'dshpm-tools', children:
            jsx('button', { className:'dshpm-button', type:'button', onClick:() => setMarketToolsOpen(!marketToolsOpen), children: marketToolsOpen ? '收起手动添加 ▴' : '手动添加候选 / 从内置清单导入 ▾' })
          }),
          marketToolsOpen ? jsxs(React.Fragment, { children:[
            jsxs('div', { className:'dshpm-tools', children:[
              jsx('button', { className:'dshpm-button', type:'button', disabled:!market.importable.available, onClick:() => importMarket(false), children:market.entries.length ? '从内置清单补全候选' : '导入内置候选清单' }),
              market.entries.length && market.importable.available ? jsx('button', { className:'dshpm-button', type:'button', onClick:() => importMarket(true), children:'清空市场并重新导入' }) : null
            ] }),
            jsxs('div', { className:'dshpm-tools', children:[
              jsx('input', { className:'dshpm-search', value:manualSpec, onChange:(event) => setManualSpec(event.target.value), placeholder:'GitHub 仓库地址或 owner/repo', style:{ flex:'2 1 280px' } }),
              jsx('input', { className:'dshpm-search', value:manualNote, onChange:(event) => setManualNote(event.target.value), placeholder:'备注（可选）' }),
              jsx('button', { className:'dshpm-button', type:'button', disabled:!manualSpec.trim(), onClick:addManual, children:'加入候选' })
            ] }),
            jsx('p', { className:'dshpm-sub', children:'让 AI 帮忙：告诉 AI「用 POST /dsh-plugin-manager/market/add?spec=github:owner/repo 把仓库加进发现市场」，它可以按你的需求批量登记候选。' })
          ] }) : null
        ] })
      ] });

      const installedCounts = jsxs('div', { className:'dshpm-counts', children:[
        jsx('span', { className:'dshpm-count', children:[jsx('b', { children:state.entries.length  }, 'n'), ' 已装'] }),
        jsx('span', { className:'dshpm-count', children:[jsx('b', { children:state.entries.filter((entry) => entry.enabled).length  }, 'n'), ' 已启用'] }),
        jsx('span', { className:'dshpm-count', children:[jsx('b', { children:state.entries.filter((entry) => !entry.enabled).length  }, 'n'), ' 未启用'] }),
        jsx('span', { className:'dshpm-count', children:[jsx('b', { children:state.entries.filter((entry) => entry.pinned && entry.packageName !== managerPackageName).length  }, 'n'), ' 已置顶'] }),
        jsx('span', { className:'dshpm-count', children:[jsx('b', { children:state.conflicts.length  }, 'n'), ' 冲突'] })
      ] });
      const marketCounts = jsxs('div', { className:'dshpm-counts', children:[
        jsx('span', { className:'dshpm-count', children:[jsx('b', { children:market.entries.length  }, 'n'), ' 候选'] }),
        jsx('span', { className:'dshpm-count', children:[jsx('b', { children:market.entries.filter((entry) => entry.installed).length  }, 'n'), ' 已装'] }),
        jsx('span', { className:'dshpm-count', children:[jsx('b', { children:market.entries.filter((entry) => !entry.installed && entry.installable !== false).length  }, 'n'), ' 待装'] })
      ] });

      return jsxs('div', { className:'dshpm', children:[
        jsx('style', { children:css }),
        jsxs('header', { className:'dshpm-top', children:[
          jsxs('div', { children:[
            jsx('h2', { className:'dshpm-title', children:'插件管理' }),
            jsx('p', { className:'dshpm-sub', children:'已装的插件用来运行当前 Profile；发现市场只是「想装什么」的清单。换标签页切换。' })
          ] }),
          tab === 'market' ? marketCounts : installedCounts
        ] }),
        jsxs('div', { className:'dshpm-tabs', role:'tablist', children:[
          jsx('button', { className:`dshpm-tab${tab === 'installed' ? ' active' : ''}`, type:'button', role:'tab', 'aria-selected':tab === 'installed', onClick:() => setTab('installed'), children:'已装的插件' }),
          jsx('button', { className:`dshpm-tab${tab === 'market' ? ' active' : ''}`, type:'button', role:'tab', 'aria-selected':tab === 'market', onClick:() => setTab('market'), children:'发现市场' })
        ] }),
        tab === 'market' ? marketPanel : installedPanel,
        jsx('div', { className:'dshpm-pager', children:jsx('button', { className:'dshpm-button', type:'button', onClick:() => Promise.all([reload(), reloadMarket()]), children:'刷新全部' }) }),
        confirmation ? jsx('div', { className:'dshpm-modal-backdrop', role:'presentation', onMouseDown:() => closeConfirm(false), children:jsx('section', { className:'dshpm-modal', role:'dialog', 'aria-modal':'true', onMouseDown:(event) => event.stopPropagation(), children:jsxs(React.Fragment, { children:[
          jsxs('div', { className:'dshpm-modal-head', children:[jsx('h3', { children:`确认${confirmation.enabled ? '启用' : '禁用'} ${confirmation.entry.packageName}？` }), jsx('button', { className:'dshpm-button dshpm-close', type:'button', onClick:() => closeConfirm(false), children:'×' })] }),
          jsx('p', { className:'dshpm-description', children:'检测到以下冲突，继续可能产生重复注册或运行期报错。核心与官方组件不会被自动关闭。' }),
          jsx('ul', { className:'dshpm-conflict-list', children:confirmation.conflicts.map((item) => jsxs('li', { children:[jsx('b', { children:conflictLabel[item.kind] ?? item.kind  }, 'n'), `：${item.left} ↔ ${item.right}（${item.evidence}）`] }, `${item.kind}:${item.left}:${item.right}`)) }),
          jsxs('div', { className:'dshpm-modal-foot', children:[jsx('button', { className:'dshpm-button', type:'button', onClick:() => closeConfirm(false), children:'取消' }), jsx('button', { className:'dshpm-button primary', type:'button', onClick:() => closeConfirm(true), children:`继续${confirmation.enabled ? '启用' : '禁用'}` })] })
        ] }) }) }) : null,
        guard ? jsx('div', { className:'dshpm-modal-backdrop', role:'presentation', onMouseDown:() => closeGuard(false), children:jsx('section', { className:'dshpm-modal', role:'dialog', 'aria-modal':'true', onMouseDown:(event) => event.stopPropagation(), children:jsxs(React.Fragment, { children:[
          jsxs('div', { className:'dshpm-modal-head', children:[jsx('h3', { children:guardText.title }), jsx('button', { className:'dshpm-button dshpm-close', type:'button', onClick:() => closeGuard(false), children:'×' })] }),
          jsx('p', { className:'dshpm-description', children:guardText.body }),
          jsxs('div', { className:'dshpm-modal-foot', children:[jsx('button', { className:'dshpm-button', type:'button', onClick:() => closeGuard(false), children:'取消' }), jsx('button', { className:guard.action === 'uninstall' ? 'dshpm-button danger' : 'dshpm-button primary', type:'button', onClick:() => closeGuard(true), children:`${guard.entry.pinned ? '取消置顶并' : ''}${guard.action === 'uninstall' ? '彻底卸载' : '禁用'}` })] })
        ] }) }) }) : null,
        task ? jsx('div', { className:'dshpm-modal-backdrop', role:'presentation', onMouseDown:task.job.state === 'running' ? undefined : () => setTask(null), children:jsx('section', { className:'dshpm-modal', role:'dialog', 'aria-modal':'true', onMouseDown:(event) => event.stopPropagation(), children:jsxs(React.Fragment, { children:[
          jsxs('div', { className:'dshpm-modal-head', children:[jsx('h3', { children: task.job.state === 'failed' ? `${task.kind === 'install' ? '安装' : '卸载'}失败：${task.label}` : task.job.state === 'succeeded' ? `${task.kind === 'install' ? '安装' : '卸载'}完成：${task.label}` : `${task.kind === 'install' ? '正在安装' : '正在卸载'} ${task.label}` }), task.job.state === 'running' ? null : jsx('button', { className:'dshpm-button dshpm-close', type:'button', onClick:() => setTask(null), children:'×' })] }),
          renderTaskSteps()
        ] }) }) }) : null,
        marketDetail ? jsx('div', { className:'dshpm-modal-backdrop', role:'presentation', onMouseDown:() => setMarketDetail(null), children:jsx('section', { className:'dshpm-modal', role:'dialog', 'aria-modal':'true', onMouseDown:(event) => event.stopPropagation(), children:jsxs(React.Fragment, { children:[
          jsxs('div', { className:'dshpm-modal-head', children:[jsx('h3', { children:marketDetail.repoName }), jsx('button', { className:'dshpm-button dshpm-close', type:'button', onClick:() => setMarketDetail(null), children:'×' })] }),
          jsx('p', { className:'dshpm-description', children:marketDetail.description || '未提供介绍。' }),
          marketDetail.note ? jsx('p', { className:'dshpm-description', children:['备注：', marketDetail.note] }) : null,
          jsxs('dl', { className:'dshpm-detail-grid', children:[jsx('dt', { children:'用途' }), jsx('dd', { children:categoryLabel[marketDetail.category] ?? marketDetail.category }), jsx('dt', { children:'来源' }), jsx('dd', { children:marketDetail.source === 'manual' ? '手动添加' : marketDetail.source === 'uninstalled' ? '卸载后回到市场' : '内置候选清单' }), jsx('dt', { children:'作者' }), jsx('dd', { children:marketDetail.owner || '未声明' }), jsx('dt', { children:'仓库' }), jsx('dd', { children: marketDetail.url ? jsxs('a', { href:marketDetail.url, target:'_blank', rel:'noopener noreferrer', children:[marketDetail.url, ' ', jsx(ExternalIcon, {})] }) : '未声明' }), jsx('dt', { children:'安装源' }), jsx('dd', { children:marketDetail.spec || '未声明' }), jsx('dt', { children:'状态' }), jsx('dd', { children:marketDetail.installed ? `已安装${marketDetail.enabled ? '并启用' : '，未启用'}${marketDetail.packageName ? `（${marketDetail.packageName}）` : ''}` : '未安装' }), jsx('dt', { children:'安装命令' }), jsx('dd', { children:marketDetail.installCommand })] }),
          jsxs('div', { className:'dshpm-modal-foot', children:[
            marketDetail.url ? jsx('button', { className:'dshpm-button', type:'button', onClick:openExternal(marketDetail.url), children:'在 GitHub 打开' }) : null,
            jsx('button', { className:'dshpm-button danger', type:'button', onClick:() => { const candidate = marketDetail; setMarketDetail(null); removeCandidate(candidate); }, children:'移除' }),
            marketDetail.installed || marketDetail.installable === false ? null : jsx('button', { className:'dshpm-button primary', type:'button', onClick:() => { const candidate = marketDetail; setMarketDetail(null); install(candidate); }, children:'安装并启用' })
          ] })
        ] }) }) }) : null,
        detail ? jsx('div', { className:'dshpm-modal-backdrop', role:'presentation', onMouseDown:() => setDetail(null), children:jsx('section', { className:'dshpm-modal', role:'dialog', 'aria-modal':'true', onMouseDown:(event) => event.stopPropagation(), children:jsxs(React.Fragment, { children:[jsxs('div', { className:'dshpm-modal-head', children:[jsx('h3', { children:detail.packageName }), jsx('button', { className:'dshpm-button dshpm-close', type:'button', onClick:() => setDetail(null), children:'×' })] }), jsx('p', { className:'dshpm-description', children:detail.description }), jsxs('dl', { className:'dshpm-detail-grid', children:[jsx('dt', { children:'用途' }), jsx('dd', { children:detail.category }), jsx('dt', { children:'来源' }), jsx('dd', { children:detail.sourceLabel }), jsx('dt', { children:'版本' }), jsx('dd', { children:detail.version ?? '未声明' }), jsx('dt', { children:'状态' }), jsx('dd', { children:detail.pinned ? '已置顶（禁用 / 卸载前需先取消置顶）' : detail.enabled ? '已启用' : '未启用' }), jsx('dt', { children:'仓库' }), jsx('dd', { children: detail.repository ? jsxs('a', { href:`https://github.com/${detail.repository}`, target:'_blank', rel:'noopener noreferrer', children:[`https://github.com/${detail.repository}`, ' ', jsx(ExternalIcon, {})] }) : (detail.homepage ?? '未声明') }), jsx('dt', { children:'冲突声明' }), jsx('dd', { children:detail.declaredConflicts.length ? detail.declaredConflicts.join('、') : '无' })] })] }) }) }) : null
      ] });
    }
    function apply(ctx) { ctx.slots.inject('settings.section', () => ctx.slots.register({ name:'settings.section', id:'plugin-manager', order:16, label:() => '插件管理' }, PluginManagerSection)); }
    exports.inject = ['slots']; exports.apply = apply; return module.exports;
  }
});      const setAlias = React.useCallback(async (entry) => {
        const current = entry.alias || '';
        const next = window.prompt('为「' + entry.packageName + '」设置备注名称：\n（留空则还原为原名）', current);
        if (next === null) return;
        await fetch(`/dsh-plugin-manager/alias?package=${encodeURIComponent(entry.packageName)}&alias=${encodeURIComponent(next)}`, { method:'POST' }).then(readBody);
        setNotice({ kind:'info', text: next.trim() ? '已为 ' + entry.packageName + ' 设置备注「' + next.trim() + '」' : '已还原 ' + entry.packageName + ' 的备注名称' });
        setState(await fetch('/dsh-plugin-manager/inventory').then(readBody));
      }, []);


