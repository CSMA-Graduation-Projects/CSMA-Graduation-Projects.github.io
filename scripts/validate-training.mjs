#!/usr/bin/env node
// Independent acceptance checks for the public training guides and real templates.
// Run after build-training.py. No browser, network, npm package or Git write is needed.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const results = [];
const expectedTracks = {
  research: { page: 'undergraduate-research.html', count: 7 },
  bachelor: { page: 'bachelor.html', count: 8 },
  competition: { page: 'competition.html', count: 6 },
  master: { page: 'master.html', count: 13 },
};
const expectedTemplateIds = ['onboarding', 'topic', 'literature', 'reading', 'proposal', 'experiment', 'weekly', 'meeting', 'midterm', 'thesis', 'outcomes', 'integrity', 'review-response', 'defense', 'archive', 'handover', 'competition', 'research-task', 'change-request', 'annual-check', 'ai-use', 'professional-practice', 'engineering-report', 'bachelor-task'];
const expectedMasterStages = ['orientation', 'topic', 'survey', 'proposal', 'research', 'midterm', 'writing', 'outcomes', 'integrity', 'review', 'defense', 'final', 'archive'];
const categories = new Set(['入门与计划', '研究与过程', '论文与毕业', '协作与归档']);
const nonempty = value => typeof value === 'string' && value.trim().length > 0;
const read = relative => fs.readFileSync(path.join(root, relative), 'utf8');
const decode = text => text.replace(/&amp;/g, '&').replace(/&quot;/g, '"').replace(/&#(?:39|x27);/g, "'").replace(/&lt;/g, '<').replace(/&gt;/g, '>');
const htmlText = html => decode(html.replace(/<[^>]*>/g, ' ')).replace(/\s+/g, ' ').trim();
const escape = text => text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const hasId = (html, id) => new RegExp(`\\bid=["']${escape(id)}["']`).test(html);
const sameMembers = (a, b) => a.length === b.length && [...a].sort().every((x, i) => x === [...b].sort()[i]);
function check(label, ok, detail = '') {
  results.push({ label, ok: Boolean(ok), detail });
  console.log(`${ok ? 'PASS' : 'FAIL'} ${label}${detail ? ` — ${detail}` : ''}`);
}
function grouped(label, values, test) {
  const failed = values.filter(item => !test(item)).map(item => item.id || String(item));
  check(label, !failed.length, failed.length ? failed.join(', ') : `${values.length} 项`);
}
function article(html, id) {
  const match = html.match(new RegExp(`<article\\b(?=[^>]*\\bid=["']${escape(id)}["'])[^>]*>[\\s\\S]*?<\\/article>`, 'i'));
  return match?.[0] || '';
}
function links(html) { return [...html.matchAll(/\bhref=["']([^"']+)["']/g)].map(match => decode(match[1])); }
function loadJson(file) {
  try { return JSON.parse(read(file)); }
  catch (error) { check(`读取 ${file}`, false, error.message); return null; }
}

try {
  const pathways = loadJson('assets/data/pathways.json');
  const manifest = loadJson('assets/data/templates.json');
  if (!pathways || !manifest) throw new Error('数据文件无法读取，后续验收不能运行。');
  const tracks = pathways.tracks || [];
  const templates = manifest.templates || [];
  check('数据版本与顶层结构', Array.isArray(tracks) && Array.isArray(templates) && /^\d{4}-\d{2}-\d{2}$/.test(pathways.updated || '') && /^\d{4}-\d{2}-\d{2}$/.test(manifest.updated || ''));
  check('四条培养路径齐全且没有重复', sameMembers(tracks.map(x => x.id), Object.keys(expectedTracks)));
  check('34 个阶段及各路径数量', tracks.reduce((n, t) => n + (t.stages?.length || 0), 0) === 34 && tracks.every(t => t.stages?.length === expectedTracks[t.id]?.count));
  const master = tracks.find(t => t.id === 'master');
  check('硕士 13 个正式阶段完整且顺序清楚', JSON.stringify(master?.stages.map(s => s.id)) === JSON.stringify(expectedMasterStages));
  grouped('路径说明、适用对象、时间边界与真实页面', tracks, t => ['id', 'title', 'subtitle', 'audience', 'duration', 'note', 'page'].every(key => nonempty(t[key])) && t.page === expectedTracks[t.id]?.page && fs.existsSync(path.join(root, t.page)));
  const stages = tracks.flatMap(t => (t.stages || []).map(s => ({ ...s, id: `${t.id}/${s.id}`, stageId: s.id, track: t })));
  grouped('阶段字段、行动数量与可验收结构', stages, s => ['title', 'timing', 'goal', 'failure', 'next'].every(key => nonempty(s[key])) && [['entry', 1, 3], ['actions', 3, 5], ['deliverables', 2, 4], ['review', 2, 4]].every(([key, min, max]) => Array.isArray(s[key]) && s[key].length >= min && s[key].length <= max && s[key].every(nonempty)) && Array.isArray(s.templates) && s.templates.length > 0);
  grouped('阶段 ID 在各自路径内唯一', tracks, t => new Set(t.stages.map(s => s.id)).size === t.stages.length && t.stages.every(s => /^[a-z][a-z0-9-]*$/.test(s.id)));
  check('24 份模板 ID 完整、唯一', sameMembers(templates.map(t => t.id), expectedTemplateIds));
  grouped('模板元数据与分类完整', templates, t => ['id', 'title', 'category', 'audience', 'stage', 'description', 'file'].every(key => nonempty(t[key])) && categories.has(t.category));
  check('模板分类覆盖四类', new Set(templates.map(t => t.category)).size === 4);
  grouped('每份模板均指向安全的实际 Markdown 文件', templates, t => /^assets\/templates\/[a-z0-9-]+\.md$/.test(t.file || '') && fs.existsSync(path.join(root, t.file)) && fs.statSync(path.join(root, t.file)).isFile());
  check('模板文件不存在重复占位', new Set(templates.map(t => t.file)).size === 24);
  const contents = new Map(templates.filter(t => t.file && fs.existsSync(path.join(root, t.file))).map(t => [t.id, read(t.file)]));
  grouped('模板正文可填写，包含具体字段及检查语义', templates, t => {
    const body = contents.get(t.id) || '';
    return body.length >= 500 && /^#\s+\S/m.test(body) && (body.match(/^##\s+/gm) || []).length >= 3 && /填写|填报|使用说明/.test(body) && /验收|审核|复核|检查|确认/.test(body) && /待填写|待确认|待核实|\[ \]|____|填写：|填写:/.test(body);
  });
  check('模板正文没有整篇复用的假模板', new Set([...contents.values()].map(t => t.trim())).size === 24);
  grouped('所有阶段模板引用都可解析', stages, s => s.templates.every(id => contents.has(id)));
  check('24 份模板均进入实际培养阶段', sameMembers([...new Set(stages.flatMap(s => s.templates))], expectedTemplateIds));

  const pageHtml = new Map(tracks.map(t => [t.id, read(t.page)]));
  grouped('阶段锚点及静态正文真实存在', stages, s => {
    const section = article(pageHtml.get(s.track.id), s.stageId);
    const visible = htmlText(section);
    return section.includes('workflow-stage') && visible.includes(s.title) && visible.includes(s.goal) && s.actions.every(x => visible.includes(x)) && s.deliverables.every(x => visible.includes(x));
  });
  grouped('阶段对应模板链接与自检入口准确', stages, s => {
    const hrefs = links(article(pageHtml.get(s.track.id), s.stageId));
    return s.templates.every(id => hrefs.includes(`templates.html#${id}`)) && hrefs.includes(`planner.html?track=${s.track.id}&stage=${s.stageId}`);
  });
  grouped('阶段整改、验收与下一步可直接阅读', stages, s => {
    const visible = htmlText(article(pageHtml.get(s.track.id), s.stageId));
    return visible.includes(s.failure) && visible.includes(s.next) && s.review.every(x => visible.includes(x));
  });
  grouped('路径页没有重复 HTML ID', tracks, t => {
    const ids = [...pageHtml.get(t.id).matchAll(/\bid=["']([^"']+)["']/g)].map(m => m[1]);
    return new Set(ids).size === ids.length;
  });
  const templateHtml = read('templates.html');
  grouped('每份模板有独立锚点、真实下载与静态全文预览', templates, t => {
    const section = article(templateHtml, t.id);
    const preview = section.match(/<pre[^>]*>([\s\S]*?)<\/pre>/i)?.[1];
    return hasId(templateHtml, t.id) && links(section).includes(t.file) && /\bdownload(?:[\s=>])/.test(section) && preview && decode(preview).trim() === contents.get(t.id)?.trim();
  });
  check('全套模板与培养手册的下载入口真实', ['assets/downloads/csma-training-templates.zip', 'assets/downloads/training-handbook.md', 'assets/downloads/SHA256SUMS'].every(file => fs.existsSync(path.join(root, file)) && fs.statSync(path.join(root, file)).size > 0) && links(templateHtml).includes('assets/downloads/csma-training-templates.zip'));
  const home = read('index.html');
  check('首页可抵达四条路径、模板与阶段清单', [...tracks.map(t => t.page), 'templates.html', 'planner.html'].every(file => links(home).includes(file)));
  const planner = read('planner.html');
  check('自检页无脚本时仍可进入四条完整指南', /<noscript>/.test(planner) && tracks.every(t => links(planner).includes(t.page)));

  // User scenarios below check meaning independently of the HTML generator.
  const stageText = (track, stage) => JSON.stringify(tracks.find(t => t.id === track)?.stages.find(s => s.id === stage) || {});
  const containsAll = (text, patterns) => patterns.every(pattern => pattern.test(text));
  check('场景：学生选题有问题证据、贡献边界和失败退路', containsAll(stageText('master', 'topic'), [/真实|实际问题/, /贡献/, /资源/, /失败|停止/, /调整|换题|缩题/]) && contents.has('topic'));
  check('场景：综述有检索、筛选、比较与原始来源', containsAll(stageText('master', 'survey'), [/检索/, /筛选|纳入/, /比较/, /原始|原文/, /局限|相反证据/]) && contents.has('literature') && contents.has('reading'));
  check('场景：本科毕设连接任务书、需求设计、验证和论文', contents.has('bachelor-task') && contents.has('engineering-report') && containsAll(stageText('bachelor', 'design'), [/需求|问题/, /接口|数据流/, /测试|验证/]) && containsAll(stageText('bachelor', 'validation'), [/原始记录|实际结果/, /失败|缺陷/, /结论/]));
  check('场景：查非先核实校本定义，与查重和 AI 分开', containsAll(stageText('master', 'integrity'), [/查非/, /含义|对象|范围/, /本校|本校正式文件/, /独立|不能以一项通过代替/, /相似性/, /AI/, /分开保存/, /版本/]));
  check('场景：送审双版本、匿名核验、正式异议程序', containsAll(stageText('master', 'review'), [/完整保存版/, /匿名送审版/, /文件属性/, /回执/, /异议|申诉/, /期限/, /不私自|不.*联系评阅/]));
  check('场景：答辩有资格、意见处理，区分学位授予', containsAll(stageText('master', 'defense'), [/资格/, /正式答辩/, /修改/, /答辩通过不等于学位已经授予/]) && containsAll(stageText('master', 'final'), [/审核/, /回执/, /正式决定/]));
  check('场景：学硕专硕及专业实践有独立安排和证据', containsAll(JSON.stringify(master), [/学硕/, /专硕/, /实践基地/, /考核证据|实践报告/]) && contents.has('professional-practice') && /实践/.test(contents.get('professional-practice') || ''));
  check('场景：科研训练不以计划或截图代替实际完成', containsAll(JSON.stringify(tracks.find(t => t.id === 'research')), [/小任务/, /失败/, /复查/, /截图/, /引用/, /交接/]));
  check('场景：竞赛核实资格、预算、权属、回执及正式结果', containsAll(JSON.stringify(tracks.find(t => t.id === 'competition')), [/当届/, /资格/, /预算/, /权属/, /回执/, /官方/, /复盘/]));
  check('场景：归档能定位原始数据、恢复、复查与交接', containsAll(stageText('master', 'archive'), [/原始数据/, /代码/, /环境/, /日志/, /恢复/, /接收人/, /权限/, /遗留/]));
  const management = htmlText(read('management.html'));
  check('场景：日常管理包含任务、汇报、请假与反馈', containsAll(management, [/任务/, /周报/, /组会/, /请假/, /反馈/, /证据|记录/]));
  const policy = htmlText(read('policies.html'));
  check('场景：正式要求有校本核对而非全站统一阈值', containsAll(policy, [/校本|本校/, /学位/, /成果/, /日期|时间/, /通知|文件/, /核对|确认/]) && tracks.every(t => /学校|学院|规则|规定/.test(t.note + t.duration)));
  const handbook = read('assets/downloads/training-handbook.md');
  check('离线手册覆盖全部阶段及四条培养路径', tracks.every(t => handbook.includes(t.title) && t.stages.every(s => handbook.includes(s.title) && handbook.includes(s.goal))));
} catch (error) {
  check('验证器完整运行', false, error.stack || String(error));
}

const summary = { generatedAt: new Date().toISOString(), assertions: results.length, passed: results.filter(r => r.ok).length, failed: results.filter(r => !r.ok).length, checks: results };
console.log(`\nTraining acceptance: ${summary.passed}/${summary.assertions} checks passed.`);
console.log('边界：语义检查验证关键执行要素；不替代校方资格认定、人工内容审阅或浏览器交互验证。ZIP 内部清单另行核验。');
if (process.env.CSMA_TRAINING_VALIDATION_REPORT) {
  const destination = path.resolve(process.env.CSMA_TRAINING_VALIDATION_REPORT);
  fs.mkdirSync(path.dirname(destination), { recursive: true });
  fs.writeFileSync(destination, JSON.stringify(summary, null, 2) + '\n');
}
if (summary.failed) process.exitCode = 1;
