# GitHub Pages 部署指南

## 1. 当前部署方式

仓库是组织主页站点，公开域为 `https://csma-graduation-projects.github.io/`。GitHub Pages 使用 “Deploy from a branch”，选择 `main` 与 `/(root)`。页面和资源使用相对路径，适配根域 base。

`main` 为当前融合版，也是日常维护与发布分支。负责人可在检查后直接提交并推送到 `main`；大改版或多人协作可使用 PR。前序版本用固定标签保存，不覆盖或重写。

## 2. 发布隔离

根目录 `_config.yml` 必须包含：

```yaml
exclude:
  - work
```

当前配置还排除 `node_modules`、`dist`、`vendor` 和 `scripts`。不要添加 `.nojekyll`，否则 Jekyll 排除规则不会应用，内部目录可能被原样复制。

构建排除不等于仓库私有：如果 GitHub 仓库公开，`work/` 源文件仍可能通过仓库界面访问。内部报告不得包含 secret 或敏感原文；真正敏感材料应放在仓库之外。

## 3. 本地预览

完成下一节的 Jekyll 构建后运行：

```sh
python -m http.server 8000 --directory _site
```

访问 `http://localhost:8000/`，抽查首页、四类培养入口、项目、里程碑、资源、成果、FAQ、About 和归档页。不要直接把源码目录作为发布验收对象。

## 4. Pages 等价构建

如果本机已有兼容 Jekyll 环境：

```sh
bundle check
bundle exec jekyll build --trace
```

仓库当前没有 Gemfile，也不要求维护者为纯静态内容引入前端包管理器。需要临时验证时，可在仓库外创建隔离的 Ruby/Gem 环境；不要把临时依赖或缓存提交进仓库。

构建后必须确认：

```sh
test ! -e _site/work
```

并确认 `_site/` 含全部公开 HTML、CSS、JS、favicon、WebP/PNG、robots 和 sitemap。

## 5. 必跑检查

```sh
node --check script.js
node --check scripts/validate-site.mjs
node scripts/validate-site.mjs
node scripts/privacy-scan.mjs --build
git diff --check
```

此外执行：

- 所有站内文件和锚点检查；
- 所有主页面 HTTP 200 检查；
- 1440、1280、1024、768、390px 视觉和横向溢出检查；
- 键盘、焦点、无 JavaScript、reduced-motion 检查；
- secret/个人信息扫描，只输出路径；
- 下载文件和外部链接核验；
- 旧 URL 与旧锚点兼容检查。

## 6. 发布流程

1. 确认工作区状态；在 `main` 上执行 `git pull --ff-only origin main`，再开始修改。
2. 完成页面修改，检查内容、链接与构建结果；需要浏览器回归时再执行相应检查。
3. 用 `git diff` 审查改动，确认事实来源与公开范围。
4. 执行 `git add .` 与 `git commit -m "Update site content"`。
5. 执行 `git push -u origin main`；已设置上游后可简写为 `git push`。
6. 在仓库 Actions 中等待 `pages build and deployment` 成功，再核对公开域。

首次发布或发布设置变更时，确认 Settings → Pages → Source 为 `Deploy from a branch`，Branch 为 `main`，Folder 为 `/(root)`。推送其他分支不会更新这条发布来源。

推送被拒绝时先同步并处理远端改动，不使用 force push。前序版本与查看方法见 [版本记录](versions.md)。

## 7. 回滚

- 优先通过普通 revert 或部署上一个已审查提交恢复，不改写公开历史。
- 不使用 `git reset --hard`、`git clean -fdx`、`git checkout -- .` 或 force push。
- 数据和页面路由问题先从仓库外备份恢复到单独分支并比较，避免覆盖用户的新修改。

## 8. GitHub Pages 设置核对

负责人应人工确认：

- Source 仍为 “Deploy from a branch”；
- 分支为实际默认分支，目录为 `/root`；
- HTTPS 已启用；
- 自定义域（若未来增加）与 canonical/sitemap 同步；
- 没有意外启用会复制全部源文件的部署流程；
- 构建日志中没有 Liquid、链接或资源错误。
