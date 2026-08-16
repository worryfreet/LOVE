# LOVE 生产部署

## 固定拓扑

```text
Internet -> love.atimefriend.cn:443 -> Nginx -> 127.0.0.1:3100
                                              -> LOVE app container
                                              -> PostgreSQL container + volume
                                              -> MinIO container + volume
```

- 生产根目录为 `/srv/love`；不可变代码版本位于 `/srv/love/releases/<git-sha>`，`/srv/love/current` 指向当前版本。
- `/srv/love/shared/.env.production` 保存秘密，权限 600；`/srv/love/shared/backups` 保存数据库备份。
- PostgreSQL 和 MinIO 使用 Docker named volumes，不随 release 切换。
- 应用只映射 `127.0.0.1:3100`，公网 80/443 仅由既有 Nginx 管理。

## 发布输入

- 远程仓库：`git@github.com:worryfreet/LOVE.git`。
- 发布分支必须先通过 `npm run check`；服务器拉取后再次核对 `git rev-parse HEAD` 与批准 SHA 完全一致。
- 服务器秘密文件至少包含 `POSTGRES_PASSWORD`、`MINIO_ROOT_PASSWORD`、`SESSION_SECRET` 和可选 `LOVE_IMAGE_TAG`。
- 不使用 `.env.example` 作为生产秘密；不在 Workbench 输出中打印秘密文件。

## 首次部署顺序

1. 使用 Workbench 对唯一 ECS 做只读审计：系统资源、Docker/Compose、Git、Nginx、证书、端口、磁盘和服务器 SSH Key 的 GitHub 只读权限。
2. 确认 DNS、公网入口、备案与证书条件。任何目标目录上传前先检查是否存在。
3. 创建全新的 release 目录，使用服务器 SSH Key 拉取批准提交；设置只读代码权限。
4. 链接秘密文件到 release，运行 `docker compose ... config --quiet`，构建 `love:<git-sha>` 镜像。
5. 先启动 database、storage 和 storage-init；执行校验和迁移，确认迁移退出码为 0。
6. 在切流前执行 `deploy/backup.sh /srv/love/shared/backups` 并验证备份非空。
7. 在候选端口启动应用，检查容器状态、`/api/health` 和日志，再原子切换 `current` 与 Nginx 上游。
8. `nginx -t` 成功后 reload；公网验证 HTTP 跳转、TLS、首页、创建、上传、预览、发布与匿名分享。

步骤 5–8 会改变线上进程或流量，必须在执行前说明目标实例、预期中断、回滚 release，并取得用户确认。

## 备份与回滚

- 每次切流前使用自定义格式 `pg_dump -Fc`；备份文件必须非空并位于 shared 目录。
- 至少保留当前和上一成功 release/镜像；发布事务内不删除上一版本。
- 应用回滚优先把 `/srv/love/current` 与 Nginx 上游切回上一版本，再执行 `nginx -t && reload` 并检查公开页面。
- 数据库迁移采用 expand/contract（扩展/收缩）策略，当前初始迁移只有新增表。若未来出现不兼容迁移，未获单独批准不得自动恢复数据库。
- MinIO 图片和 PostgreSQL 备份独立于代码 release；删除 release 不等于删除用户数据。

## 运维门禁

- `docker compose -f docker-compose.production.yml ps` 中数据库、对象存储和应用均应健康，迁移与 bucket 初始化应成功退出。
- `/api/health` 返回 200；应用、数据库、对象存储和 Nginx 日志无持续 4xx/5xx 或凭证泄漏。
- 证书续期沿用服务器既有 ACME 体系；不并行安装第二套证书管理器。
- 定期验证数据库备份可恢复、对象存储持久卷、日志轮转、磁盘余量与证书到期时间。
