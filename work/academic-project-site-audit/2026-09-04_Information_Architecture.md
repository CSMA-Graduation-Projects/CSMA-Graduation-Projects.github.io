# CSMA 学业项目公共门户信息架构

审计日期：2026-09-04

## 1. 定位

目标定位：**CSMA 学生学业项目与科研培养公共门户**。

门户帮助学生回答：我处于哪条培养路径、当前阶段的目标是什么、下一步做什么、需要形成什么证据、如何获得反馈、何时进入下一阶段。它不是成绩系统、评价系统、公开档案库或静态网页伪装的管理后台。

## 2. 内容原则

- 学生是学习与研究成长主体。
- 导师提供方向、方法、资源与反馈支持。
- 项目是培养载体，不以公开排名或负面状态监督个人。
- 过程证据用于复核、反馈与持续改进。
- 私人记录与未公开研究默认存入受控私有系统。
- 公开成果必须真实、可核验、获授权。

共性机制：`Guidance → Planning → Execution → Evidence → Feedback → Reflection → Achievement`。

## 3. 目标站点地图

```text
Home (index.html)
├── 本科毕业设计 (bachelor.html，保留)
├── 本科科研 (undergraduate-research.html，新增)
├── 硕士成长 (master.html，保留)
├── 博士培养 (doctor.html，保留兼容)
├── 项目与课题 (projects.html，新增；无事实时显示空状态)
├── 里程碑 (milestones.html，新增共性入口)
├── 资源与模板 (templates.html，保留并扩展)
├── 公开成果 (outcomes.html，新增；无授权数据时显示空状态)
├── 归档规范 (archive.html，保留)
├── FAQ (faq.html，新增)
└── 关于与联系 (about.html，新增)
```

## 4. 首页结构

1. Hero and Purpose：说明公共门户定位和公开边界。
2. Three Learning Tracks：本科毕设、本科科研、硕士同等入口。
3. Current Milestones：指向各轨道权威页面；无已核验动态日期时不制造“当前”状态。
4. How the System Works：七步共性机制。
5. Featured Topics or Projects：没有真实授权数据时显示透明空状态。
6. Essential Resources：链接现有 7 个说明性资源。
7. Selected Outcomes：没有真实授权数据时显示透明空状态。
8. Latest Updates：只说明资料状态，不伪造新闻。
9. FAQ Preview。
10. About and Contact：使用已核验 GitHub 组织入口，官方联系方式待补。

## 5. 三轨统一页面模型

每条轨道使用：

```text
Overview
Who It Is For
Learning Outcomes
Lifecycle
Current Milestones
Stage Details
Required Deliverables
Templates and Resources
Quality Checklist
Common Risks
FAQ
Public Outcomes
Contact
```

每阶段使用：

```text
Goal
Tasks
Evidence
Review
Exit Criteria
```

其中 Evidence 只描述证据类型；学生实际周报、评价、报告、数据和未公开材料不由公共门户存储。

## 6. 三轨生命周期

### 本科毕业设计

了解要求 → 课题发布 → 学生选题 → 师生沟通与确认 → 任务书 → 开题与文献调研 → 需求分析和方案设计 → 系统/研究实现 → 实验与测试 → 中期检查 → 论文撰写 → 材料自查 → 预答辩（如适用）→ 正式答辩 → 修改归档 → 经授权成果展示。

### 本科科研

了解研究组 → 申请与匹配 → 入门训练 → 工具与规范学习 → 方向探索 → 小任务验证 → 正式项目 → 周期汇报 → 实验和系统实现 → 写作与复现 → 论文/竞赛/项目成果（可能路径，不承诺）→ 能力总结 → 升学与长期发展衔接。

### 硕士成长

Foundation → Exploration → Research → Validation → Dissemination → Graduation → Development，对应入学适应、沟通/计划/课程、方向与文献、开题与研究、实验验证、论文/答辩/归档及就业升学。

## 7. 权威来源与复用

- `bachelor.html`：本科毕业设计权威流程。
- `undergraduate-research.html`：本科科研权威流程。
- `master.html`：硕士权威流程与既有参考时间。
- `templates.html`：资源说明的单一权威入口。
- `archive.html`：私有过程归档与公开成果归档边界的权威说明。
- 首页只呈现摘要，不再复制全部流程与命名清单。

## 8. 搜索与筛选决策

当前没有项目/成果数据集，内容规模不足以证明搜索价值。本次不引入第三方服务或大型依赖。未来真实公开条目达到需要浏览的规模后，可基于结构化公开数据增加无依赖客户端筛选；筛选字段不得包含成绩、评价或负面个人状态。

## 9. 兼容策略

- 不删除或重命名任何现有 `.html` URL。
- 不改变现有脚本 ID：`nav-toggle`、`main-nav`、`back-to-top`。
- 不改变当前锚点，补回历史别名锚点。
- `doctor.html` 继续保留并可达；是否调整导航层级仅列候选，不在本次自动执行。
- 无数据字段迁移或接口变更。

