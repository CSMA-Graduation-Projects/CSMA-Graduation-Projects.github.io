# 站点维护指南

## 1. 项目定位

本站是 CSMA 学生学业项目与科研培养公共门户，不是学生档案、成绩、评价或账号管理系统。首页并列提供本科毕业设计、本科科研、硕士培养与博士培养四条路径。前三条路径有完整的阶段要求，博士页提供研究定位与培养说明。

## 2. 技术栈与入口

- 纯 HTML5、CSS、原生 JavaScript。
- 无 npm/pnpm/yarn 依赖和运行时后端。
- `index.html` 为首页；各 `.html` 文件即稳定页面路由。
- `style.css` 是唯一设计系统；`script.js` 处理渐进增强导航、返回顶部、阶段深链展开和打印完整指南。
- `_config.yml` 控制 GitHub Pages/Jekyll 发布排除，`work/` 和 `scripts/` 不进入生成站点。
- `_posts/` 存放新闻 Markdown；`_layouts/news.html` 为新闻正文布局；`_includes/` 生成新闻列表和公开展示卡片。
- `_data/achievements.json` 与 `_data/students.json` 分别维护成果、榜样；发布模板位于 `docs/content-templates/`，该目录不进入生成站点。

## 3. 本地运行

发布等价预览先按部署文档完成 Jekyll 构建，再在仓库根目录运行：

```sh
python -m http.server 8000 --directory _site
```

访问 `http://localhost:8000/`。若系统命令名为 `python3`，使用 `python3 -m http.server 8000 --directory _site`。不要把直接服务源码目录当作发布验收，因为隐私保留块要由 Jekyll 从生成页面中剔除。

## 4. 修改页面

1. 保留现有 `.html` 文件名、URL、锚点和脚本 ID。
2. 复用现有 `container`、`page-section`、`card`、`stage-gate`、`notice`、`status-table` 等样式。
3. 每页保持一个 H1；H2/H3 不跳级。
4. 新表格添加 `caption`，列头/行头添加 `scope`，并放入 `.table-scroll`。
5. 新页面包含 description、canonical、Open Graph、favicon、skip link、语义面包屑和 `main-content`。
6. 只把真实且已核验内容写成事实；未知项写“待补充”，不要制作看似真实的示例学生或项目。

## 5. 导航与兼容

页面头部采用静态导航，无 JavaScript 时仍可使用。顶部品牌文字统一为“人才培养管理体系”。主导航依次为首页、新闻、学士、硕士、博士、资源、成果、榜样、关于九项，对应 `index.html`、`news.html`、`bachelor.html`、`master.html`、`doctor.html`、`resources.html`、`outcomes.html`、`students.html`、`about.html`。修改导航时同步所有根目录 HTML 和 `_layouts/news.html`，验证脚本会检查顺序、链接与当前栏目。

`templates.html`、`archive.html`、`milestones.html` 归入资源；`projects.html` 归入成果；`undergraduate-research.html` 归入学士；`faq.html` 归入关于。培养内页继续提供本科科研等路径切换。

阶段要求使用原生 `details` / `summary`，默认折叠，点击或通过键盘展开；无需 JavaScript 即可阅读。带阶段锚点的链接会自动展开目标，打印时展示全部阶段，并在打印后恢复展开状态。

必须保留：

- 既有页面：`index.html`、`bachelor.html`、`master.html`、`doctor.html`、`templates.html`、`archive.html`。
- 首页当前与历史锚点；模板页全部入口和详情锚点；归档页 `repository-structure`。
- `nav-toggle`、`main-nav`、`back-to-top`。

## 6. 设计与响应式

- 继续使用 `style.css` 顶部的颜色、宽度、阴影和圆角变量，不创建第二套系统。
- 重点检查 1440、1280、1024、768、390px。
- 在 920px 及以下，JavaScript 可折叠菜单；禁用 JavaScript 时链接仍直接显示。
- 长表格使用水平滚动容器；长标题和 URL 必须换行；返回顶部按钮不得遮挡末端链接。
- 不添加无意义动画；新增动效必须尊重 `prefers-reduced-motion`。

## 7. 图片与性能

- 保留用户原始资源，不覆盖或删除。
- 首页优先加载 `assets/hero-workflow.webp`，并以原 PNG 回退。
- 新图片应记录来源/许可，使用合理尺寸和现代格式；信息性图片必须提供 alt，装饰性 CSS 背景不承载唯一信息。
- 不因性能问题擅自删除 PDF、视频或图片；先生成派生版本并验证链接。

## 8. 本地验证

```sh
node --check script.js
node --check scripts/validate-site.mjs
node scripts/validate-site.mjs
node scripts/validate-site.mjs --build
node scripts/privacy-scan.mjs --build
git diff --check
```

源文件检查覆盖页面结构、导航、资源链接与内容字段。构建检查还覆盖生成的新闻正文、首页最新三条、成果和榜样卡片、站内链接及站点地图。需要浏览器回归时，再检查键盘导航、焦点、菜单 Escape、无 JavaScript 导航、reduced motion、下载入口与横向滚动。

## 9. 清理缓存

如果本地预览未更新：

1. 停止并重新启动静态服务器。
2. 浏览器硬刷新或打开无痕窗口。
3. 删除本地生成的 `_site/`、`dist/` 或缓存目录前，先确认它们是可再生构建产物且路径精确；不要运行针对仓库根目录的递归删除。
4. GitHub Pages 有缓存时，等待构建完成并检查响应头；不要通过改文件名破坏旧 URL。

## 10. 安全提交

1. 先运行 `git status --short --branch`，识别用户原有修改。
2. 复核 diff，不自动 stash、reset、clean 或覆盖他人改动。
3. 扫描 secret 与个人信息，扫描结果只报告文件路径，不打印敏感值。
4. 确认 Jekyll 产物不存在 `_site/work`。
5. 运行链接、页面、移动端和旧 URL 回归。
6. 日常在 `main` 上完成普通提交与推送；大改版或多人协作可使用功能分支和 PR。前序版本使用固定标签保存，禁止 force push。
7. 合并与部署由负责人审查后执行。
