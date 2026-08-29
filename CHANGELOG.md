# 变更日志

本格式基于 [Keep a Changelog](https://keepachangelog.com/zh-CN/1.1.0/)，版本号遵循 [语义化版本](https://semver.org/lang/zh-CN/)。

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
