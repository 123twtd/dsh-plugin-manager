<div align="center">

# @dsh/plugin-manager

独立于旧 `component-hub` 的 DSH 插件管理器 —— 以 Profile 事务和 Loader 真实验证为核心的插件控制面。

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Node](https://img.shields.io/badge/node-%3E%3D22-green.svg)](https://nodejs.org)
[![Tests](https://img.shields.io/badge/tests-22%20passing-brightgreen.svg)](#测试)
[![PRD](https://img.shields.io/badge/PRD-P0--P4%20%2B%20P5-blue.svg)](docs/PLUGIN-MANAGER-PRD.md)

</div>

---

## 这是什么

DeepSeek Harness（DSH）是一个以 Profile 为中心、通过 Cordis patch 合成配置树的 Agent 运行时。
插件以 npm 包形式安装，通过 `dsh.profile.bundles` 声明，由 `cordis.patch.yml` 控制启用/禁用。

本插件为 DSH 提供**插件生命周期控制面**：

- **清单**：读取 Profile bundles，区分官方 / 社区 / 未知来源，区分 installed / enabled 状态
- **冲突引擎**（7 类）：显式声明、重复 Service Provider、路由、命令、端口、重复插件 ID、缺失依赖、Node 版本不兼容
- **事务**：toggle / install / uninstall 全程快照 → 校验 → 失败回滚，不靠正则匹配 YAML
- **smoke check**：`node --check` 验证入口文件语法，作为 `verified` 状态证据
- **任务持久化**：job 状态落盘 `jobs.json`，进程重启后前端轮询不再 404
- **发现市场**：离线快照 + 手动录入 + 一键安装事务

它独立于旧 `component-hub`，不导入旧项目代码，也不把组件市场 UI 当作管理器。

## 目录结构

```
dsh-plugin-manager/
├── manager.js              # 核心管理器：清单、冲突、事务、smoke check、HTTP API
├── client/
│   └── client.js           # 设置页 UI：tab 布局、冲突确认、异步进度、响应式
├── cordis.patch.yml        # 本插件的 patch 声明
├── test.mjs                # 22 个单元测试
├── tests/render/           # 渲染数据测试与夹具
├── docs/
│   └── PLUGIN-MANAGER-PRD.md   # 产品需求文档（7 态模型、冲突引擎、事务流程）
├── LICENSE
└── package.json
```

## 快速开始

### 前置要求

- Node.js >= 22
- DSH（DeepSeek Harness）运行时
- pnpm（通过 corepack 或独立安装）

### 安装

本插件通过 DSH Profile 的 bundles 机制加载，不需要单独全局安装：

```bash
# 在 DSH 项目根目录
pnpm add github:123twtd/dsh-plugin-manager
# 然后在 package.json 的 dsh.profile.bundles 加入 @dsh/plugin-manager
```

### 运行测试

```bash
git clone https://github.com/123twtd/dsh-plugin-manager.git
cd dsh-plugin-manager
pnpm install   # 安装 yaml 依赖
node --test test.mjs
```

## DSH 插件生态

DSH 插件按来源分四类：

| 来源 | 说明 | 示例 |
|---|---|---|
| Official | DeepSeek 官方维护的核心组件 | `@deepseek-ai/dsh-client-runtime`、`@dsh/plugin-manager` |
| Verified | 官方验证的社区插件 | 待 registry 上线后登记 |
| Community | 社区开发，spec 归一化后可一键安装 | `github:owner/repo` |
| Unknown | 已安装但无来源信息 | 仅有 node_modules 记录 |

按架构角色分类：Core Service、Provider、Runtime Plugin、Client Plugin、Full-stack Plugin、Bundle、Workflow、Theme/UI、Skill Pack。

### 插件状态模型

```
discovered → installed → enabled → active → verified
                ↓           ↓        ↓
             failed    quarantined
```

- **discovered**：已发现（在市场或 node_modules 中）
- **installed**：依赖已安装到 node_modules
- **enabled**：已加入 Profile bundles 且未被 patch 禁用
- **active**：Loader 已成功激活（本版本以 smoke check 为证据基础）
- **verified**：通过指定等级的真实验证（`node --check` 语法校验）
- **failed**：安装、配置或启动失败
- **quarantined**：存在风险或冲突，被隔离

安装不等于启用，启用不等于运行，运行不等于验证通过。

## 核心 API

### HTTP 接口

| 方法 | 路径 | 说明 |
|---|---|---|
| GET | `/dsh-plugin-manager/inventory` | 当前 Profile 插件清单 + 冲突 |
| GET | `/dsh-plugin-manager/plan?package=&enabled=` | 预览 toggle 影响 |
| POST | `/dsh-plugin-manager/toggle?...` | 启用/禁用事务 |
| POST | `/dsh-plugin-manager/install?spec=` | 异步安装，返回 jobId |
| GET | `/dsh-plugin-manager/install?jobId=` | 轮询安装进度 |
| POST | `/dsh-plugin-manager/uninstall?package=&confirm=true` | 卸载事务 |
| GET | `/dsh-plugin-manager/market` | 发现市场候选列表 |
| POST | `/dsh-plugin-manager/market/add?spec=&note=` | 手动添加候选 |
| POST | `/dsh-plugin-manager/pin?package=&pinned=` | 置顶/取消置顶 |

### 事务流程

所有变更操作执行标准事务：

```
读取状态 → 生成计划 → 展示影响 → 创建快照 → 修改 Profile
→ dump-config 校验 → smoke check → 成功提交 / 失败回滚
```

没有完整事务结果不得显示"成功"。

### 冲突引擎（7 类）

| 类型 | kind | 严重度 | 说明 |
|---|---|---|---|
| 显式声明 | `explicit` | high | 作者在 `dsh-market.json` 声明 conflicts |
| 重复 Service | `service` | critical | 同一 Provider 被两个插件 provides |
| 路由冲突 | `route` | high | 重复 HTTP 路由 |
| 命令冲突 | `command` | high | 重复命令名 |
| 端口冲突 | `port` | critical | 重复端口占用 |
| 重复插件 ID | `duplicate-id` | critical | 两个 bundle 声明同一 insert id |
| 缺失依赖 | `missing-dependency` | high | 声明的 DSH 依赖未安装 |
| 版本不兼容 | `version` | high | Node 版本不满足 engines.node |

低风险显式冲突可作为自动禁用候选；官方核心和核心 Service 不会自动关闭。

## 开发指南

### 技术分层

```
plugin-manager-core    状态模型、Manifest、依赖图、冲突、事务、策略
plugin-manager-dsh     DSH Bundle、Profile、Loader、dsh plugin 集成
plugin-manager-ui      列表、详情、计划、冲突、进度、结果
```

### 如何开发 DSH 插件

1. 创建 npm 包，`package.json` 中声明 `dsh.bundle.patch` 指向你的 `cordis.patch.yml`
2. 在 `dsh-market.json` 中声明 services / resources / conflicts / dependencies
3. 用 `pnpm pack` 或发布到 GitHub 后，通过 `spec` 归一化机制安装

```json
// package.json
{
  "name": "my-dsh-plugin",
  "dsh": {
    "bundle": { "patch": "./cordis.patch.yml" }
  }
}
```

```json
// dsh-market.json
{
  "services": { "provides": ["my-feature"] },
  "resources": { "commands": ["my-cmd"] },
  "conflicts": ["other-plugin"],
  "dependencies": ["@dsh/some-core"]
}
```

## 测试

22 个测试覆盖：

- 17 个原有测试：清单读取、状态判断、冲突检测、事务回滚、monorepo 降级、市场归一化
- 5 个新增测试：重复插件 ID、缺失依赖、版本不兼容、job 持久化恢复、smoke check

```bash
node --test test.mjs
```

## 开发阶段

| 阶段 | 状态 | 门禁 |
|---|---|---|
| P0 契约冻结 | ✅ | 状态模型、Manifest、错误码定义完成 |
| P1 只读清单 | ✅ | 准确区分 installed / enabled |
| P2 冲突计划 | ✅ | 7 类冲突夹具测试通过 |
| P3 事务变更 | ✅ | 启动失败、回滚失败均有测试证据 |
| P4 最小 UI | ✅ | 列表 + 详情 + 计划 + 冲突确认 |
| P5 发现市场 | ✅ 首子能力 | 离线快照 + 一键安装 |

## 贡献

欢迎提交 Issue 和 Pull Request。请先阅读 [CONTRIBUTING.md](CONTRIBUTING.md)。

## 行为准则

本项目遵循 [Contributor Covenant](CODE_OF_CONDUCT.md) 行为准则。

## 变更日志

详见 [CHANGELOG.md](CHANGELOG.md)。

## 许可证

[MIT](LICENSE) © 2026 123twtd
