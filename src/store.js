// 数据层：预置 JSON + localStorage 持久化 + 导入导出
import base from './data/elements.json';
import { DIMENSIONS, CATEGORIES, CATEGORY_ALIASES, TOUCHPOINTS, catByKey } from './config.js';
import { areaRatio } from './pentagon.js';

const KEY = 'vespa-cn-culture:v1';
// 已彻底删除的预置元素：旧的 localStorage、共享库、导入文件里出现也会被丢弃
// 玉器（jade）已删除，由中国结（chinese-knot）替代
const REMOVED_IDS = new Set(['jade']);
const REPLACED_BY = { jade: 'chinese-knot' };
const clone = (o) => JSON.parse(JSON.stringify(o));

export function normalize(raw) {
  const e = clone(raw || {});
  e.id = String(e.id || '').trim() || 'el-' + Date.now().toString(36);
  e.nameZh = e.nameZh || '';
  e.nameEn = e.nameEn || '';
  if (CATEGORY_ALIASES[e.category]) e.category = CATEGORY_ALIASES[e.category];
  e.category = CATEGORIES.some((c) => c.key === e.category) ? e.category : CATEGORIES[0].key;
  e.tags = { era: '', regions: [], touchpoints: [], ...(e.tags || {}) };
  e.flags = { vespaUsed: false, culturallySensitive: false, ...(e.flags || {}) };
  e.image = e.image || '';
  e.imageFit = e.imageFit === 'contain' ? 'contain' : 'cover';
  e.imagePosition = e.imagePosition || 'center';
  const s = e.scores || {};
  e.scores = Object.fromEntries(DIMENSIONS.map((d) => [d.key, clampScore(s[d.key])]));
  e.notes = e.notes || '';
  return e;
}
const clampScore = (v) => Math.max(0, Math.min(5, Math.round(Number(v) || 0)));

export const scoreArray = (e) => DIMENSIONS.map((d) => e.scores[d.key] || 0);
export const total = (e) => scoreArray(e).reduce((a, b) => a + b, 0);
export const area = (e) => areaRatio(scoreArray(e));

class Store {
  constructor() {
    this.group = '';
    this.deleted = [];
    let saved = null;
    try { saved = JSON.parse(localStorage.getItem(KEY) || 'null'); } catch {}
    const baseEls = base.elements.map(normalize);
    if (saved && Array.isArray(saved.elements)) {
      this.group = saved.group || '';
      this.deleted = saved.deleted || [];
      // 早期版本里书法存为 symbols（旧的「符号与纹样」），现属艺术与文学
      for (const e of saved.elements) if (e && e.id === 'calligraphy' && e.category === 'symbols') e.category = 'arts';
      // 被删除的元素原位换成替代元素，保持顺序
      this.elements = saved.elements.flatMap((raw) => {
        if (!raw || !REMOVED_IDS.has(raw.id)) return [normalize(raw)];
        const rep = baseEls.find((b) => b.id === REPLACED_BY[raw.id]);
        return rep && !saved.elements.some((x) => x && x.id === rep.id) ? [rep] : [];
      });
      this.deleted = this.deleted.filter((id) => !REMOVED_IDS.has(id));
      // JSON 里新加的预置元素，自动补进来
      for (const b of baseEls) {
        if (!this.elements.some((e) => e.id === b.id) && !this.deleted.includes(b.id)) this.elements.push(b);
      }
    } else {
      this.elements = baseEls;
    }
  }
  save() {
    try {
      localStorage.setItem(KEY, JSON.stringify({ group: this.group, deleted: this.deleted, elements: this.elements, savedAt: new Date().toISOString() }));
      return true;
    } catch (err) {
      alert('保存失败：浏览器存储空间不足（可能是上传的图片太大）。请先导出 JSON 备份，或改用图片地址。');
      return false;
    }
  }
  get(id) { return this.elements.find((e) => e.id === id); }
  setScore(id, key, v) { const e = this.get(id); if (!e) return; e.scores[key] = clampScore(v); this.save(); }
  upsert(raw) {
    const e = normalize(raw);
    const i = this.elements.findIndex((x) => x.id === e.id);
    if (i >= 0) this.elements[i] = e; else this.elements.push(e);
    this.deleted = this.deleted.filter((d) => d !== e.id);
    this.save();
    return e;
  }
  remove(id) {
    this.elements = this.elements.filter((e) => e.id !== id);
    if (!this.deleted.includes(id)) this.deleted.push(id);
    this.save();
  }
  reset() {
    localStorage.removeItem(KEY);
    this.elements = base.elements.map(normalize);
    this.deleted = [];
    this.save();
  }
  // 新增元素的 id 带随机后缀：不同同学各自新增同名元素，汇总合并时不会互相覆盖
  uniqueId(seed) {
    const id = (seed || '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 40) || 'element';
    let k;
    do { k = `${id}-${Math.random().toString(36).slice(2, 6)}`; } while (this.get(k));
    return k;
  }

  // ---------- 共享素材库（无后端）----------
  // 老师把汇总后的 JSON 放到 public/data/shared.json 并重新部署，所有人打开网页就能看到大家新增的元素。
  async loadShared() {
    try {
      const res = await fetch(new URL('data/shared.json?t=' + Date.now(), document.baseURI));
      if (!res.ok) return 0;
      const data = await res.json();
      const list = Array.isArray(data) ? data : data.elements;
      if (!Array.isArray(list)) return 0;
      let added = 0;
      for (const raw of list) {
        const e = normalize({ ...raw, origin: 'shared' });
        if (REMOVED_IDS.has(e.id) || this.get(e.id) || this.deleted.includes(e.id)) continue;
        this.elements.push(e);
        added++;
      }
      return added;
    } catch { return 0; }
  }
  // 我新增的元素（不含预置和共享库里的），用于提交给老师
  mine() {
    const presetIds = new Set(base.elements.map((b) => b.id));
    return this.elements.filter((e) => !presetIds.has(e.id) && e.origin !== 'shared');
  }
  exportMine() {
    return JSON.stringify({
      version: 1, app: 'vespa-cn-culture', kind: 'contribution', group: this.group, exportedAt: new Date().toISOString(),
      elements: this.mine().map((e) => ({ ...e, author: e.author || this.group })),
    }, null, 2);
  }

  // ---------- 导入导出 ----------
  exportJSON() {
    return JSON.stringify({
      version: 1, app: 'vespa-cn-culture', group: this.group, exportedAt: new Date().toISOString(),
      dimensions: DIMENSIONS.map(({ key, zh, en }) => ({ key, zh, en })),
      elements: this.elements,
    }, null, 2);
  }
  importJSON(text) {
    const data = JSON.parse(text);
    const list = Array.isArray(data) ? data : data.elements;
    if (!Array.isArray(list)) throw new Error('文件里没有 elements 数组');
    let added = 0, updated = 0;
    for (const raw of list) {
      if (raw && REMOVED_IDS.has(raw.id)) continue;
      const e = normalize(raw);
      const i = this.elements.findIndex((x) => x.id === e.id);
      if (i >= 0) { this.elements[i] = e; updated++; } else { this.elements.push(e); added++; }
      this.deleted = this.deleted.filter((d) => d !== e.id);
    }
    this.save();
    return { added, updated, group: data.group || '' };
  }
  exportCSV() {
    const head = ['group', 'id', 'name_zh', 'name_en', 'category_zh', 'category_en', 'era', 'regions', 'touchpoints',
      'vespa_used', 'culturally_sensitive',
      ...DIMENSIONS.map((d) => `${d.key} (${d.zh})`), 'total_25', 'area_pct', 'notes'];
    const rows = this.elements.map((e) => {
      const c = catByKey(e.category);
      return [this.group, e.id, e.nameZh, e.nameEn, c.zh, c.en, e.tags.era, e.tags.regions.join('/'),
        e.tags.touchpoints.map((k) => (TOUCHPOINTS.find((t) => t.key === k) || { zh: k }).zh).join('/'),
        e.flags.vespaUsed ? 1 : 0, e.flags.culturallySensitive ? 1 : 0,
        ...scoreArray(e), total(e), (area(e) * 100).toFixed(1), e.notes];
    });
    const esc = (v) => { const s = String(v ?? ''); return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s; };
    // 加 BOM，Excel 打开中文不乱码
    return String.fromCharCode(0xfeff) + [head, ...rows].map((r) => r.map(esc).join(',')).join('\r\n');
  }
}

export const store = new Store();
