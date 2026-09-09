# CSMA 学业项目主页仓库审计

审计日期：2026-09-04  
审计基线：`d6ad5e959d772706a7041dcf2ce5513190361e8f`  
基线分支：`backup/pre-system-redesign-20260904-220934`  
工作分支：`feature/system-audit-redesign-20260904-220934`

> 本文件是内部工作材料。它通过根目录 `_config.yml` 从 GitHub Pages 构建产物中排除。构建排除不等于仓库私有；公开仓库中的源文件仍可被访问。

## 1. 安全基线

- 审计开始时工作区干净，分支为 `main`，并跟踪 `origin/main`。
- 远程仓库：GitHub 组织主页仓库；未发现内嵌凭据。
- Git bundle：`../CSMA-Graduation-Projects.github.io-20260904-220934.bundle`。
- 工作区副本：`../CSMA-Graduation-Projects.github.io-worktree-20260904-220934/`。
- bundle 已通过 `git bundle verify`，包含完整 4 提交历史。
- 未 stash、commit、push、merge、强制切换或清理任何用户修改。

## 2. 真实技术栈

- 纯静态 HTML5、CSS、原生 JavaScript。
- 无 `package.json`、锁文件、前端框架、服务端、数据库或远程 API。
- 首页入口为 `index.html`；其余页面通过相对 `.html` 链接组成文件路由。
- 样式单一来源为 `style.css`；交互单一来源为 `script.js`。
- 唯一图片资产为 `assets/hero-workflow.png`，尺寸 1672×941，约 1.8 MiB。
- 当前无结构化业务数据文件；未发现 JSON、YAML、CSV、PDF、DOCX 或真实模板下载文件。

## 3. 部署与在线状态

- README 说明当前采用 GitHub Pages “Deploy from a branch”，来源为默认分支根目录。
- 仓库最初无 Actions workflow、`_config.yml` 或 `.nojekyll`。
- 2026-09-04 只读检查时，站点根路径及 6 个既有页面均返回 HTTP 200。
- 本地基线与线上 `index.html`、`archive.html` 内容哈希一致，说明基线内容正在公开发布。
- 组织主页仓库使用根域，不需要项目子路径；当前相对资源路径兼容该 base。

## 4. 既有路由与兼容边界

必须保留：

- `index.html`
- `bachelor.html`
- `master.html`
- `doctor.html`
- `templates.html`
- `archive.html`

必须保留当前锚点：

- 首页：`top`、`philosophy`、`programs`、`timeline`、`outcomes`、`naming`、`structure`、`templates`、`organization`。
- 模板页：`top`、`weekly`、`survey`、`proposal`、`midterm`、`thesis-check`、`archive-template`、`handover` 及相应 `*-detail`。
- 归档页：`top`、`repository-structure`。
- 培养页：`top`。

Git 历史中还出现过 `home`、`理念`、`overview`、`ug-timeline`、`management`、`faq`；本次以别名锚点恢复，不重命名现有锚点。

## 5. 架构与部署风险

| 等级 | 风险 | 证据 | 处理 |
|---|---|---|---|
| 高 | 内部 `work/` 可能从分支根目录进入 Pages | 基线缺少发布排除配置 | 新增最小 `_config.yml` 排除 `work`，构建后检查 `_site/work` 不存在 |
| 高 | 公开页面引导把账号、数据位置、联系人、过程材料写入仓库 | `templates.html`、`archive.html`、`master.html`、`doctor.html` | 明确凭据绝不入库，私人材料仅进入受控私有系统 |
| 高 | 缺少本科科研独立入口 | 仅有本科毕设、硕士、博士 | 新增独立静态路由，不复用或破坏 `bachelor.html` |
| 中 | 首页、详情页重复维护流程、节点、命名和归档说明 | 多个 HTML 内重复文本 | 详情页作为权威来源，首页保留摘要与链接 |
| 中 | 没有自动化结构与链接回归 | 无测试脚本 | 新增无依赖静态验证脚本 |
| 中 | 无 canonical、OG、favicon、sitemap、robots | 所有页面 head 与根目录 | 在不改变 URL 的前提下补齐 |
| 低 | 原生 JS 菜单无 Escape/无 JS 降级/reduced-motion | `script.js` 与移动 CSS | 渐进增强并改善键盘交互 |

## 6. 数据与接口结论

- 当前没有 `students`、`projects`、`topics`、`milestones`、`templates`、`resources`、`outcomes` 等结构化数据接口。
- 页面内容均为静态硬编码；本次不引入大型框架、不做大规模数据迁移。
- 不存在可被此次修改破坏的 API、对象字段、关联键或 slug。
- 既有页面 URL、锚点和脚本元素 ID 必须保持兼容。
- 若以后引入学生或成果数据，应增加可选的 `public`、`consentToPublish`、`displayName`、`visibility` 字段，且默认不公开。

## 7. 构建前基线检查

- `node --check script.js`：通过。
- 当前本地 href/src 与 fragment 检查：通过，无缺失目标。
- 系统自带 Tidy 版本不能正确识别 UTF-8 HTML5 语义元素，因此其错误输出不作为有效 HTML5 结论。
- 无 Jekyll gem 基线；最终采用临时隔离环境或等价 Pages 构建进行验证，不向项目引入运行时依赖。

## 8. 审计结论

仓库规模小、依赖少、现有路由清晰，适合在原技术栈内进行渐进式重构。主要风险不是代码漏洞，而是公开站点定位与数据边界：页面偏向公开“管理/检查/归档”，缺少本科科研与完整培养阶段，同时存在诱导敏感材料进入公开仓库的表述。实施应以发布隔离、隐私边界、三轨入口和证据驱动阶段模型为先，不以重建技术栈解决内容治理问题。

