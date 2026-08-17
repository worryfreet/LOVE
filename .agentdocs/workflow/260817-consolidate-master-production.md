# LOVE 分支收敛与 Master 生产发布

## 目标

- 审计 LOVE 本地和远程全部分支，将所有未进入 `master` 的提交合并到 `master`。
- 最终只保留 `master`：不创建新分支，合并验证完成后删除已完全合并的其他本地与远程分支。
- 以远程 `origin/master` 的确定 SHA 通过 Workbench 发布到 `https://love.atimefriend.cn`。
- 发布保持不可变 release、数据库备份、候选健康检查和上一版本即时回滚能力。

## 当前审计

- 本地和远程均只有 `master` 与 `codex/extract-love-project` 两条实际分支；`origin/HEAD` 指向 `origin/master`。
- `codex/extract-love-project` 当前为 `aa2bb62`，包含 `origin/master` 的全部历史并线性领先，不存在分叉提交，允许将 `master` 快进到该分支。
- 工作区在审计开始时无未提交代码；本任务文档会随待合并分支一并进入 `master`。

## 分支策略

- 本次不创建临时分支、发布分支或 tag 分支。
- 先拉取远程引用并复核 ancestry，再把本地 `master` 快进到已验证的功能分支 HEAD。
- `npm run check` 通过并推送 `origin/master` 后，才删除已合并的 `codex/extract-love-project` 本地与远程引用。
- 后续所有开发、提交、推送和生产发布默认直接使用 `master`。
- 固定顺序为：本地 `master` 修改与门禁、提交并推送 `origin/master`、服务器在全新 release 中拉取最新 `origin/master`、核对三端 SHA 后切流；禁止服务器维护独立提交或直接修改线上代码。

## 部署边界

- 目标实例：`cn-beijing / i-2ze68pw7irayg74flgod / ashi-deploy`。
- 生产目录：`/srv/love/releases/<master-sha>`；`/srv/love/current` 原子指向正式 release。
- 预期采用候选端口和 Nginx 零停机切换；若候选失败，不改变线上流量。
- 切流前创建 PostgreSQL 自定义格式备份；回滚时恢复上一 `/srv/love/current` 与正式容器，再验证 Nginx 和健康接口。
- 不读取、输出或下载服务器 SSH 私钥和生产秘密正文，不删除历史 release、数据库卷或对象存储卷。

## 实施阶段

- [x] 阶段一：读取分支、部署与服务器治理资料，完成只读分支审计。
- [x] 阶段二：提交任务文档，更新远程引用并将全部提交快进合并到 `master`。
- [x] 阶段三：在 `master` 完成 `npm run check`，推送并验证远程默认分支 SHA。
- [x] 阶段四：删除已完全合并的非 `master` 本地与远程分支，复核只剩 `master`。
- [ ] 阶段五：使用 Workbench 完成服务器只读审计、候选构建、备份、迁移、切流与公网验证。
- [ ] 阶段六：记录发布 SHA、备份、回滚版本与健康结果，归档任务文档。

## 验收标准

- `git branch -a` 中除 `origin/HEAD -> origin/master` 外只存在本地 `master` 和 `origin/master`。
- 本地 `master`、`origin/master` 与批准发布 SHA 对齐，生产 release 从该 SHA 拉取。
- `npm run check` 全部通过，生产应用、PostgreSQL 和对象存储满足既有健康门禁。
- `https://love.atimefriend.cn/`、`/create` 与 `/api/health` 返回成功响应。
- 上一成功 release 和非空数据库备份均保留，发布事务不删除用户数据。
