# 新闻发布与栏目维护

顶部导航为：首页、新闻、学士、硕士、博士、联培、资源、成果、榜样、导引、我们。“联培 / Joint Training”提供面向外校及海外本硕博的科研与竞赛合作入口，以及跨校共同指导与正式培养衔接指南；科研与竞赛合作作为联培子页，不增加顶部栏目。“榜样”展示优秀学生的成长经历和代表作品，与展示各项产出的“成果”相互关联；“导引 / Mentoring”承载学习与研究指导文章。“我们 / About”保留 `about.html` 地址及“关于我们 / About Us”页面标题。

## 发布一条新闻

1. 复制 `docs/content-templates/news.md` 到 `_posts/`，英文配对稿放在 `_news_en/`，保持相同文件名及正文锚点。
2. 将文件命名为 `YYYY-MM-DD-英文短标题.md`，例如 `2026-09-10-weekly-arrangement.md`。
3. 填写文件开头的标题、日期、类型、适用对象和摘要，然后填写正文。日期与文件名一致，使用 `YYYY-MM-DD`；同日新闻使用不同的英文短标题。
4. 有截止时间时填写 `deadline`，没有则删除这一行。安排与要求应说明任务、时间、完成方式和相关材料。
5. 核对两语内容并完成构建检查，在发布已获授权时提交并推送 `main`：

```sh
node scripts/validate-site.mjs
git add _posts/ _news_en/
git commit -m "发布工作安排"
git push -u origin main
```

GitHub Pages 构建成功后，新闻页自动列出文章，首页自动展示最新三条。无需再编辑首页列表。正文的固定地址为 `/news/YYYY-MM-DD-英文短标题.html`；修改既有新闻时保留文件名和日期，以免旧链接失效。

正文用 `##`、`###` 写小标题，文章标题由系统生成。站内链接使用从根目录开始的路径，例如中文 `[材料说明](/templates.html#weekly-detail)`、英文 `[Materials](/en/templates.html#weekly-detail)`。图片或附件先放入 `assets/`，再用 `/assets/文件名` 引用。

未来日期的新闻会等到日期到达且网站再次构建时才显示；本站没有定时发布服务。如需当天发布，使用实际发布日期并在当天推送。

## 添加成果与学生榜样

| 栏目 | 内容文件 | 填写内容 |
| --- | --- | --- |
| 成果 | `_data/achievements.json` | 成果标题、类别、日期、参与者、简介、公开来源或作品链接 |
| 榜样 | `_data/students.json` | 展示姓名、培养阶段、届次说明、成长简介、代表经历、作品链接；照片可选 |

两个文件初始为 `[]`。可参考 `docs/content-templates/achievement.json` 和 `docs/content-templates/student.json`，把填写完成的对象加入数组，多个对象用逗号分隔。成果按日期从新到旧排列，榜样按数据文件中的顺序展示。条目的 `id` 使用稳定的英文字母、数字和连字符，不随标题变化。

链接使用完整 `https://` 地址或 `/` 开头的站内路径。照片放在 `assets/`，填写如 `/assets/students/portrait.jpg` 的真实路径；没有照片就省略 `photo`。每项成果和榜样至少提供一条可查阅的公开来源或代表作品链接。

实际学生事迹与成果材料确认后再加入公开数据；当前页面保留简洁的待补充状态。草稿和授权记录放在仓库之外，构建排除或隐藏页面不能使公开仓库中的材料变私有。

## 维护其他栏目

- **资源**：修改 `scripts/build-training.py` 的资源入口和对应英文文案，再重新生成页面。本轮 28 份模板在 `templates.html`；模板元数据维护于 `assets/data/templates.json` 和 `assets/data/en/templates.json`。
- **联培**：维护 `scripts/training-pages/joint-training.html` 与其 `en/` 对应源，保持章节锚点与七阶段内容对应；流程在中英 `assets/data/workflows.json` 的 `joint-training` 项，专用模板为 `joint-training-plan.md` 和 `joint-training-recognition.md`。重新生成网页、离线手册和下载包后再验证。入口是 `joint-training.html` 与 `en/joint-training.html`，不新增培养路径。
- **科研与竞赛合作**：维护 `scripts/training-pages/research-collaboration.html` 与其 `en/` 对应源，归入联培；六步、两处判断的流程在中英 `workflows.json` 的 `research-collaboration` 项。首联系模板为中英 `collaboration-interest.md`，以简短兴趣、基础、时间和支持需求开启交流，允许科研新手参与；联系渠道链接导师公开主页，正式接收等手续按实际需要衔接。网页、离线手册与下载包统一生成。
- **我们**：中文介绍维护于 `about.html`，英文源为 `scripts/english-pages/about.html`；更新研究组介绍、培养理念、工作方式与公开联系信息后重新生成。介绍实际合作时核实项目状态和公开权限，不将通用联培指南写成已成立的合作项目。
- **导引**：中英文章分别维护于 `_essays/` 和 `_essays_en/`，保持相同 slug，参考配对的导引模板。
- **导航**：维护 `scripts/i18n.py` 中的共享十一项导航，再执行 `python3 scripts/build-training.py`；验证脚本检查两种语言的顺序、链接与当前栏目。

有本地 Jekyll 环境时，构建后运行 `node scripts/validate-site.mjs --build` 和 `node scripts/privacy-scan.mjs --build`，以检查生成的新闻正文、列表、数据卡片和站内链接。

联培及科研合作相关修改还应运行培养内容、流程工具、双语和下载包检查。本轮设计范围为 5 条路径、45 个阶段、28 份模板、13 张流程图及 62 个构建 HTML；每语言模板包应有 31 项及 30 条文件哈希，流程图包应有 28 项及 27 条文件哈希。设计与本轮验收见[科研与竞赛合作更新](training-redesign/11-科研与竞赛合作.md)和[合作验收记录](training-redesign/collaboration-verification.json)。新一轮培养 57/57、流程与工具 46/46、双语 71/71、站内链接与下载包校验已通过；[联合培养更新](training-redesign/10-联合培养.md)和[联培验收记录](training-redesign/joint-training-verification.json)保留上一轮 60 页、27 份模板、12 张图的范围。

本轮编辑前的同级完整备份为 `CSMA-Graduation-Projects.github.io-backup-20261020-121104`，包含 1122 个文件和 1419 个目录项。上一版 `39138ad` 已发布；2026-10-20 的联培和科研与竞赛合作已获用户发布授权。发布复核前另建备份 `CSMA-Graduation-Projects.github.io-backup-20261020-130124`，1147 个文件、1444 个目录项核验一致。最终复核见[12 发布验收](training-redesign/12-发布验收.md)，线上结果以当前 Pages 部署及公开页面为准。
