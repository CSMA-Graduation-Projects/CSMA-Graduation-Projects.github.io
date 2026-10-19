# CSMA 人才培养管理体系

本轮扩展：完整[英文门户](en/index.html)、[学习与研究导引](essays.html)、[国际学生指南](international.html)及新增[学习与成长指南](learning.html)。两种语言各覆盖 5 条培养路径、45 个阶段、11 张培养与科研流程图、7 类科研工具任务和 25 份可填写模板，并提供对应离线手册与下载包。新增博士完整路径，将各层级的能力目标、学习实践、证据自检、反馈纠正与下一步连接起来。设计与验收范围见[学习与成长更新](docs/training-redesign/09-学习与成长.md)。

面向本科生、硕士生与博士生的公共培养指南，提供具体阶段、任务、交付、检查与反馈安排；国际学生按学位层次核对适用要求、语言和支持事项。栏目统一为“导引 / Mentoring”，语言入口使用 EN / ZH。站点采用原有 GitHub Pages / Jekyll 架构，无前端构建框架依赖。

本轮已构建 58 个 HTML 页面：培养内容检查 51/51、流程与工具检查 46/46、双语检查 62/62 通过，站内链接、下载包哈希和重复生成核验通过；实际浏览器检查覆盖 60 组响应式页面与 22 张中英导出图，见[学习成长验收记录](docs/training-redesign/growth-verification.json)。此前 54 页双语版本的响应式 2596 项、文章定向 196 项及交互下载 82 项检查见[双语验收记录](docs/training-redesign/bilingual-verification.json)；随后 56 页国际学生版本的 51 项双语检查和定向浏览器检查见[国际学生验收记录](docs/training-redesign/international-verification.json)。这两份报告保留各自历史范围。

2026-10-19 发布范围：流程图、科研工具、完整双语门户、导引、国际学生与学习成长指南。用户已确认先发布当前验证版本，后续继续增量完善。下列本地验收报告保留各自验证时的快照；实际发布提交及部署状态以仓库历史和 GitHub Pages Actions 为准。此前基础版本为 `befdced`。

2026-10-19 阅读方式更新：培养与科研流程图默认在网页正文直接显示，无需点击展开、下载文件或安装软件；保存与编辑入口放在图后，仍可按需收起。早期直接显示调整的备份为 `CSMA-Graduation-Projects.github.io-backup-20261019-022746`，526 个文件核对一致；本次版本已纳入博士路径与新的学习循环。

## 内容入口

| 路径或工具 | 内容 |
| --- | --- |
| [首页](index.html) | 五条培养路径、学习成长与常用任务入口 |
| [学习与成长](learning.html) | 起点诊断、四层能力目标、六步学习循环、阻塞处理、复盘与迁移 |
| [本科科研训练](undergraduate-research.html) | 7 阶段：入门、基础、探索、计划、执行、总结、归档 |
| [本科毕业设计](bachelor.html) | 8 阶段：选题至论文答辩、终稿归档 |
| [学科竞赛](competition.html) | 6 阶段：选赛、组队、原型、开发、提交、复盘 |
| [硕士培养](master.html) | 13 阶段：入学至学位手续、数据交接 |
| [博士培养](doctor.html) | 11 阶段：研究基础至原创贡献、论文评审、学位与资料交接 |
| [阶段总览](milestones.html) / [个人清单](planner.html) | 阶段衔接、个人自检、本地保存与导出 |
| [流程图总览](workflows.html) | 5 条培养路径、6 类共同工作，含判断、整改、返回路线及 SVG / draw.io 下载 |
| [科研工具指南](tools.html) | 7 类任务的工具组合、操作步骤、交付产物和核验方法，与培养阶段互通 |
| [模板库](templates.html) | 25 份 Markdown 模板，含学习与成长复盘；可预览、搜索、复制和下载 |
| [学习与研究导引](essays.html) | 学习方法、科研实践与指导交流文章，中英配对 |
| [国际学生指南](international.html) | 本硕博适用要求、材料语言、共同核对与学习支持 |
| [日常管理](management.html) | 任务、周报、组会、沟通、请假与资源 |
| [学术规范](integrity.html) | 数据、引用、AI、查重、查非、匿名送审 |
| [归档交接](archive.html) | 数据目录、版本、校验、复现和权限交接 |
| [依据与校本核对](policies.html) | 官方来源、有效版本、适用年级与待核实规则 |

新闻、项目、成果、榜样和关于等原有栏目保留。博士页面沿用原地址并扩展为完整路径。旧页面 URL 与历史阶段锚点继续兼容。

## 正式规则与公共边界

本网站提供通用执行方法，不自行制定学校的学位门槛。正式时限、学分、成果要求、查重/查非标准、评阅与答辩处理，须按本人适用的校院有效文件确认。组内工作建议与学校正式批准分别记录。

公开站点只提供指南、空白模板和经授权内容。填写后的个人培养记录、考勤、评审、未公开论文和数据存入获准的受控空间。阶段清单只在浏览器本地保存自检状态与个人计划日期，不向服务器提交，不认定阶段通过。

## 内容维护

- 培养路径源：`assets/data/pathways.json`；英文为 `assets/data/en/pathways.json`。
- 模板目录源：`assets/data/templates.json` 及其 `en/` 对应文件；实际文件：`assets/templates/*.md`、`assets/templates/en/*.md`。
- 流程图源：`assets/data/workflows.json` 及其 `en/` 对应文件；各语言分别生成 SVG 与 draw.io 文件。
- 科研工具源：`assets/data/research-tools.json`；含工具、任务场景、官方来源和阶段映射。
- 共用指南源：`scripts/training-pages/*.html` 与 `scripts/training-pages/en/*.html`；学习成长源为两种语言的 `learning.html`。
- 统一生成器：`scripts/build-training.py`；调用 `scripts/workflow_diagrams.py` 与 `scripts/research_tools.py`，生成首页、五条路径、共用页、模板页、流程与工具页、完整手册及下载包。
- 页面交互：`assets/training.js`；培养页面样式：`assets/training.css`；流程和工具样式：`assets/workflows.css`、`assets/research-tools.css`；原有基础样式：`style.css`。
- 新闻：`_posts/`、`_news_en/`；导引：`_essays/`、`_essays_en/`；成果与学生故事：`_data/`；语言导航与公共文案见 `scripts/i18n.py`、`scripts/i18n/en.json`。

修改数据或模板后执行：

```sh
python3 scripts/build-training.py
node --check assets/training.js
node --check assets/training-en.js
node scripts/validate-training.mjs
node scripts/validate-workflow-tools.mjs
python3 scripts/verify-training-package.py
```

生成页面和图文件应随数据一起提交，GitHub Pages 直接构建已生成 HTML。不要只改派生页面或导出的图文件，否则下一次生成会覆盖。每种语言的模板包应包含 25 份模板、使用说明、完整手册和 SHA-256 清单，共 28 个条目；独立流程图包应包含 11 份 SVG、11 份 draw.io 文件、使用说明和 SHA-256 清单，共 24 个条目。生成后核对实际成员与哈希，不混入填写后的材料。

## 构建与验证

使用 Jekyll 3.10 兼容环境构建真实发布产物；不要直接服务源码目录代替验收，因为新闻等内容依赖 Liquid。

```sh
jekyll build --safe --trace
node scripts/validate-site.mjs --build
python3 -B scripts/validate-bilingual.py
node scripts/privacy-scan.mjs --build
node scripts/validate-training.mjs
node scripts/validate-workflow-tools.mjs --build
git diff --check
python3 -m http.server 8766 --bind 127.0.0.1 --directory _site
```

浏览器验证（需要本机 Chrome）：

```sh
CSMA_QA_BASE_URL=http://127.0.0.1:8766 node scripts/browser-qa.mjs
CSMA_QA_BASE_URL=http://127.0.0.1:8766 node scripts/training-browser-qa.mjs
```

`_config.yml` 排除脚本、内部审计与本次改版过程文档。构建排除不意味着公开 GitHub 仓库中的源文件是私有的。不要把个人记录放进本仓库。

双语扩展前的本地验收快照包括流程与工具构建检查 44/44、培养内容检查 37/37、响应式检查 796/796 和功能检查 55/55。响应式检查覆盖 22 页、320 至 1440 像素的六种宽度。全部 20 个图文件通过 XML 解析；本机 draw.io 实际打开了硕士代表图并确认节点与连线可编辑。详情见[流程与工具验收摘要](docs/training-redesign/workflow-verification.json)，这些结果不代表本次扩展已经部署到线上。

## 发布与恢复

发布流程为本地实现与验收、演示确认、提交与推送、核对 Pages 构建及线上页面。2026-10-18 的基础版本为 `befdced`；2026-10-19 的完整扩展已获用户明确发布授权。正常发布时只暂存审查过的文件；公开界面验收截图可以保留，浏览器配置、临时依赖、学生材料与缓存不进入仓库。

本次发布前再次保存同级完整备份 `CSMA-Graduation-Projects.github.io-backup-20261019-103348`：829 个文件、1065 个目录项，清单、SHA-256 和权限一致，复制期间源目录不变，`git fsck` 通过。

本轮学习成长更新前已在仓库同级创建完整备份 `CSMA-Graduation-Projects.github.io-backup-20261019-042446`：804 个文件、1039 个目录项，文件与 SHA-256 清单核对一致，复制期间源目录不变，`git fsck` 通过，基线为 `befdcedb28ab7ad4cc59865f6ebf7bc973c0f4d1`。此前各轮备份保留。恢复时先保存当前目录，再从对应备份复制到新的恢复目录核对；不要覆盖当前工作或改写 Git 历史。

维护文档：[内容管理](docs/content-management.md)、[新闻维护](docs/news-publishing.md)、[公开边界](docs/privacy-and-publication-boundary.md)、[部署](docs/deployment.md)。本次过程记录在 `docs/training-redesign/`。
