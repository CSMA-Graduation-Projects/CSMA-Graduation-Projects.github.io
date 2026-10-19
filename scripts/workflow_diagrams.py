# -*- coding: utf-8 -*-
"""Accessible, dependency-free flow diagrams and editable offline exports."""
import html
import json
import math
import re
import unicodedata
import xml.etree.ElementTree as ET
from pathlib import Path
from i18n import localize

LANGUAGE = 'zh-CN'

SITE = 'https://csma-graduation-projects.github.io/'
KINDS = {'stage': '培养阶段', 'process': '工作步骤', 'decision': '条件判断', 'remedy': '整改支路', 'end': '完成与后续'}

def load_flows(root):
    data = json.loads((Path(root) / 'assets/data/workflows.json').read_text(encoding='utf-8'))
    validate_flows(data)
    return data

def flows_for_track(data, track_id):
    return [f for f in data['flows'] if f.get('track') == track_id]

def validate_flows(data):
    ids = set()
    for f in data['flows']:
        assert f['id'] not in ids, 'duplicate flow: ' + f['id']
        ids.add(f['id'])
        nodes = {n['id']: n for n in f['nodes']}
        assert len(nodes) == len(f['nodes'])
        assert len(f['order']) == len(set(f['order']))
        assert set(f['order']) == {n['id'] for n in f['nodes'] if n['lane'] == 'main'}
        for n in f['nodes']:
            assert n['label'] and n['detail'] and n['href'] and n['kind'] in KINDS
            assert not n['href'].startswith(('javascript:', 'file:'))
        for e in f['edges']:
            assert e['from'] in nodes and e['to'] in nodes and e['label']
        for n in f['nodes']:
            if n['kind'] == 'decision':
                outgoing = [e for e in f['edges'] if e['from'] == n['id']]
                assert {'pass', 'fail'} <= {e['type'] for e in outgoing}
            if n['lane'] == 'return':
                assert any(e['from'] == n['id'] and e['type'] == 'return' and e['to'] in f['order'] for e in f['edges'])
    return True

def _e(s):
    return html.escape(str(s), quote=True)

def _prefix(flow, instance_id):
    prefix = re.sub(r'[^A-Za-z0-9_-]', '-', instance_id)
    return 'flow-' + (prefix + '-' if prefix else '') + flow['id']

def render_flow(flow, instance_id='', compact=False):
    """Render the full chart immediately; compact permits optional native collapse."""
    prefix = _prefix(flow, instance_id)
    nodes = {n['id']: n for n in flow['nodes']}
    edges = flow['edges']
    def card(n):
        kind = n['kind']
        symbol = '<span class="wf-diamond" aria-hidden="true">◆</span>' if kind == 'decision' else ''
        return ('<a class="wf-node wf-' + kind + '" id="' + prefix + '-' + n['id'] + '" href="' + _e(n['href']) + '">'
                '<span class="wf-kind">' + symbol + KINDS[kind] + '</span><strong>' + _e(n['label']) + '</strong>'
                '<span class="wf-detail">' + _e(n['detail']) + '</span><span class="wf-open">查看说明 ↗</span></a>')
    rows = []
    for i, nid in enumerate(flow['order']):
        n = nodes[nid]
        branches = [e for e in edges if e['from'] == nid and e['type'] == 'fail']
        side = ''
        for e in branches:
            rem = nodes[e['to']]
            back = next(b for b in edges if b['from'] == rem['id'] and b['type'] == 'return')
            side += ('<aside class="wf-branch" aria-label="未满足条件时的处理"><span class="wf-branch-arrow">'
                     + _e(e['label']) + ' <span aria-hidden="true">→</span></span><div class="wf-branch-content">' + card(rem)
                     + '<a class="wf-return" href="#' + prefix + '-' + back['to'] + '"><span aria-hidden="true">↶</span> '
                     + _e(back['label']) + '</a></div></aside>')
        onward = next((e for e in edges if e['from'] == nid and e['type'] in ('next', 'pass')), None)
        connector = ('<div class="wf-connector" data-continue="' + _e(onward['label']) + '"><span>' + (_e(onward['label']) if onward['type'] == 'pass' else '') + '</span><b aria-hidden="true">↓</b></div>') if onward else ''
        rows.append('<div class="wf-row' + (' wf-has-branch' if side else '') + '"><div class="wf-main">' + card(n) + connector + '</div>' + side + '</div>')
    overview = '<a href="workflows.html#flow-' + flow['id'] + '">在流程图总览查看 ↗</a>' if instance_id else ''
    downloads = ('<div class="wf-downloads"><strong>保存与编辑（可选）</strong><a href="assets/diagrams/' + flow['id'] + '.svg" download>下载 SVG 图</a>'
                 '<a href="assets/diagrams/' + flow['id'] + '.drawio" download>下载 draw.io 源文件</a>' + overview + '</div>')
    body = ('<div class="wf-body"><p class="wf-reading-key">实线向下：满足条件后推进；金色判断：检查能否继续；虚线回箭头：整改后返回复查。点击节点打开具体说明。</p>'
            '<div class="wf-chart" aria-label="' + _e(flow['title']) + '">' + ''.join(rows) + '</div>'
            '<p class="wf-note"><strong>使用边界：</strong>' + _e(flow['note']) + '</p></div>')
    if compact:
        count = len([n for n in flow['nodes'] if n['lane'] == 'main' and n['kind'] != 'decision'])
        gates = len([n for n in flow['nodes'] if n['kind'] == 'decision'])
        body = '<details class="wf-disclosure" data-flow-disclosure open><summary>流程图 <span>' + str(count) + ' 个阶段 / 步骤 · ' + str(gates) + ' 处判断 · 点击收起或展开</span></summary>' + body + '</details>'
    return ('<section class="workflow-diagram" id="' + prefix + '" aria-labelledby="' + prefix + '-title"><header class="wf-heading">'
            '<p class="section-kicker">WORKFLOW / 流程图</p><h2 id="' + prefix + '-title">' + _e(flow['title']) + '</h2><p>' + _e(flow['summary']) + '</p></header>'
            + body + downloads + '</section>')

def flow_markdown(flow):
    nodes = {n['id']: n for n in flow['nodes']}
    lines = ['### ' + flow['title'], '', flow['summary'], '', '在线图：' + SITE + 'workflows.html#flow-' + flow['id'], '', '**主线（满足条件后向下推进）**', '']
    for i, nid in enumerate(flow['order'], 1):
        n = nodes[nid]
        lines.append(str(i) + '. ' + ('【判断】' if n['kind'] == 'decision' else '') + n['label'] + '：' + n['detail'] + ' [具体说明](' + SITE + n['href'] + ')')
        for e in flow['edges']:
            if e['from'] == nid and e['type'] == 'fail':
                rem = nodes[e['to']]
                back = next(b for b in flow['edges'] if b['from'] == rem['id'] and b['type'] == 'return')
                lines.append('   - 未满足 → ' + rem['detail'] + ' → ' + back['label'] + '（' + nodes[back['to']]['label'] + '）。')
    lines += ['', '**使用边界：**' + flow['note'], '', '[SVG 下载](' + SITE + 'assets/diagrams/' + flow['id'] + '.svg) · [draw.io 可编辑源文件](' + SITE + 'assets/diagrams/' + flow['id'] + '.drawio)', '']
    return '\n'.join(lines)

# Standard Helvetica advances, also close to Arial. English SVG spans use an
# explicit textLength, making these bounds independent of the viewer's fallback
# font. Source words remain intact; a token too wide for its box fails clearly.
_LOWER_WIDTHS = (556,556,500,556,556,278,556,556,222,222,500,222,833,556,556,556,556,333,500,278,556,500,722,500,500,500)
_UPPER_WIDTHS = (667,667,722,722,667,611,778,722,278,500,667,556,833,722,778,667,778,722,667,611,722,667,944,667,667,611)
_BOLD_LOWER_WIDTHS = (556,611,556,611,556,333,611,611,278,278,556,278,889,611,611,611,611,389,556,333,611,556,778,556,556,500)
_BOLD_UPPER_WIDTHS = (722,722,722,722,667,611,778,722,278,556,722,611,833,722,778,667,778,722,667,611,722,667,944,667,667,611)
_PUNCT_WIDTHS = {' ':278, '.':278, ',':278, ':':278, ';':278, '!':278, "'":222, '"':355, '-':333, '/':278, '\\':278, '(':333, ')':333, '[':278, ']':278, '?':556, '&':667, '+':584, '=':584, '%':889, '@':1015, '_':556, '’':222, '‘':222, '“':333, '”':333, '–':556, '—':1000, '↶':900, '·':278}

def _text_width(text, font=1, weight='400'):
    bold = str(weight) in ('600', '700', '800', '900', 'bold')
    lower = _BOLD_LOWER_WIDTHS if bold else _LOWER_WIDTHS
    upper = _BOLD_UPPER_WIDTHS if bold else _UPPER_WIDTHS
    units = 0
    for char in text:
        if 'a' <= char <= 'z': units += lower[ord(char)-ord('a')]
        elif 'A' <= char <= 'Z': units += upper[ord(char)-ord('A')]
        elif char.isascii() and char.isdigit(): units += 556
        else: units += _PUNCT_WIDTHS.get(char, 1000)
    return units * font / 1000

def _wrap(text, max_units, weight='400'):
    """Wrap CJK by display units and English by bounded whole-word advances."""
    if LANGUAGE == 'en':
        lines, line = [], ''
        max_width = max_units / 2
        for word in text.split():
            if _text_width(word, weight=weight) > max_width:
                raise ValueError('Unbroken export token exceeds its text box: ' + word)
            candidate = (line + ' ' + word).strip()
            if line and _text_width(candidate, weight=weight) > max_width:
                lines.append(line)
                line = word
            else: line = candidate
        if line: lines.append(line)
        return lines or ['']
    lines, line, width = [], '', 0
    for c in text:
        w = 2 if unicodedata.east_asian_width(c) in ('W', 'F') else 1
        if width + w > max_units and line:
            lines.append(line); line = ''; width = 0
        line += c; width += w
    if line: lines.append(line)
    return lines

def _export_frame(flow):
    title_y = 45
    summary_y = title_y + len(_wrap(flow['title'], 52, '700')) * 32
    legend = localize('向下推进；未满足走右侧整改支路；沿虚线返回对应步骤。点击节点打开在线说明。', LANGUAGE)
    key_y = summary_y + len(_wrap(flow['summary'], 112)) * 22 + 24
    return {'title_y': title_y, 'summary_y': summary_y, 'legend': legend,
            'key_y': key_y, 'first_node_y': key_y + len(_wrap(legend, 118)) * 21 + 35}

def _decision_text_box(node):
    label_lines = _wrap(node['label'], 28, '700')
    detail_lines = _wrap(node['detail'], 34)
    label_height = 20 + (len(label_lines)-1) * 22
    detail_height = 15 + (len(detail_lines)-1) * 17
    width = max([_text_width(s, 16, '700') for s in label_lines] + [_text_width(s, 12) for s in detail_lines])
    return width, label_height + 10 + detail_height, label_height

def _layout(flow):
    """Portrait export with a consistent main lane and explicit return lane."""
    positions = {}
    nodes = {n['id']:n for n in flow['nodes']}
    y = _export_frame(flow)['first_node_y']
    for nid in flow['order']:
        n = nodes[nid]
        if n['kind'] == 'decision':
            text_width, text_height, _ = _decision_text_box(n)
            # A centred rectangle lies inside a diamond when its width/w
            # plus its height/h is <= 1. Include 12 px safety on each side.
            h = max(240, math.ceil((text_height+24)/(1-(text_width+24)/408)))
        else:
            h = max(150,80+len(_wrap(n['label'],42,'700'))*22+len(_wrap(n['detail'],56))*20)
        positions[nid] = (36,y,408,h)
        row_height = h
        row_gap = 115
        for e in flow['edges']:
            if e['from']==nid and e['type']=='fail':
                rem = nodes[e['to']]
                rh = max(180,80+len(_wrap(rem['label'],30,'700'))*22+len(_wrap(rem['detail'],40))*20)
                positions[e['to']] = (548,y,310,rh)
                row_height = max(row_height,rh)
                back = next(b for b in flow['edges'] if b['from']==rem['id'] and b['type']=='return')
                row_gap = max(row_gap, len(_wrap('↶ '+back['label'],48))*17+45)
        y += row_height + row_gap
    note = localize('使用边界：',LANGUAGE) + flow['note']
    return positions,920,y+len(_wrap(note,112))*21+80

def _absolute(href):
    return href if href.startswith(('https://', 'http://')) else SITE + href

def _text(parent, x, y, content, font=15, fill='#243c4d', weight='400', max_units=48, anchor='start', line_height=None):
    line_height = line_height or font * 1.55
    elem = ET.SubElement(parent, 'text', {'x': str(x), 'y': str(y), 'font-size': str(font), 'fill': fill, 'font-weight': weight, 'text-anchor': anchor})
    for i, line in enumerate(_wrap(content, max_units, weight)):
        attrs = {'x': str(x), 'dy': '0' if i == 0 else str(line_height)}
        if LANGUAGE == 'en' and line:
            attrs.update({'textLength': f'{_text_width(line,font,weight):.3f}', 'lengthAdjust': 'spacingAndGlyphs'})
        ET.SubElement(elem, 'tspan', attrs).text = line
    return elem

def _svg(flow):
    pos, width, height = _layout(flow)
    svg = ET.Element('svg', {'xmlns': 'http://www.w3.org/2000/svg', 'width': str(width), 'height': str(height), 'viewBox': f'0 0 {width} {height}', 'role': 'img', 'aria-labelledby': 'diagram-title diagram-desc', 'font-family': 'PingFang SC,Microsoft YaHei,Noto Sans CJK SC,sans-serif'})
    if LANGUAGE == 'en': svg.set('font-family', 'Arial,Helvetica,sans-serif')
    ET.SubElement(svg, 'title', {'id': 'diagram-title'}).text = flow['title']
    ET.SubElement(svg, 'desc', {'id': 'diagram-desc'}).text = flow['summary'] + ' 实线向下推进，金色菱形为判断，虚线为整改后返回。' + flow['note']
    defs = ET.SubElement(svg, 'defs')
    for mid, col in [('arrow', '#426a71'), ('return-arrow', '#a77931')]:
        marker = ET.SubElement(defs, 'marker', {'id': mid, 'viewBox': '0 0 10 10', 'refX': '9', 'refY': '5', 'markerWidth': '7', 'markerHeight': '7', 'orient': 'auto-start-reverse'})
        ET.SubElement(marker, 'path', {'d': 'M 0 0 L 10 5 L 0 10 z', 'fill': col})
    ET.SubElement(svg, 'rect', {'width': str(width), 'height': str(height), 'fill': '#f7f8f6'})
    _text(svg, 36, 45, flow['title'], 25, '#14375f', '700', 52 if LANGUAGE=='en' else 66,line_height=32)
    frame = _export_frame(flow)
    summary_y = frame['summary_y']
    _text(svg, 36, summary_y, flow['summary'], 14, max_units=112,line_height=22)
    key_y = frame['key_y']
    _text(svg, 36, key_y, localize('向下推进；未满足走右侧整改支路；沿虚线返回对应步骤。点击节点打开在线说明。',LANGUAGE), 13, '#536674', max_units=118)
    # Draw edges first so nodes cover endpoints cleanly.
    for i, e in enumerate(flow['edges']):
        ax, ay, aw, ah = pos[e['from']]; bx, by, bw, bh = pos[e['to']]
        attrs = {'class': 'flow-edge', 'data-from': e['from'], 'data-to': e['to'], 'data-edge-type': e['type'], 'fill': 'none', 'stroke-width': '2', 'stroke': '#426a71', 'marker-end': 'url(#arrow)'}
        if e['type'] in ('next', 'pass'):
            d = f'M {ax+aw/2} {ay+ah} L {bx+bw/2} {by-5}'
            if e['type'] == 'pass': _text(svg, ax+aw/2+14, ay+ah+30, e['label'], 12, '#24685f', max_units=24)
        elif e['type'] == 'fail':
            d = f'M {ax+aw} {ay+ah/2} L {bx-5} {by+bh/2}'
            label_y = min(ay+ah/2,by+bh/2)-12 if LANGUAGE=='en' else ay+ah/2-11
            _text(svg, ax+aw+14, label_y, localize('未满足',LANGUAGE), 12, '#805b28', max_units=12)
        else:
            rail = 874 + (i % 5) * 5
            # Leave below the remedy, outside its text, then route on the far right.
            if LANGUAGE == 'en':
                # The right-side exit keeps the route out of the multiline
                # return label below the remedy, including its vertical stem.
                d = f'M {ax+aw} {ay+ah/2} L {rail} {ay+ah/2} L {rail} {by-20} L {bx+bw-22} {by-20} L {bx+bw-22} {by-4}'
            else:
                d = f'M {ax+aw/2} {ay+ah} L {ax+aw/2} {ay+ah+27} L {rail} {ay+ah+27} L {rail} {by-20} L {bx+bw-22} {by-20} L {bx+bw-22} {by-4}'
            attrs.update({'stroke': '#a77931', 'stroke-dasharray': '6 5', 'marker-end': 'url(#return-arrow)'})
            _text(svg, ax, ay+ah+21, '↶ '+e['label'], 11, '#805b28', max_units=48)
        attrs['d'] = d
        ET.SubElement(svg, 'path', attrs)
    for n in flow['nodes']:
        x, y, w, h = pos[n['id']]
        g = ET.SubElement(svg, 'g', {'class': 'flow-node', 'data-node-id': n['id'], 'aria-label': n['label'] + '。' + n['detail']})
        a = ET.SubElement(g, 'a', {'href': _absolute(n['href']), 'target': '_blank'})
        ET.SubElement(a, 'title').text = n['label'] + '：' + n['detail']
        if n['kind'] == 'decision':
            ET.SubElement(a, 'polygon', {'points': f'{x+w/2},{y} {x+w},{y+h/2} {x+w/2},{y+h} {x},{y+h/2}', 'fill': '#f6edda', 'stroke': '#ad894a', 'stroke-width': '2'})
            lines = _wrap(n['label'], 28, '700')
            _, text_height, label_height = _decision_text_box(n)
            text_top = y + (h-text_height)/2
            top = text_top + 16
            detail_top = text_top + label_height + 10 + 12
            _text(a, x+w/2, top, n['label'], 16, '#684e26', '700', 28, 'middle', 22)
            _text(a, x+w/2, detail_top, n['detail'], 12, '#684e26', max_units=34, anchor='middle', line_height=17)
        else:
            remedy = n['kind'] == 'remedy'
            fill, stroke = ('#fffaf0', '#baa371') if remedy else ('#ffffff', '#9db2b5')
            ET.SubElement(a, 'rect', {'x': str(x), 'y': str(y), 'width': str(w), 'height': str(h), 'rx': '9', 'fill': fill, 'stroke': stroke, 'stroke-width': '1.5'})
            _text(a, x+19, y+25, localize(KINDS[n['kind']],LANGUAGE), 11, '#617777', max_units=50)
            units = 30 if remedy else 42
            label_lines = _wrap(n['label'], units, '700')
            _text(a, x+19, y+50, n['label'], 16, '#14375f', '700', units, line_height=22)
            _text(a, x+19, y+50+len(label_lines)*22+3, n['detail'], 13, '#485e69', max_units=40 if remedy else 56, line_height=20)
    footer_y = height - (len(_wrap(localize('使用边界：',LANGUAGE)+flow['note'],112))*21+55)
    _text(svg, 36, footer_y, localize('使用边界：',LANGUAGE) + flow['note'], 13, '#536674', max_units=112 if LANGUAGE=='en' else 116, line_height=21)
    _text(svg, 36, height-23, localize('CSMA 培养指南 · ',LANGUAGE) + SITE + 'workflows.html#flow-' + flow['id'], 11, '#536674', max_units=140)
    return ET.tostring(svg, encoding='unicode') + '\n'

def _drawio(flow):
    pos, width, height = _layout(flow)
    mxfile = ET.Element('mxfile', {'host': 'app.diagrams.net', 'type': 'device', 'version': '24.7.17'})
    diagram = ET.SubElement(mxfile, 'diagram', {'id': 'diagram-' + flow['id'], 'name': flow['title']})
    model = ET.SubElement(diagram, 'mxGraphModel', {'dx': str(width), 'dy': str(height), 'grid': '1', 'gridSize': '10', 'guides': '1', 'tooltips': '1', 'connect': '1', 'arrows': '1', 'fold': '1', 'page': '1', 'pageScale': '1', 'pageWidth': str(width), 'pageHeight': str(height), 'math': '0', 'shadow': '0'})
    root = ET.SubElement(model, 'root'); ET.SubElement(root, 'mxCell', {'id': '0'}); ET.SubElement(root, 'mxCell', {'id': '1', 'parent': '0'})
    def textcell(id, value, y, h, font):
        font_style = 'fontFamily=Arial;spacing=0;' if LANGUAGE == 'en' else ''
        c = ET.SubElement(root, 'mxCell', {'id': id, 'value': value, 'style': f'text;html=0;whiteSpace=wrap;align=left;verticalAlign=top;fontSize={font};fontColor=#14375f;'+font_style, 'vertex': '1', 'parent': '1'})
        ET.SubElement(c, 'mxGeometry', {'x': '36', 'y': str(y), 'width': '840', 'height': str(h), 'as': 'geometry'})
    frame = _export_frame(flow)
    title_lines = _wrap(flow['title'],52,'700')
    summary_lines = _wrap(flow['summary'],112)
    legend_lines = _wrap(frame['legend'],118)
    note_lines = _wrap(localize('使用边界：',LANGUAGE)+flow['note'],112)
    textcell('diagram-title','\n'.join(title_lines),20,len(title_lines)*32+8,24)
    textcell('diagram-summary','\n'.join(summary_lines),frame['summary_y']-14,len(summary_lines)*22+8,14)
    textcell('diagram-legend','\n'.join(legend_lines),frame['key_y']-13,len(legend_lines)*21+8,13)
    textcell('diagram-note','\n'.join(note_lines),height-(len(note_lines)*21+55)-13,len(note_lines)*21+8,13)
    for n in flow['nodes']:
        x,y,w,h=pos[n['id']]
        decision = n['kind']=='decision'; remedy=n['kind']=='remedy'
        style = ('rhombus;' if decision else 'rounded=1;arcSize=8;') + 'whiteSpace=wrap;html=0;align=center;verticalAlign=middle;fontSize=14;fontColor=#243c4d;spacing=15;'
        style += 'fillColor=#f6edda;strokeColor=#ad894a;' if decision else ('fillColor=#fffaf0;strokeColor=#baa371;' if remedy else 'fillColor=#ffffff;strokeColor=#9db2b5;')
        label = n['label']+'\n\n'+n['detail']
        if LANGUAGE == 'en': style += 'fontFamily=Arial;'
        if decision:
            # Match SVG word breaks in a narrow centred text box. A 12 px
            # font keeps both title and detail inside the same safe diamond.
            style += 'fontSize=12;labelWidth=224;spacing=0;'
            label = '\n'.join(_wrap(n['label'],28,'700'))+'\n\n'+'\n'.join(_wrap(n['detail'],34))
        else:
            units = 30 if remedy else 42
            detail_units = 36 if remedy else 50
            label = '\n'.join(_wrap(n['label'],units,'700'))+'\n\n'+'\n'.join(_wrap(n['detail'],detail_units))
        obj=ET.SubElement(root, 'object', {'id':n['id'], 'label': label, 'link':_absolute(n['href']), 'tooltip':localize(KINDS[n['kind']],LANGUAGE)})
        cell=ET.SubElement(obj,'mxCell', {'style':style,'vertex':'1','parent':'1'})
        ET.SubElement(cell,'mxGeometry', {'x':str(x),'y':str(y),'width':str(w),'height':str(h),'as':'geometry'})
    for i,e in enumerate(flow['edges']):
        style='edgeStyle=orthogonalEdgeStyle;rounded=0;orthogonalLoop=1;jettySize=auto;html=0;endArrow=block;endFill=1;strokeWidth=2;fontSize=12;labelBackgroundColor=#f7f8f6;'
        style += 'strokeColor=#a77931;dashed=1;fontColor=#805b28;' if e['type']=='return' else 'strokeColor=#426a71;fontColor=#24685f;'
        if e['type'] in ('next','pass'):style+='exitX=0.5;exitY=1;entryX=0.5;entryY=0;'
        elif e['type']=='fail':style+='exitX=1;exitY=0.5;entryX=0;entryY=0.5;'
        elif LANGUAGE == 'en':style+='exitX=1;exitY=0.5;entryX=0.95;entryY=0;'
        else:style+='exitX=0.5;exitY=1;entryX=0.95;entryY=0;'
        if LANGUAGE == 'en':
            style+='fontFamily=Arial;whiteSpace=wrap;'
            if e['type']=='return': style+='fontSize=11;labelWidth=280;'
            elif e['type']=='fail': style+='labelWidth=82;'
            elif e['type']=='pass': style+='labelWidth=155;'
        c=ET.SubElement(root,'mxCell',{'id':'edge-'+str(i),'value':e['label'] if e['type']!='next' else '', 'style':style,'edge':'1','parent':'1','source':e['from'],'target':e['to']})
        geometry=ET.SubElement(c,'mxGeometry',{'relative':'1','as':'geometry'})
        if e['type']=='return':
            ax,ay,aw,ah=pos[e['from']];bx,by,bw,bh=pos[e['to']];rail=874+(i%5)*5
            points=ET.SubElement(geometry,'Array',{'as':'points'})
            if LANGUAGE == 'en':
                points_xy = [(rail,ay+ah/2),(rail,by-20),(bx+bw-22,by-20)]
                label_height = len(_wrap(e['label'],48))*17+4
                geometry.set('x','-1')
                geometry.set('y','0')
                geometry.set('width','280')
                geometry.set('height',str(label_height))
                ET.SubElement(geometry,'mxPoint',{'x':str(-aw/2),'y':str(ah/2+14+label_height/2),'as':'offset'})
            else:
                points_xy = [(ax+aw/2,ay+ah+28),(rail,ay+ah+28),(rail,by-20),(bx+bw-22,by-20)]
            for px,py in points_xy:ET.SubElement(points,'mxPoint',{'x':str(px),'y':str(py)})
    return '<?xml version="1.0" encoding="UTF-8"?>\n'+ET.tostring(mxfile,encoding='unicode')+'\n'

def generate_diagram_assets(root, data, language='zh-CN'):
    global LANGUAGE
    LANGUAGE = language
    validate_flows(data)
    target=Path(root)/'assets/diagrams';target.mkdir(parents=True,exist_ok=True)
    for flow in data['flows']:
        (target/(flow['id']+'.svg')).write_text(localize(_svg(flow),language),encoding='utf-8')
        (target/(flow['id']+'.drawio')).write_text(localize(_drawio(flow),language),encoding='utf-8')

if __name__ == '__main__':
    root=Path(__file__).resolve().parent.parent
    data=load_flows(root);generate_diagram_assets(root,data)
    print('Generated SVG and draw.io assets for '+str(len(data['flows']))+' workflows.')
