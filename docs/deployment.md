# GitHub Pages 部署指南

## 1. 当前部署方式

仓库是组织主页站点，公开域为 `https://csma-graduation-projects.github.io/`。现有说明采用 GitHub Pages “Deploy from a branch”，从默认分支根目录发布。页面和资源使用相对路径，适配根域 base。

本任务不自动 push、merge 或部署。部署必须由负责人在审查后执行。

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

访问 `http://localhost:8000/`，抽查首页、三类培养入口、博士兼容页、项目、里程碑、资源、成果、FAQ、About 和归档页。不要直接把源码目录作为发布验收对象。

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

1. 从最新默认分支创建功能分支，不强制切换或覆盖本地修改。
2. 建立仓库外 bundle 与工作区备份。
3. 完成内容、隐私和技术审查。
4. 在功能分支运行构建与全部回归。
5. 由人工审查 diff、事实来源、公开授权和候选退役项。
6. 由负责人执行普通提交、push 和 PR。
7. 审查通过后由负责人合并；不得 force push。
8. 等待 Pages 构建成功，逐页核对公开域。
9. 检查构建产物不含 `work/`、secret、个人档案或未公开研究。

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
