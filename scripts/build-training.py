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
from html.parser import HTMLParser

ROOT = pathlib.Path(__file__).resolve().parents[1]
def read(name): return (ROOT / name).read_text(encoding='utf-8')
def write(name, text):
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

def build_home(tracks, templates):
    short = {'research':('本科科研训练','从第一次文献阅读到独立小任务，在真实实践中建立研究能力。'), 'bachelor':('本科毕业设计','把选题、实现、论文、答辩连起来，按阶段完成一项完整作品。'), 'competition':('本科竞赛','先读规则，再组队与验证；让参赛过程留下可复用的成果。'), 'master':('硕士培养','贯通选题到学位申请，明确研究任务与每个正式环节。')}
    cards = ''.join(tile(*short[t['id']],t['page'],f"{len(t['stages'])} 个阶段 · 进入路径",f"0{i+1} / {'研究生' if t['id']=='master' else '本科生'}") for i,t in enumerate(tracks))
    body = f'''<section class="training-hero" id="top">{aliases(['home','hjp.'])}<div class="container training-hero-grid">
      <div><p class="section-kicker">CSMA / STUDENT FIELD GUIDE</p><h1>让每一步成长，<br>都有清晰的方向。</h1><p class="hero-intro">从科研入门到毕业答辩，找到当前阶段，<br class="desktop-break">明确要做的事、要交的材料和下一步。</p><div class="hero-actions"><a class="btn primary" href="#programs">找到我的培养路径 <span aria-hidden="true">↗</span></a><a class="btn light" href="planner.html">开始阶段自检</a></div><p class="hero-caption">四条培养路径 · {sum(len(t['stages']) for t in tracks)} 个明确阶段 · {len(templates)} 份可用模板</p></div>
      <aside class="hero-roadmap" aria-label="从目标到完成的培养方法"><div class="roadmap-heading"><span>一项任务，怎样走到完成</span><span class="live-dot" aria-hidden="true"></span></div><ol><li><span>01</span><div><strong>找准阶段</strong><small>先确认条件，再确定目标</small></div><b aria-hidden="true">↗</b></li><li><span>02</span><div><strong>行动与记录</strong><small>按模板推进，留下真实证据</small></div><b aria-hidden="true">↗</b></li><li><span>03</span><div><strong>提交与反馈</strong><small>对照标准检查，逐项修改</small></div><b aria-hidden="true">↗</b></li><li><span>04</span><div><strong>验收与归档</strong><small>确认完成，带着积累进入下一步</small></div><b aria-hidden="true">✓</b></li></ol><a href="milestones.html">了解阶段之间怎样衔接 <span aria-hidden="true">→</span></a></aside>
    </div></section>
    <section class="section path-section" id="programs">{aliases(['overview'])}<div class="container"><div class="home-heading"><div><p class="section-kicker">CHOOSE YOUR PATH</p><h2>从你现在的身份与任务出发</h2></div><a class="text-link" href="doctor.html">博士培养指南 ↗</a></div><div class="path-grid">{cards}</div></div></section>
    <section class="section soft" id="timeline">{aliases(['philosophy','理念','ug-timeline'])}<div class="container task-hub"><div><p class="section-kicker">MAKE IT HAPPEN</p><h2>知道下一步，<br>也有工具把它做好。</h2><p>每个阶段都包含进入条件、操作步骤、交付材料与验收要求。遇到问题时，按整改说明调整计划。</p><a class="text-link" href="assets/downloads/training-handbook.md" download>下载完整培养手册（Markdown） ↓</a></div><div class="tool-grid">{tile('阶段自检','选择阶段，逐项自检，保存或导出自己的待办清单。','planner.html','生成我的清单','01')}{tile('模板库','周报、综述、开题、实验、送审、答辩与归档，直接下载填写。','templates.html','浏览全部模板','02')}{tile('日常管理','任务、周报、组会、请假、指导反馈与资源使用。','management.html','建立工作节奏','03')}{tile('学术规范','把查重、查非、引用、AI 使用与匿名要求逐项查清。','integrity.html','检查提交质量','04')}</div></div></section>
    <section class="section" id="management"><div class="container"><div class="home-heading"><div><p class="section-kicker">START WITH THE RIGHT REQUIREMENTS</p><h2>先对齐要求，再安排进度</h2></div></div><div class="requirement-strip"><div><span class="status-chip">第一步</span><h3>核对本学年、本人适用的规定</h3><p>学制、课程、实践、成果、检测阈值、送审和答辩时间，都应对应正式文件与具体年级。</p></div><a class="btn outline" href="policies.html#local-check">打开校本要求核对表 ↗</a></div></div></section>
    <section class="section soft" id="templates"><div class="container"><div class="home-heading"><div><p class="section-kicker">QUICK ACCESS</p><h2>常用材料，一步到达</h2></div><a class="text-link" href="assets/downloads/csma-training-templates.zip" download>下载全套模板 ↓</a></div><div class="quick-links">{''.join(f'<a href="templates.html#{i}">{n}<span aria-hidden="true">↗</span></a>' for i,n in [('weekly','周报与反馈'),('literature','文献综述'),('proposal','开题报告'),('midterm','中期检查'),('thesis','论文自检'),('review-response','评阅回复'),('defense','答辩准备'),('archive','归档清单')])}</div><div class="inline-links" id="structure">{aliases(['naming'])}<a href="archive.html">数据与资料归档 →</a><a href="resources.html">全部学习资源 →</a></div></div></section>
    <section class="section" id="news">{aliases(['updates'])}<div class="container"><div class="home-heading"><div><p class="section-kicker">NEWS & UPDATES</p><h2>安排与动态</h2></div><a class="text-link" href="news.html">全部动态 ↗</a></div>{{% include news-list.html limit=3 %}}</div></section>
    <section class="section soft" id="outcomes"><div class="container closing-panel" id="organization"><div><p class="section-kicker">GROW TOGETHER</p><h2>把扎实的过程，沉淀为真实的成长。</h2><p>学生主动探索，导师提供必要的方向、方法与反馈。</p></div><div class="inline-links" id="faq"><a href="outcomes.html">公开成果 ↗</a><a href="students.html">学生故事 ↗</a><a href="about.html">了解 CSMA ↗</a><a href="faq.html">常见问题 ↗</a></div></div></section>'''
    write('index.html',shell('index.html','学习有路径，研究有依据','本科科研训练、毕业设计、竞赛与硕士培养的完整阶段指南、真实模板和阶段自检工具。',body,home=True))

LEGACY = {
 'master':{'orientation':['foundation'],'topic':['exploration'],'midterm':['validation'],'writing':['dissemination'],'defense':['graduation'],'archive':['development']},
 'bachelor':{'topic':['stage-matching'],'proposal':['stage-planning'],'implementation':['stage-execution'],'writing':['stage-writing'],'archive':['stage-archive']},
 'research':{'orientation':['research-understand'],'foundation':['research-foundation'],'exploration':['research-exploration'],'project':['research-project'],'validation':['research-writing'],'archive':['research-development']}
}

def build_track(track, template_by_id):
    stages = track['stages']; page = track['page']; tid = track['id']
    sidebar = '<nav aria-label="阶段目录"><ol>' + ''.join(f'<li><a href="#{s["id"]}"><span>{i+1:02}</span>{esc(s["title"])}</a></li>' for i,s in enumerate(stages)) + '</ol></nav>'
    body = hero(track['title'],track['subtitle'], '培养路径 / ' + ('硕士' if tid=='master' else '本科'), track['audience']+' · '+track['duration'])
    body += '<div class="container pathway-tabs" aria-label="培养路径"><a href="undergraduate-research.html">科研训练</a><a href="bachelor.html">毕业设计</a><a href="competition.html">学科竞赛</a><a href="master.html">硕士培养</a></div>'
    body += f'<div class="container guide-layout"><aside class="guide-sidebar"><details open><summary>阶段目录 <span aria-hidden="true">↓</span></summary>{sidebar}<a class="sidebar-tool" href="planner.html?track={tid}">打开阶段自检 →</a></details></aside><div class="guide-content">'
    body += f'<section class="guide-intro" id="lifecycle">{aliases(["current-milestones","year-view"] if tid=="master" else ["current-milestones"])}<span class="status-chip">如何使用这条路径</span><p>{esc(track["note"])}</p><p>参考时机用于安排工作；正式截止日以本人适用的通知为准。先完成<a href="policies.html#local-check">校本要求核对</a>，再约定每阶段的提交与反馈日期。</p><div class="inline-links"><a href="management.html">日常管理</a><a href="integrity.html">学术规范</a><button class="text-button" type="button" data-print>打印完整指南</button></div></section>'
    body += '<div id="stage-details">'
    used=set(s['id'] for s in stages)
    for i,s in enumerate(stages):
        old=LEGACY.get(tid,{}).get(s['id'],[])
        used.update(old)
        body += f'<article class="workflow-stage" id="{s["id"]}">{aliases(old)}<header class="stage-heading"><span class="stage-number">{i+1:02}</span><div><p class="stage-timing">{esc(s["timing"])}</p><h2>{esc(s["title"])}</h2></div></header><p class="stage-goal">{esc(s["goal"])}</p>'
        body += f'<div class="entry-block"><h3>开始前，先确认</h3>{ul(s["entry"])}</div><div class="stage-columns"><div><h3>具体怎么做</h3>{ul(s["actions"])}</div><div class="deliverable-block"><h3>这一阶段交什么</h3>{ul(s["deliverables"])}</div></div><section class="review-block"><h3>怎样算完成</h3>{ul(s["review"])}</section><details class="correction"><summary>未达到要求时，怎样处理</summary><p>{esc(s["failure"])}</p></details>'
        links=''.join(f'<a href="templates.html#{x}">{esc(template_by_id[x]["title"])}</a>' for x in s['templates'])
        body += f'<div class="stage-template-links"><span>配套模板</span>{links}</div><div class="stage-next"><p><strong>下一步</strong> {esc(s["next"])}</p><a class="text-link" href="planner.html?track={tid}&amp;stage={s["id"]}">自检本阶段 →</a></div></article>'
    # Historical conceptual anchors remain usable even when the stage taxonomy changed.
    unmapped=[x for group in LEGACY.get(tid,{}).values() for x in group if x not in used]
    body += '</div>'+aliases(unmapped)
    body += f'<section class="guide-intro" id="resources">{aliases(["deliverables","quality-checklist","public-outcomes","contact"])}<h2>完成一个阶段，再确认下一步</h2><p>自检完成后提交材料，记录审核人、意见和下一次复核日期。仅填写清单或完成计划，不等于已通过正式审核。</p><div class="inline-links"><a href="templates.html">全部模板</a><a href="archive.html">归档与交接</a><a href="policies.html">正式依据</a></div></section></div></div>'
    write(page,shell(page,track['title'],track['subtitle'],body,'master.html' if tid=='master' else 'bachelor.html'))

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

def build_milestones(tracks):
    body=hero('阶段与里程碑','研究可以迭代，正式环节需要逐项确认。','ROADMAP / 全流程总览')
    body+='<section class="section"><div class="container"><section class="guide-intro" id="gate-model"><h2>每一关都回答六个问题</h2><div class="principle-grid">'+''.join(f'<div><strong>{a}</strong><p>{b}</p></div>' for a,b in [('为何做','目标与价值是什么'),('何时开始','哪些前置条件已具备'),('怎样做','谁来做、按什么步骤'),('交什么','文件、代码与证据在哪里'),('谁确认','按何标准、由谁审核'),('没通过怎么办','补什么、何时复核')])+'</div></section><div id="track-milestones">'
    for t in tracks:
        body+=f'<section class="roadmap-track"><h2><a href="{t["page"]}">{esc(t["title"])}</a></h2><p>{esc(t["note"])}</p><ol>'+''.join(f'<li><a href="{t["page"]}#{s["id"]}"><span>{i+1:02}</span><strong>{esc(s["title"])}</strong><small>{esc(s["timing"])}</small></a></li>' for i,s in enumerate(t['stages']))+'</ol></section>'
    body+='</div><section class="guide-intro" id="dates"><h2>用正式节点倒排自己的计划</h2><p>先填学院正式截止日，再为导师审阅、整改、系统提交留出约定时间。提前量由工作量和审核人共同确认；不要把示意周数当作统一制度。遇到延期先记录影响、请求支持，再办理需要的变更手续。</p><a href="templates.html#change-request">使用任务变更与延期模板 →</a></section><section class="guide-intro" id="evidence"><h2>阶段状态怎样记录</h2><p>待开展 → 进行中 → 待验收 → 已完成；受阻时单独标明原因、责任人及下次复核日。学生自报、材料提交、导师复核和学校正式批准是不同状态，不能互相替代。</p><a href="planner.html">打开个人阶段清单 →</a></section></div></section>'
    write('milestones.html',shell('milestones.html','阶段与里程碑','四条培养路径的阶段衔接、检查标准、证据状态与倒排计划说明。',body,'resources.html'))

def build_resources():
    body=hero('学习与科研资源','先找到任务，再选择能帮助你完成它的材料。','RESOURCE LIBRARY / 资源导航')
    entries=[('阶段自检','按路径生成本阶段待办，保存或导出自检记录。','planner.html'),('模板库','24 份实际可填写的 Markdown 模板与整包下载。','templates.html'),('阶段与里程碑','四条路径全景、前置条件和阶段衔接。','milestones.html'),('日常管理','任务、周报、组会、沟通、请假与资源使用。','management.html'),('学术规范与提交检查','查重、查非、AI 使用、引用与匿名评阅。','integrity.html'),('数据资料归档','结构、版本、数据授权、复现与交接验收。','archive.html'),('依据与校本核对','官方来源、年度规则、成果与毕业要求。','policies.html'),('博士培养','保留原有前沿研究与长期成长指南。','doctor.html')]
    body+='<section class="section" id="resource-directory"><div class="container"><div class="tool-grid">'+''.join(tile(*e,number=f'{i+1:02}') for i,e in enumerate(entries))+'</div><section class="guide-intro"><h2>常用工具的官方文档</h2><p>遇到工具问题，优先查阅对应版本的官方说明。</p><div class="inline-links"><a href="https://git-scm.com/docs/gittutorial">Git 入门 ↗</a><a href="https://code.visualstudio.com/docs">VS Code ↗</a><a href="https://www.zotero.org/support/">Zotero 文献管理 ↗</a></div></section></div></section>'
    write('resources.html',shell('resources.html','学习与科研资源','培养路径、阶段自检、模板、日常管理、学术规范和数据归档的一站式资源入口。',body))

def build_handbook(tracks, templates):
    lines=['# CSMA 学生培养工作手册','', '更新：2026-10-18。通用工作指南；正式要求以本人适用的校院文件为准。','', '在线入口：https://csma-graduation-projects.github.io/','', '填写后的材料存入获准的受控空间；本手册不是校院审批记录。','']
    for t in tracks:
        lines += ['## '+t['title'],'',t['subtitle'],'',t['audience']+'；'+t['duration'],'',t['note'],'']
        for i,s in enumerate(t['stages']):
            lines += [f'### {i+1:02} {s["title"]}','', '参考时机：'+s['timing'],'','目标：'+s['goal'],'']
            for field,label in [('entry','进入条件'),('actions','操作步骤'),('deliverables','交付材料'),('review','验收标准')]:
                lines += ['**'+label+'**','']+['- '+x for x in s[field]]+['']
            lines += ['未达要求：'+s['failure'],'','下一步：'+s['next'],'','配套模板：'+ '、'.join(templates[x]['title']+'（'+x+'.md）' for x in s['templates']),'']
    for name,title in [('management','日常管理与协作'),('integrity','学术规范与提交检查'),('archive','数据资料归档与交接'),('policies','依据与校本要求核对')]:
        converter = HandbookMarkdown(name + '.html')
        converter.feed(read(f'scripts/training-pages/{name}.html'))
        lines += ['## '+title,'',converter.result(),'']
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

def main():
    pdata,tdata=load_data(); tracks=pdata['tracks']; templates=tdata['templates']; by_id={t['id']:t for t in templates}
    build_home(tracks,templates)
    for track in tracks: build_track(track,by_id)
    build_templates(templates); build_planner(tracks); build_milestones(tracks); build_resources()
    for page,title,lead in [('management','日常管理与协作','让任务、沟通、反馈和资源使用形成稳定的工作节奏。'),('integrity','学术规范与提交检查','把研究责任落实到数据、引用、写作和每一次正式提交。'),('archive','数据资料归档与交接','让论文中的每个结论有出处，让接手的人找得到、看得懂、跑得通。'),('policies','依据与校本要求核对','分清正式规定与工作建议，按本人适用的文件安排培养过程。')]:
        fragment=read(f'scripts/training-pages/{page}.html')
        write(page+'.html',shell(page+'.html',title,lead,hero(title,lead)+fragment,'resources.html'))
    build_handbook(tracks,by_id); package_templates(templates)
    print(f'Generated 4 pathways / {sum(len(t["stages"]) for t in tracks)} stages / {len(templates)} templates and shared pages.')

if __name__ == '__main__': main()
