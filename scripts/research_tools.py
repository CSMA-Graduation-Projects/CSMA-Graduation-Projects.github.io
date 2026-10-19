# -*- coding: utf-8 -*-
"""Render task-oriented research tool guidance without client-side dependencies."""
import html
import json
from pathlib import Path


def esc(value):
    return html.escape(str(value), quote=True)


def ul(items, ordered=False):
    tag = 'ol' if ordered else 'ul'
    return '<' + tag + '>' + ''.join('<li>' + esc(x) + '</li>' for x in items) + '</' + tag + '>'


def load_tools(root):
    root = Path(root)
    data = json.loads((root / 'assets/data/research-tools.json').read_text(encoding='utf-8'))
    data['_template_titles'] = {x['id']: x['title'] for x in json.loads(
        (root / 'assets/data/templates.json').read_text(encoding='utf-8'))['templates']}
    return data


def render_stage_tools(data, track_id, stage_id):
    """Compact links to the relevant task recipes; no installed-software claims."""
    scenarios = {x['id']: x for x in data['scenarios']}
    ids = data['stage_map'][track_id + '.' + stage_id]
    links = ''.join('<a href="tools.html#' + esc(i) + '">' + esc(scenarios[i]['title']) + ' <span aria-hidden="true">↗</span></a>' for i in ids)
    return '<div class="stage-tools"><h4>这个阶段，怎样选工具</h4><p>按当前任务选择一套组合，查看操作步骤、交付格式与核验方法。</p><div class="stage-tool-links">' + links + '</div></div>'


def render_tools(data):
    """Return tools.html main body, excluding the site shell and hero."""
    tools = {x['id']: x for x in data['tools']}
    sources = {x['id']: x for x in data['sources']}
    titles = data.get('_template_titles', {})

    def source_links(ids):
        return ' · '.join('<a href="' + esc(sources[i]['url']) + '">' + esc(sources[i]['title']) + '</a>' for i in ids)

    choices = []
    recipes = []
    for number, scene in enumerate(data['scenarios'], 1):
        combo = ' + '.join(tools[i]['name'] for i in scene['minimal_tools'])
        choices.append('<a class="tools-choice" href="#' + esc(scene['id']) + '"><span class="tools-choice-number">0' + str(number) + '</span><strong>' + esc(scene['title']) + '</strong><span>' + esc(scene['goal']) + '</span><small>' + esc(combo) + '</small></a>')
        combo_links = ' + '.join('<a href="#tool-' + esc(i) + '">' + esc(tools[i]['name']) + '</a>' for i in scene['minimal_tools'])
        template_links = ''.join('<a href="templates.html#' + esc(i) + '">' + esc(titles.get(i, i)) + ' ↗</a>' for i in scene.get('templates', []))
        recipes.append('''<article class="tool-scenario" id="{id}">
          <header class="tool-scenario-heading"><span class="tools-choice-number">{number:02d}</span><div><h2>{title}</h2><p>{goal}</p></div><a class="tool-return" href="#choose-tools">返回选择 ↑</a></header>
          <p class="tool-combo"><strong>初学者最小组合</strong><span>{combo}</span></p>
          <div class="tool-steps"><h3>按这几步推进</h3>{steps}</div>
          <div class="tool-detail-grid"><section><h3>交付什么</h3>{outputs}</section><section><h3>怎样确认完成</h3>{checks}</section></div>
          <details class="tool-options"><summary>需要换工具或增加工具时</summary>{alternatives}</details>
          <div class="tool-pitfalls"><h3>容易误用的地方</h3>{pitfalls}</div>
          <nav class="tool-template-links" aria-label="{title} / 配套模板">{templates}</nav>
          <p class="tool-sources"><strong>功能依据</strong> {sources}</p>
        </article>'''.format(id=esc(scene['id']), number=number, title=esc(scene['title']), goal=esc(scene['goal']), combo=combo_links, steps=ul(scene['steps'], True), outputs=ul(scene['outputs']), checks=ul(scene['checks']), alternatives=ul(scene['alternatives']), pitfalls=ul(scene['pitfalls']), templates=template_links, sources=source_links(scene['sources'])))

    labels = {'recommended': '推荐组合', 'optional': '可选替代', 'prepare': '需另行准备'}
    catalog = []
    for tool in data['tools']:
        docs = source_links(tool.get('docs', []))
        if tool.get('url'):
            docs += (' · ' if docs else '') + '<a href="' + esc(tool['url']) + '">官方网站 / 文档</a>'
        catalog.append('<article class="tool-resource" id="tool-' + esc(tool['id']) + '"><span class="tool-status tool-status-' + esc(tool['status']) + '">' + labels[tool['status']] + '</span><h3>' + esc(tool['name']) + '</h3><p>' + esc(tool['purpose']) + '</p><p class="tool-boundary">' + esc(tool['boundary']) + '</p><p class="tool-sources">' + docs + '</p></article>')

    return '''<section class="section tools-overview" id="choose-tools"><div class="container">
      <div class="tools-intro"><p class="section-kicker">TOOLS FOLLOW TASKS</p><h2>你现在要完成哪类任务？</h2><p>{intro}</p><p>{note}</p></div>
      <nav class="tools-choice-grid" aria-label="按研究任务选择工具">{choices}</nav>
      <p class="tools-navigation"><a href="#tool-catalog">查看精简工具目录 ↓</a><a href="workflows.html">回到流程图总览 ↗</a><a href="assets/downloads/training-handbook.md" download>下载离线培养手册 ↓</a></p>
    </div></section>
    <section class="section soft tools-recipes"><div class="container">{recipes}</div></section>
    <section class="section" id="tool-catalog"><div class="container"><div class="tools-intro"><p class="section-kicker">A SMALL TOOLBOX</p><h2>工具够用，材料可交接</h2><p>优先沿用能独立完成任务的工具。下列条目说明用途与边界，不代表所有服务、扩展或商业许可证已具备。</p></div><div class="tool-catalog">{catalog}</div><p class="tool-sources">官方功能说明核对日期：{updated}。场景中的工作步骤与验收建议由本站整理，不是软件厂商或学校的强制规定。</p></div></section>'''.format(intro=esc(data['intro']), note=esc(data['selection_note']), choices=''.join(choices), recipes=''.join(recipes), catalog=''.join(catalog), updated=esc(data['updated']))


def tools_markdown(data):
    """Plain Markdown counterpart for the offline handbook, including source URLs."""
    tools = {x['id']: x for x in data['tools']}
    sources = {x['id']: x for x in data['sources']}
    titles = data.get('_template_titles', {})
    lines = ['## 科研工具与任务方法', '', data['intro'], '', data['selection_note'], '']
    for scene in data['scenarios']:
        lines.extend(['### ' + scene['title'], '', scene['goal'], '', '**初学者最小组合：**' + ' + '.join(tools[i]['name'] for i in scene['minimal_tools']), ''])
        for key, title in [('steps','操作步骤'), ('outputs','交付格式'), ('checks','完成核验'), ('alternatives','替代与增加工具的条件'), ('pitfalls','常见误用')]:
            lines.extend(['**' + title + '**', ''])
            lines.extend((str(n) + '. ' if key == 'steps' else '- ') + text for n, text in enumerate(scene[key], 1))
            lines.append('')
        lines += ['配套模板：' + '；'.join('[' + titles.get(i, i) + '](https://csma-graduation-projects.github.io/templates.html#' + i + ')' for i in scene.get('templates', [])), '']
        lines += ['功能依据：' + '；'.join('[' + sources[i]['title'] + '](' + sources[i]['url'] + ')' for i in scene['sources']), '']
    lines += ['### 精简工具目录', '']
    labels = {'recommended': '推荐组合', 'optional': '可选替代', 'prepare': '需另行准备'}
    for tool in data['tools']:
        lines += ['- **' + tool['name'] + '（' + labels[tool['status']] + '）**：' + tool['purpose'] + ' ' + tool['boundary']]
        refs = ['[' + sources[i]['title'] + '](' + sources[i]['url'] + ')' for i in tool.get('docs', [])]
        if tool.get('url'):
            refs.append('[官方网站 / 文档](' + tool['url'] + ')')
        if refs:
            lines += ['  功能说明：' + '；'.join(refs)]
    lines += ['', '官方功能说明核对日期：' + data['updated'] + '。工作步骤与验收建议由本站整理，具体正式要求以适用文件为准。', '']
    return '\n'.join(lines)
