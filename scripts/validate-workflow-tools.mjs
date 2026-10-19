#!/usr/bin/env node
// Acceptance checks for usable process maps and task-based research tool guidance.
// Uses only Node and Python standard libraries. Run after build-training.py.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { execFileSync } from 'node:child_process';

const repo = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const root = process.argv.includes('--build') ? path.join(repo, '_site') : repo;
const results = [];
const read = relative => fs.readFileSync(path.join(root, relative), 'utf8');
const load = relative => JSON.parse(read(relative));
const nonempty = value => typeof value === 'string' && value.trim().length > 0;
const list = value => Array.isArray(value) && value.length > 0 && value.every(nonempty);
const decode = value => value.replace(/&amp;/g, '&').replace(/&quot;/g, '"').replace(/&#(?:39|x27);/g, "'").replace(/&lt;/g, '<').replace(/&gt;/g, '>');
const plain = html => decode(html.replace(/<[^>]*>/g, ' ')).replace(/\s+/g, ' ').trim();
const escape = value => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const hrefs = html => [...html.matchAll(/\bhref=["']([^"']+)["']/g)].map(m => decode(m[1]));
const downloadLink = (html, href) => [...html.matchAll(/<a\b[^>]*>/gi)].some(m => hrefs(m[0]).includes(href) && /\bdownload(?:\s|=|>)/i.test(m[0]));
const sameMembers = (a, b) => a.length === b.length && [...a].sort().every((x, i) => x === [...b].sort()[i]);
const hasId = (html, id) => new RegExp(`\\bid=["']${escape(id)}["']`).test(html);
const article = (html, id) => html.match(new RegExp(`<article\\b(?=[^>]*\\bid=["']${escape(id)}["'])[^>]*>[\\s\\S]*?<\\/article>`, 'i'))?.[0] || '';
function check(label, ok, detail = '') {
  results.push({ label, ok: Boolean(ok), detail });
  console.log(`${ok ? 'PASS' : 'FAIL'} ${label}${detail ? ` — ${detail}` : ''}`);
}
function grouped(label, items, predicate) {
  const failed = items.filter(item => !predicate(item)).map(item => item.id || item.key || String(item));
  check(label, items.length > 0 && !failed.length, failed.length ? failed.join(', ') : `${items.length} 项`);
}
function reachable(start, edges, allowed = () => true) {
  const reached = new Set([start]);
  const queue = [start];
  while (queue.length) {
    const current = queue.shift();
    for (const edge of edges.filter(e => e.from === current && allowed(e))) {
      if (!reached.has(edge.to)) { reached.add(edge.to); queue.push(edge.to); }
    }
  }
  return reached;
}
function localLinkValid(href, from = 'index.html') {
  if (/^(?:https?:|mailto:|tel:|data:)/.test(href) || href.includes('{{')) return true;
  const [rawFile, rawFragment = ''] = href.split('#');
  const file = decodeURIComponent(rawFile.split('?')[0]);
  const target = file ? path.resolve(root, path.dirname(from), file.replace(/^\//, '')) : path.join(root, from);
  if (!target.startsWith(root + path.sep) || !fs.existsSync(target)) return false;
  if (!rawFragment || !/\.html$/.test(target)) return true;
  return hasId(fs.readFileSync(target, 'utf8'), decodeURIComponent(rawFragment));
}

try {
  const { tracks } = load('assets/data/pathways.json');
  const { templates } = load('assets/data/templates.json');
  const workflow = load('assets/data/workflows.json');
  const toolData = load('assets/data/research-tools.json');
  const flows = workflow.flows || [];
  const scenarios = toolData.scenarios || [];
  const tools = toolData.tools || [];
  const sources = toolData.sources || [];
  const stageMap = toolData.stage_map || {};
  const stages = tracks.flatMap(t => t.stages.map(s => ({ id: `${t.id}.${s.id}`, stage: s, track: t })));
  const byTool = new Map(tools.map(t => [t.id, t]));
  const byScenario = new Map(scenarios.map(s => [s.id, s]));
  const bySource = new Map(sources.map(s => [s.id, s]));
  const templateIds = new Set(templates.map(t => t.id));
  const flowHtml = read('workflows.html');
  const toolHtml = read('tools.html');
  const handbook = read('assets/downloads/training-handbook.md');
  const expectedFlows = ['research-path', 'bachelor-path', 'competition-path', 'master-path', 'doctor-path', 'literature', 'reproduction', 'engineering', 'submission', 'feedback', 'archiving'];
  const expectedScenarios = ['literature', 'empirical', 'software', 'ai', 'writing', 'collaboration', 'management'];
  check('流程与工具数据具有日期和完整结构', /^\d{4}-\d{2}-\d{2}$/.test(workflow.updated || '') && /^\d{4}-\d{2}-\d{2}$/.test(toolData.updated || '') && tracks.length === 5);
  check('十一张图覆盖培养路径与共同科研工作', sameMembers(flows.map(f => f.id), expectedFlows));
  check('七类工具场景覆盖实际研究任务', sameMembers(scenarios.map(s => s.id), expectedScenarios));
  grouped('流程目的、适用边界与节点内容可读', flows, f => ['id', 'title', 'summary', 'note'].every(k => nonempty(f[k])) && Array.isArray(f.nodes) && f.nodes.length >= 3 && f.nodes.every(n => ['id', 'label', 'detail', 'kind', 'href'].every(k => nonempty(n[k]))) && list(f.order));
  grouped('图中节点唯一，连线无悬空引用', flows, f => {
    const ids = new Set(f.nodes.map(n => n.id));
    return ids.size === f.nodes.length && new Set(f.order).size === f.order.length && f.order.every(id => ids.has(id)) && f.edges.length > 0 && f.edges.every(e => ids.has(e.from) && ids.has(e.to) && e.from !== e.to && nonempty(e.label));
  });
  grouped('从开始可以走到结束及所有分支节点', flows, f => {
    const reached = reachable(f.order[0], f.edges);
    return reached.has(f.order.at(-1)) && f.nodes.every(n => reached.has(n.id));
  });
  grouped('每个判断有通过和未通过路线', flows, f => {
    const decisions = f.nodes.filter(n => n.kind === 'decision');
    return decisions.length > 0 && decisions.every(n => ['pass', 'fail'].every(type => f.edges.some(e => e.from === n.id && e.type === type)));
  });
  grouped('未通过会整改并返回当前或更早的核查点', flows, f => f.edges.filter(e => e.type === 'fail').every(failure => {
    const decisionIndex = f.order.indexOf(failure.from);
    const reached = reachable(failure.to, f.edges, e => ['return', 'next'].includes(e.type) && !f.order.includes(e.from));
    return f.nodes.some(n => n.id === failure.to && n.kind === 'remedy') && f.edges.some(e => e.type === 'return' && reached.has(e.from) && f.order.includes(e.to) && f.order.indexOf(e.to) <= decisionIndex);
  }));
  grouped('五条培养图逐一覆盖原有阶段且没有复制阶段', tracks, track => {
    const candidates = flows.filter(f => f.track === track.id);
    return candidates.length === 1 && sameMembers(candidates[0].nodes.filter(n => n.stage).map(n => n.stage), track.stages.map(s => s.id));
  });
  grouped('45 个阶段图节点指向正确的详细说明', stages, s => flows.find(f => f.track === s.track.id)?.nodes.some(n => n.stage === s.stage.id && n.href === `${s.track.page}#${s.stage.id}`));
  grouped('所有节点都有可到达的说明或材料', flows, f => f.nodes.every(n => localLinkValid(n.href)));
  grouped('流程图中心有标题、分支说明与真实下载入口', flows, f => {
    const links = hrefs(flowHtml);
    return hasId(flowHtml, `flow-${f.id}`) && plain(flowHtml).includes(f.title) && plain(flowHtml).includes(f.note) && ['svg', 'drawio'].every(ext => links.includes(`assets/diagrams/${f.id}.${ext}`) && downloadLink(flowHtml, `assets/diagrams/${f.id}.${ext}`) && fs.existsSync(path.join(root, `assets/diagrams/${f.id}.${ext}`)));
  });
  check('流程图整包在图中心有明确下载入口', downloadLink(flowHtml, 'assets/downloads/csma-workflow-diagrams.zip'));
  grouped('十个图示页面默认直接显示流程，无需展开或下载', ['workflows.html', ...tracks.map(t => t.page), 'resources.html', 'integrity.html', 'management.html', 'archive.html'], page => {
    const html = read(page);
    const diagrams = [...html.matchAll(/<details\b(?=[^>]*\bdata-flow-disclosure)[^>]*>/g)].map(m => m[0]);
    return diagrams.length > 0 && diagrams.every(tag => /\sopen(?:\s|=|>)/.test(tag));
  });
  grouped('每条培养页面实际包含本路径图和图中心入口', tracks, t => {
    const html = read(t.page);
    const flow = flows.find(f => f.track === t.id);
    return /workflow-diagram/.test(html) && plain(html).includes(flow.title) && hrefs(html).some(h => h === 'workflows.html' || h.startsWith('workflows.html#'));
  });
  grouped('首页和资源页可抵达流程与工具中心', ['index.html', 'resources.html'], page => ['workflows.html', 'tools.html'].every(p => hrefs(read(page)).some(h => h === p || h.startsWith(p + '#'))));
  grouped('共用工作流程进入对应指导页面', flows.filter(f => !f.track), f => {
    const guide = f.guide?.split('#')[0];
    const page = guide?.endsWith('.html') ? guide : guide + '.html';
    return nonempty(page) && fs.existsSync(path.join(root, page)) && (hrefs(read(page)).some(h => h === `workflows.html#flow-${f.id}` || h === `workflows.html#${f.id}`) || plain(read(page)).includes(f.title));
  });
  check('阶段工具映射恰好覆盖现有45阶段', stages.length === 45 && sameMembers(Object.keys(stageMap), stages.map(s => s.id)));
  grouped('阶段映射都使用实际存在的工具场景', stages, s => list(stageMap[s.id]) && stageMap[s.id].every(id => byScenario.has(id)));
  grouped('每个阶段正文能直接进入它的工具场景', stages, s => stageMap[s.id].every(id => hrefs(article(read(s.track.page), s.stage.id)).includes(`tools.html#${id}`)));
  grouped('工具场景有操作、产物、核查和替代选择', scenarios, s => ['id', 'title', 'goal'].every(k => nonempty(s[k])) && ['minimal_tools', 'steps', 'outputs', 'checks', 'alternatives', 'pitfalls', 'sources'].every(k => list(s[k])) && s.steps.length >= 3 && s.outputs.length >= 2 && s.checks.length >= 2);
  grouped('工具和官方资料引用没有孤立占位项', scenarios, s => s.minimal_tools.every(id => byTool.has(id)) && s.sources.every(id => bySource.has(id)));
  grouped('工具场景关联的模板实际存在且网页可达', scenarios, s => list(s.templates) && s.templates.every(id => templateIds.has(id) && hrefs(toolHtml).includes(`templates.html#${id}`)));
  check('工具、场景、来源ID各自唯一', [tools, scenarios, sources].every(items => items.length > 0 && new Set(items.map(i => i.id)).size === items.length));
  grouped('工具区分推荐、可选和需另行准备的能力', tools, t => ['id', 'name', 'purpose', 'boundary'].every(k => nonempty(t[k])) && ['recommended', 'optional', 'prepare'].includes(t.status) && Array.isArray(t.docs) && t.docs.every(id => bySource.has(id)) && (t.docs.length > 0 || /^https:\/\//.test(t.url || '')));
  grouped('来源提供明确标题与HTTPS页面', sources, s => nonempty(s.title) && /^https:\/\//.test(s.url));
  grouped('工具页面包含全部场景操作与可检查产物', scenarios, s => hasId(toolHtml, s.id) && [s.title, s.goal, ...s.steps, ...s.outputs, ...s.checks, ...s.pitfalls].every(text => plain(toolHtml).includes(text)));
  const scenarioText = id => JSON.stringify(byScenario.get(id) || {});
  const includesAll = (text, patterns) => patterns.every(p => p.test(text));
  check('场景：文献训练有原始来源、检索和逐项核对', includesAll(scenarioText('literature'), [/原文|原始/, /检索/, /引用|引文/, /核对|核查|复核/]));
  check('场景：实验有环境、原始结果和可复查记录', includesAll(scenarioText('empirical'), [/环境/, /原始/, /配置|参数/, /日志|记录/, /复现|复查|重跑/]));
  check('场景：工程实现以需求、实际测试和缺陷为依据', includesAll(scenarioText('software'), [/需求/, /测试/, /缺陷|失败|错误/, /版本|提交/]));
  check('场景：AI研究记录模型与提示，核实输出和数据权限', includesAll(scenarioText('ai'), [/模型/, /提示/, /核查|核对|复核|验证/, /隐私|授权|敏感|受限/]));
  check('场景：写作和汇报要求版本、实测演示与证据', includesAll(scenarioText('writing'), [/引用|文献/, /版本|修订/, /核对|核查|检查/]) && includesAll(scenarioText('collaboration'), [/版本|提交/, /试放|实际设备/, /证据/, /回执/]));
  check('场景：管理与归档有任务记录、权限和恢复核验', includesAll(scenarioText('management'), [/任务/, /权限|授权/, /恢复/, /复查|检查/, /记录|产物|证据/]));
  const publicText = [read('assets/data/workflows.json'), read('assets/data/research-tools.json'), flowHtml, toolHtml, handbook, ...flows.flatMap(f => ['svg', 'drawio'].map(ext => read(`assets/diagrams/${f.id}.${ext}`)))].join('\n');
  check('公开内容没有本机路径、账号目录或安装盘点', !/(?:\/Users\/|\/Applications\/|\/private\/|file:\/\/|C:\\Users\\|安装盘点结果|本机已安装清单|[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,})/.test(publicText));
  check('流程保留校本顺序、正式审核和授位边界', includesAll(JSON.stringify(flows.find(f => f.track === 'master')) + flowHtml, [/学校|学院|校本/, /预答辩/, /学位授予|授位/, /正式|核对/]));
  const doctorFlow = flows.find(f => f.track === 'doctor');
  check('博士流程保留资格考核、原创贡献和正式审核边界', doctorFlow && includesAll(JSON.stringify(doctorFlow), [/资格/, /原创|贡献/, /正式|学校|校本/, /整改|修订|调整/]));
  check('博士资格环节有实质判断和可返回的整改路线', doctorFlow && (() => {
    const qualification = doctorFlow.nodes.find(n => n.stage === 'qualification');
    if (!qualification) return false;
    const decisions = doctorFlow.nodes.filter(n => n.kind === 'decision');
    const decision = qualification.kind === 'decision' ? qualification : decisions.find(n => doctorFlow.edges.some(e => e.from === qualification.id && e.to === n.id));
    if (!decision) return false;
    const failure = doctorFlow.edges.find(e => e.from === decision.id && e.type === 'fail');
    return Boolean(failure && doctorFlow.nodes.some(n => n.id === failure.to && n.kind === 'remedy') && doctorFlow.edges.some(e => e.from === failure.to && e.type === 'return'));
  })());
  check('工具建议说明AI核查和受限材料使用边界', includesAll(toolHtml, [/AI/, /人工|核对|核查/, /未公开|敏感|受限/, /授权|获准|许可/]));
  const newPages = ['workflows.html', 'tools.html'];
  grouped('新增页面无重复锚点且站内链接均能解析', newPages, page => {
    const html = read(page);
    const ids = [...html.matchAll(/\bid=["']([^"']+)["']/g)].map(m => m[1]);
    return new Set(ids).size === ids.length && hrefs(html).every(h => localLinkValid(h, page));
  });
  grouped('新增页面无需远程脚本或远程嵌入渲染图', newPages, page => !/<(?:script|iframe)\b[^>]*(?:src|data-src)=["'](?:https?:)?\/\//i.test(read(page)) && !/mermaid\.live|kroki\.io|plantuml\.com\/plantuml/.test(read(page)));
  grouped('离线手册保留全部流程的分支与核查信息', flows, f => handbook.includes(f.title) && handbook.includes(f.note) && f.nodes.every(n => handbook.includes(n.kind === 'remedy' ? n.detail : n.label)) && f.edges.filter(e => ['fail', 'return'].includes(e.type)).every(e => handbook.includes(e.label)) && /满足条件后|满足后继续/.test(handbook));
  grouped('离线手册包含全部工具场景与检查要求', scenarios, s => [s.title, s.goal, ...s.steps, ...s.outputs, ...s.checks].every(text => handbook.includes(text)));

  // Parse the downloadable artifacts rather than accepting filenames as evidence.
  const artifactProbe = String.raw`
import hashlib, json, pathlib, re, sys, xml.etree.ElementTree as ET, zipfile
root = pathlib.Path(sys.argv[1])
flows = json.loads((root/'assets/data/workflows.json').read_text())['flows']
errors = {'svg': [], 'drawio': [], 'bundle': [], 'handbook': []}
normalize = lambda text: re.sub(r'\s+', '', re.sub(r'<[^>]*>', '', text))
for flow in flows:
    key = flow['id']
    for extension in ('svg', 'drawio'):
        try:
            tree = ET.parse(root/f'assets/diagrams/{key}.{extension}')
            xml = tree.getroot()
            ids = [node.attrib['id'] for node in xml.iter() if 'id' in node.attrib]
            assert len(ids) == len(set(ids)), 'duplicate XML ids'
            assert not any(node.tag.split('}')[-1] in ('script', 'foreignObject') for node in xml.iter()), 'active or HTML-dependent content'
            if extension == 'svg':
                assert xml.tag.split('}')[-1] == 'svg' and 'viewBox' in xml.attrib, 'not a scalable SVG'
                texts = normalize(''.join(xml.itertext()))
                assert all(normalize(node['label']) in texts for node in flow['nodes']), 'node label missing from SVG'
                assert any(node.tag.split('}')[-1] in ('path', 'polyline', 'line') for node in xml.iter()), 'no visible connectors'
                assert any(node.tag.split('}')[-1] in ('title', 'desc') and node.text for node in xml.iter()), 'no accessible description'
                actual_nodes = [node.attrib.get('data-node-id') for node in xml.iter() if 'data-node-id' in node.attrib]
                assert set(actual_nodes) == {node['id'] for node in flow['nodes']} and len(actual_nodes) == len(flow['nodes']), 'SVG node identity mismatch'
                actual_edges = [(node.attrib.get('data-from'), node.attrib.get('data-to'), node.attrib.get('data-edge-type')) for node in xml.iter() if 'data-from' in node.attrib]
                expected_edges = [(edge['from'], edge['to'], edge['type']) for edge in flow['edges']]
                assert sorted(actual_edges) == sorted(expected_edges), 'SVG connectors differ from workflow'
                for node in xml.iter():
                    for attr, value in node.attrib.items():
                        if attr.split('}')[-1] == 'href':
                            assert value.startswith(('https://csma-graduation-projects.github.io/', '#')), 'unexpected remote or local-file reference'
            else:
                assert xml.tag == 'mxfile' and xml.find('.//mxGraphModel') is not None, 'not editable uncompressed draw.io XML'
                objects = {node.attrib.get('id'): node for node in xml.iter('object')}
                vertices = {node.attrib.get('id'): node for node in xml.iter('mxCell') if node.attrib.get('vertex') == '1' and 'id' in node.attrib}
                for identity, obj in objects.items():
                    cell = obj.find('mxCell')
                    if cell is not None and cell.attrib.get('vertex') == '1': vertices[identity] = cell
                edges = [node for node in xml.iter('mxCell') if node.attrib.get('edge') == '1']
                node_ids = {node['id'] for node in flow['nodes']}
                assert node_ids <= set(vertices), 'draw.io workflow vertex missing'
                assert len(edges) == len(flow['edges']), 'draw.io edge count differs from workflow'
                assert sorted((edge.attrib.get('source'), edge.attrib.get('target')) for edge in edges) == sorted((edge['from'], edge['to']) for edge in flow['edges']), 'draw.io connectors differ from workflow'
                for expected in flow['edges']:
                    edge = next(edge for edge in edges if edge.attrib.get('source') == expected['from'] and edge.attrib.get('target') == expected['to'])
                    if expected['type'] != 'next': assert expected['label'] == edge.attrib.get('value'), 'draw.io branch label missing or different'
                    if expected['type'] == 'return': assert 'dashed=1' in edge.attrib.get('style', ''), 'draw.io return route is not distinguished'
                for node in flow['nodes']:
                    cell = vertices[node['id']]
                    label = objects[node['id']].attrib.get('label', '') if node['id'] in objects else cell.attrib.get('value', '')
                    assert normalize(node['label']) in normalize(label) and normalize(node['detail']) in normalize(label), 'node label or detail missing from draw.io'
                    geometry = cell.find('mxGeometry')
                    assert geometry is not None and float(geometry.attrib.get('width', '0')) > 0 and float(geometry.attrib.get('height', '0')) > 0, 'unpositioned draw.io vertex'
        except Exception as error:
            errors[extension].append(f'{key}: {error}')
try:
    with zipfile.ZipFile(root/'assets/downloads/csma-workflow-diagrams.zip') as archive:
        names = archive.namelist()
        assert archive.testzip() is None and len(names) == len(set(names)), 'CRC or duplicate entries'
        assert len(names) == 2*len(flows)+2, 'expected two formats per diagram, README and SHA256SUMS'
        expected = {}
        for flow in flows:
            for ext in ('svg', 'drawio'):
                basename = flow['id']+'.'+ext
                matches = [name for name in names if pathlib.PurePosixPath(name).name == basename]
                assert len(matches) == 1, 'missing or duplicate '+basename
                name = matches[0]
                assert not name.startswith('/') and '..' not in pathlib.PurePosixPath(name).parts, 'unsafe ZIP path'
                expected[name] = (root/'assets/diagrams'/basename).read_bytes()
                assert archive.read(name) == expected[name], 'bundle/source mismatch: '+basename
        checksum_name = next(name for name in names if pathlib.PurePosixPath(name).name == 'SHA256SUMS')
        lines = archive.read(checksum_name).decode().splitlines()
        assert len(lines) == 2*len(flows)+1, 'expected hash for each diagram file and README'
        checked = set()
        for line in lines:
            digest, name = line.split('  ', 1)
            assert name in names and name not in checked and name != checksum_name, 'invalid manifest entry'
            assert hashlib.sha256(archive.read(name)).hexdigest() == digest, 'hash mismatch: '+name
            checked.add(name)
        assert checked == set(names)-{checksum_name}, 'hash manifest incomplete'
except Exception as error:
    errors['bundle'].append(str(error))
try:
    with zipfile.ZipFile(root/'assets/downloads/csma-training-templates.zip') as archive:
        assert archive.read('training-handbook.md') == (root/'assets/downloads/training-handbook.md').read_bytes(), 'template ZIP handbook is stale'
except Exception as error:
    errors['handbook'].append(str(error))
print(json.dumps(errors, ensure_ascii=False))
`;
  const artifact = JSON.parse(execFileSync('python3', ['-c', artifactProbe, root], { encoding: 'utf8', maxBuffer: 2 * 1024 * 1024 }));
  for (const [key, label] of [['svg', '十一份SVG可解析且内容、连线与说明真实存在'], ['drawio', '十一份draw.io包含可编辑节点及完整连接'], ['bundle', '流程图ZIP真实完整，文件与23项哈希一致'], ['handbook', '模板ZIP内手册与当前完整手册字节一致']]) {
    check(label, artifact[key].length === 0, artifact[key].join('; '));
  }
} catch (error) {
  check('流程与工具验证器完整运行', false, error.stack || String(error));
}

const summary = { generatedAt: new Date().toISOString(), scope: process.argv.includes('--build') ? 'jekyll-build' : 'source', assertions: results.length, passed: results.filter(r => r.ok).length, failed: results.filter(r => !r.ok).length, checks: results };
console.log(`\nWorkflow and tool acceptance: ${summary.passed}/${summary.assertions} checks passed.`);
console.log('边界：结构和任务证据检查不替代浏览器视觉核验、draw.io应用实际导入或校方正式审核。');
if (process.env.CSMA_WORKFLOW_VALIDATION_REPORT) {
  const destination = path.resolve(process.env.CSMA_WORKFLOW_VALIDATION_REPORT);
  fs.mkdirSync(path.dirname(destination), { recursive: true });
  fs.writeFileSync(destination, JSON.stringify(summary, null, 2) + '\n');
}
if (summary.failed) process.exitCode = 1;
