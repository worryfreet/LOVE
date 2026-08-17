# LOVE 代理文档索引

## 基础技术治理

- 前端与 BFF 基于 Next.js App Router、React 19、TypeScript、React Three Fiber 与 Three.js。
- 修改 TypeScript/React/Three.js/Node.js 代码后必须通过 `npm run lint`、`npm run typecheck`、`npm run test` 与 `npm run build`。
- 场景只消费规范化 `LoveProjectConfig`；数据库、Cookie、上传临时态不得进入 Three.js 实体域。
- 单个代码文件不得超过 1000 行；创作者、访客、场景、后端和存储职责分别组织。

## 产品与架构文档

`prd/shared-romantic-experience.md` - 分享链接“沉浸浪漫 / 自由享受”双模式、约一分钟叙事时间轴、路径前方玫瑰开放、情书暂停、流星结尾、状态机与验收方案；设计或实现访客分享体验时必读。

`frontend/architecture.md` - LOVE 前端、场景运行时、创作者工作台、访客体验和验证约束；修改任何界面或场景代码时必读。

`backend/architecture.md` - PostgreSQL、对象存储、无账号管理凭证、发布快照和媒体隐私边界；修改服务端逻辑时必读。

`backend/api.md` - LOVE Route Handlers 的鉴权、输入、响应和错误语义；进行前后端对接时必读。

`backend/deployment.md` - Docker Compose、数据库迁移、Nginx、Workbench 发布、备份与回滚约束；部署或修改生产配置时必读。

## 当前任务文档

`workflow/260816-extract-love-project.md` - 从 ModelStudio 抽离花海小院、实现无账号定制/发布/分享，并部署到 `love.atimefriend.cn` 的完整实施计划。

`workflow/260817-consolidate-master-production.md` - 将 LOVE 全部分支收敛到唯一 `master` 并以该分支完成生产发布；处理分支治理和本次上线时读取。

## 已完成任务文档

`workflow/done/260817-slow-romantic-walk-sky-deploy.md` - 已完成沉浸模式 18 秒院门至屋门直行、2 米玫瑰开放、繁星流星增强、终幕双层文案防遮挡与生产发布；维护自动剧情或浪漫天空时读取。

`workflow/done/260817-unified-photo-wall-door-transition.md` - 已完成标准比例八联照片墙、按实际位置上传与默认回退、单支大蜡烛、格栅移除、双向过门自动关门和开门外景恢复；维护照片定制或门户切换时读取。

`workflow/done/260817-refine-camera-interior.md` - 已完成开局右前方全景机位、前墙/右墙与桌面照片编排、三株绣球花自然摆放及生产发布；复核相同场景时读取。

`workflow/done/260817-refine-cottage-furnishing.md` - 已完成信件内收、绣球花束重排、暖木书柜替换默认床铺及东墙照片避让；维护室内陈设时读取。

`workflow/done/260817-immersive-romantic-share.md` - 已完成分享页沉浸浪漫与自由享受双模式、63 秒自动镜头、情书珍藏门禁、GPU 玫瑰开放波、流星终幕与原地控制交接；维护分享体验时读取。

`workflow/done/260817-smooth-interior-loading-deploy.md` - 已完成小屋首次打开时的独立 Suspense 边界、epoch 首帧握手、门缝暖光加载幕布与生产发布；维护进入小屋加载或复核本次 release 时读取。

## 全局重要记忆

- ModelStudio 只作为源副本，不删除或移动其花海小院代码。
- 公开链接读取不可变发布版本；草稿修改不会直接污染访客页面。
- 创作者管理凭证与访客短码必须完全分离。
- LOVE 唯一长期分支为 `master`：新功能先修改并验收本地 `master`，再推送 `origin/master`，最后由服务器拉取最新 `origin/master` 并以同一 SHA 发布；不再创建其他开发或发布分支。
