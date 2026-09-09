# CSMA 学生学业项目与科研培养公共门户

## 仓库用途

本仓库用于部署 CSMA-Graduation-Projects 组织的 GitHub Pages 静态网站。网站定位为 **CSMA 学生学业项目与科研培养公共门户**：通过清晰的培养路径、阶段任务、过程证据、反馈机制、公共资源和经授权成果，帮助学生理解“现在处于哪里、下一步做什么、应形成什么证据”。

学生是学业与研究成长的主体；导师提供方向、方法、资源与反馈。本站不是成绩、评价或学生档案管理后台，也不会用前端登录保护本应私有的数据。

当前 `main` 为融合版：延续早期版的深蓝主视觉与简洁布局，保留详实版的完整培养内容。首页集中提供四条培养路径和常用入口，内页按阶段展开详细要求。

## 网站主要内容

- 首页：培养路径、阶段方法、资源与成果、关于与联系。
- 本科毕业设计：从了解要求、课题匹配到答辩、归档和授权成果展示。
- 本科科研：从申请匹配、基础训练和小任务到正式项目、复现写作与长期发展。
- 硕士成长：Foundation、Exploration、Research、Validation、Dissemination、Graduation、Development。
- 博士培养：覆盖前沿研究、阶段汇报、成果沉淀和交接，与其他三条培养路径并列展示。
- 里程碑：三类轨道共用的 Goal / Tasks / Evidence / Review / Exit Criteria。
- 项目与成果：只接收真实、可核验、适合公开且获得授权的条目。
- 资源与模板：周报、综述、开题、中期、论文检查、归档和交接说明；真实下载文件待核验后补充。
- 归档规范：区分受控私有过程库与公共成果库。
- FAQ 与 About：说明使用方式、事实边界、隐私边界和公共联系入口。

## 公开与私有边界

适合公开：培养介绍、通用流程、公开方向、公共模板/检查表、工具指南、经授权成果和官方联系方式。

默认私有：学生申请与培养记录、周报、成绩/排名、导师反馈、评审/答辩意见、未公开论文或数据、项目申请书、待申请专利、私有仓库/服务器地址、私人联系方式和所有账号凭据。

公开 GitHub 仓库中的隐藏元素、未链接文件、JSON 或前端“登录”都不是真正的访问控制。详细规则见 [`docs/privacy-and-publication-boundary.md`](docs/privacy-and-publication-boundary.md)。

## 文件结构说明

```text
.
├── index.html        # 网站首页
├── bachelor.html                  # 本科毕业设计培养路径（保留 URL）
├── undergraduate-research.html    # 本科科研培养路径
├── master.html                    # 硕士学业与科研全流程（保留 URL）
├── doctor.html                    # 博士培养指南（保留 URL）
├── milestones.html                # 里程碑与阶段门
├── projects.html                  # 项目与课题
├── outcomes.html                  # 经授权公开成果
├── templates.html                 # 资源与模板（保留 URL/锚点）
├── archive.html                   # 归档与公开边界（保留 URL/锚点）
├── faq.html / about.html          # 常见问题、门户与联系
├── assets/           # 页面视觉资源
├── style.css         # 全站样式
├── script.js         # 导航与返回顶部交互
├── scripts/          # 本地静态验证脚本（不进入 Pages 构建）
├── docs/             # 维护与内容治理文档
├── work/             # 内部审计材料（通过 _config.yml 排除发布）
├── _config.yml       # GitHub Pages/Jekyll 发布排除配置
└── README.md         # 仓库说明文档
```

## 本地修改方式

本网站使用纯 HTML、CSS、JavaScript 编写，无 npm/pnpm/yarn 依赖。修改页面时编辑对应 `.html`；修改全站视觉样式时编辑 `style.css`；修改菜单与返回顶部交互时编辑 `script.js`。

发布等价预览应先用兼容 Jekyll 环境生成 `_site/`（详见部署文档），再运行：

```sh
python -m http.server 8000 --directory _site
```

然后在浏览器访问：

```text
http://localhost:8000
```

不要把直接服务源码目录当作发布验收：`index.html` 和 `archive.html` 使用 Jekyll 前置区与构建注释，只有生成产物才体现真实公开内容。

本地检查：

```sh
node --check script.js
node scripts/validate-site.mjs
node scripts/privacy-scan.mjs --build
git diff --check
```

结构验证脚本检查预期页面、站内文件与锚点、重复 ID、历史兼容 ID、表格语义、基础 SEO 元数据和 `work/` 发布排除。隐私扫描只显示路径、类型和计数，不回显匹配值；源文件与历史扫描仍会报告本次按约束保留的身份关联型旧示例。

## GitHub Pages 使用说明

GitHub Pages 应配置为从 `main` 分支的 `/(root)` 发布。日常修改直接在 `main` 上完成；提交并推送后，等待 Pages 构建成功即可更新网页。

开始修改前：

```sh
git switch main
git pull --ff-only origin main
```

修改并完成检查后：

```sh
git status --short
git add .
git commit -m "Update site content"
git push -u origin main
```

`push` 只上传已提交的内容。设置过上游后，也可以使用 `git push`。多人协作或大改版仍可使用功能分支与 PR；普通内容维护不要求另建分支。前序版本通过标签保留，详见 [`docs/versions.md`](docs/versions.md)。

`_config.yml` 必须保留 `work` 排除项。注意：构建排除只能阻止文件进入 Pages 产物，不能让公开 GitHub 仓库中的源文件变私有。

组织主页仓库通常可通过以下形式访问：

```text
https://CSMA-Graduation-Projects.github.io/
```

## 内容维护入口

- 站点维护：[`docs/site-maintenance.md`](docs/site-maintenance.md)
- 内容管理：[`docs/content-management.md`](docs/content-management.md)
- 隐私与发布边界：[`docs/privacy-and-publication-boundary.md`](docs/privacy-and-publication-boundary.md)
- 部署：[`docs/deployment.md`](docs/deployment.md)

## 安全提交原则

提交前确认没有 secret、个人信息、未公开研究、私有 URL 或内部审计材料进入发布产物；不要清理或重写 Git 历史，除非负责人已制定专门的事故响应方案并明确授权。
