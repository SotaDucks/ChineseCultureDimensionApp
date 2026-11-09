// 五边形雷达图：纯 SVG 实现，支持拖拽吸附、点击刻度、平滑过渡
import { DIMENSIONS } from './config.js';

const NS = 'http://www.w3.org/2000/svg';
const N = 5;
const R = 130; // 5 分对应的半径
const LABEL_R = R + 22;

const ang = (i) => ((-90 + 72 * i) * Math.PI) / 180;
const unit = (i) => [Math.cos(ang(i)), Math.sin(ang(i))];
const pt = (i, r) => { const [x, y] = unit(i); return [x * r, y * r]; };
const ptsStr = (vals, radius = R) =>
  vals.map((v, i) => pt(i, (v / 5) * radius).map((n) => n.toFixed(2)).join(',')).join(' ');

/** 归一化面积：0–1，相对于满分五边形 */
export function areaRatio(scores) {
  let s = 0;
  for (let i = 0; i < N; i++) s += scores[i] * scores[(i + 1) % N];
  return s / 125;
}

/** 总览卡片用的小五边形（静态字符串） */
export function miniPentagonSVG(scores) {
  const r = 40;
  const rings = [1, 2, 3, 4, 5]
    .map((l) => `<polygon class="m-ring${l === 5 ? ' outer' : ''}" points="${ptsStr([l, l, l, l, l], r)}"/>`)
    .join('');
  const axes = DIMENSIONS.map((_, i) => { const [x, y] = pt(i, r); return `<line class="m-axis" x1="0" y1="0" x2="${x.toFixed(2)}" y2="${y.toFixed(2)}"/>`; }).join('');
  const any = scores.some((v) => v > 0);
  const shape = any ? `<polygon class="m-shape" points="${ptsStr(scores, r)}"/>` : '';
  return `<svg class="mini-pentagon" viewBox="-48 -46 96 88" aria-hidden="true">${rings}${axes}${shape}</svg>`;
}

function el(tag, attrs = {}, parent) {
  const e = document.createElementNS(NS, tag);
  for (const k in attrs) e.setAttribute(k, attrs[k]);
  if (parent) parent.appendChild(e);
  return e;
}

export class Pentagon {
  constructor(host, { onScore, onActive, onHover } = {}) {
    this.onScore = onScore || (() => {});
    this.onActive = onActive || (() => {});
    this.onHover = onHover || (() => {});
    this.scores = [0, 0, 0, 0, 0];
    this.disp = [0, 0, 0, 0, 0];
    this.active = 0;
    this.hover = null;
    this.drag = null;
    this.build(host);
    this.render();
  }

  build(host) {
    const svg = (this.svg = el('svg', {
      class: 'pentagon', viewBox: '-250 -192 500 372', role: 'group',
      'aria-label': '五维评分五边形',
    }));
    host.appendChild(svg);

    const grid = el('g', { class: 'grid' }, svg);
    for (let l = 1; l <= 5; l++) {
      el('polygon', { class: 'ring' + (l === 5 ? ' outer' : ''), points: ptsStr([l, l, l, l, l]) }, grid);
    }
    this.axes = DIMENSIONS.map((_, i) => {
      const [x, y] = pt(i, R);
      return el('line', { class: 'axis', x1: 0, y1: 0, x2: x, y2: y }, grid);
    });

    this.shape = el('polygon', { class: 'shape', points: ptsStr(this.disp) }, svg);

    // 刻度点（可点击）
    const ticks = el('g', { class: 'ticks' }, svg);
    this.ticks = DIMENSIONS.map((_, i) =>
      [1, 2, 3, 4, 5].map((l) => {
        const [x, y] = pt(i, (l / 5) * R);
        return el('circle', { class: 'tick', cx: x, cy: y, r: 2.6 }, ticks);
      })
    );

    // 控制点
    const handles = el('g', { class: 'handles' }, svg);
    this.handles = DIMENSIONS.map(() => el('circle', { class: 'handle', r: 6.5, cx: 0, cy: 0 }, handles));

    // 维度标签
    const labels = el('g', { class: 'labels' }, svg);
    this.labels = DIMENSIONS.map((d, i) => this.buildLabel(d, i, labels));

    svg.addEventListener('pointerdown', (e) => this.down(e));
    svg.addEventListener('pointermove', (e) => this.move(e));
    svg.addEventListener('pointerup', (e) => this.up(e));
    svg.addEventListener('pointercancel', (e) => this.up(e));
    svg.addEventListener('pointerleave', () => { if (!this.drag) this.setHover(null); });
  }

  buildLabel(d, i, parent) {
    const [x, y] = pt(i, LABEL_R);
    const g = el('g', { class: 'label', 'data-i': i }, parent);
    let anchor = 'middle';
    if (i === 1 || i === 2) anchor = 'start';
    if (i === 3 || i === 4) anchor = 'end';
    // 英文名过长则拆成两行
    const words = d.en.split(' ');
    const enLines = d.en.length > 12 && words.length > 1
      ? [words.slice(0, Math.ceil(words.length / 2)).join(' '), words.slice(Math.ceil(words.length / 2)).join(' ')]
      : [d.en];
    const lineH = 13;
    const blockH = 18 + enLines.length * lineH;
    let top; // 文本块顶部 y
    if (i === 0) top = y - blockH - 2;
    else if (i === 1 || i === 4) top = y - blockH / 2;
    else top = y + 4;
    const dx = i === 2 ? -6 : i === 3 ? 6 : 0; // 底部两个标签略向内收
    const zh = el('text', { class: 'l-zh', x: x + dx, y: top + 15, 'text-anchor': anchor }, g);
    zh.textContent = d.zh;
    enLines.forEach((line, k) => {
      const t = el('text', { class: 'l-en', x: x + dx, y: top + 18 + lineH * (k + 1) - 2, 'text-anchor': anchor }, g);
      t.textContent = line.toUpperCase();
    });
    // 透明点击区域
    const bb = { w: 120, h: blockH + 6 };
    const rx = anchor === 'start' ? x + dx - 4 : anchor === 'end' ? x + dx - bb.w + 4 : x - bb.w / 2;
    el('rect', { class: 'l-hit', x: rx, y: top - 2, width: bb.w, height: bb.h }, g);
    g.addEventListener('pointerdown', (e) => { e.stopPropagation(); this.setActive(i, true); });
    g.addEventListener('pointerenter', () => this.setHover(i));
    g.addEventListener('pointerleave', () => this.setHover(null));
    return g;
  }

  // ---------- 交互 ----------
  local(e) {
    const p = this.svg.createSVGPoint();
    p.x = e.clientX; p.y = e.clientY;
    const q = p.matrixTransform(this.svg.getScreenCTM().inverse());
    return [q.x, q.y];
  }
  nearestAxis([x, y]) {
    let best = 0, bestDot = -Infinity;
    const len = Math.hypot(x, y) || 1;
    for (let i = 0; i < N; i++) {
      const [ux, uy] = unit(i);
      const d = (x * ux + y * uy) / len;
      if (d > bestDot) { bestDot = d; best = i; }
    }
    return best;
  }
  project(i, [x, y]) {
    const [ux, uy] = unit(i);
    const s = Math.round(((x * ux + y * uy) / R) * 5);
    return Math.max(0, Math.min(5, s));
  }
  down(e) {
    if (e.button !== undefined && e.button !== 0) return;
    const p = this.local(e);
    const dist = Math.hypot(p[0], p[1]);
    if (dist > R + 18) return;
    let axis = null;
    // 优先抓取已打分的控制点
    for (let i = 0; i < N; i++) {
      if (this.scores[i] <= 0) continue;
      const [hx, hy] = pt(i, (this.scores[i] / 5) * R);
      if (Math.hypot(p[0] - hx, p[1] - hy) < 14) { axis = i; break; }
    }
    // 在中心按下：根据拖动方向决定是哪条轴
    if (axis === null && dist >= 14) axis = this.nearestAxis(p);
    this.drag = { axis, start: p, id: e.pointerId };
    this.svg.setPointerCapture(e.pointerId);
    this.svg.classList.add('dragging');
    if (axis !== null) { this.setActive(axis, true); this.apply(axis, p); }
    e.preventDefault();
  }
  move(e) {
    const p = this.local(e);
    if (this.drag) {
      if (this.drag.axis === null) {
        const v = [p[0] - this.drag.start[0], p[1] - this.drag.start[1]];
        if (Math.hypot(v[0], v[1]) < 6) return;
        this.drag.axis = this.nearestAxis(v);
        this.setActive(this.drag.axis, true);
      }
      this.apply(this.drag.axis, p);
      return;
    }
    const dist = Math.hypot(p[0], p[1]);
    if (dist <= R + 18 && dist > 12) this.setHover(this.nearestAxis(p));
    else if (dist > R + 18 && !e.target.closest('.label')) this.setHover(null);
  }
  up(e) {
    if (!this.drag) return;
    try { this.svg.releasePointerCapture(e.pointerId); } catch {}
    this.drag = null;
    this.svg.classList.remove('dragging');
  }
  apply(i, p) {
    const s = this.project(i, p);
    if (s !== this.scores[i]) this.onScore(i, s);
  }

  // ---------- 外部接口 ----------
  setScores(scores, animate = true) {
    this.scores = scores.slice();
    if (!animate) { this.disp = scores.slice(); this.render(); return; }
    const from = this.disp.slice();
    const t0 = performance.now();
    const dur = 380;
    cancelAnimationFrame(this.raf);
    const step = (t) => {
      const k = Math.min(1, (t - t0) / dur);
      const e = 1 - Math.pow(1 - k, 3);
      this.disp = from.map((f, i) => f + (this.scores[i] - f) * e);
      this.render();
      if (k < 1) this.raf = requestAnimationFrame(step);
    };
    this.raf = requestAnimationFrame(step);
  }
  setActive(i, fromUser = false) {
    this.active = i;
    this.render();
    if (fromUser) this.onActive(i);
  }
  setHover(i) {
    if (this.hover === i) return;
    this.hover = i;
    this.render();
    this.onHover(i);
  }

  render() {
    this.shape.setAttribute('points', ptsStr(this.disp));
    this.svg.classList.toggle('has-score', this.scores.some((v) => v > 0));
    for (let i = 0; i < N; i++) {
      const [x, y] = pt(i, (this.disp[i] / 5) * R);
      const h = this.handles[i];
      h.setAttribute('cx', x.toFixed(2));
      h.setAttribute('cy', y.toFixed(2));
      h.classList.toggle('scored', this.scores[i] > 0);
      const on = i === this.active;
      const hov = i === this.hover;
      h.classList.toggle('active', on);
      this.axes[i].classList.toggle('active', on);
      this.axes[i].classList.toggle('hover', hov);
      this.labels[i].classList.toggle('active', on);
      this.labels[i].classList.toggle('hover', hov);
      this.ticks[i].forEach((t, l) => {
        t.classList.toggle('lit', l + 1 <= this.scores[i]);
        t.classList.toggle('on-axis', on || hov);
      });
    }
  }
}
