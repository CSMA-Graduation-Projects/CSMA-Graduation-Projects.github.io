#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""Generate the public training pages from auditable JSON and authored fragments.

Run before Jekyll. No dependency, network access, or Git mutation is required.
"""
import hashlib
import html
import json
import pathlib
import re
import zipfile
import shutil
from html.parser import HTMLParser
from workflow_diagrams import load_flows, render_flow, generate_diagram_assets, flows_for_track, flow_markdown
from research_tools import load_tools, render_tools, render_stage_tools, tools_markdown
from i18n import localize, page_language

SOURCE_ROOT = pathlib.Path(__file__).resolve().parents[1]
ROOT = SOURCE_ROOT
LANG = 'zh-CN'
def read(name):
    if name.startswith('scripts/training-pages/'):
        path = SOURCE_ROOT / 'scripts/training-pages' / ('en' if LANG == 'en' else '') / pathlib.Path(name).name
    else:
        path = ROOT / name
    return path.read_text(encoding='utf-8')
def write(name, text):
    text = localize(text, LANG)
    if name.endswith('.html'): text = page_language(text, name, LANG)
    p = ROOT / name
    p.parent.mkdir(parents=True, exist_ok=True)
    p.write_text('\n'.join(line.rstrip() for line in text.rstrip().splitlines()) + '\n', encoding='utf-8')
def esc(value): return html.escape(str(value), quote=True)
def ul(items): return '<ul>' + ''.join('<li>' + esc(x) + '</li>' for x in items) + '</ul>'
def aliases(ids): return ''.join(f'<span class="anchor-alias" id="{esc(x)}" aria-hidden="true"></span>' for x in ids)

NAV = [('index.html','首页'),('news.html','新闻'),('bachelor.html','学士'),('master.html','硕士'),('doctor.html','博士'),('resources.html','资源'),('outcomes.html','成果'),('students.html','榜样'),('about.html','关于')]
def shell(page, title, description, body, parent=None, home=False):
    parent = parent or page
    links = []
    for target,label in NAV:
        current = (' class="active" aria-current="' + ('page' if page == target else 'true') + '"') if parent == target else ''
        links.append(f'<a{current} href="{target}">{label}</a>')
    nav = '\n'.join(links)
    canonical = 'https://csma-graduation-projects.github.io/' + ('' if home else page)
    schema = '<script type="application/ld+json">' + json.dumps({'@context':'https://schema.org','@type':'WebSite','name':'CSMA 人才培养管理体系','url':canonical,'inLanguage':'zh-CN'},ensure_ascii=False) + '</script>' if home else ''
    return f'''---
---
<!doctype html>
<html lang="zh-CN">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>{esc(title)} | CSMA 人才培养管理体系</title>
  <meta name="description" content="{esc(description)}">
  <meta name="referrer" content="strict-origin-when-cross-origin">
  <meta name="theme-color" content="#14375f">
  <meta http-equiv="Content-Security-Policy" content="default-src 'self'; img-src 'self' data:; style-src 'self'; script-src 'self'; object-src 'none'; base-uri 'self'; form-action 'none'; frame-src 'none'">
  <link rel="canonical" href="{canonical}">
  <meta property="og:type" content="website">
  <meta property="og:locale" content="zh_CN">
  <meta property="og:site_name" content="CSMA 人才培养管理体系">
  <meta property="og:title" content="{esc(title)}">
  <meta property="og:description" content="{esc(description)}">
  <meta property="og:url" content="{canonical}">
  <meta property="og:image" content="https://csma-graduation-projects.github.io/assets/hero-workflow.png">
  <link rel="icon" href="assets/favicon.svg" type="image/svg+xml">
  <link rel="stylesheet" href="style.css">
  <link rel="stylesheet" href="assets/training.css">
  <link rel="stylesheet" href="assets/workflows.css">
  <link rel="stylesheet" href="assets/research-tools.css">
  {schema}
</head>
<body class="training-site{' training-home' if home else ''}">
  <a class="skip-link" href="#main-content">跳到主要内容</a>
  <header class="site-header"><div class="container header-inner">
    <a class="brand" href="index.html" aria-label="CSMA 人才培养管理体系首页"><span class="brand-mark">CSMA</span><span class="brand-text">人才培养管理体系</span></a>
    <button class="nav-toggle" id="nav-toggle" type="button" aria-expanded="false" aria-controls="main-nav" aria-label="展开主导航">菜单</button>
    <nav class="main-nav" id="main-nav" aria-label="主导航">{nav}</nav>
  </div></header>
  <main id="main-content" tabindex="-1">{body}</main>
  <footer class="site-footer"><div class="container footer-inner">
    <div class="footer-copy"><strong>CSMA · 学习有路径，研究有依据。</strong><p>公共培养指南与空白模板 · 2026 年 10 月修订</p></div>
    <ul class="footer-nav" aria-label="页脚导航"><li><a href="policies.html">依据与校本核对</a></li><li><a href="management.html">日常管理</a></li><li><a href="archive.html">归档规范</a></li><li><a href="about.html">关于</a></li></ul>
  </div></footer>
  <button class="back-to-top" id="back-to-top" type="button" aria-label="返回顶部">↑</button>
  <script src="script.js"></script><script src="assets/training.js"></script>
</body></html>'''

def hero(title, lead, kicker='培养工作手册', meta='通用工作指南 · 正式要求以适用校院文件为准'):
    return f'''<section class="guide-hero" id="top"><div class="container"><nav class="breadcrumb" aria-label="面包屑"><ol><li><a href="index.html">首页</a></li><li aria-current="page">{esc(title)}</li></ol></nav><p class="section-kicker">{esc(kicker)}</p><h1>{esc(title)}</h1><p class="guide-lead">{esc(lead)}</p><p class="guide-meta">{esc(meta)}</p></div></section>'''

def tile(title, desc, href, label='查看指南', number=''):
    return f'<article class="path-card"><span class="card-index">{esc(number)}</span><h3><a href="{href}">{esc(title)}</a></h3><p>{esc(desc)}</p><a class="text-link" href="{href}">{esc(label)} <span aria-hidden="true">↗</span></a></article>'

def load_data():
    return json.loads(read('assets/data/pathways.json')), json.loads(read('assets/data/templates.json'))

def growth_contract(track, markdown=False):
    g = track['growth']
    labels = (['What you will learn','Check your starting point','Your responsibility','Guidance and support','Feedback and revision','Evidence for the next step','Learning and growth','Use the learning review template'] if LANG == 'en' else ['这条路径要形成的能力','开始时，用小任务确认起点','学生负责什么','指导与支持负责什么','怎样获得反馈并改进','带着什么进入下一步','学习与成长','使用学习复盘模板'])
    fields = ['capabilities','starting_check','student_role','support_role','feedback','transition']
    if markdown:
        return '\n\n'.join('**'+label+'**\n\n'+ ('\n'.join('- '+x for x in g[key]) if isinstance(g[key],list) else g[key]) for label,key in zip(labels,fields))
    result = '<section class="guide-intro growth-contract" id="growth"><p class="section-kicker">LEARN / PRACTISE / REFLECT</p><h2>'+labels[6]+'</h2><div class="growth-grid">'
    for label,key in zip(labels,fields):
        result += '<div><h3>'+label+'</h3>'+(ul(g[key]) if isinstance(g[key],list) else '<p>'+esc(g[key])+'</p>')+'</div>'
    return result+'</div><div class="inline-links"><a href="learning.html">'+labels[6]+' →</a><a href="templates.html#learning-review">'+labels[7]+' →</a></div></section>'

def build_home(tracks, templates):
    short = {'research':('本科科研训练','从第一次文献阅读到独立小任务，在真实实践中建立研究能力。'), 'bachelor':('本科毕业设计','把选题、实现、论文、答辩连起来，按阶段完成一项完整作品。'), 'competition':('本科竞赛','先读规则，再组队与验证；让参赛过程留下可复用的成果。'), 'master':('硕士培养','贯通选题到学位申请，明确研究任务与每个正式环节。')}
    short['doctor'] = ('博士培养','形成独立研究议程，贯通资格考核、原创贡献、学位论文与归档。')
    cards = ''.join(tile(*short[t['id']],t['page'],f"{len(t['stages'])} 个阶段 · 进入路径",f"0{i+1} / {'研究生' if t['id'] in ['master','doctor'] else '本科生'}") for i,t in enumerate(tracks))
    body = f'''<section class="training-hero" id="top">{aliases(['home','hjp.'])}<div class="container training-hero-grid">
      <div><p class="section-kicker">CSMA / STUDENT FIELD GUIDE</p><h1>让每一步成长，<br>都有清晰的方向。</h1><p class="hero-intro">从科研入门到毕业答辩，找到当前阶段，<br class="desktop-break">明确要做的事、要交的材料和下一步。</p><div class="hero-actions"><a class="btn primary" href="#programs">找到我的培养路径 <span aria-hidden="true">↗</span></a><a class="btn light" href="planner.html">开始阶段自检</a></div><p class="hero-caption">五条培养路径 · {sum(len(t['stages']) for t in tracks)} 个明确阶段 · {len(templates)} 份可用模板</p></div>
      <aside class="hero-roadmap" aria-label="从目标到完成的培养方法"><div class="roadmap-heading"><span>一项任务，怎样走到完成</span><span class="live-dot" aria-hidden="true"></span></div><ol><li><span>01</span><div><strong>找准阶段</strong><small>先确认条件，再确定目标</small></div><b aria-hidden="true">↗</b></li><li><span>02</span><div><strong>行动与记录</strong><small>按模板推进，留下真实证据</small></div><b aria-hidden="true">↗</b></li><li><span>03</span><div><strong>提交与反馈</strong><small>对照标准检查，逐项修改</small></div><b aria-hidden="true">↗</b></li><li><span>04</span><div><strong>验收与归档</strong><small>确认完成，带着积累进入下一步</small></div><b aria-hidden="true">✓</b></li></ol><a href="milestones.html">了解阶段之间怎样衔接 <span aria-hidden="true">→</span></a></aside>
    </div></section>
    <section class="section path-section" id="programs">{aliases(['overview'])}<div class="container"><div class="home-heading"><div><p class="section-kicker">CHOOSE YOUR PATH</p><h2>从你现在的身份与任务出发</h2></div><a class="text-link" href="doctor.html">博士培养指南 ↗</a></div><div class="path-grid">{cards}</div></div></section>
    <section class="section soft" id="timeline">{aliases(['philosophy','理念','ug-timeline'])}<div class="container task-hub"><div><p class="section-kicker">MAKE IT HAPPEN</p><h2>知道下一步，<br>也有工具把它做好。</h2><p>每个阶段都包含进入条件、操作步骤、交付材料与验收要求。遇到问题时，按整改说明调整计划。</p><a class="text-link" href="assets/downloads/training-handbook.md" download>下载完整培养手册（Markdown） ↓</a></div><div class="tool-grid">{tile('阶段自检','选择阶段，逐项自检，保存或导出自己的待办清单。','planner.html','生成我的清单','01')}{tile('模板库','周报、综述、开题、实验、送审、答辩与归档，直接下载填写。','templates.html','浏览全部模板','02')}{tile('日常管理','任务、周报、组会、请假、指导反馈与资源使用。','management.html','建立工作节奏','03')}{tile('学术规范','把查重、查非、引用、AI 使用与匿名要求逐项查清。','integrity.html','检查提交质量','04')}</div></div></section>
    <section class="section" id="management"><div class="container"><div class="home-heading"><div><p class="section-kicker">START WITH THE RIGHT REQUIREMENTS</p><h2>先对齐要求，再安排进度</h2></div></div><div class="requirement-strip"><div><span class="status-chip">第一步</span><h3>核对本学年、本人适用的规定</h3><p>学制、课程、实践、成果、检测阈值、送审和答辩时间，都应对应正式文件与具体年级。</p></div><a class="btn outline" href="policies.html#local-check">打开校本要求核对表 ↗</a></div></div></section>
    <section class="section soft" id="templates"><div class="container"><div class="home-heading"><div><p class="section-kicker">QUICK ACCESS</p><h2>常用材料，一步到达</h2></div><a class="text-link" href="assets/downloads/csma-training-templates.zip" download>下载全套模板 ↓</a></div><div class="quick-links">{''.join(f'<a href="templates.html#{i}">{n}<span aria-hidden="true">↗</span></a>' for i,n in [('weekly','周报与反馈'),('literature','文献综述'),('proposal','开题报告'),('midterm','中期检查'),('thesis','论文自检'),('review-response','评阅回复'),('defense','答辩准备'),('archive','归档清单')])}</div><div class="inline-links" id="structure">{aliases(['naming'])}<a href="archive.html">数据与资料归档 →</a><a href="resources.html">全部学习资源 →</a></div></div></section>
    <section class="section" id="news">{aliases(['updates'])}<div class="container"><div class="home-heading"><div><p class="section-kicker">NEWS & UPDATES</p><h2>安排与动态</h2></div><a class="text-link" href="news.html">全部动态 ↗</a></div>{{% include news-list.html limit=3 %}}</div></section>
    <section class="section soft" id="outcomes"><div class="container closing-panel" id="organization"><div><p class="section-kicker">GROW TOGETHER</p><h2>把扎实的过程，沉淀为真实的成长。</h2><p>学生主动探索，导师提供必要的方向、方法与反馈。</p></div><div class="inline-links" id="faq"><a href="outcomes.html">公开成果 ↗</a><a href="students.html">学生故事 ↗</a><a href="about.html">了解 CSMA ↗</a><a href="faq.html">常见问题 ↗</a></div></div></section>'''
    visual_entry = '<section class="section visual-entry"><div class="container"><div class="home-heading"><div><p class="section-kicker">SEE THE PROCESS / CHOOSE THE TOOLS</p><h2>先看懂流程，再选好工具</h2></div></div><div class="tool-grid">'+tile('流程图总览','沿箭头看清前置条件、审核分支与返工去向；节点可直达阶段说明。','workflows.html','查看 10 张流程图','01 / 看流程')+tile('科研工具指南','从文献、实验、开发到论文，选择最小工具组合，按交付物检查是否完成。','tools.html','按任务选择工具','02 / 选工具')+'</div></div></section>'
    body = body.replace('<section class="section soft" id="timeline">', visual_entry+'<section class="section soft" id="timeline">')
    essays = essay_section(home=True)
    body = body.replace('<section class="section soft" id="outcomes">', essays+'<section class="section soft" id="outcomes">')
    international = ('International students', 'Find the requirements, language arrangements and support that apply to your undergraduate, master’s or doctoral programme.', 'Open the international student guide') if LANG == 'en' else ('国际学生', '按本科、硕士、博士分别核对培养要求、语言安排与支持渠道，再进入对应阶段。', '打开国际学生指南')
    body = body.replace('<section class="section soft" id="templates">', '<section class="section soft" id="international-entry"><div class="container requirement-strip"><div><p class="section-kicker">INTERNATIONAL STUDENTS</p><h2>'+international[0]+'</h2><p>'+international[1]+'</p></div><a class="btn outline" href="international.html">'+international[2]+' ↗</a></div></section><section class="section soft" id="templates">')
    if LANG == 'en': body = body.replace('include news-list.html', 'include news-list-en.html')
    body = body.replace('查看 10 张流程图', '查看 11 张流程图').replace('<a class="text-link" href="doctor.html">博士培养指南 ↗</a>', '<a class="text-link" href="learning.html">怎样学习与成长 ↗</a>')
    write('index.html',shell('index.html','学习有路径，研究有依据','本科科研训练、毕业设计、竞赛、硕士与博士培养的完整阶段指南、流程图、科研工具、真实模板和阶段自检。',body,home=True))

LEGACY = {
 'master':{'orientation':['foundation'],'topic':['exploration'],'midterm':['validation'],'writing':['dissemination'],'defense':['graduation'],'archive':['development']},
 'bachelor':{'topic':['stage-matching'],'proposal':['stage-planning'],'implementation':['stage-execution'],'writing':['stage-writing'],'archive':['stage-archive']},
 'research':{'orientation':['research-understand'],'foundation':['research-foundation'],'exploration':['research-exploration'],'project':['research-project'],'validation':['research-writing'],'archive':['research-development']}
}

def build_track(track, template_by_id, flowdata, tooldata):
    stages = track['stages']; page = track['page']; tid = track['id']
    sidebar = '<nav aria-label="阶段目录"><ol>' + ''.join(f'<li><a href="#{s["id"]}"><span>{i+1:02}</span>{esc(s["title"])}</a></li>' for i,s in enumerate(stages)) + '</ol></nav>'
    body = hero(track['title'],track['subtitle'], '培养路径 / ' + ({'master':'硕士','doctor':'博士'}.get(tid,'本科')), track['audience']+' · '+track['duration'])
    body += '<div class="container pathway-tabs" aria-label="培养路径"><a href="undergraduate-research.html">科研训练</a><a href="bachelor.html">毕业设计</a><a href="competition.html">学科竞赛</a><a href="master.html">硕士培养</a><a href="doctor.html">博士培养</a><a href="learning.html">学习与成长</a></div>'
    body += f'<div class="container guide-layout"><aside class="guide-sidebar"><details open><summary>阶段目录 <span aria-hidden="true">↓</span></summary>{sidebar}<a class="sidebar-tool" href="planner.html?track={tid}">打开阶段自检 →</a></details></aside><div class="guide-content">'
    body += f'<section class="guide-intro" id="lifecycle">{aliases(["current-milestones","year-view"] if tid=="master" else ["current-milestones"])}<span class="status-chip">如何使用这条路径</span><p>{esc(track["note"])}</p><p>参考时机用于安排工作；正式截止日以本人适用的通知为准。先完成<a href="policies.html#local-check">校本要求核对</a>，再约定每阶段的提交与反馈日期。</p><div class="inline-links"><a href="#stage-details">直接查看各阶段说明 ↓</a><a href="management.html">日常管理</a><a href="integrity.html">学术规范</a><button class="text-button" type="button" data-print>打印完整指南</button></div></section>'
    body += growth_contract(track)
    international_anchor = tid if tid in ['master','doctor'] else 'bachelor'
    international_note = ('International students: confirm the programme rules, language arrangements and eligibility that apply to you.', 'Read the international student guidance') if LANG == 'en' else ('国际学生：先核对适用培养方案、材料与答辩语言，以及项目或竞赛资格。', '查看本阶段国际学生说明')
    body += '<section class="guide-intro"><p>'+international_note[0]+'</p><a class="text-link" href="international.html#'+international_anchor+'">'+international_note[1]+' →</a></section>'
    body += ''.join(render_flow(flow, instance_id='path-'+tid, compact=True) for flow in flows_for_track(flowdata,tid))
    body += '<div id="stage-details">'
    used=set(s['id'] for s in stages)
    for i,s in enumerate(stages):
        old=LEGACY.get(tid,{}).get(s['id'],[])
        used.update(old)
        body += f'<article class="workflow-stage" id="{s["id"]}">{aliases(old)}<header class="stage-heading"><span class="stage-number">{i+1:02}</span><div><p class="stage-timing">{esc(s["timing"])}</p><h2>{esc(s["title"])}</h2></div></header><p class="stage-goal">{esc(s["goal"])}</p>'
        body += f'<div class="entry-block"><h3>开始前，先确认</h3>{ul(s["entry"])}</div><div class="stage-columns"><div><h3>具体怎么做</h3>{ul(s["actions"])}</div><div class="deliverable-block"><h3>这一阶段交什么</h3>{ul(s["deliverables"])}</div></div><section class="review-block"><h3>怎样算完成</h3>{ul(s["review"])}</section><details class="correction"><summary>未达到要求时，怎样处理</summary><p>{esc(s["failure"])}</p></details>'
        body += render_stage_tools(tooldata,tid,s['id'])
        links=''.join(f'<a href="templates.html#{x}">{esc(template_by_id[x]["title"])}</a>' for x in s['templates'])
        body += f'<div class="stage-template-links"><span>配套模板</span>{links}</div><div class="stage-next"><p><strong>下一步</strong> {esc(s["next"])}</p><a class="text-link" href="planner.html?track={tid}&amp;stage={s["id"]}">自检本阶段 →</a></div></article>'
    # Historical conceptual anchors remain usable even when the stage taxonomy changed.
    unmapped=[x for group in LEGACY.get(tid,{}).values() for x in group if x not in used]
    body += '</div>'+aliases(unmapped)
    body += f'<section class="guide-intro" id="resources">{aliases(["deliverables","quality-checklist","public-outcomes","contact"])}<h2>完成一个阶段，再确认下一步</h2><p>自检完成后提交材料，记录审核人、意见和下一次复核日期。仅填写清单或完成计划，不等于已通过正式审核。</p><div class="inline-links"><a href="templates.html">全部模板</a><a href="archive.html">归档与交接</a><a href="policies.html">正式依据</a></div></section></div></div>'
    write(page,shell(page,track['title'],track['subtitle'],body,page if tid in ['master','doctor'] else 'bachelor.html'))

def build_templates(templates):
    body=hero('模板库','把要求落实到一份能填写、能提交、能复核的材料。','TOOLS / 可直接下载',f'{len(templates)} 份 Markdown 模板 · 支持文本编辑器与常用 Markdown 工具')
    body+='''<section class="section"><div class="container"><div class="requirement-strip" id="downloads"><div><h2>从空白模板开始，保留自己的证据</h2><p>下载后复制到个人受控工作空间填写；学校有正式表格时优先使用校表。通用模板可作为材料底稿与自检附表。</p></div><a class="btn primary" href="assets/downloads/csma-training-templates.zip" download>下载全套模板 ↓</a></div><div class="template-filter" data-template-filter hidden><div><label for="template-search">搜索名称、用途或阶段</label><input id="template-search" type="search" placeholder="例如：开题、实验、送审" autocomplete="off"></div><div><label for="template-category">模板类别</label><select id="template-category"><option value="">全部类别</option><option>入门与计划</option><option>研究与过程</option><option>论文与毕业</option><option>协作与归档</option></select></div><p id="template-count" role="status" aria-live="polite"></p></div><div class="template-grid">'''
    old={'literature':['survey','survey-detail'],'weekly':['weekly-detail'],'proposal':['proposal-detail'],'midterm':['midterm-detail'],'thesis':['thesis-check','thesis-detail'],'archive':['archive-template','archive-detail'],'handover':['handover-detail']}
    for t in templates:
        content=read(t['file']); needle=' '.join(str(t[k]) for k in ['title','category','audience','stage','description'])
        body+=f'<article class="template-card" id="{t["id"]}" data-template-card data-category="{esc(t["category"])}" data-search="{esc(needle)}">{aliases(old.get(t["id"],[]))}<span class="template-category">{esc(t["category"])}</span><h2>{esc(t["title"])}</h2><p>{esc(t["description"])}</p><dl><div><dt>适用对象</dt><dd>{esc(t["audience"])}</dd></div><div><dt>使用阶段</dt><dd>{esc(t["stage"])}</dd></div></dl><div class="inline-links"><a class="text-link" href="{t["file"]}" download>下载 Markdown ↓</a><button class="text-button" type="button" data-copy-template="{t["file"]}">复制全文</button></div><details class="template-preview"><summary>预览填写内容</summary><pre>{esc(content)}</pre></details></article>'
    body+='</div><div id="template-empty" class="guide-intro" hidden><h2>没有匹配的模板</h2><p>试试“论文”“实验”“归档”等关键词，或清空筛选。</p><button class="btn outline" type="button" data-reset-filter>清空筛选</button></div><p id="copy-status" role="status" aria-live="polite"></p><section class="guide-intro" id="resource-policy"><h2>填写与提交前</h2><p>删除指导性示例，不能核实的事项写“待核实”，不适用项注明原因。填写后的评审意见、个人信息、未公开结果和受限数据不上传公共站点。模板没有签字、审核或学位资格认定效力。</p><a href="policies.html#local-check">核对本校正式表格与提交要求 →</a></section></div></section>'
    write('templates.html',shell('templates.html','模板库',f'{len(templates)} 份可下载、预览、复制的培养全过程模板。支持按类别和关键词查找。',body,'resources.html'))

def build_planner(tracks):
    options=''.join(f'<option value="{t["id"]}">{esc(t["title"])}</option>' for t in tracks)
    body=hero('我的阶段清单','定位当前任务，把准备、交付和自检变成清晰的待办。','TOOLS / 阶段自检','个人自检工具 · 勾选不代表导师验收或学校审批')
    body+=f'''<section class="section"><div class="container planner-layout"><div class="planner-settings"><h2>从当前阶段开始</h2><p>内容依据培养指南生成。先选路径，再选阶段。</p><div id="planner-controls" hidden><label for="track-select">培养路径</label><select id="track-select">{options}</select><label for="stage-select">当前阶段</label><select id="stage-select"></select><label for="target-date">个人计划完成日（可选）</label><input id="target-date" type="date"><p class="field-help">用于安排自己的工作，不是学校正式截止日。</p></div><p id="storage-status" role="status">正在准备阶段清单……</p><div class="inline-links"><a href="milestones.html">全流程总览</a><a href="policies.html#local-check">校本核对</a></div></div><div id="planner-result" class="planner-result"><noscript><h2>阅读完整阶段指南</h2><p>交互清单需要 JavaScript；你仍可直接阅读全部指南与下载模板。</p></noscript><ul>{''.join(f'<li><a href="{t["page"]}">{esc(t["title"])}</a></li>' for t in tracks)}</ul></div></div></section>'''
    write('planner.html',shell('planner.html','我的阶段清单','选择培养路径与阶段，生成可本地保存和导出的个人自检清单。',body,'resources.html'))

def build_milestones(tracks, flowdata):
    body=hero('阶段与里程碑','研究可以迭代，正式环节需要逐项确认。','ROADMAP / 全流程总览')
    body+='<section class="section"><div class="container"><section class="guide-intro" id="gate-model"><h2>每一关都回答六个问题</h2><div class="principle-grid">'+''.join(f'<div><strong>{a}</strong><p>{b}</p></div>' for a,b in [('为何做','目标与价值是什么'),('何时开始','哪些前置条件已具备'),('怎样做','谁来做、按什么步骤'),('交什么','文件、代码与证据在哪里'),('谁确认','按何标准、由谁审核'),('没通过怎么办','补什么、何时复核')])+'</div></section><div id="track-milestones">'
    body += '<section class="guide-intro"><h2>用流程图看清主线与返工</h2><p>箭头表示衔接，决策节点给出通过条件，未通过分支指出返回哪一步。图中正式环节仍以校院规定为准。</p><div class="inline-links"><a href="workflows.html">打开全部流程图 →</a><a href="tools.html">按任务选择科研工具 →</a></div></section>'
    for t in tracks:
        body+=f'<section class="roadmap-track"><h2><a href="{t["page"]}">{esc(t["title"])}</a></h2><p>{esc(t["note"])}</p><ol>'+''.join(f'<li><a href="{t["page"]}#{s["id"]}"><span>{i+1:02}</span><strong>{esc(s["title"])}</strong><small>{esc(s["timing"])}</small></a></li>' for i,s in enumerate(t['stages']))+'</ol>'
        body+=''.join(f'<a class="text-link roadmap-diagram-link" href="workflows.html#flow-{esc(f["id"])}">查看这条路径的流程图与返工分支 →</a>' for f in flows_for_track(flowdata,t['id']))+'</section>'
    body+='</div><section class="guide-intro" id="dates"><h2>用正式节点倒排自己的计划</h2><p>先填学院正式截止日，再为导师审阅、整改、系统提交留出约定时间。提前量由工作量和审核人共同确认；不要把示意周数当作统一制度。遇到延期先记录影响、请求支持，再办理需要的变更手续。</p><a href="templates.html#change-request">使用任务变更与延期模板 →</a></section><section class="guide-intro" id="evidence"><h2>阶段状态怎样记录</h2><p>待开展 → 进行中 → 待验收 → 已完成；受阻时单独标明原因、责任人及下次复核日。学生自报、材料提交、导师复核和学校正式批准是不同状态，不能互相替代。</p><a href="planner.html">打开个人阶段清单 →</a></section></div></section>'
    write('milestones.html',shell('milestones.html','阶段与里程碑','五条培养路径的阶段衔接、检查标准、证据状态与倒排计划说明。',body,'resources.html'))

def build_workflows(flowdata):
    flows=flowdata['flows']
    body=hero('流程图总览','看清从哪里开始、怎样判断通过，以及遇到问题后回到哪一步。','VISUAL GUIDE / 培养与研究流程','5 条培养路径 · 6 类关键任务 · 网页直接看图 · 源文件可选下载')
    body+='<section class="section"><div class="container"><div class="guide-intro"><h2>在网页中直接看图，沿箭头阅读</h2><p>下方全部流程图默认显示，无需下载；点击目录可直接跳到对应图。主线表示通常的工作顺序；决策节点说明通过条件，支路说明整改与返回位置。点击节点进入对应指南。研究可以往返迭代，学校正式环节的顺序与认定以适用规定为准。</p><div class="inline-links"><a href="assets/downloads/csma-workflow-diagrams.zip" download>下载全部流程图与可编辑源文件（可选）↓</a><a href="tools.html">如何选择研究与绘图工具 →</a><button class="text-button" type="button" data-print>打印流程图</button></div></div>'
    for title,items in [('培养路径',[f for f in flows if f.get('track')]),('关键任务',[f for f in flows if not f.get('track')])]:
        body+='<nav class="flow-directory" aria-label="'+title+' / 流程图"><h2>'+title+'</h2><div class="flow-directory-grid">'+''.join(f'<a href="#flow-{esc(f["id"])}"><strong>{esc(f["title"])}</strong><span>{esc(f["summary"])}</span></a>' for f in items)+'</div></nav>'
    body+=''.join(render_flow(flow,compact=True) for flow in flows)
    body+='<section class="guide-intro" id="edit-diagrams"><h2>将图用于自己的项目</h2><p>用 draw.io 打开 .drawio 源文件，复制后修改节点、负责人和本项目条件；导出 SVG 或 PDF 用于论文、汇报。保留源文件，并在图题中记录版本和适用范围。图里的“通过”应对应实际审核记录，不能通过改图替代审批。</p><p>网页流程图无需安装工具即可阅读。SVG 是静态导出图；下载到本地后，节点链接仍指向线上指南。整包附有校验清单，便于确认文件完整。</p><a href="templates.html#research-task">用任务书记录具体负责人、交付物与验收日期 →</a></section></div></section>'
    write('workflows.html',shell('workflows.html','流程图总览','11 张培养与研究流程图，明确主线、审核条件、返工路径；支持 SVG 和 draw.io 下载。',body,'resources.html'))

def build_tools_page(tooldata):
    body=hero('科研工具指南','围绕一项具体任务，选择能留下清晰产物与证据的最小工具组合。','RESEARCH TOOLKIT / 按任务选择','先确定交付物 · 再选择工具 · 保留可复查记录')+render_tools(tooldata)
    write('tools.html',shell('tools.html','科研工具指南','文献调研、实验复现、软件开发、LLM 研究、论文、竞赛与日常归档的工具组合、操作和验收。',body,'resources.html'))

def package_diagrams(flowdata):
    files={}
    for flow in flowdata['flows']:
        for ext in ['svg','drawio']:
            name=flow['id']+'.'+ext
            files[name]=(ROOT/'assets/diagrams'/name).read_bytes()
    intro='# CSMA 培养与科研流程图\n\n11 张流程图，每张含 SVG 与可编辑 draw.io 源文件。\n\n使用 draw.io 打开 .drawio 文件并另存副本；SVG 可在浏览器阅读，图中链接指向线上阶段指南。学校正式规则以本人适用文件为准。\n\n'
    intro+='\n'.join('- '+f['title']+'：['+f['id']+'.svg]('+f['id']+'.svg) / ['+f['id']+'.drawio]('+f['id']+'.drawio)' for f in flowdata['flows'])
    intro+='\n\n完整说明：https://csma-graduation-projects.github.io/workflows.html\n\n文件修改后重新生成校验清单。校验仅说明文件完整，不证明流程已获正式批准。\n'
    files['README.md']=localize(intro,LANG).encode('utf-8')
    sums=''.join(hashlib.sha256(content).hexdigest()+'  '+name+'\n' for name,content in files.items())
    files['SHA256SUMS']=sums.encode('utf-8')
    with zipfile.ZipFile(ROOT/'assets/downloads/csma-workflow-diagrams.zip','w',compression=zipfile.ZIP_DEFLATED) as z:
        for name,content in files.items():
            info=zipfile.ZipInfo(name,date_time=(2026,10,18,0,0,0)); info.compress_type=zipfile.ZIP_DEFLATED
            z.writestr(info,content)

def build_resources(flowdata):
    body=hero('学习与科研资源','先找到任务，再选择能帮助你完成它的材料。','RESOURCE LIBRARY / 资源导航')
    entries=[('流程图总览','五条培养路径与六类关键任务；看清分支、整改与下一步。','workflows.html'),('科研工具指南','七类任务的最小组合、操作、交付物与核验方法。','tools.html'),('阶段自检','按路径生成本阶段待办，保存或导出自检记录。','planner.html'),('模板库','25 份实际可填写的 Markdown 模板与整包下载。','templates.html'),('阶段与里程碑','五条路径全景、前置条件和阶段衔接。','milestones.html'),('日常管理','任务、周报、组会、沟通、请假与资源使用。','management.html'),('学术规范与提交检查','查重、查非、AI 使用、引用与匿名评阅。','integrity.html'),('数据资料归档','结构、版本、数据授权、复现与交接验收。','archive.html'),('依据与校本核对','官方来源、年度规则、成果与毕业要求。','policies.html'),('博士培养','从研究基础、资格考核到原创贡献、学位论文与交接。','doctor.html')]
    entries.insert(0, ('学习与成长','诊断起点、制定任务、获取反馈，把能力带到下一阶段。','learning.html'))
    entries.insert(0, ('国际学生指南','本、硕、博的适用要求、语言安排、阶段记录与支持渠道。','international.html'))
    body+='<section class="section" id="resource-directory"><div class="container"><div class="tool-grid">'+''.join(tile(*e,number=f'{i+1:02}') for i,e in enumerate(entries))+'</div><section class="guide-intro"><h2>常用工具的官方文档</h2><p>遇到工具问题，优先查阅对应版本的官方说明。</p><div class="inline-links"><a href="https://git-scm.com/docs/gittutorial">Git 入门 ↗</a><a href="https://code.visualstudio.com/docs">VS Code ↗</a><a href="https://www.zotero.org/support/">Zotero 文献管理 ↗</a></div></section></div></section>'
    body+='<section class="section"><div class="container">'+''.join(render_flow(f,instance_id='resources',compact=True) for f in flowdata['flows'] if f.get('guide')=='resources')+'</div></section>'
    write('resources.html',shell('resources.html','学习与科研资源','培养路径、流程图、科研工具、阶段自检与模板的一站式资源入口。',body))

def build_handbook(tracks, templates, flowdata, tooldata):
    lines=['# CSMA 学生培养工作手册','', '更新：2026-10-19。通用工作指南；正式要求以本人适用的校院文件为准。','', '在线入口：https://csma-graduation-projects.github.io/','', '填写后的材料存入获准的受控空间；本手册不是校院审批记录。','']
    for t in tracks:
        lines += ['## '+t['title'],'',t['subtitle'],'',t['audience']+'；'+t['duration'],'',t['note'],'']
        lines += [growth_contract(t, markdown=True),'']
        for i,s in enumerate(t['stages']):
            lines += [f'### {i+1:02} {s["title"]}','', '参考时机：'+s['timing'],'','目标：'+s['goal'],'']
            for field,label in [('entry','进入条件'),('actions','操作步骤'),('deliverables','交付材料'),('review','验收标准')]:
                lines += ['**'+label+'**','']+['- '+x for x in s[field]]+['']
            lines += ['未达要求：'+s['failure'],'','下一步：'+s['next'],'','配套模板：'+ '、'.join(templates[x]['title']+'（'+x+'.md）' for x in s['templates']),'']
    for name,title in [('learning','学习与成长'),('management','日常管理与协作'),('integrity','学术规范与提交检查'),('archive','数据资料归档与交接'),('policies','依据与校本要求核对'),('international','国际学生指南')]:
        converter = HandbookMarkdown(name + '.html')
        converter.feed(read(f'scripts/training-pages/{name}.html'))
        lines += ['## '+title,'',converter.result(),'']
    lines += ['## 流程图与分支说明','','本节保留可离线阅读的主线与分支。可编辑 draw.io 文件与 SVG 图请另行下载流程图包：https://csma-graduation-projects.github.io/assets/downloads/csma-workflow-diagrams.zip','']
    for flow in flowdata['flows']: lines += [flow_markdown(flow),'']
    lines += ['## 科研工具指南','',tools_markdown(tooldata),'']
    write('assets/downloads/training-handbook.md','\n'.join(lines))

class HandbookMarkdown(HTMLParser):
    """Convert the small supported guide fragment vocabulary to offline Markdown."""
    def __init__(self, page):
        super().__init__(convert_charrefs=True)
        self.out=[]; self.links=[]; self.lists=[]; self.pre=False; self.table=False
        self.rows=[]; self.row=[]; self.cell=None; self.caption=None; self.page=page
    def emit(self, value):
        if self.cell is not None: self.cell.append(value)
        elif self.caption is not None: self.caption.append(value)
        elif not self.table: self.out.append(value)
    def handle_starttag(self, tag, attributes):
        attrs=dict(attributes)
        if tag=='table': self.table=True; self.rows=[]
        elif tag=='tr': self.row=[]
        elif tag in ('td','th'): self.cell=[]
        elif tag=='caption': self.caption=[]
        elif tag in ('h2','h3'): self.emit('\n\n'+'#'*(int(tag[1])+1)+' ')
        elif tag in ('p','section'): self.emit('\n\n')
        elif tag in ('ul','ol'): self.lists.append(0 if tag=='ol' else None); self.emit('\n')
        elif tag=='li':
            marker='- '
            if self.lists and self.lists[-1] is not None:
                self.lists[-1]+=1; marker=str(self.lists[-1])+'. '
            self.emit('\n'+marker)
        elif tag=='a':
            href=attrs.get('href','')
            if href.startswith('#'): href=self.page+href
            if href and not href.startswith(('https://','http://')): href='https://csma-graduation-projects.github.io/'+href.lstrip('/')
            self.links.append(href); self.emit('[')
        elif tag in ('strong','b'): self.emit('**')
        elif tag=='pre': self.emit('\n\n```text\n'); self.pre=True
        elif tag=='code' and not self.pre: self.emit('`')
        elif tag=='br': self.emit('\n')
    def handle_endtag(self, tag):
        if tag in ('td','th') and self.cell is not None:
            self.row.append(re.sub(r'\s+',' ',''.join(self.cell)).strip().replace('|','\\|')); self.cell=None
        elif tag=='tr' and self.row: self.rows.append(self.row); self.row=[]
        elif tag=='caption':
            caption=''.join(self.caption or []).strip(); self.caption=None
            if caption:self.out.append('\n\n'+caption+'\n\n')
        elif tag=='table':
            self.table=False
            for index,row in enumerate(self.rows):
                self.out.append('| '+' | '.join(row)+' |\n')
                if index==0:self.out.append('| '+' | '.join('---' for _ in row)+' |\n')
            self.out.append('\n')
        elif tag in ('h2','h3','p','section'): self.emit('\n\n')
        elif tag in ('ul','ol'):
            if self.lists:self.lists.pop()
            self.emit('\n\n')
        elif tag=='a': self.emit(']('+(self.links.pop() if self.links else '')+') ')
        elif tag in ('strong','b'): self.emit('**')
        elif tag=='pre': self.pre=False; self.emit('\n```\n\n')
        elif tag=='code' and not self.pre: self.emit('`')
    def handle_data(self, value):
        if self.pre or value.strip():self.emit(value)
    def result(self):
        return re.sub(r'\n{3,}','\n\n',''.join(self.out)).strip()

def package_templates(templates):
    paths=[ROOT / t['file'] for t in templates]
    if (ROOT/'assets/templates/README.md').exists(): paths.append(ROOT/'assets/templates/README.md')
    paths.append(ROOT/'assets/downloads/training-handbook.md')
    sums=''.join(hashlib.sha256(p.read_bytes()).hexdigest()+'  '+p.name+'\n' for p in paths)
    write('assets/downloads/SHA256SUMS',sums)
    with zipfile.ZipFile(ROOT/'assets/downloads/csma-training-templates.zip','w',compression=zipfile.ZIP_DEFLATED) as z:
        for p in paths:
            info=zipfile.ZipInfo(p.name,date_time=(2026,10,18,0,0,0)); info.compress_type=zipfile.ZIP_DEFLATED
            z.writestr(info,p.read_bytes())
        z.writestr(zipfile.ZipInfo('SHA256SUMS',date_time=(2026,10,18,0,0,0)),sums)

def build_edition(language):
    global ROOT, LANG
    LANG = language
    ROOT = SOURCE_ROOT / ('en' if language == 'en' else '')
    if language == 'en':
        for name in ['pathways','templates','workflows','research-tools']:
            target = ROOT / 'assets/data' / (name+'.json')
            target.parent.mkdir(parents=True,exist_ok=True)
            shutil.copyfile(SOURCE_ROOT/'assets/data/en'/(name+'.json'), target)
        for source in (SOURCE_ROOT/'assets/templates/en').glob('*.md'):
            target = ROOT/'assets/templates'/source.name
            target.parent.mkdir(parents=True,exist_ok=True)
            shutil.copyfile(source,target)
    (ROOT/'assets/downloads').mkdir(parents=True,exist_ok=True)
    pdata,tdata=load_data(); tracks=pdata['tracks']; templates=tdata['templates']; by_id={t['id']:t for t in templates}
    flowdata=load_flows(ROOT); tooldata=load_tools(ROOT)
    generate_diagram_assets(ROOT,flowdata,language=language)
    build_home(tracks,templates)
    for track in tracks: build_track(track,by_id,flowdata,tooldata)
    build_templates(templates); build_planner(tracks); build_milestones(tracks,flowdata); build_resources(flowdata)
    build_workflows(flowdata); build_tools_page(tooldata); package_diagrams(flowdata)
    for page,title,lead in [('learning','学习与成长','从当前能力出发，用行动、证据与反馈形成可以迁移的学习能力。'),('management','日常管理与协作','让任务、沟通、反馈和资源使用形成稳定的工作节奏。'),('integrity','学术规范与提交检查','把研究责任落实到数据、引用、写作和每一次正式提交。'),('archive','数据资料归档与交接','让论文中的每个结论有出处，让接手的人找得到、看得懂、跑得通。'),('policies','依据与校本要求核对','分清正式规定与工作建议，按本人适用的文件安排培养过程。'),('international','国际学生指南','从本科、硕士到博士，明确适用要求、语言安排与每一步的支持。')]:
        fragment=read(f'scripts/training-pages/{page}.html')
        diagrams=''.join(render_flow(f,instance_id=page,compact=True) for f in flowdata['flows'] if f.get('guide')==page)
        if diagrams: fragment='<section class="section"><div class="container reading-guide">'+diagrams+'</div></section>'+fragment
        write(page+'.html',shell(page+'.html',title,lead,hero(title,lead)+fragment,'resources.html'))
    build_handbook(tracks,by_id,flowdata,tooldata); package_templates(templates)
    build_essays()
    print(f'Generated {language}: {len(tracks)} pathways / {sum(len(t["stages"]) for t in tracks)} stages / {len(templates)} templates and shared pages.')

def essay_section(home=False):
    english = LANG == 'en'
    if not home:
        return '<section class="section" id="essays"><div class="container"><h2 class="visually-hidden">'+('All mentoring articles' if english else '全部导引')+'</h2>{% include essay-list'+('-en' if english else '')+'.html %}</div></section>'
    title = 'Mentoring for study and research' if english else '学习与研究导引'
    intro = 'Perspectives on learning, research and supervision that help students develop independent judgment.' if english else '分享学习方法、科研实践与指导思考，帮助学生逐步形成独立判断。'
    link = 'All mentoring articles' if english else '全部导引'
    return '<section class="section" id="essays"><div class="container"><div class="home-heading"><div><p class="section-kicker">MENTORING / STUDY & RESEARCH</p><h2>'+title+'</h2></div>'+('<a class="text-link" href="essays.html">'+link+' ↗</a>' if home else '')+'</div><p class="essay-intro">'+intro+'</p>{% include essay-list'+('-en' if english else '')+'.html'+(' limit=2' if home else '')+' %}</div></section>'

def build_essays():
    title = 'Mentoring for Study and Research' if LANG == 'en' else '学习与研究导引'
    lead = 'Perspectives on learning, research and supervision that help students develop independent judgment.' if LANG == 'en' else '分享学习方法、科研实践与指导思考，帮助学生逐步形成独立判断。'
    meta = 'Research training · Independent learning · Mentoring' if LANG == 'en' else '科研训练 · 研究成长 · 指导与交流'
    write('essays.html',shell('essays.html',title,lead,hero(title,lead,'MENTORING / STUDY & RESEARCH',meta)+essay_section()))

def main():
    frontend = localize((SOURCE_ROOT/'assets/training.js').read_text(),'en')
    frontend = frontend.replace("'csma-training-stage-v1:'", "'csma-training-stage-v1:en:'").replace("toLocaleString('zh-CN'", "toLocaleString('en-GB'")
    (SOURCE_ROOT/'assets/training-en.js').write_text(frontend,encoding='utf-8')
    build_edition('zh-CN')
    build_edition('en')
    # Manual legacy pages retain their authored content; navigation is shared.
    for page in ['about','faq','projects','outcomes','students','news']:
        target = SOURCE_ROOT/(page+'.html')
        target.write_text(page_language(target.read_text(),page+'.html','zh-CN'),encoding='utf-8')
        fragment = (SOURCE_ROOT/'scripts/english-pages'/(page+'.html')).read_text()
        title = re.search(r'<h1[^>]*>(.*?)</h1>',fragment,re.S)[1]
        title = re.sub('<[^>]+>','',title)
        write(page+'.html',shell(page+'.html',title,title+' — guidance, resources and learning at CSMA.',fragment))
    from editorial import build_editorial
    build_editorial(shell)

if __name__ == '__main__': main()
