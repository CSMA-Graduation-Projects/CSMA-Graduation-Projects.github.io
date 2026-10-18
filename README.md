# CSMA 人才培养管理体系

面向本科生与硕士生的公共培养指南：找到当前阶段，明确行动、交付物、验收标准和下一步。站点采用原有 GitHub Pages / Jekyll 架构，无前端构建框架依赖。

## 内容入口

| 路径或工具 | 内容 |
| --- | --- |
| [首页](index.html) | 四条培养路径与常用任务入口 |
| [本科科研训练](undergraduate-research.html) | 7 阶段：入门、基础、探索、计划、执行、总结、归档 |
| [本科毕业设计](bachelor.html) | 8 阶段：选题至论文答辩、终稿归档 |
| [学科竞赛](competition.html) | 6 阶段：选赛、组队、原型、开发、提交、复盘 |
| [硕士培养](master.html) | 13 阶段：入学至学位手续、数据交接 |
| [阶段总览](milestones.html) / [个人清单](planner.html) | 阶段衔接、个人自检、本地保存与导出 |
| [模板库](templates.html) | 24 份 Markdown 模板、预览、搜索、复制和 ZIP 下载 |
| [日常管理](management.html) | 任务、周报、组会、沟通、请假与资源 |
| [学术规范](integrity.html) | 数据、引用、AI、查重、查非、匿名送审 |
| [归档交接](archive.html) | 数据目录、版本、校验、复现和权限交接 |
| [依据与校本核对](policies.html) | 官方来源、有效版本、适用年级与待核实规则 |

博士、新闻、项目、成果、榜样和关于等原有栏目保留。旧页面 URL 与历史阶段锚点继续兼容。

## 正式规则与公共边界

本网站提供通用执行方法，不自行制定学校的学位门槛。正式时限、学分、成果要求、查重/查非标准、评阅与答辩处理，须按本人适用的校院有效文件确认。组内工作建议与学校正式批准分别记录。

公开站点只提供指南、空白模板和经授权内容。填写后的个人培养记录、考勤、评审、未公开论文和数据存入获准的受控空间。阶段清单只在浏览器本地保存自检状态与个人计划日期，不向服务器提交，不认定阶段通过。

## 内容维护

- 培养路径源：`assets/data/pathways.json`。
- 模板目录源：`assets/data/templates.json`；实际文件：`assets/templates/*.md`。
- 共用指南源：`scripts/training-pages/*.html`。
- 生成器：`scripts/build-training.py`，生成首页、四路径、共用页、模板页、完整阶段手册与下载包。
- 页面交互：`assets/training.js`；新视觉：`assets/training.css`；原有基础样式：`style.css`。
- 新闻：`_posts/`；成果与学生故事：`_data/`；共用新闻布局：`_layouts/news.html`。

修改数据或模板后执行：

```sh
python3 scripts/build-training.py
node --check assets/training.js
node scripts/validate-training.mjs
python3 scripts/verify-training-package.py
```

生成页面应随数据一起提交，GitHub Pages 直接构建已生成 HTML。不要只改派生页面，否则下一次生成会覆盖。下载包内含 24 份模板、使用说明、完整阶段手册和 SHA-256 清单；生成过程确定，不混入填写后的材料。

## 构建与验证

使用 Jekyll 3.10 兼容环境构建真实发布产物；不要直接服务源码目录代替验收，因为新闻等内容依赖 Liquid。

```sh
jekyll build --safe --trace
node scripts/validate-site.mjs --build
node scripts/privacy-scan.mjs --build
node scripts/validate-training.mjs
git diff --check
python3 -m http.server 8766 --bind 127.0.0.1 --directory _site
```

浏览器验证（需要本机 Chrome）：

```sh
CSMA_QA_BASE_URL=http://127.0.0.1:8766 node scripts/browser-qa.mjs
CSMA_QA_BASE_URL=http://127.0.0.1:8766 node scripts/training-browser-qa.mjs
```

`_config.yml` 排除脚本、内部审计与本次改版过程文档。构建排除不意味着公开 GitHub 仓库中的源文件是私有的。不要把个人记录放进本仓库。

## 发布与恢复

发布流程为本地实现与验收、演示确认、提交与推送、核对 Pages 构建及线上页面。本次改版已于 2026-10-18 完成本地验收和演示，并获得继续发布的确认。正常发布时只暂存审查过的文件；公开界面验收截图可以保留，浏览器配置、临时依赖、学生材料与缓存不进入仓库。

修改前已在仓库同级创建完整备份，备份名为 `CSMA-Graduation-Projects.github.io-backup-20261018-023603`。恢复时先保存当前目录，再从备份复制到新的恢复目录核对；不要覆盖当前工作或改写 Git 历史。

维护文档：[内容管理](docs/content-management.md)、[新闻维护](docs/news-publishing.md)、[公开边界](docs/privacy-and-publication-boundary.md)、[部署](docs/deployment.md)。本次过程记录在 `docs/training-redesign/`。
