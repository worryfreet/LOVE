# LOVE 代理文档索引

## 基础技术治理

- 前端与 BFF 基于 Next.js App Router、React 19、TypeScript、React Three Fiber 与 Three.js。
- 修改 TypeScript/React/Three.js/Node.js 代码后必须通过 `npm run lint`、`npm run typecheck`、`npm run test` 与 `npm run build`。
- 场景只消费规范化 `LoveProjectConfig`；数据库、Cookie、上传临时态不得进入 Three.js 实体域。
- 单个代码文件不得超过 1000 行；创作者、访客、场景、后端和存储职责分别组织。

## 产品与架构文档

`frontend/architecture.md` - LOVE 前端、场景运行时、创作者工作台、访客体验和验证约束；修改任何界面或场景代码时必读。

`backend/architecture.md` - PostgreSQL、对象存储、无账号管理凭证、发布快照和媒体隐私边界；修改服务端逻辑时必读。

`backend/api.md` - LOVE Route Handlers 的鉴权、输入、响应和错误语义；进行前后端对接时必读。

`backend/deployment.md` - Docker Compose、数据库迁移、Nginx、Workbench 发布、备份与回滚约束；部署或修改生产配置时必读。

## 当前任务文档

`workflow/260816-extract-love-project.md` - 从 ModelStudio 抽离花海小院、实现无账号定制/发布/分享，并部署到 `love.atimefriend.cn` 的完整实施计划。

`workflow/260817-refine-camera-interior.md` - 依据用户截图调整开局外景机位、室内相框陈列与桌面绣球花，并完成本地门禁和生产发布。

## 全局重要记忆

- ModelStudio 只作为源副本，不删除或移动其花海小院代码。
- 公开链接读取不可变发布版本；草稿修改不会直接污染访客页面。
- 创作者管理凭证与访客短码必须完全分离。
