# LOVE API 契约

## 通用规则

- 所有写接口要求同源 `Origin`，并按 IP 与操作类型限流；JSON 错误统一为 `{ "message": "中文提示" }`。
- 项目管理接口通过 `love_editor_session` HttpOnly Cookie 鉴权，Cookie 为 `SameSite=Lax`，生产环境启用 `Secure`。
- 项目 ID 与资产 ID 使用 UUID；公开短码为不可枚举的 8 位 Base62。
- 配置更新必须提交完整 `LoveProjectConfig` 和当前 `version`，成功后返回递增后的版本。

## 创建与恢复

### `POST /api/projects`

创建草稿。可传入局部 `config` 作为身份初始值。成功返回 201：

```json
{
  "projectId": "uuid",
  "publicSlug": "Base62",
  "claimUrl": "/claim/<secret>",
  "recoveryCode": "XXXX-XXXX-XXXX",
  "studioUrl": "/studio/<projectId>"
}
```

### `POST /api/recover`

输入 `{ "code": "XXXX-XXXX-XXXX" }`。成功建立编辑会话并返回 `studioUrl`；无效恢复码返回 404。

### `GET /claim/[secret]`

校验私密管理链接、建立编辑会话并 302 到工作台；无效密钥跳回 `/create?claim=invalid`。

## 草稿与媒体

### `GET /api/projects/[projectId]/draft`

返回 `{ id, publicSlug, status, config, version, published, photos }`；无会话返回 401。

### `PATCH /api/projects/[projectId]/draft`

请求为 `{ "config": LoveProjectConfig, "version": number }`。成功返回规范化配置与新版本；版本冲突返回 409；请求体上限 1 MB。

### `POST /api/projects/[projectId]/assets`

`multipart/form-data` 的 `file` 字段上传照片。成功返回 201 `{ assetId, url }`；单张 10 MB、最多 9 张。

### `DELETE /api/projects/[projectId]/assets/[assetId]`

删除未被当前发布版本引用的照片。成功 204；已发布引用返回 409。

### `GET /media/[assetId]`

已发布引用允许访客读取；未发布资产仅项目编辑会话可读。无权限也返回 404，避免资产枚举。

## 发布与分享

### `POST /api/projects/[projectId]/publish`

保存当前草稿为新不可变版本，返回 `{ publicSlug, revisionId, shareUrl }`。重复发布生成递增版本，但保持同一个公开短码。

### `DELETE /api/projects/[projectId]/publish`

撤下当前分享，成功 204。历史版本保留用于审计，但不再公开可达。

### `GET /api/public/[slug]`

返回 `{ publicSlug, config, photos }`，只包含公开渲染字段，响应 `private, no-store`；不存在或已撤下返回 404。

### `GET /api/share/qr?url=<same-origin-share-url>`

仅为本站 `/s/` 链接生成 SVG 二维码；任意外域或其他路径返回 400。

## 管理操作

### `POST /api/projects/[projectId]/credentials`

轮换管理链接和恢复码，使旧凭证与全部旧会话失效，返回新的 `claimUrl` 和 `recoveryCode`。

### `DELETE /api/projects/[projectId]`

归档项目、立即撤下公开版本、失效会话并清理媒体，成功 204。该操作不可从产品界面撤销。

## 健康检查

### `GET /api/health`

同时检查 PostgreSQL 与对象存储 bucket。全部正常返回 200；任一依赖失败返回 503，供容器与反向代理发布门禁使用。
