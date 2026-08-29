# 贡献指南

感谢你对 @dsh/plugin-manager 的兴趣！本文档说明如何参与贡献。

## 开发环境

```bash
git clone https://github.com/123twtd/dsh-plugin-manager.git
cd dsh-plugin-manager
pnpm install
node --test test.mjs
```

要求：Node.js >= 22，pnpm（通过 corepack 或独立安装）。

## 代码规范

- 使用 ES Modules（`"type": "module"`）
- 不引入新依赖除非必要；当前仅依赖 `yaml`
- 注释用中文（与现有代码一致），公开 API 补 JSDoc
- 不使用正则匹配 YAML，一律走 `yaml` 的 AST
- 事务操作必须遵循"快照 → 修改 → 校验 → 失败回滚"模式

## 提交规范

使用 Conventional Commits：

```
<type>: <description>

[optional body]
```

type 包括：`feat`（新功能）、`fix`（修复）、`docs`（文档）、`refactor`（重构）、`test`（测试）、`chore`（杂项）。

示例：
```
feat: 新增 quarantine 状态持久化
fix: 修复显式冲突检测比较对象错误
docs: 补充 DSH 生态说明
```

## 提交 Pull Request

1. Fork 仓库并创建 feature 分支（`feat-xxx` / `fix-xxx`）
2. 确保所有测试通过：`node --test test.mjs`
3. 如果新增功能，补充对应测试
4. PR 描述说明变更动机和影响
5. 不要提交 `package-lock.json`（本项目用 pnpm）
6. 不要提交渲染测试截图（`tests/render/shot-*.png` 已 gitignore）

## 测试

```bash
# 单元测试
node --test test.mjs

# 渲染数据测试
node tests/render/render-data-test.mjs
```

新增冲突类型、事务变更或状态转换时，必须补充对应夹具测试。

## 发布流程

1. 更新 `CHANGELOG.md`
2. 更新 `package.json` 的 `version`
3. 创建 git tag `vX.Y.Z`
4. 推送 tag 触发 release

## 报告问题

提交 Issue 时请包含：
- DSH 版本和 Node 版本
- 复现步骤
- 期望行为与实际行为
- 相关日志（如有）
