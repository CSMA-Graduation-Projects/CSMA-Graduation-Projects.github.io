# 新闻发布与栏目维护

顶部导航为：首页、新闻、学士、硕士、博士、资源、成果、榜样、导引、关于。“榜样”展示优秀学生的成长经历和代表作品，与展示各项产出的“成果”相互关联。“导引 / Mentoring”承载学习与研究指导文章。

## 发布一条新闻

1. 复制 `docs/content-templates/news.md` 到 `_posts/`，英文配对稿放在 `_news_en/`，保持相同文件名及正文锚点。
2. 将文件命名为 `YYYY-MM-DD-英文短标题.md`，例如 `2026-09-10-weekly-arrangement.md`。
3. 填写文件开头的标题、日期、类型、适用对象和摘要，然后填写正文。日期与文件名一致，使用 `YYYY-MM-DD`；同日新闻使用不同的英文短标题。
4. 有截止时间时填写 `deadline`，没有则删除这一行。安排与要求应说明任务、时间、完成方式和相关材料。
5. 检查后提交并推送 `main`：

```sh
node scripts/validate-site.mjs
git add _posts/
git commit -m "发布工作安排"
git push -u origin main
```

GitHub Pages 构建成功后，新闻页自动列出文章，首页自动展示最新三条。无需再编辑首页列表。正文的固定地址为 `/news/YYYY-MM-DD-英文短标题.html`；修改既有新闻时保留文件名和日期，以免旧链接失效。

正文用 `##`、`###` 写小标题，文章标题由系统生成。站内链接使用从根目录开始的路径，例如 `[材料说明](/templates.html#weekly-detail)`。图片或附件先放入 `assets/`，再用 `/assets/文件名` 引用。

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

- **资源**：修改 `scripts/build-training.py` 的资源入口和对应英文文案，再重新生成页面。25 份模板在 `templates.html`；模板元数据维护于 `assets/data/templates.json` 和 `assets/data/en/templates.json`。
- **关于**：在 `about.html` 更新研究组介绍、培养理念、工作方式与公开联系信息。
- **导引**：中英文章分别维护于 `_essays/` 和 `_essays_en/`，保持相同 slug，参考配对的导引模板。
- **导航**：维护 `scripts/i18n.py` 中的共享十项导航，再执行 `python3 scripts/build-training.py`；验证脚本检查两种语言的顺序、链接与当前栏目。

有本地 Jekyll 环境时，构建后运行 `node scripts/validate-site.mjs --build` 和 `node scripts/privacy-scan.mjs --build`，以检查生成的新闻正文、列表、数据卡片和站内链接。
