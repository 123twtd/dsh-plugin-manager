# 变更日志

本格式基于 [Keep a Changelog](https://keepachangelog.com/zh-CN/1.1.0/)，版本号遵循 [语义化版本](https://semver.org/lang/zh-CN/)。

## [0.2.0] - 2026-08-29

### 新增

- **检查更新 `checkUpdate`**：联网查询已装插件是否有新版本。npm 包走 `registry.npmjs.org` 的 dist-tags；github 包走 GitHub API 的 latest release 或最新 tag。离线/网络异常时返回降级提示而非抛错
- **更新事务 `updatePlugin`**：复用 install 的事务结构（快照 → pnpm update → dump-config → 分层验证 → 失败回滚）。保留用户配置（bundles/patch/pins/market）不动，只换代码。官方核心组件受保护不可更新
- **`startUpdate`**：异步 job，前端轮询进度，和 install/uninstall 一致
- **HTTP 接口**：`GET /dsh-plugin-manager/check-update?package=` + `POST /dsh-plugin-manager/update?package=`，通用 job 查询合并 install/uninstall/update
- **UI 检查更新按钮**：每个已装插件卡片新增「检」按钮，一键联网查询；有更新时显示版本变化（`v1.0.0 → v1.1.0`）和「升」按钮，走异步进度
- **5 个新测试**：checkUpdate 缺失包/无版本号/npm registry 查询、updatePlugin 拒绝核心组件/拒绝缺失包

### 变更

- 版本号升至 `0.2.0`（新增面向用户的功能 API）
- job 查询接口合并：install/uninstall/update 共用 `GET ?jobId=` 轮询
- 成功提示文案统一"验证发现 N 个问题"（原"smoke check"措辞）

## [0.1.1] - 2026-08-29

### 新增

- **分层验证 `verifyProfile`**：升级 smoke check 为三层验证——syntax（`node --check`）→ config（`dump-config`）→ loader（真实 dsh 进程启动，等待 ready 信号或超时崩溃检测）。dsh 不可用时降级到 syntax 层，`degraded` 字段如实标注
- **`loaderSmokeTest`**：启动真实 dsh 进程，等待 stderr 输出 ready/listening 信号，超时 15s 或异常退出即视为 Loader 启动失败
- **E2E 测试夹具**：用临时 Profile 跑真实 pnpm install/uninstall 并断言最终态（pnpm 不可用时自动跳过）
- **3 个新测试**：verifyProfile 语法层捕获错误、verifyProfile 合法插件通过、E2E 真实 pnpm install/uninstall

### 变更

- toggle / install / uninstall 的 `verification` 字段从 `smokeCheck` 升级为 `verifyProfile`，新增 `level` 字段（syntax/config/loader）
- `smokeCheck` 保留为兼容旧调用方的语法层子集

## [0.1.0] - 2026-08-29

### 新增

- **冲突引擎 7 类全覆盖**：在原有 explicit / service / route / command / port 基础上，新增 duplicate-id（重复插件 ID）、missing-dependency（缺失 DSH 依赖）、version（Node 版本不兼容）三类检测
- **任务持久化**：job 状态落盘到 `~/.dsh/profiles/<profile>/.dsh-plugin-manager/jobs.json`，进程重启后前端轮询不再拿到 404
- **Smoke check**：`dump-config` 校验后对每个已启用 bundle 执行 `node --check` 语法校验，作为 `verified` 状态证据基础；toggle / install / uninstall 返回值均带 `verification` 字段
- **5 个新测试**：重复 ID 检测、缺失依赖检测、版本不兼容检测、job 持久化恢复、smoke check 验证
- **开源项目文件**：CONTRIBUTING.md、CODE_OF_CONDUCT.md、CHANGELOG.md、.github/ 模板与 CI workflow
- **README 重写**：badges、目录结构、快速开始、DSH 插件生态介绍、状态模型、API 文档、开发指南

### 修复

- 修复 `inspectProfile` 中显式冲突检测的逻辑错误：`right.declaredConflicts.includes(right.packageName)` 应为 `.includes(left.packageName)`，原来把 right 和自身比较

### 变更

- `startInstall(profile, spec)` 签名改为 `startInstall(profile, dir, spec)`，job 持久化需要 dir 参数
- `startUninstall(profile, packageName, options)` 签名改为 `startUninstall(profile, dir, packageName, options)`
- `getJob(id)` 签名改为 `getJob(dir, id)`，进程重启后从磁盘恢复
- `smokeCheck` 导出为公共 API
- client.js 在 toggle / install / uninstall 成功提示中显示 smoke check 结果
- `.gitignore` 新增渲染测试截图和 `package-lock.json` 排除
- 移除误入库的 `package-lock.json` 和 8 张渲染测试截图

### 之前已有的能力（v0.1.0 初始）

- 清单读取：区分官方 / 社区 / 未知来源，区分 installed / enabled
- toggle 事务：快照 → 写 patch → dump-config 校验 → 失败回滚
- install / uninstall 事务：pnpm add/remove + lockfile 恟复顺序
- monorepo 合集仓库降级：缺 `dsh.bundle.patch` 的根包自动探测合法子包
- pnpm 三级回退：`pnpm` → `corepack pnpm` → corepack 缓存中的 `pnpm.cjs`
- 发现市场：离线快照导入 + 手动录入 + spec 归一化
- 安全护栏：管理器自身不可禁用/卸载，官方核心受保护，置顶项需先取消置顶
- UI：tab 布局、分区渲染、异步进度、响应式、无障碍
