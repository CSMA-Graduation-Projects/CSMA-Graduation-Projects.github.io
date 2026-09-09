# CSMA 学业项目主页验收报告

审计启动：2026-09-04  
验收完成：2026-09-05（Asia/Shanghai）  
状态：本地实施与验证完成；未 commit、未 push、未 merge、未部署

> 本文件是内部工作材料。`_config.yml` 已将 `work/` 从 Jekyll 产物排除；公开仓库中的源文件仍然可见，因此本报告不记录敏感原文。

## 1. 当前分支与基线

- 当前分支：`feature/system-audit-redesign-20260904-220934`。
- 修改前及当前 HEAD：`d6ad5e959d772706a7041dcf2ce5513190361e8f`。
- 基线分支：`backup/pre-system-redesign-20260904-220934`。
- 审计开始时：`main...origin/main`，工作区干净。
- 当前所有修改仍未提交；没有 stash、push、merge、force push 或远程设置变更。

## 2. 仓库外备份

- Git bundle：`/Users/hjp/Applications/VSCode/hjp.edu.cse.ms.aps/work/group/CSMA-Graduation-Projects.github.io-20260904-220934.bundle`。
- bundle SHA-256：`887def78e14381c1e1dd28c81cdae26eb1b5e5ce5a30bd24a39a79624d823371`。
- `git bundle verify`：通过，包含 4 个提交的完整历史。
- 工作区副本：`/Users/hjp/Applications/VSCode/hjp.edu.cse.ms.aps/work/group/CSMA-Graduation-Projects.github.io-worktree-20260904-220934/`。

## 3. 真实技术栈与部署

- 纯 HTML5、CSS、原生 JavaScript；无 Vue、React、Vite、Jekyll 主题或服务端。
- 无 `package.json`、npm/pnpm/yarn 锁文件、Gemfile、数据库、远程 API 或业务数据接口。
- 文件路由：根目录 `.html`；资源使用相对路径。
- GitHub Pages 基线方式：从默认分支根目录发布；未新增或修改 workflow。
- 新增最小 `_config.yml`，仅用于构建排除；组织主页根域不需要项目子路径 base。

## 4. 修改文件

已修改 9 个既有跟踪文件：

- `README.md`
- `index.html`
- `bachelor.html`
- `master.html`
- `doctor.html`
- `templates.html`
- `archive.html`
- `style.css`
- `script.js`

`git diff --stat`（不包含未跟踪新文件）：9 files changed，1549 insertions，308 deletions。最终数字以报告末尾再次执行的命令为准。

## 5. 新增文件

发布配置与站点入口：

- `.gitignore`
- `_config.yml`
- `undergraduate-research.html`
- `milestones.html`
- `projects.html`
- `outcomes.html`
- `faq.html`
- `about.html`
- `robots.txt`
- `sitemap.xml`
- `assets/favicon.svg`
- `assets/hero-workflow.webp`

维护文档：

- `docs/site-maintenance.md`
- `docs/content-management.md`
- `docs/privacy-and-publication-boundary.md`
- `docs/deployment.md`

本地验证工具（由 `_config.yml` 排除发布）：

- `scripts/validate-site.mjs`
- `scripts/privacy-scan.mjs`
- `scripts/browser-qa.mjs`
- `scripts/capture-responsive.sh`

内部审计材料：本目录要求的 7 份 Markdown 报告均已生成。

## 6. 数据保留验证

- `git diff --name-only --diff-filter=D` 无输出：未删除任何跟踪文件。
- 原始 `assets/hero-workflow.png` 当前 Git blob 与基线均为 `861d213c7cbe28bc12954f7b34c73632afdf611d`：未覆盖或修改。
- 对 6 个基线页面抽取 H1–H3、段落、列表项和表格单元的 155 个正文块进行逐块核对：155/155 仍在各自原文件中。
- 适合公开的基线内容继续可见；身份关联示例和会诱导公开凭据的旧措辞仅保留在原文件的源内构建注释中，由 Jekyll 从 `_site` 剔除。
- 未创建学生、项目、论文、专利、竞赛、成绩、时间、联系人或成果示例数据。

## 7. URL、锚点、ID 与接口

- 6 个旧 URL 全部保留：`index.html`、`bachelor.html`、`master.html`、`doctor.html`、`templates.html`、`archive.html`。
- 新增 6 个 URL，不替代旧路由：本科科研、里程碑、项目、成果、FAQ、About。
- 当前锚点全部保留；有 Git 历史证据的 `home`、`理念`、`overview`、`ug-timeline`、`management`、`faq`、`hjp.` 以别名锚点兼容。
- `nav-toggle`、`main-nav`、`back-to-top` 均保留。
- 历史中出现的损坏字符串 `back-to-</button>top` 不是合法 ID，未重新制造；合法 `back-to-top` 保留。
- 仓库没有业务 API、字段、slug 或关联键，因此没有接口迁移；数组/对象结构也没有变化。

## 8. 首页最终结构

1. Hero and Purpose。
2. 公开/私有边界提示。
3. 本科毕业设计、本科科研、硕士成长三个同等入口；博士作为旧兼容入口继续可达。
4. Current Milestones 摘要，并链接到各轨道权威页面。
5. Guidance → Planning → Execution → Evidence → Feedback → Reflection → Achievement 共性机制。
6. 项目与课题、公开成果的真实空状态。
7. 资源与模板深链。
8. 资料状态而非虚构 News。
9. FAQ 预览。
10. About 与已核验 GitHub 组织联系入口。

没有添加无依据 KPI、排名、负面状态或行政口号墙。

## 9. 本科毕业设计最终结构

- 16 步完整生命周期，从了解要求、课题发布和师生确认，到任务书、开题调研、实现/实验、论文、答辩、归档和授权成果展示。
- 5 个阶段门，每个阶段明确 Goal、Tasks、导师支持、Evidence、Review、Exit Criteria。
- 保留原关键节点、毕业设计要求、论文—系统一致性、答辩与归档内容。
- 新增交付物可见性表、自查、常见风险、统一资源入口和制度来源提示。
- 预答辩只写为“如正式要求适用”，未虚构学院制度或时间。

## 10. 本科科研最终结构

- 新增独立入口和 13 步生命周期：了解研究组、申请匹配、入门训练、工具规范、方向探索、小任务、正式项目、周期汇报、实验/系统、写作复现、可能成果路径、能力总结、长期发展衔接。
- 6 个阶段门覆盖匹配、基础、探索、项目、写作/复现、发展。
- 强调兴趣、责任、科研规范、可复现、团队协作和反馈；不承诺论文、竞赛或获奖。
- 申请、能力评估、反馈与个人发展计划默认私有；真实项目与方向因无证据保持空状态。

## 11. 硕士学业与科研全流程

- 20 步生命周期与 7 个阶段：Foundation、Exploration、Research、Validation、Dissemination、Graduation、Development。
- 每阶段包含 Goal、Tasks、Evidence、Review、Exit Criteria。
- 保留研一/研二/研三和既有月份节点；明确它们只是仓库既有参考，须按当年正式通知核验。
- 增加入学适应、培养计划、课程/能力、研究方向、阶段检查、学术规范、可复现、就业/升学和长期发展。
- 私人计划、周报、导师评价、考核、未公开论文/数据及凭据不由公共页保存。

## 12. 资源、模板与里程碑

- `milestones.html` 统一 Goal / Tasks / Evidence / Review / Exit Criteria，并说明 7 步共性机制和三轨进入条件。
- `templates.html` 保留 7 个原入口及全部详情锚点，补充适用对象、阶段、文件类型和更新时间状态。
- 资源分类覆盖 Policies、Templates、Checklists、Writing、Research Methods、Development Tools、Reproducibility、Defense Preparation、Academic Integrity。
- 仓库没有真实 PDF/DOCX/Markdown 模板或下载链接；页面明确“说明性资源”，未伪造下载验收。

## 13. 项目与成果展示

- `projects.html` 区分 Available Topics、Ongoing Projects、Completed Projects、Research Prototypes、Student Outcomes。
- `outcomes.html` 建立事实、权利、隐私、授权和链接核验门。
- 当前无经核验项目/成果数据或授权记录，两页均使用明确空状态，不用示例冒充事实。
- 因仓库不存在真实项目，无法抽查“至少 3 个项目”；此项如实标为资料缺口，而不是虚构通过。

## 14. 隐私与公开边界

- 公共门户只承载公开路径、公共资源和经授权成果；没有实现前端假登录。
- 源码扫描识别到 `index.html`、`archive.html` 各 3 个身份关联型旧命名示例；报告不记录原值。
- 原值未删除、未改名、未匿名化、未复制到新数据文件；生成页使用不含姓名/学号的公共项目 ID 格式。
- Jekyll 产物验证确认：身份关联值、旧姓名式命名格式、源内保留块与 Liquid 标记均未进入 12 个生成页面。
- `_site/work`、`_site/scripts` 均不存在。
- 构建产物隐私扫描：0 个配置模式命中。
- 当前源码扫描只在上述 2 个文件报告 4 个“文件/类型”记录（身份关联值与旧姓名式命名格式）；历史扫描报告 8 个“提交文件/类型”记录。未发现 key/token/private-key/password 赋值、手机号、正文邮箱、学号、身份证号、成绩/排名值或 URL 内嵌凭据。
- Git 提交元数据含非 noreply 作者邮箱；本次不改写历史。

## 15. 敏感数据处理建议

1. 立即由负责人核验身份关联命名示例的公开授权。
2. 身份映射、学生过程材料、导师反馈、评审和授权记录迁移到学校系统、私有仓库、受控云盘或受控数据库。
3. 凭据只进入密码/秘密管理服务；如未来发现真实 secret，必须轮换。
4. 明确成果授权、撤回/更正和安全报告的官方渠道。
5. 构建隐藏不消除公开源与 Git 历史风险；是否调整仓库可见性或历史由人工专项审批。
6. 本次没有清理 Git 历史、修改远程账户或删除源数据。

详细风险见 `2026-09-04_Privacy_Publication_Audit.md`。

## 16. 候选退役模块

- 没有实际删除、移动、隐藏或停止维护任何模块。
- 博士页、返回顶部按钮、原 PNG 和 7 个说明性模板建议继续保留。
- 首页重复内容采用“内容合并但保留旧 URL/锚点”。
- 身份映射建议迁移至私有系统，后续删除/归档须人工确认。
- 完整报告：`2026-09-04_Module_Retirement_Candidates.md`。

## 17. 响应式与浏览器验收

- 在生成站点上检查 12 个页面 × 1440、1280、1024、768、390px，共 60 个页面/视口组合。
- 自动浏览器断言：364/364 通过。
- 每个组合检查：标题/H1/main、跳转链接、页面级横向溢出、图片加载、控制台错误、桌面或折叠菜单状态。
- 额外检查：无 JavaScript 时 390px 导航可用、reduced-motion、首个 Tab 焦点、跳到主内容后的焦点转移。
- 16 张桌面/平板/手机截图已人工抽查；产物位于 `/private/tmp/csma-site-qa-20260904/`，不在仓库内。
- 长表格置于可聚焦水平滚动容器；未发现页面级横向滚动。

## 18. 可访问性

- 12 页均有跳到主内容链接和可聚焦 `main-content`。
- 当前页导航使用 `aria-current`；内页采用语义面包屑。
- 表格具有 caption 和 `scope`；生命周期使用有序列表；时间线/机制提供列表语义。
- 菜单支持 Escape、点击外部和断点变化关闭；无 JS 时导航仍可达。
- 统一 `:focus-visible`；真实键盘测试确认首个 Tab 焦点可见且跳转后焦点到主内容。
- 动效尊重 `prefers-reduced-motion`；返回顶部考虑安全区。

## 19. SEO

- 12 页均有独立 title、description、canonical、Open Graph、favicon 和中文 locale。
- 首页新增真实、最小化的 `WebSite` JSON-LD，不填写未知组织事实或联系人。
- 新增有效 `robots.txt` 和含 12 个公开 URL 的有效 `sitemap.xml`；`xmllint --noout` 通过。
- canonical 与 sitemap 均使用已核验的组织主页根域。
- 保留既有 URL，不以 SEO 为由重命名路由。

## 20. 性能

- 无第三方字体、分析器、搜索服务或大型依赖。
- 原 PNG 保留不变：1,884,325 bytes。
- 新 WebP：72,824 bytes，约减少 96.1%；CSS 使用 `image-set` 并保留 PNG 回退，首页预加载 WebP。
- 浏览器验证中背景图与 favicon 均成功加载；无控制台错误。
- 没有为性能删除 PDF、图片或其他用户资源。

## 21. 构建结果

真实执行：

```text
Jekyll 4.3.4（仓库外临时 Gem 目录）
jekyll build --trace
结果：成功，最终一轮生成时间约 0.014 秒
```

构建产物包含全部 12 个 HTML、CSS、JS、favicon、PNG/WebP、robots 和 sitemap；不含 `work/` 或 `scripts/`。

## 22. Lint、测试与静态验证

- 包管理器：不存在；未混用 npm/pnpm/yarn。
- 项目 lint 脚本：不存在，故为 N/A，没有伪称运行。
- 项目单元测试脚本：不存在，故为 N/A。
- `node --check script.js`：通过。
- `node --check scripts/validate-site.mjs`：通过。
- `node --check scripts/privacy-scan.mjs`：通过。
- `node --check scripts/browser-qa.mjs`：通过。
- `node scripts/validate-site.mjs`：通过；12 页、文件/锚点、重复 ID、旧 ID、表格、元数据、构建隔离均通过。
- `node scripts/privacy-scan.mjs --build`：通过，0 个配置模式命中。
- `git diff --check`：通过。

## 23. 重点页面与抽查

- 首页、本科毕业设计、本科科研、硕士、项目、里程碑、资源、成果、FAQ、About：均存在且直接访问成功。
- 博士兼容页与归档页：均存在且直接访问成功。
- 专属本地服务器日志确认 12 个页面首次请求均为 HTTP 200。
- 3 个以上资源：已抽查 7 个说明性资源及锚点。
- 3 个以上里程碑：已抽查三轨摘要、硕士 4 行既有节点和共性阶段门。
- 三条完整路径：16/13/20 步生命周期均完成结构与浏览器检查。
- 3 个真实项目、真实下载入口：源仓库不存在，明确为未适用/待补充。

## 24. 未解决问题

1. 硕士具体月份缺正式制度来源、适用届次和最后核验日期。
2. 未提供官方邮箱、办公室、申请或隐私更正渠道。
3. 未提供真实模板文件、版本、更新时间和下载链接。
4. 未提供可公开课题、项目、成果、新闻或授权记录。
5. 背景图来源与使用许可需负责人核验。
6. 身份关联旧示例仍存在于公开源与 Git 历史；构建已剔除，但源风险尚未消除。
7. 未在远端 Pages 环境部署，因此远端新页面状态需在人工发布后复核。

## 25. 需要人工补充或确认

- 学院/专业正式培养制度与年度时间表来源。
- 三类轨道的负责人和正式联系渠道。
- 真实公共模板与维护责任人。
- 可公开课题/项目/成果及事实、IP、授权证明。
- 身份关联旧示例的授权、迁移、仓库可见性和历史处置决定。
- 背景图许可。
- GitHub Pages Source、HTTPS 和构建日志的远端人工核对。

## 26. 最终结论

本次在不删除文件、不改变旧 URL/现有 ID/接口、不伪造业务事实的前提下，将站点重构为三类培养轨道加一套共性机制的公共门户。所有原页面正文块保留；不适宜公开的旧内容只停止进入生成页面。真实 Jekyll 构建、发布隔离、静态验证、隐私扫描和 60 个响应式页面组合均通过。剩余问题均依赖正式制度、授权、联系人或远端发布权限，应由负责人补充和确认。
