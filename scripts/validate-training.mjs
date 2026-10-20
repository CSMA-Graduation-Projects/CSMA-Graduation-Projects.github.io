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
  doctor: { page: 'doctor.html', count: 11 },
};
const expectedTemplateIds = ['onboarding', 'topic', 'literature', 'reading', 'proposal', 'experiment', 'weekly', 'meeting', 'midterm', 'thesis', 'outcomes', 'integrity', 'review-response', 'defense', 'archive', 'handover', 'competition', 'research-task', 'change-request', 'annual-check', 'ai-use', 'professional-practice', 'engineering-report', 'bachelor-task', 'learning-review', 'joint-training-plan', 'joint-training-recognition', 'collaboration-interest'];
const expectedMasterStages = ['orientation', 'topic', 'survey', 'proposal', 'research', 'midterm', 'writing', 'outcomes', 'integrity', 'review', 'defense', 'final', 'archive'];
const expectedDoctorStages = ['orientation', 'foundation', 'qualification', 'proposal', 'research', 'annual-review', 'contributions', 'writing', 'review', 'defense', 'archive'];
const growthKeys = ['capabilities', 'starting_check', 'student_role', 'support_role', 'feedback', 'transition'];
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
  check('五条培养路径齐全且没有重复', sameMembers(tracks.map(x => x.id), Object.keys(expectedTracks)));
  check('45 个阶段及各路径数量', tracks.reduce((n, t) => n + (t.stages?.length || 0), 0) === 45 && tracks.every(t => t.stages?.length === expectedTracks[t.id]?.count));
  const master = tracks.find(t => t.id === 'master');
  const doctor = tracks.find(t => t.id === 'doctor');
  check('硕士 13 个正式阶段完整且顺序清楚', JSON.stringify(master?.stages.map(s => s.id)) === JSON.stringify(expectedMasterStages));
  check('博士 11 个培养阶段完整且顺序清楚', JSON.stringify(doctor?.stages.map(s => s.id)) === JSON.stringify(expectedDoctorStages));
  grouped('路径说明、适用对象、时间边界与真实页面', tracks, t => ['id', 'title', 'subtitle', 'audience', 'duration', 'note', 'page'].every(key => nonempty(t[key])) && t.page === expectedTracks[t.id]?.page && fs.existsSync(path.join(root, t.page)));
  grouped('各路径明确能力目标、入门诊断、双方责任和成长衔接', tracks, t => {
    const growth = t.growth;
    return growth && sameMembers(Object.keys(growth), growthKeys) && ['capabilities', 'starting_check'].every(key => Array.isArray(growth[key]) && growth[key].length === 3 && growth[key].every(nonempty)) && ['student_role', 'support_role', 'feedback', 'transition'].every(key => nonempty(growth[key]));
  });
  const stages = tracks.flatMap(t => (t.stages || []).map(s => ({ ...s, id: `${t.id}/${s.id}`, stageId: s.id, track: t })));
  grouped('阶段字段、行动数量与可验收结构', stages, s => ['title', 'timing', 'goal', 'failure', 'next'].every(key => nonempty(s[key])) && [['entry', 1, 3], ['actions', 3, 5], ['deliverables', 2, 4], ['review', 2, 4]].every(([key, min, max]) => Array.isArray(s[key]) && s[key].length >= min && s[key].length <= max && s[key].every(nonempty)) && Array.isArray(s.templates) && s.templates.length > 0);
  grouped('阶段 ID 在各自路径内唯一', tracks, t => new Set(t.stages.map(s => s.id)).size === t.stages.length && t.stages.every(s => /^[a-z][a-z0-9-]*$/.test(s.id)));
  check('28 份模板 ID 完整、唯一', sameMembers(templates.map(t => t.id), expectedTemplateIds));
  grouped('模板元数据与分类完整', templates, t => ['id', 'title', 'category', 'audience', 'stage', 'description', 'file'].every(key => nonempty(t[key])) && categories.has(t.category));
  check('模板分类覆盖四类', new Set(templates.map(t => t.category)).size === 4);
  grouped('每份模板均指向安全的实际 Markdown 文件', templates, t => /^assets\/templates\/[a-z0-9-]+\.md$/.test(t.file || '') && fs.existsSync(path.join(root, t.file)) && fs.statSync(path.join(root, t.file)).isFile());
  check('模板文件不存在重复占位', new Set(templates.map(t => t.file)).size === expectedTemplateIds.length);
  const contents = new Map(templates.filter(t => t.file && fs.existsSync(path.join(root, t.file))).map(t => [t.id, read(t.file)]));
  grouped('模板正文可填写，包含具体字段及检查语义', templates, t => {
    const body = contents.get(t.id) || '';
    return body.length >= 500 && /^#\s+\S/m.test(body) && (body.match(/^##\s+/gm) || []).length >= 3 && /填写|填报|使用说明/.test(body) && /验收|审核|复核|检查|确认/.test(body) && /待填写|待确认|待核实|待讨论|\[ \]|____|填写：|填写:/.test(body);
  });
  check('模板正文没有整篇复用的假模板', new Set([...contents.values()].map(t => t.trim())).size === expectedTemplateIds.length);
  grouped('所有阶段模板引用都可解析', stages, s => s.templates.every(id => contents.has(id)));
  check('25 份模板均进入实际培养阶段', sameMembers([...new Set(stages.flatMap(s => s.templates))], expectedTemplateIds.filter(id => !id.startsWith('joint-training-') && id !== 'collaboration-interest')));

  const jointHtml = read('joint-training.html');
  check('两份联培模板直接服务跨校培养指南', ['joint-training-plan', 'joint-training-recognition'].every(id => contents.has(id) && links(jointHtml).includes(`templates.html#${id}`)));
  check('联培指南保留接收派出、分层指导与正式认定的可达章节', ['start','types','roles','stages','levels','coordination','outcomes','closure','sources'].every(id => hasId(jointHtml,id)));
  check('五条路径均可进入联合培养指南', tracks.every(t => links(read(t.page)).includes('joint-training.html#levels')));
  const collaborationHtml = read('research-collaboration.html');
  check('首次合作入口连接真实公开联系、可填写意向与后续指导', ['https://h-jp.github.io/', 'templates.html#collaboration-interest', 'templates.html#research-task', 'templates.html#learning-review', 'joint-training.html'].every(h => links(collaborationHtml).includes(h)) && contents.has('collaboration-interest'));
  check('从首页、联培及五条路径均能发现科研与竞赛合作', ['index.html', 'joint-training.html', ...tracks.map(t => t.page)].every(p => links(read(p)).includes('research-collaboration.html')));
  check('合作指南保留分层起点、首次联系、任务与后续选择', ['welcome','directions','formats','fit','contact','getting-started','first-task','next','questions'].every(id => hasId(collaborationHtml,id)) && /本科生/.test(collaborationHtml) && /硕士生/.test(collaborationHtml) && /博士生/.test(collaborationHtml));
  const pageHtml = new Map(tracks.map(t => [t.id, read(t.page)]));
  grouped('完整成长说明在路径页面直接可读', tracks, t => {
    const visible = htmlText(pageHtml.get(t.id));
    return t.growth && Object.values(t.growth).flat().every(text => nonempty(text) && visible.includes(text));
  });
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
  check('首页可抵达五条路径、学习指南、模板与阶段清单', [...tracks.map(t => t.page), 'learning.html', 'templates.html', 'planner.html'].every(file => links(home).includes(file)));
  const planner = read('planner.html');
  check('自检页无脚本时仍可进入五条完整指南', /<noscript>/.test(planner) && tracks.every(t => links(planner).includes(t.page)));

  // User scenarios below check meaning independently of the HTML generator.
  const stageText = (track, stage) => JSON.stringify(tracks.find(t => t.id === track)?.stages.find(s => s.id === stage) || {});
  const containsAll = (text, patterns) => patterns.every(pattern => pattern.test(text));
  grouped('入门诊断要求实际材料而非自报熟练度', tracks, t => t.growth && t.growth.starting_check.every(text => /作品|练习|报错|原文|通知|条件|验证|规则|记录|比较|方案|证据|文献|文件|论证|结果/.test(text)));
  grouped('学生主动求助、指导者支持和反馈复查有明确动作', tracks, t => t.growth && containsAll(t.growth.student_role, [/主动|队长主动/, /求助|确认|提出|请求|复核|报告/]) && containsAll(t.growth.feedback, [/证据|实际|问题|结果|主张/, /复查|复核|重测|重跑/, /修改|修订|调整|改进/]));
  check('成长目标区分入门、综合工程、团队协作、研究与原创贡献', tracks.every(t => {
    const patterns = { research: [/给定|小问题/, /复查/, /反馈/], bachelor: [/需求/, /设计/, /测试/], competition: [/规则/, /团队/, /贡献/], master: [/研究问题/, /对照/, /论文/], doctor: [/原创/, /主线/, /独立判断/] }[t.id];
    return patterns && containsAll(JSON.stringify(t.growth?.capabilities || []), patterns);
  }));
  grouped('跨路径迁移交代新要求而不自动替代正式资格', tracks, t => t.growth && /重新|新(?:的)?问题|下一层级|原创贡献/.test(t.growth.transition) && /不自动|不.*自动|分别记录/.test(t.growth.transition));
  check('场景：学生选题有问题证据、贡献边界和失败退路', containsAll(stageText('master', 'topic'), [/真实|实际问题/, /贡献/, /资源/, /失败|停止/, /调整|换题|缩题/]) && contents.has('topic'));
  check('场景：综述有检索、筛选、比较与原始来源', containsAll(stageText('master', 'survey'), [/检索/, /筛选|纳入/, /比较/, /原始|原文/, /局限|相反证据/]) && contents.has('literature') && contents.has('reading'));
  check('场景：本科毕设连接任务书、需求设计、验证和论文', contents.has('bachelor-task') && contents.has('engineering-report') && containsAll(stageText('bachelor', 'design'), [/需求|问题/, /接口|数据流/, /测试|验证/]) && containsAll(stageText('bachelor', 'validation'), [/原始记录|实际结果/, /失败|缺陷/, /结论/]));
  check('场景：查非先核实校本定义，与查重和 AI 分开', containsAll(stageText('master', 'integrity'), [/查非/, /含义|对象|范围/, /本校|本校正式文件/, /独立|不能以一项通过代替/, /相似性/, /AI/, /分开保存/, /版本/]));
  check('场景：送审双版本、匿名核验、正式异议程序', containsAll(stageText('master', 'review'), [/完整保存版/, /匿名送审版/, /文件属性/, /回执/, /异议|申诉/, /期限/, /不私自|不.*联系评阅/]));
  check('场景：答辩有资格、意见处理，区分学位授予', containsAll(stageText('master', 'defense'), [/资格/, /正式答辩/, /修改/, /答辩通过不等于学位已经授予/]) && containsAll(stageText('master', 'final'), [/审核/, /回执/, /正式决定/]));
  check('场景：学硕专硕及专业实践有独立安排和证据', containsAll(JSON.stringify(master), [/学硕/, /专硕/, /实践基地/, /考核证据|实践报告/]) && contents.has('professional-practice') && /实践/.test(contents.get('professional-practice') || ''));
  check('场景：科研训练不以计划或截图代替实际完成', containsAll(JSON.stringify(tracks.find(t => t.id === 'research')), [/小任务/, /失败/, /复查/, /截图/, /引用/, /交接/]));
  check('场景：竞赛核实资格、预算、权属、回执及正式结果', containsAll(JSON.stringify(tracks.find(t => t.id === 'competition')), [/当届/, /资格/, /预算/, /权属/, /回执/, /官方/, /复盘/]));
  check('场景：博士建立独立研究能力与原创贡献证据', containsAll(JSON.stringify(doctor), [/独立/, /原创/, /主线|研究问题/, /证据/, /局限|边界/, /反例|反证|相反|推翻|异议/]));
  check('场景：博士资格考核依据校本条件并有正式结果与整改', containsAll(stageText('doctor', 'qualification'), [/资格/, /学校|学院|校本|培养方案/, /正式|规定/, /结果|结论/, /整改|补充|重考|复审|未通过/]));
  check('场景：博士持续检查研究主线、贡献和学位条件', containsAll(stageText('doctor', 'annual-review'), [/年度|中期/, /主线|研究|问题/, /证据|材料/, /调整|整改|修订/]) && containsAll(stageText('doctor', 'contributions'), [/贡献/, /原创|创新/, /成果/, /要求|条件|认定/, /学校|正式|规定/]));
  check('场景：博士送审答辩与资料交接使用正式程序及真实证据', containsAll(stageText('doctor', 'review'), [/评阅|送审/, /匿名/, /意见/, /正式|学校/, /修改|复审/]) && containsAll(stageText('doctor', 'defense'), [/资格/, /答辩/, /学位/, /正式|规定/]) && containsAll(stageText('doctor', 'archive'), [/原始|数据/, /恢复|复查|复核/, /交接|接收/, /权限|授权/]));
  check('场景：归档能定位原始数据、恢复、复查与交接', containsAll(stageText('master', 'archive'), [/原始数据/, /代码/, /环境/, /日志/, /恢复/, /接收人/, /权限/, /遗留/]));
  const management = htmlText(read('management.html'));
  check('场景：日常管理包含任务、汇报、请假与反馈', containsAll(management, [/任务/, /周报/, /组会/, /请假/, /反馈/, /证据|记录/]));
  const policy = htmlText(read('policies.html'));
  check('场景：正式要求有校本核对而非全站统一阈值', containsAll(policy, [/校本|本校/, /学位/, /成果/, /日期|时间/, /通知|文件/, /核对|确认/]) && tracks.every(t => /学校|学院|规则|规定/.test(t.note + t.duration)));
  const learning = htmlText(read('learning.html'));
  check('自主学习指南有诊断、计划、证据、反馈和迁移闭环', containsAll(learning, [/诊断|起点|基础/, /计划|任务/, /证据/, /反馈/, /复核|复查/, /迁移|下一阶段/]) && links(read('learning.html')).includes('templates.html#learning-review'));
  check('成长复盘模板记录能力证据、行动与复核', containsAll(contents.get('learning-review') || '', [/能力|学习/, /证据/, /反馈/, /行动|任务/, /复核|复查/, /迁移|下一阶段/]));
  const handbook = read('assets/downloads/training-handbook.md');
  check('离线手册覆盖全部阶段及五条培养路径', tracks.every(t => handbook.includes(t.title) && t.stages.every(s => handbook.includes(s.title) && handbook.includes(s.goal))));
  check('离线手册保留各层级完整成长说明', tracks.every(t => t.growth && Object.values(t.growth).flat().every(text => handbook.includes(text))));
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
