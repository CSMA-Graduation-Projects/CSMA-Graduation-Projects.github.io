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
    printDetails = $$('.correction,.template-preview,[data-flow-disclosure]').map(detail => [detail, detail.open]);
    printDetails.forEach(([detail]) => { detail.open = true; });
  });
  window.addEventListener('afterprint', () => {
    printDetails.forEach(([detail, open]) => { detail.open = open; });
    printDetails = [];
  });
  function revealFlowTarget() {
    let target;
    try { target = document.getElementById(decodeURIComponent(location.hash.slice(1))); } catch { return; }
    if (!target) return;
    const enclosing = target.closest('[data-flow-disclosure]');
    const disclosure = enclosing || target.querySelector('[data-flow-disclosure]');
    if (disclosure) {
      disclosure.open = true;
      requestAnimationFrame(() => target.scrollIntoView({ block: 'start', behavior: 'instant' }));
    }
  }
  window.addEventListener('hashchange', revealFlowTarget);
  revealFlowTarget();
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
      $('#template-count').textContent = `${count} / ${cards.length} templates`;
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
        const response = await fetch(button.dataset.copyTemplate, { cache: 'no-cache' });
        if (!response.ok) throw new Error('Template unavailable');
        const content = await response.text();
        await navigator.clipboard.writeText(content);
        status.textContent = 'The full template has been copied. Paste it into your own working file to complete it.';
        button.textContent = 'Copied';
        setTimeout(() => { button.textContent = 'Copy full text'; }, 2500);
      } catch {
        status.textContent = 'Copying was not permitted by your browser. Download the Markdown file or open the preview and copy it manually.';
        button.closest('.template-card').querySelector('details').open = true;
        button.textContent = 'Copy not completed';
      } finally { button.disabled = false; }
    }));
  }

  const planner = $('#planner-result');
  if (!planner) return;
  const trackSelect = $('#track-select');
  const stageSelect = $('#stage-select');
  const dateInput = $('#target-date');
  const storageStatus = $('#storage-status');
  const statePrefix = 'csma-training-stage-v1:en:';
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
      ? 'Checks and dates are stored only in this browser and are not uploaded. Clearing browser data removes them; export a copy to keep your record.'
      : 'Local storage is unavailable in this browser. You can still use the checklist on this page; export it before leaving.') + extra;
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
    $('#check-progress-label').textContent = `Checked ${completed} / ${checks.length} items`;
    $('#check-completion').textContent = completed === checks.length
      ? 'All self-check items are ticked. Submit the corresponding evidence and wait for the designated reviewer; this tool does not approve a stage.'
      : 'Tick items that are complete and supported by evidence. Explain pending or not-applicable items in the exported checklist.';
  }
  function exportChecklist() {
    const lines = ['# ' + currentTrack.title + ' · ' + currentStage.title, '',
      'Type: personal self-check record, not supervisory acceptance or institutional approval.',
      'Exported at: ' + new Date().toLocaleString('en-GB', { timeZone: 'Asia/Shanghai', hour12: false }) + ' (Beijing time)',
      'Personal target date: ' + (state.date || 'Not set'), 'Checklist content version: ' + signature, '',
      '## Stage goal', '', currentStage.goal, '', '## Self-check', ''];
    let group;
    checks.forEach((check, index) => {
      if (group !== check.group) { group = check.group; lines.push('', '### ' + group, ''); }
      lines.push(`- [${state.checked[index] ? 'x' : ' '}] ${check.label}`);
    });
    lines.push('', '## Actions', '', ...currentStage.actions.map(action => '- ' + action), '',
      '## If requirements are not met', '', currentStage.failure, '', '## Next step', '', currentStage.next, '',
      '## Evidence and review (complete after export; keep in controlled storage)', '',
      '- Evidence link/version: To complete', '- Not-applicable items and confirmation basis: To complete', '- Blockers/support needed: To complete',
      '- Submission date: To complete', '- Reviewer/comments/official decision: Awaiting review', '- Next review date: To confirm', '',
      'Guide: https://csma-graduation-projects.github.io/en/' + currentTrack.page + '#' + currentStage.id, '');
    saveFile(`csma-${currentTrack.id}-${currentStage.id}-checklist.md`, lines.join('\n'));
  }
  function render() {
    currentTrack = tracks.find(track => track.id === trackSelect.value) || tracks[0];
    currentStage = currentTrack.stages.find(stage => stage.id === stageSelect.value) || currentTrack.stages[0];
    checks = [['entry','Before starting'],['deliverables','Deliverables'],['review','Before acceptance']]
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
    storageMessage(changed ? ' The content for this stage has changed. Previous ticks were not carried over; check the items again.' : '');
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
    const download = text('button', 'Export my checklist ↓', 'btn primary'); download.type='button'; download.id='export-checklist'; download.addEventListener('click', exportChecklist);
    const reset = text('button', 'Reset this stage', 'text-button'); reset.type='button'; reset.id='reset-checklist';
    const confirm = text('div', '', 'planner-notice'); confirm.hidden = true; confirm.id = 'reset-confirmation';
    confirm.append(text('p', 'Clear the checks and target date for this stage? Other stages will stay as they are.'));
    const yes = text('button','Confirm reset','btn outline'); yes.type='button'; yes.id='confirm-reset';
    const cancel = text('button','Keep checklist','text-button'); cancel.type='button';
    yes.addEventListener('click', () => { state = { signature, checked: checks.map(() => false), date: '' }; persist(); render(); $('#reset-checklist').focus(); });
    cancel.addEventListener('click', () => { confirm.hidden=true; reset.focus(); });
    reset.addEventListener('click', () => { confirm.hidden=false; cancel.focus(); });
    confirm.append(yes,cancel);
    actions.append(download,link('Read the stage guide ↗',currentTrack.page+'#'+currentStage.id,'btn outline'),reset);
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
  fetch('assets/data/pathways.json', { cache: 'no-cache' }).then(response => {
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
    storageStatus.textContent='The stage checklist could not be loaded. Refresh, or follow the guide links and download templates.';
  });
})();
