# 抽离 LOVE 独立项目与可分享定制体验

## 目标

- 将 ModelStudio 当前工作区中的“花海小院”完整复制到独立项目 `LOVE`，不删除、不移动、不重写 ModelStudio 原有实现。
- LOVE 打开后直接呈现可交互场景，不再经过模型库或场景库。
- 创作者无需先注册账号即可填写姓名、信件、照片等内容，预览确认后发布；接收者通过短链接直接访问只读成品，不登录、不进入编辑器。
- 新项目使用 Next.js App Router 与 Node.js Runtime，同时具备数据库、图片存储、发布快照、短链接和独立部署能力。
- 绑定远程仓库 `git@github.com:worryfreet/LOVE.git`，但在确认远程是否已有历史前禁止强推或覆盖。
- 所有功能和本地生产门禁通过后，使用 `alibabacloud-workbench-cli` 连接既有阿里云 ECS，将最终版本部署到 `https://love.atimefriend.cn`；服务器现有 SSH Key 只用于只读拉取 LOVE 仓库，不复制、不打印、不下载私钥。

## 现状审计

- 源项目为 React 19 + TypeScript + Vite + React Three Fiber + Three.js；冻结时花海小院场景依赖闭包已按当前工作树复制。源工作随后整理为 `f5b047c3acaeb04007ed7a30f00c02b1d85a0590`，场景目录为 `54` 个文件、约 `6.3 MB`。
- 迁移开始时源基线为 `e40ae8a1f59f5d23d675579b9465daabf893be4d` 加未提交的花海、共享花朵与测试改动；LOVE 复制的是该实时工作树而非只复制提交。源仓库现已由原项目自行提交为 `f5b047c` 且工作树干净，LOVE 未删除或移动其中任何代码。
- `LOVE` 已在远程原有 `f78f706 Initial commit` 历史上克隆，并绑定 `git@github.com:worryfreet/LOVE.git`，实施分支为 `codex/extract-love-project`。
- 当前入口仍是通用 ModelStudio 路由 `/scenes/cottage-flower-garden/edit`；新项目需要拆成独立场景入口、创作者工作台和只读分享入口。
- 当前花园调参保存依赖 Vite 开发服务把配置写回仓库 JSON，只适合开发者，不支持多用户部署。
- 当前室内陈设存放在 `sessionStorage`，上传照片被压缩后写成 data URL；它不能跨设备分享，也不能作为线上数据权威。
- 当前入口铭牌姓名和天空 `I LOVE YOU!` 文案仍是代码常量；情书文字已进入参数 schema，九张照片和室内布局已有可复用编辑能力。

## 产品模式与路由

### 体验路由

- `/`：直接加载默认花海小院演示场景，保留轻量“定制这座小院”入口，不出现 ModelStudio 目录页。
- `/create`：四步式新建向导，创建草稿并签发私密管理凭证。
- `/studio/[projectId]`：创作者工作台；通过 HttpOnly 编辑会话访问，提供基础定制、实时预览和可选高级布局。
- `/preview/[projectId]`：只对当前创作者会话开放的草稿预览，使用与访客完全相同的渲染组件。
- `/s/[slug]`：公开只读短链接；接收者无需登录，打开即进入已发布场景。
- `/claim/[secret]`：一次性或可轮换的管理密钥入口；校验成功后写入安全会话并立即重定向，避免编辑密钥长期暴露在地址栏和 Referer 中。

### 创作者流程

1. 填写赠送者、接收者和礼物标题。
2. 上传 `1–9` 张照片，选择主照片并拖拽排序；系统统一裁剪、纠正方向、移除 EXIF，并给出墙面与桌面槽位预览。
3. 编辑情书标题、称呼、正文和落款；可选择保留默认文案。
4. 选择时段、天气、花色、天空告白短句和可选背景音乐，然后进入访客视角预览。
5. 点击发布生成 `/s/[slug]`、二维码和系统分享；后续编辑只改草稿，必须再次“发布更新”才替换公开版本。

### 易用性边界

- 默认只展示高频内容，不向普通用户暴露 Fog、LOD、Draw Calls、材质、候选密度等开发调试参数。
- “高级布局”才开放家具移动、旋转、缩放和彩灯路径；基础模式使用稳定预设，避免普通用户破坏碰撞和动线。
- 分享页完全隐藏编辑器、调试中心和管理入口；保留键鼠、触摸和引导镜头三种浏览方式。
- 社交平台内置浏览器无法稳定使用 Pointer Lock 时，自动降级为触摸摇杆或引导漫游；WebGL 不可用时显示带进入说明的静态封面，而不是白屏。

## 前端艺术与交互方向

- 视觉论点：以完整花海小院 Canvas 作为第一视口唯一主视觉，暖木、暮色、纸张和克制玫瑰红形成礼物感；编辑界面采用安静的半透明侧边工作台，不使用 SaaS 卡片拼贴压住场景。
- 内容计划：根路径只承担“进入场景与开始定制”；创作者工作台依次完成身份、照片、情书、氛围和发布；分享页只保留礼物标题、必要漫游提示和场景体验；高级室内布置从基础流程后置。
- 交互论点：首屏使用封面到实时场景的柔和揭幕；编辑步骤与场景内容使用同一配置即时联动；预览和发布通过全屏模式切换与短促状态转场建立明确仪式感。全部动作响应 `prefers-reduced-motion`。

## 配置边界

统一使用版本化 `LoveProjectConfig`，场景组件只消费规范化后的公开配置，不读取数据库、Cookie 或上传临时状态。

```ts
interface LoveProjectConfig {
  schemaVersion: 1
  identity: {
    senderName: string
    recipientName: string
    giftTitle: string
  }
  letter: {
    title: string
    salutation: string
    body: string
    signature: string
  }
  gallery: Array<{
    assetId: string
    slotId: string
    focalX: number
    focalY: number
  }>
  ambience: {
    timeOfDay: 'dawn' | 'noon' | 'dusk' | 'evening'
    weatherPreset: string
    skyMessage: string
    musicAssetId?: string
  }
  garden: {
    rosePaletteId: string
    layoutPresetId: string
  }
  interior: {
    layoutPresetId: string
    instances: CottageInteriorInstance[]
  }
}
```

- 姓名、标题、告白文字、称呼、正文与落款按 Unicode 字符数限制并统一清理控制字符。
- 图片配置只保存 `assetId`，禁止把 data URL、任意第三方 URL 或对象存储密钥写入发布 JSON。
- 运行时从配置派生入口铭牌、情书、相框、天空文字和音乐，禁止各模块维护第二套默认值。
- 每次发布保存不可变快照；公开页永远读取 `publishedRevisionId`，避免访客看到半成品或正在编辑的数据。

## 后端与存储

### 推荐最小生产架构

- Web/BFF：Next.js App Router + Route Handlers，上传处理和数据库操作显式使用 Node.js Runtime。
- 数据库：PostgreSQL；场景配置使用 `jsonb`，项目、版本、资产和管理凭证保留关系字段。
- 文件：S3 兼容对象存储；开发环境可用 MinIO，生产可替换为 R2、OSS、COS 或标准 S3。
- 图片处理：Node.js `sharp`，限制原文件大小和像素数，按槽位输出 WebP/AVIF 与缩略图，校验真实文件签名并移除 EXIF。
- 部署：Next.js standalone 容器 + PostgreSQL + 对象存储；公网前置 Nginx/Caddy 和 HTTPS。应用层只依赖存储适配器，不绑定单一云厂商。最终生产实例通过 Workbench CLI 执行审计、发布、日志读取和健康检查。

### 核心数据表

- `projects`：`id`、`public_slug`、状态、`edit_secret_hash`、当前草稿版本、`published_revision_id`、创建/更新时间、可选过期时间。
- `project_revisions`：不可变发布配置、schema 版本、发布时间和发布序号。
- `assets`：所属项目、对象键、用途、MIME、尺寸、像素、哈希、处理状态和排序。
- `edit_sessions`：哈希会话、项目、过期时间、最近使用时间；Cookie 使用 `HttpOnly + Secure + SameSite=Lax`。
- `share_events` 可后置；MVP 不采集接收者身份，只记录匿名聚合访问量时也必须提供关闭能力。

### API 边界

- `POST /api/projects`：创建草稿，返回项目 ID、一次性管理链接和恢复码。
- `GET/PATCH /api/projects/[id]/draft`：读取/更新草稿；使用版本号做乐观并发控制。
- `POST /api/projects/[id]/assets`：上传并处理图片或音频；通过项目会话授权。
- `DELETE /api/projects/[id]/assets/[assetId]`：删除未被发布版本引用的资产。
- `POST /api/projects/[id]/publish`：校验完整性、生成不可变版本并分配或保持短码。
- `POST /api/projects/[id]/unpublish`、`DELETE /api/projects/[id]`：撤下分享或删除项目及孤立资产。
- `GET /api/public/[slug]`：只返回公开渲染所需的发布快照，不返回内部 ID、编辑凭证和存储对象键。

## 安全、隐私与分享

- 创作者 MVP 不强制账号；使用“私密管理链接 + 恢复码”。接收者始终无需登录。后续可增加可选账号绑定做跨设备恢复，但不改变分享页。
- 公共短码使用至少 `8` 位随机 Base62，不使用可枚举自增 ID；管理密钥使用高熵随机值并只保存哈希。
- 分享页默认 `noindex`；Open Graph 卡片默认使用通用封面，只有创作者明确同意才把个人照片用于社交预览。
- 所有写接口执行速率限制、CSRF/Origin 校验、内容长度和 schema 校验；配置文本只按纯文本渲染，禁止 `dangerouslySetInnerHTML`。
- 设置 CSP、`Referrer-Policy: no-referrer`、`X-Content-Type-Options: nosniff` 和受控 `frame-ancestors`；对象存储使用不可猜键、受控 CORS 与合理缓存头。
- 提供撤下、删除、管理密钥轮换和资产级联清理；数据库备份不等于用户可见发布版本。

## 迁移边界

### 必须复制并重构

- `src/entities/scene/items/cottage-flower-garden/` 的全部模型、UI、纹理与配置。
- 花园直接依赖的共享玫瑰、向日葵、牵牛花、绣球和草丛几何能力；只迁依赖闭包，不复制整个模型目录平台。
- 十种小屋室内零件、相框纹理、情书状态机、二维阅读层、门户状态机、碰撞、第一人称控制、减弱动画和纯文本清理能力。
- 花园专属控制中心中仍有产品价值的时段、天气、花色和天空动画能力；开发性能面板移入仅开发环境可见的诊断模块。
- 花海小院相关单元测试和 `sceneEditorIntegration` 中对应的集成合同，迁移后改写为 LOVE 的领域和路由测试。

### 禁止直接复制

- ModelStudio 首页、模型/零件/场景目录、蔬菜园、海岛、汽车、键盘等无关功能。
- Vite 写仓库 JSON 的配置 API、`sessionStorage` 数据权威和照片 data URL 持久化。
- 同时包含蔬菜园、海岛与花海逻辑的超大 `SceneEditor.tsx` / `SceneEditorCanvas.tsx`；LOVE 应拆为 `GardenExperience`、`CreatorStudio`、`GuestExperience`、`InteriorEditor` 和 `DebugPanel`，单文件保持小于 `1000` 行。

## Git 与远程仓库策略

1. 记录 ModelStudio 当前 `HEAD`、`git status --short`、花海依赖清单和迁移前测试结果；源项目不切分支、不删除、不移动文件。
2. 对空的 LOVE 目录先执行只读 `git ls-remote git@github.com:worryfreet/LOVE.git`。
3. 若远程有历史，直接克隆并在其历史上迁移；若远程为空，初始化 `main`、设置 `origin`，再创建 `codex/extract-love-project` 实施分支。
4. 首个提交只建立 Next.js、测试和文档骨架；第二个提交迁移可运行场景；后续按后端、编辑、发布、部署分开提交。禁止强推。
5. LOVE 中记录源提交 SHA 与工作树快照摘要，便于后续回溯，但不把 ModelStudio 的 `.git`、构建产物、临时截图或无关历史复制进去。

## 分阶段计划与 TODO

### Wave 0：冻结当前副本边界

- [x] 记录源提交、未提交改动清单、依赖闭包和基线截图。
- [x] 执行 ModelStudio 的 lint、test、build，区分迁移前已存在失败与新增失败。
- [x] 检查远程历史并安全初始化/克隆 LOVE。

### Wave 1：独立 Next.js 场景壳

- [x] 创建 Next.js App Router 项目、Node Runtime、测试与 `.agentdocs` 治理文档。
- [x] 迁移花海小院及最小依赖闭包，消除对 ModelStudio 注册表和通用场景编辑器的反向依赖。
- [x] `/` 打开默认场景，桌面与移动端都可进入、开门、进屋、拆信、看照片并播放告白天空。

### Wave 2：统一配置与创作者工作台

- [x] 实现 `LoveProjectConfig`、规范化、版本迁移和场景派生适配器。
- [x] 实现五步向导、基础/高级模式、实时预览和草稿自动保存。
- [x] 将入口姓名、情书、九张照片、天空文字、时段/天气/花色接入统一配置。

### Wave 3：后端、媒体与无账号管理

- [x] 建立 PostgreSQL schema、对象存储适配器、图片处理和清理事务。
- [x] 实现私密管理链接、HttpOnly 会话、恢复码、轮换和撤销。
- [x] 补齐上传格式/大小/像素、文本长度、Origin、速率限制与错误恢复测试。

### Wave 4：发布、短链接与平台分享

- [x] 实现草稿预览、不可变发布版本、`/s/[slug]`、取消发布与删除。
- [x] 实现二维码、Web Share、复制链接和动态 metadata/OG 图；默认不泄露个人照片。
- [ ] 验证微信、QQ、微博等内置浏览器的触摸与 WebGL 降级路径。

### Wave 5：性能、部署与交付

- [x] Three.js 客户端动态加载、首屏封面、分级质量和按距离渐进启用高密花海。
- [x] 建立 Docker/standalone 生产镜像、反向代理配置模板、缓存、备份、健康检查和数据库迁移流程。
- [ ] 通过 lint、typecheck、单元、API 集成、数据库集成、浏览器 E2E、生产构建、桌面/移动视觉和真实分享链接验收。

### Wave 6：通过 Workbench CLI 部署到阿里云 ECS

只有 Wave 0–5 全部通过后才执行本阶段，目标域名固定为 `https://love.atimefriend.cn`。

#### 6.1 本地工具与实例确认

- [x] 先执行 `workbench version` 和 `workbench config list`，只确认 CLI、守护进程和活动 profile 可用；禁止把 AccessKey、STS Token、SSH 私钥或完整配置输出写入项目日志。
- [x] 从 DNS 与 Workbench 实例列表确认唯一 ECS：`cn-beijing / i-2ze68pw7irayg74flgod / ashi-deploy`，公网 IP 为 `39.105.134.119`。
- [x] 记录最终目标实例 ID、region、实例名称和发布窗口；所有后续 `exec` 必须显式指定该实例，禁止对模糊列表批量执行。

#### 6.2 只读服务器审计

- [x] 完成只读系统审计：Alibaba Cloud Linux 4、2 vCPU、7.3 GiB 内存、70 GiB 可用磁盘、Asia/Shanghai；Docker 24.0.9、独立 `docker-compose` v5.3.1、Git 2.47.3、Nginx 1.30.4 均可用。
- [x] `/srv/love` 尚不存在、当前无容器，3100 未占用；80/443 由现有 Nginx 使用，现有 `love.atimefriend.cn` 站点为静态占位页。
- [x] 服务器 SSH Key 存在且私钥权限 600，GitHub 批处理握手成功，`git ls-remote` 读取到批准提交 `84a73fb`；未读取或输出私钥正文。
- [x] DNS 指向实例公网 IP；80/443 均公开可达。现有 DigiCert 证书覆盖 `love.atimefriend.cn` 与 `www.love.atimefriend.cn`，有效期至 2026-11-11。
- [ ] 若服务器位于中国内地，部署前核对域名备案、接入备案和 HTTPS 证书状态；未满足公网发布条件时停止在审计阶段，不修改线上服务。

#### 6.3 生产目录与秘密管理

- [ ] 默认使用 `/srv/love/releases/<git-sha>` 保存不可变发布版本，`/srv/love/current` 指向当前版本，`/srv/love/shared` 保存不随发布替换的数据。
- [ ] `.env.production`、数据库口令、对象存储凭证和管理密钥只保存在服务器秘密目录，权限限制为运行用户可读；禁止进入 Git、镜像层、构建日志或 Workbench 输出。
- [ ] PostgreSQL 和对象存储数据使用独立持久卷或已有托管服务；禁止把用户照片、数据库文件和备份放进 release 目录。
- [ ] 应用默认只监听 `127.0.0.1:3000` 或私有容器网络，由既有 Nginx/Caddy 对外提供 `love.atimefriend.cn:443`。

#### 6.4 发布执行

- [ ] 在目标服务器用现有 SSH Key 拉取经验证的 LOVE 提交，并校验实际 `HEAD` 与计划发布 SHA 一致；若服务器资源不足以稳定构建，则在本地/CI 生成版本化镜像或 standalone 包，再通过 `workbench upload` 上传到一个全新的 release 路径。
- [ ] 上传前使用 `workbench exec` 检查远端目标是否存在；不以无人值守方式覆盖已有文件。Workbench 的每次远程执行均为独立 shell，所有需要共享目录或环境的命令必须使用绝对路径或在同一次命令中完成。
- [ ] 切换前备份数据库并验证备份文件非空；数据库迁移必须向后兼容旧应用，先迁移、再启动候选版本、最后切换流量。
- [ ] 在候选端口启动新版本并检查 `/api/health`、数据库、对象存储和服务日志。任何服务重启、停止、release 软链接切换、反向代理 reload 或旧版本清理都属于线上变更，必须在执行前明确说明目标实例、影响和回滚方式，并取得用户确认。
- [ ] 健康检查通过后原子切换 `current` 或上游端口，验证 Nginx/Caddy 配置后 reload；保留至少一个上一成功版本，不在同一发布事务中删除旧 release。

#### 6.5 域名、HTTPS 与公开验收

- [ ] 为 `love.atimefriend.cn` 配置独立虚拟主机，HTTP 永久跳转 HTTPS；证书签发和续期沿用服务器现有 Nginx/Caddy/ACME 体系，不并行安装第二套冲突方案。
- [ ] 验证证书链、SNI、HTTP/2 或 HTTP/3 能力、静态资源长缓存、HTML/公开配置的正确缓存边界以及上传体积限制。
- [ ] 从公网依次验收 `/` 默认花园、`/create`、私密管理入口、草稿保存、照片上传、预览、发布、`/s/[slug]`、撤下与删除；分享链接必须在未登录浏览器和移动端内置浏览器中可直接打开。
- [ ] 使用 Workbench CLI 读取容器/进程状态、反向代理日志和应用日志，确认无持续 4xx/5xx、数据库连接错误、对象存储错误、WebGL 静态资源 404 或秘密泄漏。

#### 6.6 回滚、备份与交付

- [ ] 发布失败时先把反向代理或 `current` 切回上一成功 release，再验证公开首页和分享页；禁止一边继续修线上文件一边保持故障版本承载流量。
- [ ] 数据库迁移必须优先采用可向后兼容的 expand/contract（扩展/收缩）策略；只有确认无法兼容且用户批准时才执行数据库恢复。
- [ ] 验证数据库定时备份、对象存储生命周期、日志轮转、证书续期和磁盘告警；至少完成一次不影响真实用户的恢复演练。
- [ ] 最终记录部署 SHA、实例 ID、域名、发布时间、健康检查、备份位置、当前/上一 release 和回滚命令；不得记录任何凭证正文。

## 发布门禁

- ModelStudio 原有花海小院代码和功能未被删除，源项目现有测试结果没有因迁移发生回归。
- LOVE 根路径和分享链接都直接进入场景；分享页没有编辑入口，接收者无需登录。
- 创作者在另一台设备通过私密管理链接可继续编辑，公开链接只显示最近一次发布快照。
- 九张照片、姓名、信件、入口铭牌、天空文字和主题配置跨刷新、跨设备保持一致。
- 无效短码返回友好 404；撤下或删除后公开链接立即失效；管理密钥不可从公开 API、日志或页面源码获取。
- 移动端不出现白屏、上下文丢失、无法移动或控制层遮挡；低性能设备能自动降级。
- `npm run lint`、`npm run typecheck`、`npm run test`、API/数据库集成测试、Playwright E2E 与 `npm run build` 全部通过。
- `https://love.atimefriend.cn` DNS、TLS、HTTP 跳转、首页、创建、编辑、上传、预览、发布和访客短链接全部通过公网验收。
- ECS 上的运行版本 SHA 与远程仓库批准提交一致，秘密未进入仓库/日志，上一成功 release、数据库备份和回滚路径均可用。

## 实施证据

- ModelStudio 迁移前门禁已通过：ESLint、`716/716` 测试与 Vite 生产构建均成功；基线画面保存在源项目 `.agentdocs/assets/cottage-flower-garden/source-garden-hero.png`。
- LOVE 已完成 `54` 个花海小院场景文件和最小运行依赖的副本迁移。与源目录的差异只包含 Next.js TypeScript 兼容标注，以及姓名铭牌、自定义天空文字等 LOVE 配置适配器。
- LOVE 本地 `npm run check` 已通过：ESLint、TypeScript、`177` 项测试（`176` 通过、`1` 项因未提供独立 `TEST_DATABASE_URL` 跳过）和 Next.js 生产构建均成功。
- Playwright 已在真实 Chromium 验证生产构建：桌面根路径成功加载 WebGL 花海场景，图标返回 200、控制台零错误；`390×844` 创建页无横向溢出，管理凭证页通过同契约路由模拟完成。
- Docker Compose 配置已通过静态解析；本机 Docker daemon 当前未运行，因此真实 PostgreSQL/MinIO 集成和完整发布链将在目标 ECS 候选环境完成。

## 已冻结决策

- 采用“草稿 + 不可变发布版本”，不让实时编辑直接污染分享页。
- MVP 不强制创作者或接收者登录；编辑权限由可撤销的能力链接和安全会话承担。
- 公共短链接由 LOVE 自身域名提供，不依赖第三方短链服务。
- 图片进入对象存储并以资产 ID 引用，不继续使用 sessionStorage data URL。
- 场景渲染保持单一实现，通过 `mode: 'studio' | 'preview' | 'guest'` 控制 UI 和权限，禁止维护三份场景。
- 最终生产部署固定使用 `alibabacloud-workbench-cli` 管理既有阿里云 ECS，服务器 SSH Key 只负责拉取 GitHub 仓库；公开域名固定为 `love.atimefriend.cn`。
