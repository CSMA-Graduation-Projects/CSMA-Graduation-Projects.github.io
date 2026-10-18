/* Progressive enhancement: all guides and template downloads work without JS. */
(() => {
  'use strict';
  const $ = (selector, root = document) => root.querySelector(selector);
  const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];
  const text = (tag, value, className) => {
    const node = document.createElement(tag);
    node.textContent = value;
    if (className) node.className = className;
    return node;
  };
  function link(label, href, className) {
    const node = text('a', label, className);
    node.href = href;
    return node;
  }
  function saveFile(name, content) {
    const url = URL.createObjectURL(new Blob([content], { type: 'text/markdown;charset=utf-8' }));
    const anchor = link('', url);
    anchor.download = name;
    document.body.append(anchor);
    anchor.click();
    anchor.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  $$('[data-print]').forEach(button => button.addEventListener('click', () => window.print()));
  let printDetails = [];
  window.addEventListener('beforeprint', () => {
    printDetails = $$('.correction,.template-preview').map(detail => [detail, detail.open]);
    printDetails.forEach(([detail]) => { detail.open = true; });
  });
  window.addEventListener('afterprint', () => {
    printDetails.forEach(([detail, open]) => { detail.open = open; });
    printDetails = [];
  });
  $$('.pathway-tabs a').forEach(anchor => {
    if (new URL(anchor.href).pathname === location.pathname) anchor.setAttribute('aria-current', 'page');
  });
  const directory = $('.guide-sidebar details');
  if (directory) {
    const compact = matchMedia('(max-width: 920px)');
    const setDirectory = () => { directory.open = !compact.matches; };
    setDirectory();
    compact.addEventListener('change', setDirectory);
    $$('.guide-sidebar nav a').forEach(anchor => anchor.addEventListener('click', () => {
      if (compact.matches) directory.open = false;
    }));
  }

  const filter = $('[data-template-filter]');
  if (filter) {
    filter.hidden = false;
    const cards = $$('[data-template-card]');
    const search = $('#template-search');
    const category = $('#template-category');
    const update = () => {
      const words = search.value.trim().toLocaleLowerCase().split(/\s+/).filter(Boolean);
      let count = 0;
      cards.forEach(card => {
        const matches = (!category.value || card.dataset.category === category.value)
          && words.every(word => card.dataset.search.toLocaleLowerCase().includes(word));
        card.hidden = !matches;
        count += Number(matches);
      });
      $('#template-count').textContent = `${count} / ${cards.length} 份模板`;
      $('#template-empty').hidden = count > 0;
    };
    const reset = () => { search.value = ''; category.value = ''; update(); };
    search.addEventListener('input', update);
    category.addEventListener('change', update);
    $('[data-reset-filter]').addEventListener('click', () => { reset(); search.focus(); });
    window.addEventListener('hashchange', () => {
      let target;
      try { target = document.getElementById(decodeURIComponent(location.hash.slice(1))); } catch { return; }
      const card = target?.closest('[data-template-card]');
      if (card?.hidden) { reset(); card.scrollIntoView({ block: 'start' }); }
    });
    update();
    $$('[data-copy-template]').forEach(button => button.addEventListener('click', async () => {
      const status = $('#copy-status');
      button.disabled = true;
      try {
        const response = await fetch(button.dataset.copyTemplate);
        if (!response.ok) throw new Error('Template unavailable');
        const content = await response.text();
        await navigator.clipboard.writeText(content);
        status.textContent = '模板全文已复制。请粘贴到自己的工作文件中填写。';
        button.textContent = '已复制';
        setTimeout(() => { button.textContent = '复制全文'; }, 2500);
      } catch {
        status.textContent = '浏览器未允许复制，请使用“下载 Markdown”或展开预览手动复制。';
        button.closest('.template-card').querySelector('details').open = true;
        button.textContent = '复制未完成';
      } finally { button.disabled = false; }
    }));
  }

  const planner = $('#planner-result');
  if (!planner) return;
  const trackSelect = $('#track-select');
  const stageSelect = $('#stage-select');
  const dateInput = $('#target-date');
  const storageStatus = $('#storage-status');
  const statePrefix = 'csma-training-stage-v1:';
  let tracks, currentTrack, currentStage, checks, state, key, signature;
  let memoryStates = {};
  let canStore = true;
  try {
    const probe = statePrefix + 'probe';
    localStorage.setItem(probe, '1');
    localStorage.removeItem(probe);
  } catch { canStore = false; }
  function storageMessage(extra = '') {
    storageStatus.textContent = (canStore
      ? '自检与日期只保存在当前浏览器，不上传。清除浏览器数据后会丢失，建议导出保存。'
      : '浏览器未允许本地保存；本次页面内仍可使用，请及时导出清单。') + extra;
  }
  function fingerprint(value) {
    let hash = 2166136261;
    for (const character of JSON.stringify(value)) hash = Math.imul(hash ^ character.charCodeAt(0), 16777619);
    return (hash >>> 0).toString(16);
  }
  function persist() {
    memoryStates[key] = { ...state, checked: [...state.checked] };
    if (canStore) {
      try { localStorage.setItem(key, JSON.stringify(state)); }
      catch { canStore = false; }
    }
    storageMessage();
  }
  function updateProgress() {
    const completed = state.checked.filter(Boolean).length;
    $('#check-progress').value = completed;
    $('#check-progress-label').textContent = `已自检 ${completed} / ${checks.length} 项`;
    $('#check-completion').textContent = completed === checks.length
      ? '自检项已全部勾选。请提交对应证据并等待指定人员复核；本工具不会认定阶段通过。'
      : '对已完成且有依据的事项勾选。待核实或不适用的事项，请在导出清单中说明。';
  }
  function exportChecklist() {
    const lines = ['# ' + currentTrack.title + ' · ' + currentStage.title, '',
      '类型：个人自检记录，不代表导师验收或学校审批。',
      '导出时间：' + new Date().toLocaleString('zh-CN', { timeZone: 'Asia/Shanghai', hour12: false }) + '（北京时间）',
      '个人计划完成日：' + (state.date || '未设置'), '清单内容版本：' + signature, '',
      '## 阶段目标', '', currentStage.goal, '', '## 自检清单', ''];
    let group;
    checks.forEach((check, index) => {
      if (group !== check.group) { group = check.group; lines.push('', '### ' + group, ''); }
      lines.push(`- [${state.checked[index] ? 'x' : ' '}] ${check.label}`);
    });
    lines.push('', '## 具体行动', '', ...currentStage.actions.map(action => '- ' + action), '',
      '## 未达要求时', '', currentStage.failure, '', '## 下一步', '', currentStage.next, '',
      '## 证据与审核（导出后填写，保存到受控空间）', '',
      '- 证据链接/版本：待填写', '- 不适用项及确认依据：待填写', '- 受阻事项/所需支持：待填写',
      '- 提交日期：待填写', '- 审核人/意见/正式结论：待审核', '- 下次复核日期：待确认', '',
      '指南：https://csma-graduation-projects.github.io/' + currentTrack.page + '#' + currentStage.id, '');
    saveFile(`csma-${currentTrack.id}-${currentStage.id}-checklist.md`, lines.join('\n'));
  }
  function render() {
    currentTrack = tracks.find(track => track.id === trackSelect.value) || tracks[0];
    currentStage = currentTrack.stages.find(stage => stage.id === stageSelect.value) || currentTrack.stages[0];
    checks = [['entry','开始前确认'],['deliverables','交付材料'],['review','验收前自检']]
      .flatMap(([field, group]) => currentStage[field].map(label => ({ group, label })));
    signature = fingerprint({ checks, actions: currentStage.actions, goal: currentStage.goal, failure: currentStage.failure });
    key = statePrefix + currentTrack.id + ':' + currentStage.id;
    state = { signature, checked: checks.map(() => false), date: '' };
    let old, changed = false;
    try { old = memoryStates[key] || (canStore ? JSON.parse(localStorage.getItem(key) || 'null') : null); }
    catch { /* Invalid stored data does not prevent using the guide. */ }
    if (old?.signature === signature && Array.isArray(old.checked) && old.checked.length === checks.length) {
      state.checked = old.checked.map(value => value === true);
      if (typeof old.date === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(old.date)) state.date = old.date;
    } else if (old) changed = true;
    dateInput.value = state.date;
    storageMessage(changed ? '此阶段内容已更新，旧勾选未沿用，请重新核对。' : '');
    const url = new URL(location.href);
    url.searchParams.set('track', currentTrack.id);
    url.searchParams.set('stage', currentStage.id);
    history.replaceState(null, '', url);
    planner.replaceChildren();
    planner.append(text('p', currentStage.timing, 'section-kicker'), text('h2', currentStage.title), text('p', currentStage.goal, 'planner-goal'));
    const progressWrap = text('div', '', 'planner-progress');
    const progressLabel = text('p', ''); progressLabel.id = 'check-progress-label'; progressLabel.setAttribute('aria-live','polite');
    const progress = document.createElement('progress'); progress.id = 'check-progress'; progress.max = checks.length; progress.value = 0; progress.setAttribute('aria-labelledby','check-progress-label');
    progressWrap.append(progressLabel, progress); planner.append(progressWrap);
    let group;
    checks.forEach((check, index) => {
      if (group !== check.group) { group = check.group; planner.append(text('h3', group)); }
      const label = text('label', '', 'check-item');
      const input = document.createElement('input'); input.type = 'checkbox'; input.checked = state.checked[index]; input.id = 'check-' + index;
      input.addEventListener('change', () => { state.checked[index] = input.checked; persist(); updateProgress(); });
      label.append(input, text('span', check.label)); planner.append(label);
    });
    const notice = text('p', '', 'planner-notice'); notice.id = 'check-completion'; planner.append(notice);
    const actions = text('div', '', 'planner-actions');
    const download = text('button', '导出我的清单 ↓', 'btn primary'); download.type='button'; download.id='export-checklist'; download.addEventListener('click', exportChecklist);
    const reset = text('button', '重置本阶段', 'text-button'); reset.type='button'; reset.id='reset-checklist';
    const confirm = text('div', '', 'planner-notice'); confirm.hidden = true; confirm.id = 'reset-confirmation';
    confirm.append(text('p', '清除本阶段的勾选与计划日期？其他阶段保持原样。'));
    const yes = text('button','确认清除','btn outline'); yes.type='button'; yes.id='confirm-reset';
    const cancel = text('button','保留清单','text-button'); cancel.type='button';
    yes.addEventListener('click', () => { state = { signature, checked: checks.map(() => false), date: '' }; persist(); render(); $('#reset-checklist').focus(); });
    cancel.addEventListener('click', () => { confirm.hidden=true; reset.focus(); });
    reset.addEventListener('click', () => { confirm.hidden=false; cancel.focus(); });
    confirm.append(yes,cancel);
    actions.append(download,link('阅读本阶段说明 ↗',currentTrack.page+'#'+currentStage.id,'btn outline'),reset);
    planner.append(actions,confirm);
    updateProgress();
  }
  function selectTrack(preferred) {
    const track = tracks.find(item => item.id === trackSelect.value) || tracks[0];
    stageSelect.replaceChildren();
    track.stages.forEach((stage,index) => { const option = text('option',`${String(index+1).padStart(2,'0')} · ${stage.title}`); option.value=stage.id; stageSelect.append(option); });
    if (track.stages.some(stage => stage.id === preferred)) stageSelect.value=preferred;
    render();
  }
  dateInput.addEventListener('change', () => { state.date = dateInput.value; persist(); });
  fetch('assets/data/pathways.json').then(response => {
    if (!response.ok) throw new Error('Unable to load pathways');
    return response.json();
  }).then(data => {
    if (!Array.isArray(data.tracks) || !data.tracks.length) throw new Error('Missing pathways');
    tracks = data.tracks;
    const params = new URLSearchParams(location.search);
    if (tracks.some(track => track.id === params.get('track'))) trackSelect.value=params.get('track');
    selectTrack(params.get('stage'));
    $('#planner-controls').hidden=false;
    trackSelect.addEventListener('change', () => selectTrack());
    stageSelect.addEventListener('change',render);
  }).catch(() => {
    storageStatus.textContent='阶段清单暂未加载成功。请刷新，或从右侧链接阅读指南、下载模板。';
  });
})();
