# 版本记录与日常维护

| 版本 | Git 引用 | 基准提交 | 说明 |
| --- | --- | --- | --- |
| 早期简约版 | `v1-classic` | `d6ad5e9` | 原 main：本科、硕士、博士培养与归档说明，简洁布局。 |
| 详实扩展版 | `v2-detailed` | `2840305` | 增加本科科研、完整阶段要求、资源与公开边界，扩展为 12 页。 |
| 当前融合版 | `main` | 持续更新 | 首页保留简洁层次，内页完整保留阶段内容，按需展开阅读。 |

两个前序标签固定在各自提交；原功能分支 `feature/system-audit-redesign-20260904-220934` 也保留。所有版本存在于正常 Git 历史中，不复制旧网页到当前站点目录。

在 GitHub 的分支选择器中切换到 Tags，可查看或下载前序版本。只读查看本地历史文件：

```sh
git show v1-classic:index.html
git show v2-detailed:index.html
```

日常维护以 `main` 为入口。开始修改前同步，完成修改后检查、提交、推送：

```sh
git switch main
git pull --ff-only origin main
# 编辑页面，并完成部署指南中的构建与检查
git diff
git add .
git commit -m "Update site content"
git push -u origin main
```

GitHub Pages 使用 `main` 的根目录作为发布来源。`push` 上传的是已提交的改动；网页在 Pages 构建与部署成功后更新。详细步骤见 [部署指南](deployment.md)。
