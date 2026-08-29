# DSH Plugin Manager

这是独立于旧 `component-hub` 的 DSH 插件管理器。它不导入旧项目代码，也不把组件市场 UI 当作管理器。

当前独立闭环：

- 读取 Profile bundles，区分官方、社区和未知来源，区分安装/启用状态；
- 扫描显式冲突、重复 Service Provider、路由、命令、端口冲突、**重复插件 ID**、**缺失 DSH 依赖**、**Node 版本不兼容**；
- 在 Harness 的“设置 → 插件管理”中读取当前 Profile 的真实清单；
- 设置页内用 tab 切分「已装的插件」与「发现市场」两个独立栏目，避免市场被淹没在长插件表里；
- `GET /dsh-plugin-manager/inventory` 与 `GET /dsh-plugin-manager/plan?package=<name>&enabled=true`：供原生设置页调用；
- `POST /dsh-plugin-manager/toggle?...`：启用/禁用事务；每次写入前创建 Patch 快照，`dump-config` 失败自动恢复；
- 仅明确的低风险显式冲突可作为自动禁用候选；官方和核心 Service 不会自动关闭。
- 原生界面在真正切换前用应用内弹窗确认冲突（不依赖 `window.confirm`），成功后给出结果提示；低风险显式冲突才允许自动关闭对方。
- Patch 一律按 YAML 结构读写（`yaml` 的 AST），不使用正则匹配：`{ id: x, disabled: true }` 这类流样式与手写块样式都能正确识别。
- 写入使用块状样式；启用一个插件时只摘掉 `disabled` 标记，用户手写的 `config` 等字段会被保留。
- 改动落在 `cordis.patch.yml`，运行时才合成配置树，因此重启 Harness 后完全生效。

## 发现市场（P5 的第一个子能力）

市场只登记候选信息，**不下载任何代码**。当前唯一数据来源是 `dsh-find-plugin` 自带的离线快照
`node_modules/dsh-find-plugin/data/registry-snapshot.json`，导入后写入
`~/.dsh/profiles/<profile>/.dsh-plugin-manager/market.json`。

- 候选与已装清单按 **归一化后的 spec** 做 join：`github:Owner/Repo`、`https://github.com/o/r.git`、
  `github:o/r#ref` 都归一到 `github:o/r`，因此仓库名和包名不一致也能对上。
- 重复导入按 spec 去重，已有条目的 `note` 与登记时间会保留。
- 点「安装并启用」才真正拉包，事务顺序：
  快照 `package.json` 与 `pnpm-lock.yaml` → `pnpm add <spec>` → 写入 `dsh.profile.bundles`
  → 清掉既往 `disabled` 标记 → `dsh --dump-config` 校验 → 失败则恢复两个文件并 `pnpm remove`。
- 安装是异步任务：`POST /dsh-plugin-manager/install?spec=` 返回 `jobId`，
  用 `GET /dsh-plugin-manager/install?jobId=` 轮询，前端每 1.5 秒拉一次并展示步骤。
  每一步都同时带 `startedAt` 与 `at`，前端由此计算耗时；正在进行中的步骤会被高亮成蓝色脉冲点。
  安装期间整体进度条会按完成步骤占比推进。
- **任务持久化**：job 状态落盘到 `~/.dsh/profiles/<profile>/.dsh-plugin-manager/jobs.json`，
  进程重启后前端轮询不再拿到 404，已完成任务的状态可恢复。
- pnpm 可能只在 corepack 缓存里，按 `pnpm` → `corepack pnpm` → corepack 缓存中的 `pnpm.cjs` 三级回退解析。

- 手动录入：`POST /dsh-plugin-manager/market/add?spec=&note=`，支持只填包名（标为「待补源」，不能一键安装）。
  AI 也可以直接调这个接口把任意 `github:owner/repo` 加进发现市场，再让用户在面板里一键安装。
- 候选可随时「舍弃」：`DELETE /dsh-plugin-manager/market?spec=<key>`，按 entry 的 `key` 命中，
  没有安装源的条目也能删掉；只影响市场记录，不动已安装文件。
- 行操作内置「在 GitHub 打开」图标，详情弹窗也含可点击的仓库地址，直接新开标签跳转。

接口一览：`GET /market`、`POST /market/import[?replace=true]`、`POST /market/add`、
`DELETE /market?spec=`、`POST /install?spec=`、`GET /install?jobId=`。

## 卸载事务

顺序：置顶检查 → 先禁用并 `dump-config` 校验 → 移出 `bundles` → `pnpm remove` 真正删代码
→ `dump-config` 校验 → 成功后回流市场；任一步失败则恢复 `package.json` / `cordis.patch.yml` /
`pnpm-lock.yaml` 并按需重装。

- **必须先显式确认**：`uninstallPlugin()` 要求 `confirm: true`，HTTP 接口要求 `confirm=true`。
  卸载会删除代码，不允许被误触或脚本串台触发。
- **先禁用再删除**：先把插件置为 disabled 并校验配置树，确认不会拖垮 Profile 才真正删除。
- **自动回流市场**：原本就在市场里的无需写入（已装状态是实时 join 的，依赖消失即变回「未安装」）；
  原本不在市场里的会用它的 spec 与 package.json 信息补一条候选，标 `source: 'uninstalled'`。
- 回滚顺序是硬约束：**补偿性的 pnpm 操作会重写甚至删掉 `pnpm-lock.yaml`，所以 lockfile 的恢复必须排在它之后**。

接口：`POST /dsh-plugin-manager/uninstall?package=&unpin=&confirm=true`、`GET /dsh-plugin-manager/uninstall?jobId=`。

## 置顶

- 持久化在 `~/.dsh/profiles/<profile>/.dsh-plugin-manager/pins.json`，与 `market.json` 并列。
- 设置页中置顶项单独显示在「已置顶」分区（独立于「官方」与「其他插件」），
  并加左侧色条 + 背景色 + 列表紧凑星标，肉眼一眼就能分清。
- 置顶项不能直接禁用或卸载：前端弹二次确认，说明需先取消置顶；确认后自动取消置顶再继续。
  后端 `planToggle` 也会返回 `code: 'PINNED'` 兜底拦截。
- 官方核心组件与插件管理器本体不可置顶、不可卸载。

接口：`POST /dsh-plugin-manager/pin?package=&pinned=true|false`。

暂不支持：联网实时搜索、编辑已有候选的备注、卸载后的磁盘空间回收审计。

## Smoke Check（verified 状态）

`dump-config` 验证配置树合法后，`smokeCheck` 再对每个已启用 bundle 的入口文件执行 `node --check` 语法校验。
这不是完整 Loader 启动，但能捕获入口文件缺失和语法错误，是 `verified` 状态的证据基础。
toggle / install / uninstall 的返回值均带 `verification: { verified, checked, issues, verifiedAt }`。
失败不回滚——插件仍处于 enabled，但 `issues` 会提示用户具体哪个文件出了问题。
