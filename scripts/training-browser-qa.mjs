#!/usr/bin/env node
// Real-browser acceptance tests. Uses only Node built-ins and an isolated Chrome profile.
// Run with a local site already served; this script never opens the user's Chrome profile.
import { spawn } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';

const chromeBinary = process.env.CSMA_QA_CHROME || '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const baseUrl = (process.env.CSMA_QA_BASE_URL || 'http://127.0.0.1:8766').replace(/\/$/, '');
const qaRoot = process.env.CSMA_QA_OUTPUT || '/private/tmp/csma-training-qa';
const runId = `${Date.now()}-${process.pid}`;
const profileRoot = path.join(qaRoot, `chrome-profile-${runId}`);
const downloadRoot = path.join(qaRoot, `downloads-${runId}`);
const checks = [], runtimeErrors = [], infrastructureNotes = [];
const downloadRecords = new Map();
const stateKey = 'csma-training-stage-v1:master:review';
let chrome, client, browserClient, port, target, activeUrl = '', storageInjection;
let chromeStderr = '';
const delay = ms => new Promise(resolve => setTimeout(resolve, ms));
function record(ok, message, detail = '') {
  checks.push({ ok: Boolean(ok), message, detail });
  console.log(`${ok ? 'PASS' : 'FAIL'} ${message}${detail ? ` — ${detail}` : ''}`);
}
async function poll(test, label, timeout = 12000) {
  const start = Date.now();
  while (Date.now() - start < timeout) {
    const result = await test();
    if (result) return result;
    await delay(80);
  }
  throw new Error(`Timeout: ${label}`);
}
function connect(url) {
  return new Promise((resolve, reject) => {
    const socket = new WebSocket(url), pending = new Map(), listeners = new Map();
    let nextId = 1;
    const startup = setTimeout(() => reject(new Error('CDP connection timeout')), 15000);
    socket.addEventListener('error', () => reject(new Error('CDP WebSocket failed')), { once: true });
    socket.addEventListener('open', () => {
      clearTimeout(startup);
      socket.addEventListener('message', event => {
        const message = JSON.parse(event.data);
        if (message.id) {
          const entry = pending.get(message.id);
          if (!entry) return;
          pending.delete(message.id); clearTimeout(entry.timer);
          if (message.error) entry.reject(new Error(`${entry.method}: ${message.error.message}`));
          else entry.resolve(message.result);
        } else for (const listener of listeners.get(message.method) || []) listener(message.params);
      });
      resolve({
        send(method, params = {}) {
          return new Promise((resolveCommand, rejectCommand) => {
            const id = nextId++;
            const timer = setTimeout(() => { pending.delete(id); rejectCommand(new Error(`CDP timeout: ${method}`)); }, 15000);
            pending.set(id, { resolve: resolveCommand, reject: rejectCommand, timer, method });
            socket.send(JSON.stringify({ id, method, params }));
          });
        },
        on(method, listener) { listeners.set(method, [...(listeners.get(method) || []), listener]); },
        close() { for (const entry of pending.values()) clearTimeout(entry.timer); socket.close(); },
      });
    }, { once: true });
  });
}
async function evaluate(expression, awaitPromise = false) {
  const response = await client.send('Runtime.evaluate', { expression, returnByValue: true, awaitPromise, userGesture: true });
  if (response.exceptionDetails) throw new Error(response.exceptionDetails.exception?.description || response.exceptionDetails.text || 'Browser evaluation failed');
  return response.result.value;
}
async function waitFor(expression, label) {
  return poll(async () => {
    try { return await evaluate(expression); }
    catch (error) {
      if (/Execution context was destroyed|Cannot find context|Inspected target navigated/i.test(error.message)) return false;
      throw error;
    }
  }, label);
}
async function navigate(relative) {
  activeUrl = new URL(relative, baseUrl + '/').href;
  const response = await client.send('Page.navigate', { url: activeUrl });
  if (response.errorText) throw new Error(`${activeUrl}: ${response.errorText}`);
  await waitFor(`document.readyState === 'complete' && location.pathname === ${JSON.stringify(new URL(activeUrl).pathname)}`, `load ${relative}`);
  await delay(120);
}
async function plannerReady() { await waitFor(`document.querySelectorAll('#planner-result input[type=checkbox]').length > 0 && !document.querySelector('#planner-controls').hidden`, 'planner rendered'); }
async function select(selector, value) {
  await evaluate(`(() => { const input = document.querySelector(${JSON.stringify(selector)}); input.value = ${JSON.stringify(value)}; input.dispatchEvent(new Event('change', { bubbles: true })); return true; })()`);
}
async function click(selector) {
  // Hash navigation can still be scrolling after the next page has loaded.
  // Require a stable, unobscured target before sending real mouse input; never
  // bypass an overlay with element.click() or accept coordinates from one frame.
  const startedAt = Date.now();
  let lastScrollAt = 0, previous, stableSamples = 0, diagnostic, point;
  const scrollToTarget = async () => {
    await evaluate(`(() => { const element=document.querySelector(${JSON.stringify(selector)}); if(element) element.scrollIntoView({block:'center',behavior:'instant'}); return Boolean(element); })()`);
    lastScrollAt = Date.now(); previous = null; stableSamples = 0;
  };
  const inspect = () => evaluate(`(() => {
    const element=document.querySelector(${JSON.stringify(selector)});
    const url=new URL(location.href);
    for(const key of [...url.searchParams.keys()]) if(!['track','stage'].includes(key)) url.searchParams.delete(key);
    const currentUrl=url.origin+url.pathname+url.search+url.hash;
    const describe=node=>node?{tag:node.tagName,id:node.id||'',class:typeof node.className==='string'?node.className:''}:null;
    if(!element) return {currentUrl,target:null,rect:null,hit:null,clickable:false};
    const r=element.getBoundingClientRect(),x=r.x+r.width/2,y=r.y+r.height/2;
    const hit=document.elementFromPoint(x,y),style=getComputedStyle(element);
    return {currentUrl,target:describe(element),rect:{x:r.x,y:r.y,width:r.width,height:r.height},point:{x,y},hit:describe(hit),
      clickable:r.width>0&&r.height>0&&x>=0&&y>=0&&x<innerWidth&&y<innerHeight&&!element.disabled&&style.visibility!=='hidden'&&(hit===element||element.contains(hit))};
  })()`);
  const sameRect = (a, b) => Boolean(a?.rect && b?.rect && a.currentUrl===b.currentUrl &&
    ['x','y','width','height'].every(key=>Math.abs(a.rect[key]-b.rect[key])<=0.5));
  await scrollToTarget();
  while (Date.now()-startedAt < 12000) {
    diagnostic = await inspect();
    stableSamples = diagnostic.clickable ? (previous?.clickable && sameRect(previous,diagnostic) ? stableSamples+1 : 1) : 0;
    previous = diagnostic;
    if (stableSamples >= 3) {
      await client.send('Input.dispatchMouseEvent', { type:'mouseMoved', ...diagnostic.point });
      await delay(40);
      const finalSample = await inspect();
      if (finalSample.clickable && sameRect(diagnostic,finalSample)) { point=finalSample.point; break; }
      diagnostic=finalSample; previous=finalSample; stableSamples=0;
    }
    // A delayed anchor scroll may move the target away again. Recenter after
    // allowing that animation to settle; persistent obstruction still fails.
    if (!diagnostic.clickable && Date.now()-lastScrollAt >= 500) await scrollToTarget();
    await delay(80);
  }
  if (!point) throw new Error(`Click target did not stabilize or remained covered: ${JSON.stringify({selector,...diagnostic})}`);
  await client.send('Input.dispatchMouseEvent', { type: 'mousePressed', button: 'left', clickCount: 1, ...point });
  await client.send('Input.dispatchMouseEvent', { type: 'mouseReleased', button: 'left', clickCount: 1, ...point });
  await delay(40);
}
async function screenshot(name) {
  const result = await client.send('Page.captureScreenshot', { format: 'png', fromSurface: true });
  fs.writeFileSync(path.join(qaRoot, name), Buffer.from(result.data, 'base64'));
}
async function downloadFrom(selector) {
  // The Chinese and English editions deliberately retain the same filenames.
  // Chrome's CDP "allow" behavior can overwrite an earlier download, so a new
  // directory entry is not reliable evidence that this click completed.
  const before = new Set(downloadRecords.keys());
  const expectedUrl = await evaluate(`document.querySelector(${JSON.stringify(selector)})?.href || null`);
  await click(selector);
  const started = await poll(() => [...downloadRecords.values()].find(item =>
    !before.has(item.guid) && (expectedUrl ? item.url === expectedUrl : item.url?.startsWith(`blob:${new URL(baseUrl).origin}/`))),
  `download event for ${expectedUrl || selector}`, 15000);
  return poll(() => {
    if (started.state === 'canceled') throw new Error(`Chrome canceled download ${started.suggestedFilename} (${started.guid})`);
    if (started.state !== 'completed') return null;
    const file = path.join(downloadRoot, started.guid);
    if (!fs.existsSync(file) || !fs.statSync(file).isFile() || fs.statSync(file).size === 0) return null;
    return { name: started.suggestedFilename, file, text: fs.readFileSync(file, 'utf8'), url: started.url, guid: started.guid };
  }, `completed GUID download ${started.suggestedFilename}`, 15000);
}
async function section(name, work) {
  try { await work(); }
  catch (error) { record(false, `${name}: 完整执行`, error.stack || error.message); }
}
async function filterTemplates(search, category) {
  await evaluate(`(() => { const search = document.querySelector('#template-search'); const category = document.querySelector('#template-category'); search.value=${JSON.stringify(search)}; category.value=${JSON.stringify(category)}; search.dispatchEvent(new Event('input',{bubbles:true})); category.dispatchEvent(new Event('change',{bubbles:true})); return true; })()`);
}

try {
  const preflight = await fetch(`${baseUrl}/assets/data/pathways.json`);
  if (!preflight.ok) throw new Error(`Serve the generated site first: ${baseUrl} (HTTP ${preflight.status})`);
  const pathways = await preflight.json();
  const manifestResponse = await fetch(`${baseUrl}/assets/data/templates.json`);
  if (!manifestResponse.ok) throw new Error('Template manifest is not served');
  const manifest = await manifestResponse.json();
  const review = pathways.tracks.find(t => t.id === 'master').stages.find(s => s.id === 'review');
  const expectedChecks = review.entry.length + review.deliverables.length + review.review.length;
  fs.mkdirSync(profileRoot, { recursive: true });
  fs.mkdirSync(downloadRoot, { recursive: true });
  // This new, disposable profile belongs only to this test run. Permit repeated
  // downloads here without changing any setting in the user's browser profile.
  fs.mkdirSync(path.join(profileRoot, 'Default'), { recursive: true });
  fs.writeFileSync(path.join(profileRoot, 'Default', 'Preferences'), JSON.stringify({ profile: { default_content_setting_values: { automatic_downloads: 1 } } }), { flag: 'wx' });
  chrome = spawn(chromeBinary, ['--headless=new', '--disable-gpu', '--disable-background-networking', '--disable-component-update', '--disable-default-apps', '--disable-extensions', '--disable-sync', '--no-default-browser-check', '--no-first-run', '--remote-debugging-address=127.0.0.1', '--remote-debugging-port=0', `--user-data-dir=${profileRoot}`, 'about:blank'], { stdio: ['ignore', 'ignore', 'pipe'] });
  let launchError;
  chrome.on('error', error => { launchError = error; });
  chrome.stderr.on('data', chunk => { if (chromeStderr.length < 16000) chromeStderr += chunk.toString(); });
  const portFile = path.join(profileRoot, 'DevToolsActivePort');
  await poll(() => { if (launchError) throw launchError; return fs.existsSync(portFile); }, 'isolated Chrome startup', 25000);
  port = Number(fs.readFileSync(portFile, 'utf8').split(/\r?\n/)[0]);
  const browserVersion = await (await fetch(`http://127.0.0.1:${port}/json/version`)).json();
  browserClient = await connect(browserVersion.webSocketDebuggerUrl);
  browserClient.on('Browser.downloadWillBegin', event => downloadRecords.set(event.guid, { ...event, state: 'inProgress' }));
  browserClient.on('Browser.downloadProgress', event => {
    const item = downloadRecords.get(event.guid);
    if (item) Object.assign(item, event);
  });
  await browserClient.send('Browser.setDownloadBehavior', { behavior: 'allowAndName', downloadPath: downloadRoot, eventsEnabled: true });
  const newTarget = await fetch(`http://127.0.0.1:${port}/json/new?about%3Ablank`, { method: 'PUT' });
  target = await newTarget.json();
  client = await connect(target.webSocketDebuggerUrl);
  await client.send('Page.enable');
  await client.send('Runtime.enable');
  await client.send('Emulation.setDeviceMetricsOverride', { width: 1440, height: 1000, deviceScaleFactor: 1, mobile: false });
  client.on('Runtime.exceptionThrown', event => runtimeErrors.push({ url: activeUrl, message: event.exceptionDetails?.exception?.description || event.exceptionDetails?.text || 'uncaught exception' }));
  client.on('Runtime.consoleAPICalled', event => { if (event.type === 'error' || event.type === 'assert') runtimeErrors.push({ url: activeUrl, message: `console.${event.type}: ${(event.args || []).map(x => x.value || x.description || '').join(' ')}` }); });

  await section('阶段清单与持久化', async () => {
    await navigate('planner.html?track=master&stage=review'); await plannerReady();
    record(await evaluate(`document.querySelector('#track-select').value === 'master' && document.querySelector('#stage-select').value === 'review' && document.querySelector('#planner-result h2').textContent.includes('送审')`), 'URL 直接打开硕士送审阶段');
    record(await evaluate(`document.querySelectorAll('#planner-result input[type=checkbox]').length === ${expectedChecks} && document.querySelector('#planner-result').textContent.includes('匿名')`), '清单包含进入、交付和验收的真实送审事项');
    await click('#check-0');
    record(await evaluate(`document.querySelector('#check-progress').value === 1 && document.querySelector('#check-progress-label').textContent.includes('1 /')`), '勾选后进度与标签同步');
    await select('#target-date', '2026-12-31');
    await navigate('planner.html?track=master&stage=review'); await plannerReady();
    record(await evaluate(`document.querySelector('#check-0').checked && document.querySelector('#check-progress').value === 1`), '刷新后保留阶段勾选');
    record(await evaluate(`document.querySelector('#target-date').value === '2026-12-31'`), '个人计划日期在刷新后保留');
    await select('#stage-select', 'writing');
    record(await evaluate(`document.querySelector('#check-progress').value === 0 && document.querySelector('#target-date').value === ''`), '切换阶段不串用勾选和日期');
    await click('#check-1'); await select('#target-date', '2027-01-15');
    await select('#stage-select', 'review');
    record(await evaluate(`document.querySelector('#check-0').checked && !document.querySelector('#check-1').checked && document.querySelector('#target-date').value === '2026-12-31'`), '返回原阶段恢复本阶段独立状态');
    const exported = await downloadFrom('#export-checklist');
    record(exported.name === 'csma-master-review-checklist.md', '导出生成真实 Markdown 下载文件', exported.name);
    record(exported.text.includes(review.title) && exported.text.includes('2026-12-31') && exported.text.includes('- [x]') && exported.text.includes('- [ ]') && exported.text.includes('不代表导师验收或学校审批') && exported.text.includes('master.html#review') && exported.text.includes('审核人/意见/正式结论'), '导出包含当前状态、日期、依据与待审核字段');
    await evaluate(`document.querySelectorAll('#planner-result input[type=checkbox]').forEach(input => { if (!input.checked) input.click(); }); true`);
    record(await evaluate(`document.querySelector('#check-completion').textContent.includes('不会认定阶段通过') && document.querySelector('#check-progress').value === ${expectedChecks}`), '全部勾选仍明确需要正式复核');
    await click('#reset-checklist');
    record(await evaluate(`!document.querySelector('#reset-confirmation').hidden && document.querySelector('#check-progress').value === ${expectedChecks}`), '重置先显示确认，未确认不丢失状态');
    await click('#reset-confirmation button:last-child');
    record(await evaluate(`document.querySelector('#reset-confirmation').hidden && document.querySelector('#check-progress').value === ${expectedChecks}`), '取消重置保留原清单');
    await click('#reset-checklist'); await click('#confirm-reset');
    record(await evaluate(`document.querySelector('#check-progress').value === 0 && document.querySelector('#target-date').value === ''`), '确认后仅清空本阶段勾选与日期');
    await select('#stage-select', 'writing');
    record(await evaluate(`document.querySelector('#check-1').checked && document.querySelector('#target-date').value === '2027-01-15'`), '重置送审阶段不影响论文写作阶段');
    await screenshot('planner-desktop.png');
  });

  await section('异常参数与存储降级', async () => {
    await navigate('planner.html?track=does-not-exist&stage=invalid'); await plannerReady();
    record(await evaluate(`document.querySelector('#track-select').value === 'research' && document.querySelector('#stage-select').value === 'orientation' && new URL(location.href).searchParams.get('track') === 'research'`), '无效路径参数回退到有效默认路径并修正 URL');
    await navigate('planner.html?track=master&stage=selection'); await plannerReady();
    record(await evaluate(`document.querySelector('#track-select').value === 'master' && document.querySelector('#stage-select').value === 'orientation'`), '不属于所选路径的阶段参数安全回退');
    await evaluate(`localStorage.setItem(${JSON.stringify(stateKey)}, '{broken-json'); true`);
    await navigate('planner.html?track=master&stage=review'); await plannerReady();
    record(await evaluate(`document.querySelector('#check-progress').value === 0 && document.querySelector('#target-date').value === ''`), '损坏 localStorage 不阻塞清单，安全恢复空状态');
    await evaluate(`localStorage.setItem(${JSON.stringify(stateKey)}, JSON.stringify({signature:'obsolete-qa-version',checked:[true],date:'2026-01-01'})); true`);
    await navigate('planner.html?track=master&stage=review'); await plannerReady();
    record(await evaluate(`document.querySelector('#check-progress').value === 0 && document.querySelector('#storage-status').textContent.includes('已更新')`), '内容版本变化不沿用旧勾选，并说明原因');
    const injection = await client.send('Page.addScriptToEvaluateOnNewDocument', { source: `Object.defineProperty(window, 'localStorage', { configurable: true, get() { throw new DOMException('Blocked for acceptance test', 'SecurityError'); } });` });
    storageInjection = injection.identifier;
    try {
      await navigate('planner.html?track=master&stage=review'); await plannerReady();
      record(await evaluate(`document.querySelector('#storage-status').textContent.includes('未允许本地保存') && document.querySelectorAll('#planner-result input[type=checkbox]').length === ${expectedChecks}`), '禁止存储时仍能使用清单，并提示及时导出');
      await click('#check-0'); await select('#target-date', '2026-11-30');
      await select('#stage-select', 'writing'); await select('#stage-select', 'review');
      record(await evaluate(`document.querySelector('#check-0').checked && document.querySelector('#target-date').value === '2026-11-30'`), '禁止存储时同一页面内切换仍保留临时状态');
    } finally {
      await client.send('Page.removeScriptToEvaluateOnNewDocument', { identifier: storageInjection }); storageInjection = null;
    }
  });

  await section('模板筛选、复制与真实下载', async () => {
    await navigate('templates.html');
    await waitFor(`!document.querySelector('[data-template-filter]').hidden`, 'template filter enhancement');
    record(await evaluate(`document.querySelectorAll('[data-template-card]').length === 25 && [...document.querySelectorAll('[data-template-card]')].every(card => !card.hidden)`), '模板库实际呈现 25 份可用模板');
    await filterTemplates('实验', '研究与过程');
    record(await evaluate(`(() => { const cards=[...document.querySelectorAll('[data-template-card]')].filter(card=>!card.hidden); return cards.length > 0 && cards.some(card=>card.id==='experiment') && cards.every(card=>card.dataset.category==='研究与过程' && card.dataset.search.includes('实验')); })()`), '关键词与类别组合筛选返回匹配模板');
    await filterTemplates('不存在的模板QA-8766', '论文与毕业');
    record(await evaluate(`![...document.querySelectorAll('[data-template-card]')].some(card=>!card.hidden) && !document.querySelector('#template-empty').hidden && document.querySelector('#template-count').textContent.startsWith('0 /')`), '零结果有明确说明与重置入口');
    await click('[data-reset-filter]');
    record(await evaluate(`document.querySelector('#template-search').value === '' && document.querySelector('#template-category').value === '' && [...document.querySelectorAll('[data-template-card]')].every(card=>!card.hidden) && document.activeElement.id==='template-search'`), '重置筛选恢复全部模板并回到搜索框');
    await filterTemplates('不存在的模板QA-8766', '');
    await evaluate(`location.hash='#experiment'; true`);
    await waitFor(`!document.getElementById('experiment').hidden`, 'hidden template direct link');
    record(await evaluate(`document.querySelector('#template-search').value === '' && !document.getElementById('experiment').hidden`), '被筛选隐藏的模板可通过直接锚点重新打开');
    const template = manifest.templates.find(t => t.id === 'experiment');
    const response = await fetch(new URL(template.file, baseUrl + '/')); const expected = await response.text();
    const downloaded = await downloadFrom('#experiment a[download]');
    record(response.ok && downloaded.text === expected && /^#\s/m.test(downloaded.text), '模板下载确实得到完整源文件', downloaded.name);
    record(await evaluate(`document.querySelector('#experiment pre').textContent === ${JSON.stringify(expected)}`), '模板静态预览与下载全文一致');
    try { await client.send('Browser.grantPermissions', { origin: new URL(baseUrl).origin, permissions: ['clipboardReadWrite', 'clipboardSanitizedWrite'] }); }
    catch (error) { infrastructureNotes.push(`Clipboard permission grant unavailable: ${error.message}`); }
    await client.send('Page.bringToFront'); await click('#experiment [data-copy-template]');
    await waitFor(`document.querySelector('#copy-status').textContent.length > 0 && !document.querySelector('#experiment [data-copy-template]').disabled`, 'copy feedback');
    const copyStatus = await evaluate(`document.querySelector('#copy-status').textContent`);
    let copyVerified = false;
    if (copyStatus.includes('全文已复制')) {
      try { copyVerified = await evaluate(`navigator.clipboard.readText().then(value => value === ${JSON.stringify(expected)})`, true); }
      catch (error) { infrastructureNotes.push(`Clipboard readback: ${error.message}`); }
    } else copyVerified = copyStatus.includes('未允许复制') && await evaluate(`document.querySelector('#experiment details').open`);
    record(copyVerified, '复制全文成功且可核对，或给出可操作的权限失败提示', copyStatus);
    await evaluate(`Object.defineProperty(navigator, 'clipboard', { configurable:true, value: { writeText: () => Promise.reject(new DOMException('Denied for acceptance test','NotAllowedError')) } }); document.querySelector('#copy-status').textContent=''; true`);
    await click('#experiment [data-copy-template]');
    await waitFor(`document.querySelector('#copy-status').textContent.includes('未允许复制')`, 'copy denied fallback');
    record(await evaluate(`document.querySelector('#experiment details').open && !document.querySelector('#experiment [data-copy-template]').disabled && document.querySelector('#copy-status').textContent.includes('下载 Markdown')`), '模拟拒绝复制权限后展开预览并提供下载替代');
  });

  await section('无 JavaScript 使用', async () => {
    await client.send('Emulation.setScriptExecutionDisabled', { value: true });
    try {
      await navigate('templates.html');
      record(await evaluate(`document.querySelectorAll('[data-template-card] a[download]').length === 25 && [...document.querySelectorAll('[data-template-card] a[download]')].every(a=>a.getAttribute('href').startsWith('assets/templates/')) && document.querySelector('[data-template-filter]').hidden`), '关闭 JavaScript 后 25 个实际模板链接仍可用');
      const template = manifest.templates.find(t => t.id === 'topic');
      const response = await fetch(new URL(template.file, baseUrl + '/')); const expected = await response.text();
      const downloaded = await downloadFrom('#topic a[download]');
      record(response.ok && downloaded.text === expected, '关闭 JavaScript 后仍可实际下载完整模板', downloaded.name);
    } finally { await client.send('Emulation.setScriptExecutionDisabled', { value: false }); }
  });

  await section('阶段直接链接与窄屏', async () => {
    for (const [page, id, keyword] of [['master.html','review','送审'], ['bachelor.html','design','设计'], ['competition.html','selection','资格'], ['undergraduate-research.html','exploration','小任务']]) {
      await navigate(`${page}#${id}`);
      await waitFor(`(() => { const node=document.getElementById(${JSON.stringify(id)}); const r=node?.getBoundingClientRect(); return r && r.top < innerHeight && r.bottom > 0; })()`, `anchor ${page}#${id}`);
      record(await evaluate(`(() => { const node=document.getElementById(${JSON.stringify(id)}); const r=node?.getBoundingClientRect(); return location.hash===${JSON.stringify('#'+id)} && node?.matches('article.workflow-stage') && node.querySelector('h2').textContent.includes(${JSON.stringify(keyword)}) && r.top < innerHeight && r.bottom > 0 && node.querySelectorAll('a[href^="templates.html#"]').length > 0; })()`), `${page}#${id} 直接抵达可读阶段和模板入口`);
      if (page === 'master.html') await screenshot('master-review-desktop.png');
    }
    await client.send('Emulation.setDeviceMetricsOverride', { width: 390, height: 844, deviceScaleFactor: 1, mobile: true });
    await navigate('planner.html?track=master&stage=review'); await plannerReady();
    record(await evaluate(`document.documentElement.scrollWidth <= innerWidth + 1 && ['#track-select','#stage-select','#target-date'].every(selector=>{const r=document.querySelector(selector).getBoundingClientRect();return r.width>0 && r.left>=0 && r.right<=innerWidth+1;})`), '390px 清单无横向溢出，路径、阶段和日期控件可用');
    await screenshot('planner-mobile.png');
    await navigate('templates.html');
    record(await evaluate(`document.documentElement.scrollWidth <= innerWidth + 1 && document.querySelectorAll('[data-template-card] a[download]').length===25`), '390px 模板库无横向溢出，全部下载入口保留');
    record(await evaluate(`(() => { const cards=[...document.querySelectorAll('[data-template-card]')];return cards.every(card=>{const c=card.getBoundingClientRect(),h=card.querySelector('h2').getBoundingClientRect(); return h.width>=c.width*.7 && h.height<160;});})()`), '模板标题保留足够阅读宽度，未被旧样式挤成纵向文字');
    await screenshot('templates-mobile.png');
  });
  await section('流程图展开、返工与真实下载', async () => {
    await client.send('Emulation.setDeviceMetricsOverride', { width: 1440, height: 1000, deviceScaleFactor: 1, mobile: false });
    await navigate('workflows.html');
    record(await evaluate(`document.querySelectorAll('[data-flow-disclosure][open]').length===11 && [...document.querySelectorAll('.wf-node')].every(n=>n.getBoundingClientRect().height>0)`), '不点展开、不下载，十一张流程图首次打开即可直接阅读');
    await navigate('workflows.html#flow-master-path');
    await waitFor(`document.querySelector('#flow-master-path details').open`, 'deep link opens workflow');
    record(await evaluate(`document.querySelectorAll('.workflow-diagram').length===11 && document.querySelector('#flow-master-path details').open`), '11 张流程可达，硕士图直接链接自动展开');
    record(await evaluate(`document.querySelectorAll('#flow-master-path .wf-decision').length>0 && document.querySelectorAll('#flow-master-path .wf-branch').length>0 && [...document.querySelectorAll('#flow-master-path .wf-return')].every(a=>document.getElementById(a.hash.slice(1)))`), '硕士图有真实判断、整改和可定位的返回节点');
    await screenshot('workflows-master-desktop.png');
    await click('#flow-master-path .wf-return');
    await waitFor(`(() => { const n=document.getElementById(location.hash.slice(1)); const r=n?.getBoundingClientRect(); return n?.matches('.wf-node') && r.top<innerHeight && r.bottom>0; })()`, 'return link scrolls to workflow node');
    record(await evaluate(`(() => { const n=document.getElementById(location.hash.slice(1)); const r=n?.getBoundingClientRect(); return n?.matches('.wf-node') && r.top<innerHeight && r.bottom>0; })()`), '点击整改返回箭头会定位到需要重新处理的节点');
    await navigate('workflows.html#flow-master-path-proposal-check');
    await waitFor(`document.querySelector('#flow-master-path-proposal-check').getBoundingClientRect().top<innerHeight`, 'proposal branch in view');
    await screenshot('workflows-branch-desktop.png');
    for (const ext of ['svg','drawio']) {
      const file = 'assets/diagrams/master-path.'+ext;
      const expected = await (await fetch(new URL(file,baseUrl+'/'))).text();
      const actual = await downloadFrom(`#flow-master-path a[download][href$=".${ext}"]`);
      record(actual.text===expected && actual.text.includes(ext==='svg'?'<svg':'<mxfile'), `实际下载硕士 ${ext} 文件且与发布源一致`);
    }
    const bundle = await downloadFrom('a[download][href$="csma-workflow-diagrams.zip"]');
    const expectedBundle = Buffer.from(await (await fetch(new URL('assets/downloads/csma-workflow-diagrams.zip',baseUrl+'/'))).arrayBuffer());
    record(fs.readFileSync(bundle.file).equals(expectedBundle), '实际下载流程图整包且逐字节一致');
    await click('#flow-master-path-review');
    record(await evaluate(`location.pathname.endsWith('/master.html') && location.hash==='#review' && document.querySelector('#review .stage-tool-links a')`), '流程节点进入硕士送审说明并保留对应工具入口');
    await click('#review .stage-tool-links a');
    record(await evaluate(`location.pathname.endsWith('/tools.html') && document.querySelector(location.hash)?.matches('.tool-scenario') && document.querySelectorAll('.tool-scenario').length===7`), '阶段工具入口抵达七类工具任务中的对应说明');
    await waitFor(`document.querySelector(location.hash).getBoundingClientRect().top<innerHeight`, 'tool scenario in view');
    await evaluate(`document.querySelector(location.hash).scrollIntoView({block:'start',behavior:'instant'}); true`);
    await screenshot('tools-scenario-desktop.png');
    for (const width of [390,320]) {
      await client.send('Emulation.setDeviceMetricsOverride', { width, height: 844, deviceScaleFactor: 1, mobile: true });
      await navigate('workflows.html#flow-master-path');
      await waitFor(`document.querySelector('#flow-master-path details').open`, 'mobile deep link');
      record(await evaluate(`document.documentElement.scrollWidth<=innerWidth+1 && [...document.querySelectorAll('#flow-master-path .wf-node')].every(n=>{const r=n.getBoundingClientRect();return r.width>180&&r.right<=innerWidth+1&&r.left>=0;})`), `${width}px 展开的长流程与返工节点保持可读宽度，无整页溢出`);
      await evaluate(`document.querySelector('#flow-master-path .wf-has-branch .wf-decision').scrollIntoView({block:'start',behavior:'instant'}); true`);
      await screenshot(`workflow-branch-${width}.png`);
      await navigate('tools.html#literature');
      record(await evaluate(`document.documentElement.scrollWidth<=innerWidth+1 && [...document.querySelectorAll('.tool-scenario')].every(n=>n.getBoundingClientRect().width>200)`), `${width}px 工具步骤与交付卡片可读，无整页溢出`);
      await evaluate(`document.querySelector('#literature').scrollIntoView({block:'start',behavior:'instant'}); true`);
      await screenshot(`tools-literature-${width}.png`);
    }
    await client.send('Emulation.setScriptExecutionDisabled', { value: true });
    try {
      await navigate('workflows.html');
      record(await evaluate(`document.querySelectorAll('[data-flow-disclosure][open]').length===11 && [...document.querySelectorAll('.wf-node')].every(n=>n.getBoundingClientRect().height>0)`), '关闭 JavaScript 后十一张流程仍默认完整显示');
      const doc = await client.send('DOM.getDocument');
      const summary = await client.send('DOM.querySelector', { nodeId: doc.root.nodeId, selector: '#flow-master-path summary' });
      await client.send('DOM.focus', { nodeId: summary.nodeId });
      await waitFor(`document.activeElement?.matches('#flow-master-path summary')`, 'native focus on workflow summary');
      await client.send('Input.dispatchKeyEvent', { type: 'keyDown', key: 'Enter', code: 'Enter', windowsVirtualKeyCode: 13, text: '\r' });
      await client.send('Input.dispatchKeyEvent', { type: 'keyUp', key: 'Enter', code: 'Enter', windowsVirtualKeyCode: 13 });
      await waitFor(`!document.querySelector('#flow-master-path details')?.open`, 'keyboard collapses no-JS workflow');
      await client.send('Input.dispatchKeyEvent', { type: 'keyDown', key: 'Enter', code: 'Enter', windowsVirtualKeyCode: 13, text: '\r' });
      await client.send('Input.dispatchKeyEvent', { type: 'keyUp', key: 'Enter', code: 'Enter', windowsVirtualKeyCode: 13 });
      await waitFor(`document.querySelector('#flow-master-path details')?.open`, 'keyboard opens no-JS workflow');
      record(await evaluate(`document.querySelector('#flow-master-path details').open && document.querySelector('#flow-master-path-review').getBoundingClientRect().width>180`), '无 JavaScript 仍能用键盘收起、重新展开并阅读完整流程');
      await navigate('tools.html');
      record(await evaluate(`document.querySelectorAll('.tool-scenario').length===7 && document.querySelectorAll('.tool-template-links a').length>7`), '无 JavaScript 仍可阅读七类工具说明并进入模板');
    } finally { await client.send('Emulation.setScriptExecutionDisabled', { value: false }); }
  });
  let englishManifest, englishReview;
  await section('英文模板筛选、复制与真实下载', async () => {
    const [manifestResponse, pathwaysResponse] = await Promise.all([
      fetch(`${baseUrl}/en/assets/data/templates.json`), fetch(`${baseUrl}/en/assets/data/pathways.json`),
    ]);
    if (!manifestResponse.ok || !pathwaysResponse.ok) throw new Error('English data manifests must be published under /en/assets/data/');
    englishManifest = await manifestResponse.json();
    const englishPathways = await pathwaysResponse.json();
    englishReview = englishPathways.tracks.find(track => track.id === 'master').stages.find(stage => stage.id === 'review');
    await client.send('Emulation.setDeviceMetricsOverride', { width: 1440, height: 1000, deviceScaleFactor: 1, mobile: false });
    await navigate('en/templates.html');
    await waitFor(`!document.querySelector('[data-template-filter]').hidden`, 'English template filter enhancement');
    record(await evaluate(`document.documentElement.lang==='en' && document.querySelectorAll('[data-template-card]').length===25 && [...document.querySelectorAll('[data-template-card]')].every(card=>!card.hidden)`), '英文模板库呈现独立的 25 份完整模板');
    await filterTemplates('experiment', 'Research and progress');
    record(await evaluate(`(() => { const cards=[...document.querySelectorAll('[data-template-card]')].filter(card=>!card.hidden); return cards.length>0 && cards.some(card=>card.id==='experiment') && cards.every(card=>card.dataset.category==='Research and progress' && card.dataset.search.toLowerCase().includes('experiment')); })()`), '英文关键词和类别组合筛选可用');
    await filterTemplates('not-a-template-QA-8766', 'Thesis and graduation');
    record(await evaluate(`![...document.querySelectorAll('[data-template-card]')].some(card=>!card.hidden) && !document.querySelector('#template-empty').hidden && document.querySelector('#template-count').textContent.startsWith('0 /')`), '英文筛选零结果有提示与重置入口');
    await click('[data-reset-filter]');
    record(await evaluate(`document.querySelector('#template-search').value==='' && document.querySelector('#template-category').value==='' && [...document.querySelectorAll('[data-template-card]')].every(card=>!card.hidden)`), '英文模板重置筛选恢复全部结果');
    const item = englishManifest.templates.find(template => template.id === 'experiment');
    const response = await fetch(new URL(item.file, `${baseUrl}/en/`));
    const expected = await response.text();
    const downloaded = await downloadFrom('#experiment a[download]');
    record(response.ok && downloaded.text===expected && /^#\s/m.test(expected) && !/[\u3400-\u9fff]/u.test(expected), '英文下载得到完整英文实验模板，与源文件一致', downloaded.name);
    record(await evaluate(`document.querySelector('#experiment pre').textContent===${JSON.stringify(expected)}`), '英文模板正文预览与下载全文一致');
    await client.send('Page.bringToFront');
    await click('#experiment [data-copy-template]');
    await waitFor(`document.querySelector('#copy-status').textContent.length>0 && !document.querySelector('#experiment [data-copy-template]').disabled`, 'English copy feedback');
    const copyStatus = await evaluate(`document.querySelector('#copy-status').textContent`);
    let copied = false;
    try { copied = await evaluate(`navigator.clipboard.readText().then(value=>value===${JSON.stringify(expected)})`, true); }
    catch (error) { infrastructureNotes.push(`English clipboard readback: ${error.message}`); }
    const fallback = await evaluate(`document.querySelector('#experiment details').open && /download|preview/i.test(document.querySelector('#copy-status').textContent)`);
    record(!/[\u3400-\u9fff]/u.test(copyStatus) && (copied || fallback), '英文复制成功并核对全文，或提供英文预览下载替代', copyStatus);
    await evaluate(`Object.defineProperty(navigator,'clipboard',{configurable:true,value:{writeText:()=>Promise.reject(new DOMException('Denied for acceptance test','NotAllowedError'))}}); document.querySelector('#copy-status').textContent=''; true`);
    await click('#experiment [data-copy-template]');
    await waitFor(`document.querySelector('#copy-status').textContent.length>0 && !document.querySelector('#experiment [data-copy-template]').disabled`, 'English denied-copy fallback');
    record(await evaluate(`document.querySelector('#experiment details').open && /download|preview/i.test(document.querySelector('#copy-status').textContent) && !/[\\u3400-\\u9fff]/u.test(document.querySelector('#copy-status').textContent)`), '英文拒绝复制权限时展开全文并给出英文替代说明');
    await screenshot('en-templates-desktop.png');
  });

  await section('双语清单持久化、导出与切换', async () => {
    await navigate('planner.html?track=master&stage=review#planner-result'); await plannerReady();
    if (!await evaluate(`document.querySelector('#check-0').checked`)) await click('#check-0');
    await select('#target-date', '2027-02-01');
    await click('[data-language-switch]');
    await waitFor(`location.pathname==='/en/planner.html' && document.documentElement.lang==='en'`, 'switch to English planner'); await plannerReady();
    record(await evaluate(`new URL(location.href).searchParams.get('track')==='master' && new URL(location.href).searchParams.get('stage')==='review' && location.hash==='#planner-result' && document.querySelector('#track-select').value==='master' && document.querySelector('#stage-select').value==='review'`), '切换英文保留同一培养路径、阶段参数和锚点');
    const englishCount = englishReview.entry.length + englishReview.deliverables.length + englishReview.review.length;
    record(await evaluate(`document.querySelectorAll('#planner-result input[type=checkbox]').length===${englishCount} && document.querySelector('#planner-result h2').textContent===${JSON.stringify(englishReview.title)} && document.querySelector('#check-progress').value===0`), '英文清单使用完整英文事项和独立的初始状态');
    await click('#check-1'); await select('#target-date', '2027-03-02');
    await navigate('en/planner.html?track=master&stage=review#planner-result'); await plannerReady();
    record(await evaluate(`document.querySelector('#check-1').checked && !document.querySelector('#check-0').checked && document.querySelector('#target-date').value==='2027-03-02'`), '英文勾选和日期在刷新后保留');
    const exported = await downloadFrom('#export-checklist');
    record(exported.name.endsWith('.md') && exported.text.includes(englishReview.title) && exported.text.includes('2027-03-02') && exported.text.includes('- [x]') && exported.text.includes('- [ ]') && exported.text.includes('/en/master.html#review') && !/[\u3400-\u9fff]/u.test(exported.text) && /self.check/i.test(exported.text) && /review|approval/i.test(exported.text), '英文清单真实导出状态、日期、审核边界及英文指南入口', exported.name);
    await click('[data-language-switch]');
    await waitFor(`location.pathname==='/planner.html'`, 'return to Chinese planner'); await plannerReady();
    record(await evaluate(`document.querySelector('#check-0').checked && !document.querySelector('#check-1').checked && document.querySelector('#target-date').value==='2027-02-01' && location.hash==='#planner-result'`), '返回中文后原中文自检状态和日期没有被英文覆盖');
    await click('#reset-checklist'); await click('#confirm-reset');
    await click('[data-language-switch]');
    await waitFor(`location.pathname==='/en/planner.html'`, 'English after Chinese reset'); await plannerReady();
    record(await evaluate(`document.querySelector('#check-1').checked && !document.querySelector('#check-0').checked && document.querySelector('#target-date').value==='2027-03-02'`), '重置中文阶段不会清除英文阶段记录');
    await evaluate(`document.querySelectorAll('#planner-result input[type=checkbox]').forEach(input=>{if(!input.checked)input.click();}); true`);
    record(await evaluate(`document.querySelector('#check-progress').value===${englishCount} && /review|approval/i.test(document.querySelector('#check-completion').textContent) && !/[\\u3400-\\u9fff]/u.test(document.querySelector('#check-completion').textContent)`), '英文全部勾选后仍保留实际审核要求');
    await click('[data-language-switch]');
    await waitFor(`location.pathname==='/planner.html'`, 'prepare Chinese reset-isolation evidence'); await plannerReady();
    await click('#check-0'); await select('#target-date', '2027-04-03');
    await click('[data-language-switch]');
    await waitFor(`location.pathname==='/en/planner.html'`, 'English reset'); await plannerReady();
    await click('#reset-checklist');
    record(await evaluate(`!document.querySelector('#reset-confirmation').hidden && document.querySelector('#check-progress').value===${englishCount}`), '英文重置需要确认且确认前保留状态');
    await click('#confirm-reset');
    record(await evaluate(`document.querySelector('#check-progress').value===0 && document.querySelector('#target-date').value===''`), '英文确认重置后清除本阶段状态');
    await click('[data-language-switch]');
    await waitFor(`location.pathname==='/planner.html'`, 'Chinese after English reset'); await plannerReady();
    record(await evaluate(`document.querySelector('#check-0').checked && document.querySelector('#target-date').value==='2027-04-03'`), '重置英文阶段不会清除中文阶段记录');
    await navigate('master.html#review');
    await click('[data-language-switch]');
    await waitFor(`location.pathname==='/en/master.html' && location.hash==='#review' && document.readyState==='complete' && document.querySelector('#review h2')`, 'English stage counterpart');
    record(await evaluate(`document.querySelector('#review').matches('article.workflow-stage') && document.querySelector('#review a[href*="templates.html#"]') && document.querySelector('#review h2').textContent===${JSON.stringify(englishReview.title)}`), '具体培养阶段切换语言后抵达对应英文说明与模板');
    await screenshot('en-master-review-desktop.png');
  });

  await section('英文网页流程与可编辑资源', async () => {
    await navigate('en/workflows.html');
    record(await evaluate(`document.querySelectorAll('[data-flow-disclosure][open]').length===11 && [...document.querySelectorAll('.wf-node')].every(node=>node.getBoundingClientRect().height>0)`), '英文网页十一张流程默认直接显示，无需下载');
    const expected = await (await fetch(`${baseUrl}/en/assets/diagrams/master-path.svg`)).text();
    const actual = await downloadFrom('#flow-master-path a[download][href$=".svg"]');
    const svgLinks = [...actual.text.matchAll(/(?:xlink:)?href=["']([^"']+)["']/g)].map(match => match[1]);
    record(actual.text===expected && actual.text.includes('<svg') && !/[\u3400-\u9fff]/u.test(actual.text) && svgLinks.length>0 && svgLinks.every(href=>new URL(href,baseUrl).pathname.startsWith('/en/')), '英文 SVG 真实下载完整英文图，全部节点链接指向英文页面');
    await click('#flow-master-path-review');
    await waitFor(`location.pathname==='/en/master.html' && location.hash==='#review' && document.readyState==='complete' && document.querySelector('#review .stage-tool-links a')`, 'English diagram stage link');
    record(await evaluate(`document.querySelector('#review .stage-tool-links a')`), '英文流程节点进入英文阶段及对应工具入口');
    await click('#review .stage-tool-links a');
    await waitFor(`location.pathname==='/en/tools.html' && Boolean(location.hash) && document.readyState==='complete' && document.querySelector(location.hash)`, 'English stage tool link');
    record(await evaluate(`document.querySelector(location.hash)?.matches('.tool-scenario') && document.querySelectorAll('.tool-scenario').length===7`), '英文阶段工具入口抵达七类英文工具任务');
  });

  await section('英文无 JavaScript 导航与模板', async () => {
    await client.send('Emulation.setDeviceMetricsOverride', { width: 390, height: 844, deviceScaleFactor: 1, mobile: true });
    await client.send('Emulation.setScriptExecutionDisabled', { value: true });
    try {
      await navigate('en/templates.html');
      record(await evaluate(`!document.documentElement.classList.contains('js') && getComputedStyle(document.querySelector('#main-nav')).display!=='none' && document.querySelectorAll('#main-nav a').length===10 && document.querySelector('[data-language-switch]')`), '关闭 JavaScript 后英文窄屏导航与语言入口仍可用');
      record(await evaluate(`document.querySelectorAll('[data-template-card] a[download]').length===25 && document.querySelector('[data-template-filter]').hidden && [...document.querySelectorAll('[data-template-card] a[download]')].every(a=>new URL(a.href).pathname.startsWith('/en/assets/templates/'))`), '无 JavaScript 时 25 个英文完整模板下载入口保留');
      const item = englishManifest.templates.find(template => template.id === 'topic');
      const response = await fetch(new URL(item.file,`${baseUrl}/en/`));
      const expected = await response.text();
      const actual = await downloadFrom('#topic a[download]');
      record(response.ok && actual.text===expected && !/[\u3400-\u9fff]/u.test(actual.text), '无 JavaScript 时实际下载完整英文选题模板');
      await navigate('en/workflows.html');
      record(await evaluate(`document.querySelectorAll('[data-flow-disclosure][open]').length===11 && [...document.querySelectorAll('.wf-node')].every(node=>node.getBoundingClientRect().height>0) && document.documentElement.scrollWidth<=innerWidth+1`), '无 JavaScript 时英文手机流程图仍完整显示且不横向溢出');
      await screenshot('en-workflows-nojs-mobile.png');
    } finally { await client.send('Emulation.setScriptExecutionDisabled', { value: false }); }
  });
  record(runtimeErrors.length === 0, '全部情境没有未处理脚本异常或 console.error', runtimeErrors.length ? JSON.stringify(runtimeErrors) : '含中英文、损坏与禁止存储情境');
} catch (error) {
  record(false, '浏览器测试基础设施', error.stack || error.message);
} finally {
  if (client) {
    if (storageInjection) await client.send('Page.removeScriptToEvaluateOnNewDocument', { identifier: storageInjection }).catch(() => {});
    client.close();
  }
  if (browserClient) browserClient.close();
  if (port && target) await fetch(`http://127.0.0.1:${port}/json/close/${target.id}`).catch(() => {});
  if (chrome) {
    chrome.kill('SIGTERM');
    await Promise.race([new Promise(resolve => chrome.once('exit', resolve)), delay(1500)]);
    if (chrome.exitCode === null) chrome.kill('SIGKILL');
  }
  fs.mkdirSync(qaRoot, { recursive: true });
  const summary = { generatedAt: new Date().toISOString(), baseUrl, profileRoot, downloadRoot, assertions: checks.length, passed: checks.filter(x=>x.ok).length, failed: checks.filter(x=>!x.ok).length, checks, runtimeErrors, infrastructureNotes, downloads: [...downloadRecords.values()] };
  fs.writeFileSync(path.join(qaRoot, 'training-browser-qa.json'), JSON.stringify(summary, null, 2) + '\n');
  if (summary.failed && chromeStderr) fs.writeFileSync(path.join(qaRoot, 'chrome-diagnostics.log'), chromeStderr);
  console.log(`\nTraining browser QA: ${summary.passed}/${summary.assertions} assertions passed.`);
  console.log(`Report, screenshots, and actual downloads: ${qaRoot}`);
  if (summary.failed) process.exitCode = 1;
}
