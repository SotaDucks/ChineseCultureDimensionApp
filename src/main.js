import '@fontsource/noto-serif-sc/500.css';
import '@fontsource/noto-serif-sc/700.css';
import '@fontsource/noto-sans-sc/300.css';
import '@fontsource/noto-sans-sc/400.css';
import '@fontsource/noto-sans-sc/500.css';
import './style.css';

import { ACCENT_DEFAULT, DIMENSIONS, CATEGORIES, ERAS, REGIONS, TOUCHPOINTS, FLAGS, catByKey, eraByZh } from './config.js';
import { Pentagon, miniPentagonSVG } from './pentagon.js';
import { store, scoreArray, total, area } from './store.js';

const $ = (s, r = document) => r.querySelector(s);
const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

// ---------- 点缀色 ----------
const accentParam = new URLSearchParams(location.search).get('accent');
document.documentElement.style.setProperty('--accent',
  accentParam && /^[0-9a-f]{3,8}$/i.test(accentParam) ? '#' + accentParam : ACCENT_DEFAULT);

// ---------- 状态 ----------
const state = { index: 0, active: 0, hover: null, view: 'overview', cat: null };
const current = () => store.elements[state.index];

// ---------- 五边形 ----------
const pent = new Pentagon($('#pentHost'), {
  onScore: (i, s) => setScore(i, s),
  onActive: (i) => { state.active = i; renderQuestion(); },
  onHover: (i) => { state.hover = i; renderQuestion(); },
});

function setScore(i, s) {
  const e = current();
  if (!e) return;
  store.setScore(e.id, DIMENSIONS[i].key, s);
  pent.setScores(scoreArray(e));
  renderTotals();
  renderQuestion();
}

// ---------- 渲染：沉浸页 ----------
let layerFront = 0;
let imgToken = 0;
function showImage(e, instant) {
  const token = ++imgToken;
  const layers = document.querySelectorAll('.bg .layer');
  const next = layers[1 - layerFront];
  const apply = () => {
    if (token !== imgToken) return;
    const url = e.image ? `url("${e.image.replace(/"/g, '%22')}")` : 'none';
    next.querySelector('.main').style.backgroundImage = url;
    next.querySelector('.blur').style.backgroundImage = url;
    next.querySelector('.main').style.backgroundPosition = e.imagePosition;
    next.classList.toggle('contain', e.imageFit === 'contain');
    next.classList.toggle('instant', !!instant);
    layers[layerFront].classList.toggle('instant', !!instant);
    next.classList.add('on');
    layers[layerFront].classList.remove('on');
    layerFront = 1 - layerFront;
  };
  if (!e.image) return apply();
  const img = new Image();
  img.onload = img.onerror = apply;
  img.src = e.image;
}

function fitText(node, maxPx, minPx, maxLines) {
  let size = maxPx;
  node.style.fontSize = size + 'px';
  const lh = () => parseFloat(getComputedStyle(node).lineHeight) || size * 1.2;
  while (size > minPx && (node.scrollHeight > lh() * maxLines + 2 || node.scrollWidth > node.clientWidth + 1)) {
    size -= 2;
    node.style.fontSize = size + 'px';
  }
}
function fitTitles() {
  const vh = window.innerHeight / 100;
  const narrow = matchMedia('(max-width: 900px), (orientation: portrait)').matches;
  const zhMax = narrow ? 52 : Math.min(120, 10.5 * vh);
  fitText($('#nameZh'), zhMax, narrow ? 28 : Math.max(34, 4.6 * vh), 1);
  fitText($('#nameEn'), narrow ? 18 : Math.min(30, 2.5 * vh), 12, 2);
}

function renderElement(instant = false) {
  const e = current();
  if (!e) return;
  showImage(e, instant);
  $('#nameZh').textContent = e.nameZh;
  $('#nameEn').textContent = e.nameEn;
  const c = catByKey(e.category);
  const era = eraByZh(e.tags.era);
  const tags = [
    era ? `${era.zh} ${era.en}` : '',
    ...e.tags.regions,
    ...e.tags.touchpoints.map((k) => (TOUCHPOINTS.find((t) => t.key === k) || { zh: k }).zh),
  ].filter(Boolean);
  $('#meta').innerHTML = `<span class="cat">${esc(c.zh)} <i>${esc(c.en)}</i></span>` +
    tags.map((t) => `<span class="tag">${esc(t)}</span>`).join('');
  $('#flags').innerHTML = Object.entries(FLAGS).filter(([k]) => e.flags[k])
    .map(([k, f]) => `<div class="flag flag-${k}"><b>${k === 'culturallySensitive' ? '⚠' : '◆'} ${esc(f.zh)} <i>${esc(f.en)}</i></b><span>${esc(f.note)}</span></div>`).join('');
  $('#credit').textContent = e.imageCredit ? `Image · ${e.imageCredit}` : '';
  $('#backCat').innerHTML = `<span class="arr">‹</span> ${esc(c.zh)} <i>${esc(c.en)}</i>`;
  $('#idx').textContent = String(state.index + 1).padStart(2, '0');
  $('#count').textContent = String(store.elements.length).padStart(2, '0');
  const notes = $('#notes');
  if (notes) { notes.value = e.notes; autoGrow(notes); }
  pent.setScores(scoreArray(e), !instant);
  renderTotals();
  renderQuestion();
  fitTitles();
  if (location.hash !== '#/e/' + e.id) history.replaceState(null, '', '#/e/' + encodeURIComponent(e.id));
}

function renderTotals() {
  if (!$('#total')) return;
  const e = current();
  const arr = scoreArray(e);
  const scored = arr.filter((v) => v > 0).length;
  $('#total').textContent = total(e);
  $('#total').classList.toggle('zero', !scored);
  $('#hint').classList.toggle('dim', scored > 0);
  $('#hint').innerHTML = scored === 0
    ? '拖动控制点或点击刻度打分 · <kbd>Tab</kbd>/<kbd>↑↓</kbd> 切换维度 · <kbd>1</kbd>–<kbd>5</kbd> 打分'
    : `已评 ${scored} / 5 维度` + (scored < 5 ? ' · <kbd>0</kbd> 清除当前维度' : '');
}

function renderQuestion() {
  if (!$('#question')) return;
  const i = state.hover ?? state.active;
  const d = DIMENSIONS[i];
  const e = current();
  const s = e ? e.scores[d.key] : 0;
  const dots = [1, 2, 3, 4, 5].map((l) => `<span class="${l <= s ? 'on' : ''}"></span>`).join('');
  $('#question').innerHTML = `
    <div class="q-head"><span class="q-idx">0${i + 1}</span><span class="q-dim">${esc(d.zh)} <i>${esc(d.en)}</i></span><span class="q-dots" title="当前分数">${dots}<b>${s || '–'}</b></span></div>
    <p class="q-text">${esc(d.q)}</p>
    <div class="q-scale">
      <div><b>1</b><span>${esc(d.low)}</span></div>
      <div><b>5</b><span>${esc(d.high)}</span></div>
    </div>`;
}

function autoGrow(t) { t.style.height = 'auto'; t.style.height = Math.min(t.scrollHeight, 120) + 'px'; }
let notesTimer;
$('#notes')?.addEventListener('input', (ev) => {
  autoGrow(ev.target);
  clearTimeout(notesTimer);
  const id = current().id;
  const val = ev.target.value;
  notesTimer = setTimeout(() => { const e = store.get(id); if (e) { e.notes = val; store.save(); } }, 300);
});

function go(delta) {
  const n = store.elements.length;
  if (!n) return;
  state.index = (state.index + delta + n) % n;
  state.hover = null;
  renderElement();
}
function openElement(id) {
  const i = store.elements.findIndex((e) => e.id === id);
  if (i >= 0) state.index = i;
  showView('immersive');
}

// ---------- 总览页：类别卡片（首页） / 某类别内的元素卡片 ----------
const imgStyle = (e) => e && e.image
  ? `background-image:url(&quot;${esc(e.image)}&quot;);background-position:${esc(e.imagePosition)}` : '';

function fillFilters() {
  const opt = (v, t) => `<option value="${esc(v)}">${esc(t)}</option>`;
  const keep = (sel, html) => { const v = $(sel).value; $(sel).innerHTML = html; $(sel).value = v; if ($(sel).selectedIndex < 0) $(sel).selectedIndex = 0; };
  keep('#fEra', opt('', '全部时代 Era') + ERAS.map((e) => opt(e.zh, `${e.zh} ${e.en}`)).join(''));
  const regions = [...new Set([...REGIONS, ...store.elements.flatMap((e) => e.tags.regions)])];
  keep('#fRegion', opt('', '全部地域 Region') + regions.map((r) => opt(r, r)).join(''));
  keep('#fTouch', opt('', '全部触点 Touchpoint') + TOUCHPOINTS.map((t) => opt(t.key, t.zh)).join(''));
}

function renderOverview() {
  const inCat = !!state.cat;
  $('#crumb').hidden = !inCat;
  $('#catCtrl').hidden = !inCat;
  $('#grid').classList.toggle('cat-grid', !inCat);
  if (inCat) renderCategory(); else renderHome();
}

function renderHome() {
  const scoredAll = store.elements.filter((e) => total(e) > 0).length;
  $('#ovTitle').innerHTML = '文化元素总览 <i>Overview</i>';
  $('#ovSub').textContent = `${CATEGORIES.length} 个大类 · ${store.elements.length} 个元素 · 已打分 ${scoredAll} 个` + (store.group ? ` · 小组：${store.group}` : '');
  $('#grid').innerHTML = CATEGORIES.map((c, ci) => {
    const els = store.elements.filter((e) => e.category === c.key);
    const cover = els.find((e) => e.id === c.cover && e.image) || els.find((e) => e.image);
    const scored = els.filter((e) => total(e) > 0).length;
    return `<article class="card cat-card" data-cat="${c.key}" tabindex="0">
      <div class="c-img ${cover && cover.imageFit === 'contain' ? 'contain' : ''}" style="${imgStyle(cover)}"></div>
      <div class="cat-shade"></div>
      <div class="cat-text">
        <span class="c-rank">${String(ci + 1).padStart(2, '0')}</span>
        <h3>${esc(c.zh)}</h3>
        <p class="c-en">${esc(c.en)}</p>
        <p class="cat-count">${els.length} 个元素${els.length ? ` · 已打分 ${scored}` : ''}</p>
        ${els.length ? `<p class="cat-names">${els.slice(0, 4).map((e) => esc(e.nameZh)).join(' · ')}${els.length > 4 ? ' …' : ''}</p>` : ''}
      </div>
    </article>`;
  }).join('');
}

function renderCategory() {
  const c = catByKey(state.cat);
  const fe = $('#fEra').value, fr = $('#fRegion').value, ft = $('#fTouch').value, so = $('#sort').value;
  const inCat = store.elements.map((e, i) => ({ e, i })).filter(({ e }) => e.category === state.cat);
  let list = inCat.filter(({ e }) => (!fe || e.tags.era === fe) &&
    (!fr || e.tags.regions.includes(fr)) && (!ft || e.tags.touchpoints.includes(ft)));
  if (so === 'total') list.sort((a, b) => total(b.e) - total(a.e) || area(b.e) - area(a.e));
  if (so === 'area') list.sort((a, b) => area(b.e) - area(a.e) || total(b.e) - total(a.e));
  const scored = inCat.filter(({ e }) => total(e) > 0).length;
  $('#ovTitle').innerHTML = `${esc(c.zh)} <i>${esc(c.en)}</i>`;
  $('#ovSub').textContent = `${inCat.length} 个元素 · 已打分 ${scored} 个` + (store.group ? ` · 小组：${store.group}` : '');
  $('#grid').innerHTML = list.map(({ e }, rank) => {
    const t = total(e);
    const flags = Object.entries(FLAGS).filter(([k]) => e.flags[k]).map(([k, f]) => `<span class="cflag cflag-${k}">${esc(f.zh)}</span>`).join('');
    return `<article class="card" data-id="${esc(e.id)}" tabindex="0">
      <div class="c-img ${e.imageFit === 'contain' ? 'contain' : ''}" style="${imgStyle(e)}"></div>
      <div class="c-body">
        <div class="c-text">
          <span class="c-rank">${so !== 'default' && t > 0 ? '#' + (rank + 1) : String(rank + 1).padStart(2, '0')}</span>
          <h3>${esc(e.nameZh)}</h3>
          <p class="c-en">${esc(e.nameEn)}</p>
          ${flags ? `<div class="c-flags">${flags}</div>` : ''}
        </div>
        <div class="c-score">${miniPentagonSVG(scoreArray(e))}<div class="c-total"><b>${t || '—'}</b><small>/25</small></div></div>
      </div>
    </article>`;
  }).join('') + `<button class="card add-card" data-act="add"><span>＋</span>新增元素<i>Add element</i></button>`;
}

function openCategory(key) {
  state.cat = key;
  ['#fEra', '#fRegion', '#fTouch'].forEach((s) => ($(s).value = ''));
  $('#sort').value = 'default';
  showView('overview');
  $('#overview').scrollTop = 0;
}

$('#grid').addEventListener('click', (ev) => {
  const cat = ev.target.closest('.card[data-cat]');
  if (cat) return openCategory(cat.dataset.cat);
  const card = ev.target.closest('.card[data-id]');
  if (card) openElement(card.dataset.id);
});
$('#grid').addEventListener('keydown', (ev) => {
  if (ev.key !== 'Enter') return;
  const cat = ev.target.closest('.card[data-cat]');
  if (cat) return openCategory(cat.dataset.cat);
  const card = ev.target.closest('.card[data-id]');
  if (card) openElement(card.dataset.id);
});
['#fEra', '#fRegion', '#fTouch', '#sort'].forEach((s) => $(s).addEventListener('change', renderOverview));

function showView(v) {
  state.view = v;
  $('#immersive').hidden = v !== 'immersive';
  $('#overview').hidden = v !== 'overview';
  if (v === 'overview') {
    fillFilters();
    renderOverview();
    const h = state.cat ? '#/c/' + state.cat : '#/';
    if (location.hash !== h) history.replaceState(null, '', h);
  } else {
    renderElement(true);
  }
}

// ---------- 弹窗 ----------
function openModal(html, onMount) {
  $('#modalCard').innerHTML = html;
  $('#modal').hidden = false;
  onMount && onMount($('#modalCard'));
}
function closeModal() { $('#modal').hidden = true; $('#modalCard').innerHTML = ''; }
$('#modal').addEventListener('pointerdown', (ev) => { if (ev.target.id === 'modal') closeModal(); });

function toast(msg) {
  const t = $('#toast');
  t.textContent = msg;
  t.classList.add('on');
  clearTimeout(toast.t);
  toast.t = setTimeout(() => t.classList.remove('on'), 2200);
}

async function downscale(file, maxW = 1280) {
  const url = URL.createObjectURL(file);
  try {
    const img = await new Promise((res, rej) => { const i = new Image(); i.onload = () => res(i); i.onerror = rej; i.src = url; });
    const k = Math.min(1, maxW / img.naturalWidth);
    const c = document.createElement('canvas');
    c.width = Math.round(img.naturalWidth * k);
    c.height = Math.round(img.naturalHeight * k);
    c.getContext('2d').drawImage(img, 0, 0, c.width, c.height);
    return c.toDataURL('image/jpeg', 0.82);
  } finally { URL.revokeObjectURL(url); }
}

function elementForm(e) {
  const isNew = !e;
  e = e || { nameZh: '', nameEn: '', category: state.view === 'overview' && state.cat ? state.cat : CATEGORIES[0].key, tags: { era: '', regions: [], touchpoints: [] }, flags: {}, image: '', imageFit: 'cover', notes: '' };
  const extraRegions = e.tags.regions.filter((r) => !REGIONS.includes(r));
  const chk = (name, val, on, label) => `<label class="chk"><input type="checkbox" name="${name}" value="${esc(val)}" ${on ? 'checked' : ''}/><span>${label}</span></label>`;
  openModal(`
    <form class="form" id="elForm">
      <h3>${isNew ? '新增元素 <i>Add element</i>' : '编辑元素 <i>Edit element</i>'}</h3>
      <div class="row2">
        <label>中文名 *<input name="nameZh" required value="${esc(e.nameZh)}" placeholder="如：青花瓷"/></label>
        <label>English name *<input name="nameEn" required value="${esc(e.nameEn)}" placeholder="e.g. Blue-and-white Porcelain"/></label>
      </div>
      <div class="row2">
        <label>大类 Category<select name="category">${CATEGORIES.map((c) => `<option value="${c.key}" ${c.key === e.category ? 'selected' : ''}>${c.zh} ${c.en}</option>`).join('')}</select></label>
        <label>时代 Era<select name="era"><option value="">—</option>${ERAS.map((x) => `<option ${x.zh === e.tags.era ? 'selected' : ''} value="${x.zh}">${x.zh} ${x.en}</option>`).join('')}</select></label>
      </div>
      <fieldset><legend>地域 Region</legend>
        ${REGIONS.map((r) => chk('regions', r, e.tags.regions.includes(r), r)).join('')}
        <input class="inline" name="regionsExtra" value="${esc(extraRegions.join('、'))}" placeholder="其他地域，用顿号分隔"/>
      </fieldset>
      <fieldset><legend>落地触点 Touchpoints</legend>
        ${TOUCHPOINTS.map((t) => chk('touchpoints', t.key, e.tags.touchpoints.includes(t.key), `${t.zh}`)).join('')}
      </fieldset>
      <fieldset><legend>特殊标记 Flags</legend>
        ${Object.entries(FLAGS).map(([k, f]) => chk('flags', k, e.flags[k], `${f.zh} <i>${f.en}</i>`)).join('')}
      </fieldset>
      <fieldset><legend>图片 Image</legend>
        <div class="img-row">
          <div class="img-prev" id="imgPrev" style="background-image:url(&quot;${esc(e.image)}&quot;)"></div>
          <div class="img-inputs">
            <label class="file">上传图片（自动压缩到 1280px）<input type="file" accept="image/*" id="imgFile"/></label>
            <input name="image" id="imgUrl" value="${esc(e.image && !e.image.startsWith('data:') ? e.image : '')}" placeholder="或填写图片地址 https://… / images/xxx.jpg"/>
            <label class="chk"><input type="checkbox" name="contain" ${e.imageFit === 'contain' ? 'checked' : ''}/><span>完整显示（低分辨率 / 竖图时勾选）</span></label>
            <input name="imageCredit" value="${esc(e.imageCredit || '')}" placeholder="图片来源 / 署名（可选）"/>
          </div>
        </div>
      </fieldset>
      <label>备注 Notes<textarea name="notes" rows="2">${esc(e.notes)}</textarea></label>
      <div class="actions">
        ${isNew ? '' : '<button type="button" class="danger" id="delBtn">删除</button>'}
        <span class="sp"></span>
        <button type="button" id="cancelBtn">取消</button>
        <button type="submit" class="primary">${isNew ? '添加并打开' : '保存'}</button>
      </div>
    </form>`, (root) => {
    let dataUrl = e.image && e.image.startsWith('data:') ? e.image : '';
    const prev = $('#imgPrev', root);
    $('#imgFile', root).addEventListener('change', async (ev) => {
      const f = ev.target.files[0];
      if (!f) return;
      dataUrl = await downscale(f);
      $('#imgUrl', root).value = '';
      prev.style.backgroundImage = `url("${dataUrl}")`;
    });
    $('#imgUrl', root).addEventListener('input', (ev) => {
      if (ev.target.value) { dataUrl = ''; prev.style.backgroundImage = `url("${ev.target.value.replace(/"/g, '%22')}")`; }
    });
    $('#cancelBtn', root).onclick = closeModal;
    const del = $('#delBtn', root);
    if (del) del.onclick = () => {
      if (!confirm(`确定删除「${e.nameZh}」？它的打分也会一起删除（建议先导出 JSON 备份）。`)) return;
      store.remove(e.id);
      closeModal();
      state.index = Math.min(state.index, store.elements.length - 1);
      state.view === 'overview' ? renderOverview() : renderElement(true);
    };
    $('#elForm', root).addEventListener('submit', (ev) => {
      ev.preventDefault();
      const fd = new FormData(ev.target);
      const extra = String(fd.get('regionsExtra') || '').split(/[、,，\s]+/).map((s) => s.trim()).filter(Boolean);
      const next = {
        ...e,
        id: isNew ? store.uniqueId(fd.get('nameEn')) : e.id,
        nameZh: fd.get('nameZh').trim(),
        nameEn: fd.get('nameEn').trim(),
        category: fd.get('category'),
        tags: { era: fd.get('era'), regions: [...fd.getAll('regions'), ...extra], touchpoints: fd.getAll('touchpoints') },
        flags: Object.fromEntries(Object.keys(FLAGS).map((k) => [k, fd.getAll('flags').includes(k)])),
        image: dataUrl || String(fd.get('image') || '').trim(),
        imageFit: fd.get('contain') ? 'contain' : 'cover',
        imageCredit: String(fd.get('imageCredit') || '').trim(),
        notes: fd.get('notes'),
        author: e.author || store.group,
      };
      const saved = store.upsert(next);
      closeModal();
      toast(isNew ? '已添加' : '已保存');
      openElement(saved.id);
    });
    $('input[name="nameZh"]', root).focus();
  });
}

function download(name, text, type) {
  const blob = new Blob([text], { type });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 1000);
}
const stamp = () => { const d = new Date(); const p = (n) => String(n).padStart(2, '0'); return `${d.getFullYear()}${p(d.getMonth() + 1)}${p(d.getDate())}-${p(d.getHours())}${p(d.getMinutes())}`; };
const fileBase = () => `vespa-culture-scores${store.group ? '_' + store.group.replace(/[\\/:*?"<>|\s]+/g, '-') : ''}_${stamp()}`;

function dataPanel() {
  openModal(`
    <div class="form">
      <h3>数据 <i>Data</i></h3>
      <p class="muted">打分会自动保存在本浏览器（localStorage）。工作坊结束后请每个小组导出一份，方便汇总。</p>
      <label>小组 / 评分人 Group<input id="groupIn" value="${esc(store.group)}" placeholder="如：第 3 组"/></label>
      <div class="btns">
        <button id="exJson" class="primary">导出 JSON</button>
        <button id="exCsv">导出 CSV（Excel）</button>
        <label class="file btn">导入 JSON（可多选）<input type="file" multiple accept=".json,application/json" id="imJson"/></label>
      </div>
      <div class="btns">
        <button id="exMine" class="primary">提交我新增的元素（${store.mine().length} 个）</button>
      </div>
      <p class="muted small">「提交」会下载一个只含你新增元素（含图片）的小文件，发给老师即可。老师可一次多选导入所有同学的文件，汇总后放进 public/data/shared.json 重新部署，大家就都能看到。导入按 id 合并，新增元素的 id 自带随机后缀，不会互相覆盖。</p>
      <div class="actions"><button class="danger" id="resetBtn">重置为预置数据</button><span class="sp"></span><button id="closeBtn">完成</button></div>
    </div>`, (root) => {
    $('#groupIn', root).addEventListener('input', (ev) => { store.group = ev.target.value.trim(); store.save(); });
    $('#exJson', root).onclick = () => { download(fileBase() + '.json', store.exportJSON(), 'application/json'); toast('已导出 JSON'); };
    $('#exCsv', root).onclick = () => { download(fileBase() + '.csv', store.exportCSV(), 'text/csv;charset=utf-8'); toast('已导出 CSV'); };
    $('#exMine', root).onclick = () => {
      if (!store.mine().length) return alert('你还没有新增元素。先点「＋ 新增」添加几个吧。');
      download(fileBase().replace('culture-scores', 'culture-contrib') + '.json', store.exportMine(), 'application/json');
      toast('已下载，请发给老师');
    };
    $('#imJson', root).addEventListener('change', async (ev) => {
      const files = [...ev.target.files];
      if (!files.length) return;
      try {
        let added = 0, updated = 0;
        for (const f of files) { const r = store.importJSON(await f.text()); added += r.added; updated += r.updated; }
        toast(`导入完成：新增 ${added}，更新 ${updated}`);
        closeModal();
        state.view === 'overview' ? (fillFilters(), renderOverview()) : renderElement(true);
      } catch (err) { alert('导入失败：' + err.message); }
    });
    $('#resetBtn', root).onclick = () => {
      if (!confirm('将清除本浏览器里所有打分、备注和新增元素，恢复预置的 7 个元素。确定吗？（建议先导出 JSON 备份）')) return;
      store.reset();
      state.index = 0;
      closeModal();
      state.view === 'overview' ? renderOverview() : renderElement(true);
      toast('已重置');
    };
    $('#closeBtn', root).onclick = closeModal;
  });
}

// ---------- 按钮 ----------
document.addEventListener('click', (ev) => {
  const b = ev.target.closest('[data-act]');
  if (!b) return;
  const act = b.dataset.act;
  if (act === 'prev') go(-1);
  else if (act === 'next') go(1);
  else if (act === 'overview' || act === 'home') { state.cat = null; showView('overview'); }
  else if (act === 'category') openCategory(current().category);
  else if (act === 'add') elementForm(null);
  else if (act === 'edit') elementForm(current());
  else if (act === 'data') dataPanel();
  else if (act === 'fullscreen') toggleFullscreen();
});
function toggleFullscreen() {
  if (document.fullscreenElement) document.exitFullscreen();
  else document.documentElement.requestFullscreen?.().catch(() => {});
}

// ---------- 键盘 ----------
document.addEventListener('keydown', (ev) => {
  if (!$('#modal').hidden) { if (ev.key === 'Escape') closeModal(); return; }
  const tag = ev.target.tagName;
  if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') {
    if (ev.key === 'Escape') ev.target.blur();
    return;
  }
  if (state.view === 'overview') {
    if (ev.key === 'Escape' && state.cat) { state.cat = null; showView('overview'); }
    return;
  }
  if (ev.ctrlKey || ev.metaKey || ev.altKey) return;
  const k = ev.key;
  if (k === 'ArrowLeft') { go(-1); ev.preventDefault(); }
  else if (k === 'ArrowRight') { go(1); ev.preventDefault(); }
  else if (k === 'ArrowDown' || (k === 'Tab' && !ev.shiftKey)) { setActive((state.active + 1) % 5); ev.preventDefault(); }
  else if (k === 'ArrowUp' || (k === 'Tab' && ev.shiftKey)) { setActive((state.active + 4) % 5); ev.preventDefault(); }
  else if (/^[1-5]$/.test(k)) setScore(state.active, Number(k));
  else if (k === '0' || k === 'Backspace' || k === 'Delete') setScore(state.active, 0);
  else if (k === 'o' || k === 'O' || k === 'Escape') openCategory(current().category);
  else if (k === 'f' || k === 'F') toggleFullscreen();
});
function setActive(i) {
  state.active = i;
  state.hover = null;
  pent.hover = null;
  pent.setActive(i);
  renderQuestion();
}

// 鼠标静止时淡出顶栏，投影更干净
let idleT;
function wake() {
  document.body.classList.remove('idle');
  clearTimeout(idleT);
  idleT = setTimeout(() => document.body.classList.add('idle'), 3000);
}
['pointermove', 'keydown', 'pointerdown'].forEach((t) => document.addEventListener(t, wake, { passive: true }));
wake();

// 窄屏左右滑动切换
let touchX = null;
$('.bg').addEventListener('touchstart', (e) => { touchX = e.touches[0].clientX; }, { passive: true });
$('.bg').addEventListener('touchend', (e) => {
  if (touchX === null) return;
  const dx = e.changedTouches[0].clientX - touchX;
  if (Math.abs(dx) > 50) go(dx < 0 ? 1 : -1);
  touchX = null;
});

window.addEventListener('resize', () => { if (state.view === 'immersive') fitTitles(); });
document.fonts?.ready.then(() => fitTitles());

// ---------- 启动 / 路由 ----------
function route() {
  const h = decodeURIComponent(location.hash);
  if (h.startsWith('#/e/')) {
    const i = store.elements.findIndex((e) => e.id === h.slice(4));
    if (i >= 0 && (i !== state.index || state.view !== 'immersive')) { state.index = i; showView('immersive'); }
  } else if (h.startsWith('#/c/')) {
    const key = h.slice(4);
    if (CATEGORIES.some((c) => c.key === key) && (state.cat !== key || state.view !== 'overview')) openCategory(key);
  } else if (state.view !== 'overview' || state.cat) {
    state.cat = null;
    showView('overview');
  }
}
window.addEventListener('hashchange', route);
pent.setActive(0);
// 打开网页时总是先进入总览（类别卡片）
showView('overview');
// 加载老师发布的共享素材库（没有该文件时静默忽略）
store.loadShared().then((n) => { if (n && state.view === 'overview') { fillFilters(); renderOverview(); } });
