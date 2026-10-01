/* =========================================================
   DRIP & POUR — script.js
   Three.js scene + GSAP ScrollTrigger choreography
   ========================================================= */
(() => {
'use strict';

/* ---------- helpers ---------- */
const $ = (s, c = document) => c.querySelector(s);
const $$ = (s, c = document) => Array.from(c.querySelectorAll(s));
const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
const lerp = (a, b, t) => a + (b - a) * t;
const smooth = t => t * t * (3 - 2 * t);
const easeInOut = t => (t < .5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
const easeOut = t => 1 - Math.pow(1 - t, 3);
const damp = (a, b, k, dt) => a + (b - a) * (1 - Math.exp(-k * dt));
const rand = (a, b) => a + Math.random() * (b - a);

const RM = matchMedia('(prefers-reduced-motion: reduce)').matches;
const COARSE = matchMedia('(pointer: coarse)').matches;
const FINE = matchMedia('(hover: hover) and (pointer: fine)').matches;
const LOW = COARSE || innerWidth < 760 || (navigator.hardwareConcurrency || 8) <= 4;
const HAS_GSAP = typeof gsap !== 'undefined' && typeof ScrollTrigger !== 'undefined';
const HAS_THREE = typeof THREE !== 'undefined';
if (HAS_GSAP) gsap.registerPlugin(ScrollTrigger, ...(typeof ScrollToPlugin !== 'undefined' ? [ScrollToPlugin] : []));
if (FINE) document.body.classList.add('fine');

/* ---------- data ---------- */
const DRINKS = [
  { key: 'berry', name: 'BERRY NOIR', type: 'Dark berry sparkling', ingredients: ['Raspberry', 'Blackberry', 'Lime'],
    desc: 'Raspberry and blackberry pressed cold, lifted by lime zest and a long, fine fizz. Dark, jammy and impossibly bright on the finish.',
    price: 12, glass: 'highball', fill: .82, ice: 4,
    liq: ['#2b0418', '#d11a62'], surf: '#ff5c93', glow: '#e0105a', accent: '#ff3d7f', bg: ['#4a0d2a', '#090209'] },
  { key: 'citrus', name: 'CITRUS FIZZ', type: 'Bright citrus sparkling', ingredients: ['Orange', 'Lemon', 'Sparkling water'],
    desc: 'Sun-ripened orange and sharp lemon over crushed ice, finished with a crackle of sparkling water. Pure morning light in a glass.',
    price: 11, glass: 'balloon', fill: .78, ice: 4,
    liq: ['#ff7a00', '#ffd23f'], surf: '#ffe27a', glow: '#ff9a1f', accent: '#ff8a1f', bg: ['#6b2a00', '#0c0602'] },
  { key: 'mint', name: 'MINT CLOUD', type: 'Cool green refresher', ingredients: ['Mint', 'Lime', 'Cucumber'],
    desc: 'Cool-pressed mint, lime and cucumber folded into a cloud-soft sparkle. Calm, green and completely weightless.',
    price: 11, glass: 'collins', fill: .85, ice: 5,
    liq: ['#6fd49a', '#e6ffd2'], surf: '#f0ffe0', glow: '#8affb0', accent: '#b6f23a', bg: ['#0f4a3a', '#020a08'] },
  { key: 'cola', name: 'MIDNIGHT COLA', type: 'Spiced dark cola', ingredients: ['Cola', 'Vanilla', 'Spices'],
    desc: 'Slow-steeped cola nut, Madagascan vanilla and warm winter spice. Deep amber, velvet bubbles — a midnight classic, reborn.',
    price: 13, glass: 'contour', fill: .85, ice: 4,
    liq: ['#140603', '#6a300f'], surf: '#a65a22', glow: '#ff7a2a', accent: '#ff9a4a', bg: ['#3a1a0c', '#060302'] },
  { key: 'tropical', name: 'TROPICAL SUN', type: 'Golden tropical', ingredients: ['Mango', 'Pineapple', 'Passion fruit'],
    desc: 'Alphonso mango, golden pineapple and tart passion fruit — poured thick, bright and unapologetically sunny.',
    price: 12, glass: 'hurricane', fill: .8, ice: 3,
    liq: ['#ff6a00', '#ffe14d'], surf: '#ffe97a', glow: '#ffb020', accent: '#ffb61f', bg: ['#6b3300', '#0c0603'] },
  { key: 'rose', name: 'ROSE BLOOM', type: 'Floral pink sparkling', ingredients: ['Strawberry', 'Rose', 'Lychee'],
    desc: 'Wild strawberry, Damask rose and lychee in a petal-pink, silk-smooth pour. Floral, delicate — and a little dangerous.',
    price: 14, glass: 'coupe', fill: .82, ice: 0,
    liq: ['#ff6f9c', '#ffd1e0'], surf: '#ffe3ec', glow: '#ff7aa8', accent: '#ff6fa3', bg: ['#5a1530', '#0a0307'] }
];

/* ---------- state ---------- */
const st = {
  S: 0, St: 0, w: 0, db: 0, detail: -1, detailOpen: false, hover: -1, intro: RM ? 1 : 0,
  mx: 0, my: 0, tx: 0, ty: 0, nx: 5, ny: 5, energy: 0, lastX: 0, lastY: 0
};
let gl = null;
let cart = [];
try { cart = JSON.parse(localStorage.getItem('dp-cart') || '[]') || []; } catch (e) { cart = []; }

/* =========================================================
   DOM BUILDERS
   ========================================================= */
function splitChars(el) {
  const txt = el.textContent;
  el.textContent = '';
  el.setAttribute('aria-label', txt);
  Array.from(txt).forEach(c => {
    const s = document.createElement('span');
    s.className = 'ch';
    s.setAttribute('aria-hidden', 'true');
    s.textContent = c === ' ' ? '\u00a0' : c;
    el.appendChild(s);
  });
}

function buildStages() {
  const j = $('#journey'), fin = $('#stage7');
  DRINKS.forEach((d, i) => {
    const sec = document.createElement('section');
    sec.className = 'stage drink-stage ' + (i % 2 ? 'right' : 'left');
    sec.id = 'stage' + (i + 1);
    sec.dataset.i = i;
    sec.style.setProperty('--accent', d.accent);
    sec.innerHTML = `
      <div class="stage-no" aria-hidden="true">0${i + 1}</div>
      <div class="panel">
        <p class="kicker"><span class="idx">0${i + 1}</span><span class="bar"></span><span class="type">${d.type}</span></p>
        <h2 class="title">${d.name.split(' ').map(w => `<span class="line"><span class="word">${w}</span></span>`).join('')}</h2>
        <ul class="notes">${d.ingredients.map((n, k) => `<li><b>0${k + 1}</b>${n}</li>`).join('')}</ul>
        <p class="desc">${d.desc}</p>
        <div class="actions">
          <button class="btn magnetic" data-open="${i}"><span>Discover</span></button>
          <button class="btn ghost magnetic" data-add="${i}"><span>Add — $${d.price}</span></button>
        </div>
      </div>`;
    j.insertBefore(sec, fin);
  });
  $$('.title .word, .fin-title .word:not(.serif-it), .hw-m').forEach(splitChars);
  const si = $('.fin-title .serif-it'); if (si) splitChars(si);
}

function buildRail() {
  const r = $('#rail');
  ['Intro', ...DRINKS.map(d => d.name), 'Collection'].forEach((n, i) => {
    const b = document.createElement('button');
    b.className = 'rail-dot' + (i === 0 ? ' active' : '');
    b.setAttribute('aria-label', 'Go to ' + n);
    b.innerHTML = `<span class="rl">${n}</span><i></i>`;
    b.addEventListener('click', () => goStage(i));
    r.appendChild(b);
  });
}

/* =========================================================
   NAVIGATION / SCROLL HELPERS
   ========================================================= */
function scrollToY(y, dur = 1.8) {
  if (HAS_GSAP && typeof ScrollToPlugin !== 'undefined' && !RM) {
    gsap.to(window, { scrollTo: { y, autoKill: true }, duration: dur, ease: 'power3.inOut' });
  } else window.scrollTo({ top: y, behavior: RM ? 'auto' : 'smooth' });
}
function goStage(n) {
  closeCart();
  if (st.detailOpen) closeDetail();
  const jh = $('#journey').offsetHeight;
  if (n === 'about') return scrollToY(jh, 2.2);
  scrollToY(Math.round(jh / 8 * n), 1.6 + Math.abs(n - st.S) * .12);
}

/* =========================================================
   UI: cursor, magnetic, nav, cart, detail
   ========================================================= */
const cur = { x: innerWidth / 2, y: innerHeight / 2, rx: innerWidth / 2, ry: innerHeight / 2, gx: innerWidth / 2, gy: innerHeight / 2 };
const elDot = $('.cursor-dot'), elRing = $('.cursor-ring'), elGlow = $('#glow');

function setupCursor() {
  addEventListener('pointerover', e => {
    const t = e.target.closest && e.target.closest('a,button,input,[data-cursor],.llabel.on');
    document.body.classList.toggle('hovering', !!t);
  });
  addEventListener('pointerdown', () => document.body.classList.add('pressed'));
  addEventListener('pointerup', () => document.body.classList.remove('pressed'));
  document.addEventListener('mouseleave', () => { elDot.style.opacity = 0; elRing.style.opacity = 0; });
  document.addEventListener('mouseenter', () => { elDot.style.opacity = 1; elRing.style.opacity = 1; });
}

function magnetic(el) {
  if (!FINE || !HAS_GSAP || RM) return;
  const xTo = gsap.quickTo(el, 'x', { duration: .7, ease: 'elastic.out(1,.6)' });
  const yTo = gsap.quickTo(el, 'y', { duration: .7, ease: 'elastic.out(1,.6)' });
  el.addEventListener('pointermove', e => {
    const r = el.getBoundingClientRect();
    xTo((e.clientX - (r.left + r.width / 2)) * .32);
    yTo((e.clientY - (r.top + r.height / 2)) * .42);
  });
  el.addEventListener('pointerleave', () => { xTo(0); yTo(0); });
}

let toastT;
function toast(msg) {
  const t = $('#toast');
  t.textContent = msg;
  t.classList.add('show');
  clearTimeout(toastT);
  toastT = setTimeout(() => t.classList.remove('show'), 2400);
}

/* cart */
const money = n => '$' + n.toFixed(2);
function saveCart() { try { localStorage.setItem('dp-cart', JSON.stringify(cart)); } catch (e) { /* ignore */ } }
function addToCart(i) {
  const f = cart.find(c => c.i === i);
  if (f) f.q++; else cart.push({ i, q: 1 });
  saveCart(); renderCart();
  toast(DRINKS[i].name + ' added to cart');
  const cc = $('#cartCount');
  cc.classList.remove('bump'); void cc.offsetWidth; cc.classList.add('bump');
}
function renderCart() {
  const list = $('#cartList');
  list.innerHTML = cart.map(c => {
    const d = DRINKS[c.i];
    return `<li><div><b>${d.name}</b><small>${money(d.price)} each</small></div>
      <div class="qty"><button data-q="-1" data-i="${c.i}" aria-label="Decrease">−</button><span>${c.q}</span><button data-q="1" data-i="${c.i}" aria-label="Increase">+</button></div></li>`;
  }).join('');
  $('#cartEmpty').style.display = cart.length ? 'none' : 'block';
  const count = cart.reduce((a, c) => a + c.q, 0);
  $('#cartCount').textContent = count;
  $('#cartTotal').textContent = money(cart.reduce((a, c) => a + c.q * DRINKS[c.i].price, 0));
}
function openCart() {
  $('#cart').classList.add('open'); $('#scrim').classList.add('on');
  $('#cart').setAttribute('aria-hidden', 'false');
  document.documentElement.classList.add('locked');
}
function closeCart() {
  if (!$('#cart').classList.contains('open')) return;
  $('#cart').classList.remove('open'); $('#scrim').classList.remove('on');
  $('#cart').setAttribute('aria-hidden', 'true');
  if (!st.detailOpen) document.documentElement.classList.remove('locked');
}

/* detail */
const detailEl = $('#detail');
function openDetail(i) {
  if (st.detailOpen || !DRINKS[i]) return;
  const d = DRINKS[i];
  st.detail = i; st.detailOpen = true;
  $('#dNo').textContent = '0' + (i + 1) + ' / 06';
  $('#dType').textContent = d.type;
  $('#dName').innerHTML = d.name.split(' ').map(w => `<span class="line"><span class="word">${w}</span></span>`).join('');
  $$('#dName .word').forEach(splitChars);
  $('#dDesc').textContent = d.desc;
  $('#dIng').innerHTML = d.ingredients.map(n => `<li class="anim"><i></i>${n}</li>`).join('');
  $('#dPrice').textContent = money(d.price);
  detailEl.style.setProperty('--accent', d.accent);
  document.documentElement.style.setProperty('--accent', d.accent);
  detailEl.dataset.i = i;
  detailEl.classList.add('open');
  detailEl.setAttribute('aria-hidden', 'false');
  document.documentElement.classList.add('locked');
  document.body.classList.add('in-detail');
  document.body.classList.remove('on-drink');
  if (HAS_GSAP) {
    gsap.killTweensOf(st, 'db');
    gsap.to(st, { db: 1, duration: RM ? .01 : 1.7, ease: 'power3.inOut' });
    gsap.set('#detail .d-panel, #detailClose', { opacity: 1 });
    gsap.fromTo('#detail .ch', { yPercent: 115, opacity: 0 }, { yPercent: 0, opacity: 1, duration: 1, stagger: .035, ease: 'power4.out', delay: .55 });
    gsap.fromTo('#detail .anim', { y: 30, opacity: 0 }, { y: 0, opacity: 1, duration: .9, stagger: .08, ease: 'power3.out', delay: .7 });
    gsap.fromTo('#detailClose', { scale: .4, opacity: 0, rotate: -90 }, { scale: 1, opacity: 1, rotate: 0, duration: 1, ease: 'power4.out', delay: .9 });
  } else { st.db = 1; }
}
function closeDetail() {
  if (!st.detailOpen) return;
  st.detailOpen = false;
  document.body.classList.remove('in-detail');
  detailEl.setAttribute('aria-hidden', 'true');
  if (!$('#cart').classList.contains('open')) document.documentElement.classList.remove('locked');
  if (HAS_GSAP) {
    gsap.killTweensOf(st, 'db');
    gsap.to('#detail .d-panel, #detailClose', { opacity: 0, duration: .35, onComplete: () => { if (!st.detailOpen) detailEl.classList.remove('open'); } });
    gsap.to(st, { db: 0, duration: RM ? .01 : 1.3, ease: 'power3.inOut', onComplete: () => { if (!st.detailOpen) st.detail = -1; } });
  } else { st.db = 0; st.detail = -1; detailEl.classList.remove('open'); }
  const lastI = st.detail >= 0 ? st.detail : 0;
  document.documentElement.style.setProperty('--accent', DRINKS[lastI].accent);
}

function setupUI() {
  setupCursor();
  /* delegated clicks */
  document.addEventListener('click', e => {
    const go = e.target.closest('[data-go]');
    if (go) { e.preventDefault(); $('#nav').classList.remove('open'); $('#menuBtn').setAttribute('aria-expanded', 'false'); const v = go.dataset.go; goStage(v === 'about' ? 'about' : +v); return; }
    const sh = e.target.closest('[data-shop]');
    if (sh) { e.preventDefault(); $('#nav').classList.remove('open'); openCart(); return; }
    const op = e.target.closest('[data-open]');
    if (op) { openDetail(+op.dataset.open); return; }
    const ad = e.target.closest('[data-add]');
    if (ad) { addToCart(+ad.dataset.add); return; }
    const tt = e.target.closest('[data-toast]');
    if (tt) { e.preventDefault(); toast(tt.dataset.toast); return; }
    const q = e.target.closest('[data-q]');
    if (q) {
      const i = +q.dataset.i, c = cart.find(x => x.i === i);
      if (c) { c.q += +q.dataset.q; if (c.q <= 0) cart = cart.filter(x => x.i !== i); saveCart(); renderCart(); }
    }
  });
  $('#detailClose').addEventListener('click', closeDetail);
  $('#dAdd').addEventListener('click', () => { if (st.detail >= 0) addToCart(st.detail); });
  $('#cartClose').addEventListener('click', e => { e.preventDefault(); closeCart(); });
  $('#scrim').addEventListener('click', closeCart);
  $('#checkout').addEventListener('click', () => {
    if (!cart.length) return toast('Your cart is empty');
    toast('Demo checkout — thank you!');
    cart = []; saveCart(); renderCart(); setTimeout(closeCart, 700);
  });
  $('#news').addEventListener('submit', e => { e.preventDefault(); toast('Welcome to the pour list'); e.target.reset(); });
  $('#menuBtn').addEventListener('click', () => {
    const n = $('#nav'); const o = n.classList.toggle('open');
    $('#menuBtn').setAttribute('aria-expanded', o);
  });
  addEventListener('keydown', e => {
    if (e.key === 'Escape') { if ($('#cart').classList.contains('open')) closeCart(); else closeDetail(); }
  });
  /* quick add */
  $('#quick').innerHTML = DRINKS.map((d, i) => `<button data-add="${i}" style="--c:${d.accent}"><i></i><span>${d.name.split(' ')[0]}</span><b>$${d.price}</b></button>`).join('');
  $$('.magnetic').forEach(magnetic);
  renderCart();

  /* pointer tracking (mouse + touch) */
  const move = e => {
    const x = e.clientX, y = e.clientY;
    cur.x = x; cur.y = y;
    st.nx = (x / innerWidth) * 2 - 1;
    st.ny = -(y / innerHeight) * 2 + 1;
    st.tx = st.nx; st.ty = st.ny;
    const sp = Math.hypot(x - st.lastX, y - st.lastY);
    st.energy = Math.min(1.6, st.energy + sp / 260);
    st.lastX = x; st.lastY = y;
    if (gl) gl.needHover = true;
  };
  addEventListener('pointermove', move, { passive: true });
  addEventListener('pointerdown', move, { passive: true });
  const leave = () => { st.tx = 0; st.ty = 0; st.nx = 5; st.ny = 5; st.hover = -1; document.body.classList.remove('on-drink'); };
  addEventListener('pointerup', e => { if (e.pointerType !== 'mouse') leave(); });
  addEventListener('pointercancel', leave);
  document.addEventListener('mouseleave', leave);
}

/* =========================================================
   THREE.JS SCENE
   ========================================================= */
function initGL() {
  const T = THREE;
  const V2 = T.Vector2, V3 = T.Vector3;
  const canvas = $('#gl');

  const renderer = new T.WebGLRenderer({ canvas, antialias: !LOW, alpha: true, powerPreference: 'high-performance' });
  let pr = Math.min(devicePixelRatio || 1, LOW ? 1.5 : 2);
  renderer.setPixelRatio(pr);
  renderer.toneMapping = T.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.3;
  renderer.setClearColor(0x000000, 0);

  const scene = new T.Scene();
  const camera = new T.PerspectiveCamera(32, 1, .1, 100);
  const ray = new T.Raycaster();
  const mouseV = new V2();
  const tv = new V3();
  const dummy = new T.Object3D();

  /* ----- procedural studio environment (reflections) ----- */
  function buildEnv() {
    const s = new T.Scene();
    s.add(new T.Mesh(new T.BoxGeometry(30, 30, 30), new T.MeshBasicMaterial({ color: 0x030303, side: T.BackSide })));
    const panel = (w, h, color, k, pos) => {
      const m = new T.Mesh(new T.PlaneGeometry(w, h), new T.MeshBasicMaterial({ color: new T.Color(color).multiplyScalar(k), side: T.DoubleSide }));
      m.position.set(pos[0], pos[1], pos[2]); m.lookAt(0, 0, 0); s.add(m);
    };
    panel(14, 3, 0xffffff, 6, [0, 11, 2]);
    panel(1.6, 18, 0xbfe6ff, 7, [-9, 0, 3]);
    panel(1.6, 18, 0xffb070, 5, [9, 0, 2]);
    panel(10, 1, 0xffffff, 4, [0, -6, 8]);
    panel(5, 5, 0xffffff, 2, [0, 2, -10]);
    const pm = new T.PMREMGenerator(renderer);
    const rt = pm.fromScene(s, .03);
    pm.dispose();
    return rt.texture;
  }
  scene.environment = buildEnv();

  /* ----- textures ----- */
  function radialTex(stops) {
    const c = document.createElement('canvas'); c.width = c.height = 128;
    const x = c.getContext('2d'); const g = x.createRadialGradient(64, 64, 0, 64, 64, 64);
    stops.forEach(s => g.addColorStop(s[0], s[1]));
    x.fillStyle = g; x.fillRect(0, 0, 128, 128);
    return new T.CanvasTexture(c);
  }
  const glowTex = radialTex([[0, 'rgba(255,255,255,1)'], [.35, 'rgba(255,255,255,.3)'], [1, 'rgba(255,255,255,0)']]);
  const floorTex = radialTex([[0, 'rgba(255,255,255,.9)'], [.4, 'rgba(255,255,255,.22)'], [1, 'rgba(255,255,255,0)']]);
  const streakTex = (() => {
    const c = document.createElement('canvas'); c.width = 256; c.height = 8;
    const x = c.getContext('2d'); const g = x.createLinearGradient(0, 0, 256, 0);
    g.addColorStop(0, 'rgba(255,255,255,0)'); g.addColorStop(.5, 'rgba(255,255,255,1)'); g.addColorStop(1, 'rgba(255,255,255,0)');
    x.fillStyle = g; x.fillRect(0, 0, 256, 8); return new T.CanvasTexture(c);
  })();

  /* ----- shared materials / geometry caches ----- */
  const matCache = {};
  function stdMat(color, opts) {
    opts = opts || {};
    const key = color + JSON.stringify(opts);
    return matCache[key] || (matCache[key] = new T.MeshStandardMaterial(Object.assign({ color, roughness: .45, metalness: 0, envMapIntensity: 1.1 }, opts)));
  }
  const glassMat = new T.MeshStandardMaterial({
    color: 0x000000, metalness: 0, roughness: .04, envMapIntensity: 3, transparent: true,
    blending: T.AdditiveBlending, depthWrite: false, side: T.DoubleSide
  });
  function fresnelMat(color) {
    return new T.ShaderMaterial({
      uniforms: { uColor: { value: color }, uPow: { value: 2.6 }, uAmt: { value: .75 } },
      vertexShader: 'varying vec3 vN; varying vec3 vV; void main(){ vec4 mv=modelViewMatrix*vec4(position,1.); vN=normalize(normalMatrix*normal); vV=normalize(-mv.xyz); gl_Position=projectionMatrix*mv; }',
      fragmentShader: 'uniform vec3 uColor; uniform float uPow; uniform float uAmt; varying vec3 vN; varying vec3 vV; void main(){ float f=pow(1.-abs(dot(normalize(vN),normalize(vV))),uPow); gl_FragColor=vec4(uColor*f*uAmt,1.); }',
      transparent: true, blending: T.AdditiveBlending, depthWrite: false, side: T.DoubleSide
    });
  }
  const iceMat = new T.MeshPhysicalMaterial({
    color: 0xdff4ff, transparent: true, opacity: .52, roughness: .12, metalness: 0, clearcoat: 1,
    envMapIntensity: 2.6, emissive: 0x6ea8c8, emissiveIntensity: .14
  });
  const bubMat = new T.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: .6, depthWrite: false });
  const dropMat = new T.MeshStandardMaterial({ color: 0xffffff, transparent: true, opacity: .38, roughness: 0, metalness: 0, envMapIntensity: 3, depthWrite: false });
  const bubGeo = new T.SphereGeometry(1, 8, 6);

  /* rounded ice cube */
  const iceGeo = (() => {
    const g = new T.BoxGeometry(1, 1, 1, 6, 6, 6);
    const p = g.attributes.position, n = g.attributes.normal;
    const rad = .13, lim = .5 - rad, v = new V3(), inner = new V3(), dir = new V3();
    for (let i = 0; i < p.count; i++) {
      v.fromBufferAttribute(p, i);
      inner.set(clamp(v.x, -lim, lim), clamp(v.y, -lim, lim), clamp(v.z, -lim, lim));
      dir.copy(v).sub(inner);
      const l = dir.length();
      if (l > 1e-5) {
        dir.divideScalar(l);
        v.copy(inner).addScaledVector(dir, rad);
        n.setXYZ(i, dir.x, dir.y, dir.z);
      }
      p.setXYZ(i, v.x, v.y, v.z);
    }
    return g;
  })();

  /* ----- glass shapes ----- */
  const GLASS = {
    highball:  { y0: .2, H: 2.85, th: .07, cav: t => .58 + .13 * t, foot: null },
    balloon:   { y0: .22, H: 2.35, th: .075, cav: t => .6 + .3 * Math.sin(Math.PI * Math.pow(t, .8)), foot: null },
    collins:   { y0: .2, H: 3.15, th: .06, cav: t => .54 + .04 * t, foot: null },
    contour:   { y0: .2, H: 2.75, th: .07, cav: t => .57 + .22 * Math.pow(t, 1.5) - .16 * Math.sin(Math.PI * t), foot: null },
    hurricane: { y0: .85, H: 2.1, th: .05, cav: t => .09 + .8 * Math.sin(Math.PI * .82 * Math.pow(t, .65)),
      foot: [[0, 0], [.72, 0], [.74, .035], [.5, .075], [.14, .14], [.07, .3], [.07, .62], [.12, .78]] },
    coupe:     { y0: 1.15, H: 1.5, th: .05, cav: t => .05 + .78 * Math.pow(t, .55),
      foot: [[0, 0], [.7, 0], [.72, .035], [.45, .07], [.12, .13], [.06, .3], [.06, .95], [.09, 1.08]] }
  };
  function glassProfile(g) {
    const pts = [];
    const foot = g.foot || [[0, 0], [g.cav(0) + g.th - .05, 0], [g.cav(0) + g.th, .05]];
    foot.forEach(p => pts.push(new V2(p[0], p[1])));
    const N = 28;
    for (let i = 0; i <= N; i++) { const t = i / N; pts.push(new V2(g.cav(t) + g.th, g.y0 + g.H * t)); }
    for (let i = N; i >= 0; i--) { const t = i / N; pts.push(new V2(g.cav(t), g.y0 + g.H * t)); }
    pts.push(new V2(0, g.y0));
    return pts;
  }

  /* ----- garnish factories ----- */
  const SLICE = {
    orange:    { rind: '#f28a00', pith: '#fff0cf', flesh: '#ffa31f', segs: 10 },
    lemon:     { rind: '#f2cf1d', pith: '#fffbdc', flesh: '#ffe65a', segs: 9 },
    lime:      { rind: '#2e8f27', pith: '#f2ffd6', flesh: '#9be33f', segs: 9 },
    cucumber:  { rind: '#256b2a', pith: '#d9efb8', flesh: '#c6e79c', segs: 3 },
    pineapple: { rind: '#d89b00', pith: '#fff2a8', flesh: '#ffd53a', segs: 0 }
  };
  const sliceCache = {};
  function sliceMats(type) {
    if (sliceCache[type]) return sliceCache[type];
    const c = SLICE[type], S = 256, C = S / 2;
    const cv = document.createElement('canvas'); cv.width = cv.height = S;
    const x = cv.getContext('2d');
    const circ = (r, col) => { x.fillStyle = col; x.beginPath(); x.arc(C, C, r, 0, Math.PI * 2); x.fill(); };
    circ(C, c.rind); circ(C * .94, c.pith);
    if (c.segs > 0 && type !== 'cucumber') {
      for (let k = 0; k < c.segs; k++) {
        const a0 = k / c.segs * Math.PI * 2 + .05, a1 = (k + 1) / c.segs * Math.PI * 2 - .05;
        const g = x.createRadialGradient(C, C, C * .1, C, C, C * .86);
        g.addColorStop(0, c.pith); g.addColorStop(.25, c.flesh); g.addColorStop(1, c.flesh);
        x.fillStyle = g; x.beginPath();
        x.moveTo(C + Math.cos((a0 + a1) / 2) * C * .08, C + Math.sin((a0 + a1) / 2) * C * .08);
        x.arc(C, C, C * .86, a0, a1); x.closePath(); x.fill();
        x.strokeStyle = 'rgba(255,255,255,.35)'; x.lineWidth = 1.2;
        for (let j = 0; j < 5; j++) {
          const a = lerp(a0, a1, (j + .5) / 5);
          x.beginPath(); x.moveTo(C + Math.cos(a) * C * .2, C + Math.sin(a) * C * .2); x.lineTo(C + Math.cos(a) * C * .78, C + Math.sin(a) * C * .78); x.stroke();
        }
      }
    } else if (type === 'cucumber') {
      circ(C * .86, c.flesh);
      x.fillStyle = '#eef8d4';
      for (let k = 0; k < 3; k++) {
        const a = k / 3 * Math.PI * 2 + .5;
        for (let j = 0; j < 7; j++) { x.beginPath(); x.ellipse(C + Math.cos(a) * (C * .3 + j * 2), C + Math.sin(a) * (C * .3 + j * 2) + (j - 3) * 5, 5, 8, a, 0, Math.PI * 2); x.fill(); }
      }
      x.strokeStyle = 'rgba(80,140,60,.5)'; x.lineWidth = 2; x.beginPath(); x.arc(C, C, C * .86, 0, Math.PI * 2); x.stroke();
    } else {
      circ(C * .86, c.flesh);
      x.strokeStyle = 'rgba(255,255,255,.4)'; x.lineWidth = 1.3;
      for (let k = 0; k < 28; k++) { const a = k / 28 * Math.PI * 2; x.beginPath(); x.moveTo(C + Math.cos(a) * C * .22, C + Math.sin(a) * C * .22); x.lineTo(C + Math.cos(a) * C * .84, C + Math.sin(a) * C * .84); x.stroke(); }
      circ(C * .2, '#fff4b0');
    }
    const tex = new T.CanvasTexture(cv);
    const cap = new T.MeshStandardMaterial({ map: tex, emissive: 0xffffff, emissiveMap: tex, emissiveIntensity: .32, roughness: .5, envMapIntensity: 1 });
    const side = new T.MeshStandardMaterial({ color: c.rind, roughness: .55, emissive: c.rind, emissiveIntensity: .12 });
    return (sliceCache[type] = [side, cap, cap]);
  }
  function mkSlice(type, r) {
    return new T.Mesh(new T.CylinderGeometry(r, r, r * .13, 40, 1), sliceMats(type));
  }

  const bumpCache = {};
  function bumpyGeo(freq, amp) {
    const key = freq + '_' + amp;
    if (bumpCache[key]) return bumpCache[key];
    const g = new T.SphereGeometry(1, 28, 18), p = g.attributes.position;
    for (let i = 0; i < p.count; i++) {
      const x = p.getX(i), y = p.getY(i), z = p.getZ(i);
      const b = 1 + amp * Math.sin(x * freq) * Math.sin(y * freq) * Math.sin(z * freq);
      p.setXYZ(i, x * b, y * b, z * b);
    }
    g.computeVertexNormals();
    return (bumpCache[key] = g);
  }
  function mkBerry(kind, r) {
    const cfg = { rasp: { c: '#d4144f', e: '#5a0620', f: 9, a: .14, r: .5 }, black: { c: '#2a0d3a', e: '#240a30', f: 8, a: .12, r: .2 }, lychee: { c: '#e86a7c', e: '#4a1018', f: 6, a: .07, r: .55 } }[kind];
    const m = new T.Mesh(bumpyGeo(cfg.f, cfg.a), stdMat(cfg.c, { emissive: cfg.e, roughness: cfg.r }));
    m.scale.setScalar(r); return m;
  }
  function mkLycheeWhite(r) {
    const m = new T.Mesh(new T.SphereGeometry(1, 20, 14), stdMat('#fff2f2', { roughness: .15, emissive: '#6a3a40', emissiveIntensity: .4 }));
    m.scale.setScalar(r); return m;
  }
  const berryTex = (() => {
    const c = document.createElement('canvas'); c.width = c.height = 256;
    const x = c.getContext('2d'); x.fillStyle = '#d8183c'; x.fillRect(0, 0, 256, 256);
    x.fillStyle = '#ffe48a';
    for (let i = 0; i < 150; i++) { x.beginPath(); x.ellipse(Math.random() * 256, Math.random() * 256, 1.8, 3, 0, 0, 7); x.fill(); }
    return new T.CanvasTexture(c);
  })();
  function mkStrawberry(r) {
    const g = new T.Group();
    const geo = new T.SphereGeometry(1, 24, 16), p = geo.attributes.position;
    for (let i = 0; i < p.count; i++) {
      const y = p.getY(i), f = .5 + .5 * (y + 1) / 2;
      p.setXYZ(i, p.getX(i) * f, y * 1.15, p.getZ(i) * f);
    }
    geo.computeVertexNormals();
    g.add(new T.Mesh(geo, new T.MeshStandardMaterial({ map: berryTex, roughness: .35, emissive: '#5a0612', emissiveIntensity: .5, envMapIntensity: 1.2 })));
    const cap = new T.Mesh(new T.SphereGeometry(.55, 12, 6), stdMat('#3aa13a', { emissive: '#0a3a0a', roughness: .6 }));
    cap.scale.y = .3; cap.position.y = 1.08; g.add(cap);
    g.scale.setScalar(r); return g;
  }

  const leafCache = {};
  function leafGeo(len, wid, curl, rp, wp) {
    const key = [len, wid, curl, rp, wp].join('_');
    if (leafCache[key]) return leafCache[key];
    const g = new T.PlaneGeometry(1, 1, 6, 10), p = g.attributes.position;
    for (let i = 0; i < p.count; i++) {
      const x = p.getX(i) * 2, y = p.getY(i) + .5;
      const wv = Math.pow(Math.max(0, Math.sin(Math.PI * Math.pow(y, rp))), wp);
      const nx = x * wv * wid * .5;
      p.setXYZ(i, nx, y * len, -Math.abs(nx) * curl - y * y * len * .12);
    }
    g.computeVertexNormals();
    return (leafCache[key] = g);
  }
  const mintMat = new T.MeshStandardMaterial({ color: '#3fbf6a', emissive: '#0b3a1c', emissiveIntensity: .8, roughness: .5, side: T.DoubleSide, envMapIntensity: .9 });
  function mkLeaf(s) { const m = new T.Mesh(leafGeo(.6, .36, 1, .8, .7), mintMat); m.scale.setScalar(s || 1); return m; }
  function mkSprig() {
    const g = new T.Group();
    const curve = new T.CatmullRomCurve3([new V3(0, 0, 0), new V3(.08, .5, .03), new V3(.02, 1.0, 0), new V3(.1, 1.5, .05)]);
    g.add(new T.Mesh(new T.TubeGeometry(curve, 12, .02, 5), stdMat('#2f8a4a')));
    for (let k = 0; k < 6; k++) {
      const pt = curve.getPoint(.32 + k * .11);
      for (let s = -1; s <= 1; s += 2) {
        const piv = new T.Object3D(); piv.position.copy(pt);
        piv.rotation.y = k * 1.1 + (s > 0 ? 0 : Math.PI);
        const l = mkLeaf(1.05 - k * .08); l.rotation.z = -.9; l.rotation.x = -.25; piv.add(l); g.add(piv);
      }
    }
    const top = mkLeaf(.9); top.position.copy(curve.getPoint(1)); top.rotation.set(.1, 1, 0); g.add(top);
    return g;
  }
  const petalMat = new T.MeshStandardMaterial({ color: '#ff5c8a', emissive: '#7a1030', emissiveIntensity: .55, roughness: .45, side: T.DoubleSide, envMapIntensity: 1 });
  function mkRose(r) {
    const g = new T.Group();
    [[5, .2, .55, 0], [6, .55, .78, .5], [7, .95, 1, .2]].forEach(ring => {
      for (let k = 0; k < ring[0]; k++) {
        const piv = new T.Object3D(); piv.rotation.y = ring[3] + k / ring[0] * Math.PI * 2;
        const m = new T.Mesh(leafGeo(1, 1.15, 1.1, .6, .6), petalMat); m.scale.setScalar(ring[2] * r); m.rotation.x = ring[1]; piv.add(m); g.add(piv);
      }
    });
    return g;
  }
  function mkPetal(r) { const m = new T.Mesh(leafGeo(1, 1.1, 1.0, .6, .6), petalMat); m.scale.setScalar(r); return m; }

  let anise = null;
  function mkAnise(r) {
    if (!anise) {
      const sh = new T.Shape();
      for (let i = 0; i < 16; i++) { const a = i / 16 * Math.PI * 2, rr = i % 2 ? .13 : .3; (i ? sh.lineTo : sh.moveTo).call(sh, Math.cos(a) * rr, Math.sin(a) * rr); }
      sh.closePath();
      anise = new T.ExtrudeGeometry(sh, { depth: .06, bevelEnabled: true, bevelSize: .015, bevelThickness: .015, bevelSegments: 2 });
    }
    const m = new T.Mesh(anise, stdMat('#7a3f1e', { emissive: '#2a1206', emissiveIntensity: .8, roughness: .7 }));
    m.scale.setScalar(r * 2.6); return m;
  }
  function mkCinnamon(len) { return new T.Mesh(new T.CylinderGeometry(.055, .055, len, 10), stdMat('#9a5a2b', { roughness: .8, emissive: '#3a1c0a', emissiveIntensity: .7 })); }
  function mkVanilla(len) {
    const c = new T.CatmullRomCurve3([new V3(0, -len / 2, 0), new V3(.1, -len / 6, .03), new V3(-.05, len / 6, 0), new V3(.08, len / 2, .02)]);
    return new T.Mesh(new T.TubeGeometry(c, 14, .033, 6), stdMat('#1a0f08', { roughness: .35, emissive: '#1a0c06', emissiveIntensity: .6 }));
  }
  function mkTwist() {
    const pts = []; for (let i = 0; i <= 26; i++) { const t = i / 26; pts.push(new V3(Math.cos(t * Math.PI * 3.2) * .13, t * 1.1 - .55, Math.sin(t * Math.PI * 3.2) * .13)); }
    return new T.Mesh(new T.TubeGeometry(new T.CatmullRomCurve3(pts), 40, .04, 6), stdMat('#ff9a1a', { emissive: '#6a2a00', emissiveIntensity: .6 }));
  }
  function mkOrb(color, r) {
    return new T.Mesh(new T.SphereGeometry(r, 24, 16), stdMat(color, { transparent: true, opacity: .55, roughness: .02, metalness: .1, envMapIntensity: 3, emissive: color, emissiveIntensity: .3, depthWrite: false }));
  }
  function mkMango(r) {
    const geo = new T.SphereGeometry(1, 24, 16), p = geo.attributes.position, col = new Float32Array(p.count * 3), a = new T.Color('#ffc21a'), b = new T.Color('#ff5a1f'), c = new T.Color();
    for (let i = 0; i < p.count; i++) {
      p.setXYZ(i, p.getX(i) * 1.0, p.getY(i) * .84, p.getZ(i) * .72);
      c.copy(a).lerp(b, clamp(p.getX(i) * .5 + .45, 0, 1)); col.set([c.r, c.g, c.b], i * 3);
    }
    geo.setAttribute('color', new T.BufferAttribute(col, 3)); geo.computeVertexNormals();
    const m = new T.Mesh(geo, stdMat('#ffffff', { vertexColors: true, roughness: .35, emissive: '#552200', emissiveIntensity: .5 }));
    m.scale.setScalar(r); return m;
  }
  const passionTex = (() => {
    const c = document.createElement('canvas'); c.width = c.height = 128;
    const x = c.getContext('2d'); const g = x.createRadialGradient(64, 64, 4, 64, 64, 64);
    g.addColorStop(0, '#ffd34a'); g.addColorStop(1, '#ff9a1a'); x.fillStyle = g; x.beginPath(); x.arc(64, 64, 64, 0, 7); x.fill();
    x.fillStyle = '#2a1405';
    for (let i = 0; i < 28; i++) { const a = Math.random() * 7, d = Math.random() * 44; x.beginPath(); x.ellipse(64 + Math.cos(a) * d, 64 + Math.sin(a) * d, 3, 5, a, 0, 7); x.fill(); }
    return new T.CanvasTexture(c);
  })();
  function mkPassion(r) {
    const g = new T.Group();
    g.add(new T.Mesh(new T.SphereGeometry(1, 24, 12, 0, Math.PI * 2, 0, Math.PI / 2), stdMat('#5a1f6e', { emissive: '#240a30', emissiveIntensity: .8, roughness: .4, side: T.DoubleSide })));
    const d = new T.Mesh(new T.CircleGeometry(.94, 32), new T.MeshStandardMaterial({ map: passionTex, emissive: 0xffffff, emissiveMap: passionTex, emissiveIntensity: .35, roughness: .3 }));
    d.rotation.x = -Math.PI / 2; d.position.y = .005; g.add(d);
    g.rotation.x = 1.15; const w = new T.Group(); w.add(g); w.scale.setScalar(r); return w;
  }
  function mkCrown() {
    const g = new T.Group(), geo = new T.ConeGeometry(.09, .85, 6), m = stdMat('#3f9b2a', { emissive: '#0c3a08', emissiveIntensity: .8 });
    for (let i = 0; i < 9; i++) {
      const piv = new T.Object3D(); piv.rotation.y = i / 9 * Math.PI * 2;
      const c = new T.Mesh(geo, m); c.position.y = .4; c.rotation.z = .2 + (i % 2) * .22; piv.add(c); g.add(piv);
    }
    return g;
  }
  function rimWheel(type, r, ang, rimR, rimY) {
    const grp = new T.Group(), w = mkSlice(type, r);
    w.rotation.x = Math.PI / 2; w.position.set(rimR - .05, rimY + r * .35, 0);
    grp.add(w); grp.rotation.y = ang; return grp;
  }

  /* garnish per drink: returns array of orbit specs and adds rim garnish to `inner` */
  function garnish(D, c) {
    const rimR = c.cav(1) + c.th, rimY = c.rimY, inner = c.inner;
    switch (D.key) {
      case 'berry': {
        inner.add(rimWheel('lime', .5, .2, rimR, rimY));
        const sk = new T.Group(); sk.position.set(-.1, rimY, 0); sk.rotation.z = -.35;
        const stick = new T.Mesh(new T.CylinderGeometry(.013, .013, 2.1, 6), stdMat('#d4af7a', { metalness: .9, roughness: .25 })); stick.position.y = .02; sk.add(stick);
        [['black', .17, .36], ['rasp', .17, .64], ['black', .16, .9]].forEach(b => { const m = mkBerry(b[0], b[1]); m.position.y = b[2]; sk.add(m); });
        inner.add(sk);
        return [
          { f: () => mkBerry('rasp', .2), l: 'Raspberry' }, { f: () => mkBerry('black', .22), l: 'Blackberry' }, { f: () => mkSlice('lime', .36), l: 'Lime' },
          { f: () => mkBerry('rasp', .16) }, { f: () => mkBerry('black', .18) }, { f: () => mkBerry('rasp', .14) }, { f: () => mkSlice('lime', .26) }];
      }
      case 'citrus': {
        inner.add(rimWheel('orange', .55, .3, rimR, rimY));
        inner.add(rimWheel('lemon', .42, 2.9, rimR, rimY - .05));
        return [
          { f: () => mkSlice('orange', .42), l: 'Orange' }, { f: () => mkSlice('lemon', .38), l: 'Lemon' }, { f: () => mkOrb('#ffe9a8', .26), l: 'Sparkling water' },
          { f: () => mkTwist() }, { f: () => mkSlice('orange', .3) }, { f: () => mkSlice('lemon', .28) }, { f: () => mkOrb('#ffe9a8', .16) }];
      }
      case 'mint': {
        const sp = mkSprig(); sp.position.set(-.15, rimY - .75, .05); sp.rotation.z = .12; inner.add(sp);
        inner.add(rimWheel('lime', .46, 2.3, rimR, rimY));
        inner.add(rimWheel('cucumber', .4, -.6, rimR, rimY - .05));
        return [
          { f: () => mkLeaf(1.15), l: 'Mint' }, { f: () => mkSlice('lime', .36), l: 'Lime' }, { f: () => mkSlice('cucumber', .4), l: 'Cucumber' },
          { f: () => mkLeaf(1) }, { f: () => mkLeaf(.9) }, { f: () => mkLeaf(1.05) }, { f: () => mkSlice('cucumber', .28) }];
      }
      case 'cola': {
        const cin = mkCinnamon(1.9); cin.position.set(.22, rimY - .4, .05); cin.rotation.z = -.2; inner.add(cin);
        const van = mkVanilla(1.8); van.position.set(-.18, rimY - .35, -.05); van.rotation.z = .22; inner.add(van);
        const an = mkAnise(.3); an.position.set(-.35, rimY + .5, -.2); an.rotation.z = .4; inner.add(an);
        return [
          { f: () => mkOrb('#d98a3a', .27), l: 'Cola' }, { f: () => mkVanilla(1.3), l: 'Vanilla' }, { f: () => mkAnise(.3), l: 'Spices' },
          { f: () => mkCinnamon(1.2) }, { f: () => mkAnise(.24) }, { f: () => mkVanilla(1.0) }, { f: () => mkOrb('#d98a3a', .17) }];
      }
      case 'tropical': {
        inner.add(rimWheel('pineapple', .5, .4, rimR, rimY));
        const cr = mkCrown(); cr.position.set(.1, rimY + .08, .05); cr.rotation.z = -.15; cr.scale.setScalar(.9); inner.add(cr);
        return [
          { f: () => mkMango(.32), l: 'Mango' }, { f: () => mkSlice('pineapple', .4), l: 'Pineapple' }, { f: () => mkPassion(.3), l: 'Passion fruit' },
          { f: () => mkMango(.26) }, { f: () => mkSlice('orange', .32) }, { f: () => mkPassion(.24) }, { f: () => mkSlice('pineapple', .28) }];
      }
      default: { /* rose */
        const sb = mkStrawberry(.22); sb.position.set(rimR - .05, rimY + .12, 0); sb.rotation.z = -.4; inner.add(sb);
        const rs = mkRose(.42); rs.position.set(-.2, rimY + .28, .1); rs.rotation.x = 1.15; inner.add(rs);
        return [
          { f: () => mkStrawberry(.26), l: 'Strawberry' }, { f: () => mkRose(.34), l: 'Rose' }, { f: () => mkBerry('lychee', .21), l: 'Lychee' },
          { f: () => mkStrawberry(.2) }, { f: () => mkPetal(.4) }, { f: () => mkLycheeWhite(.19) }, { f: () => mkPetal(.34) }];
      }
    }
  }

  /* ----- build a drink ----- */
  const SEG = LOW ? 40 : 72;
  const YS = [-1.1, .95, -.2, 1.5, -1.5, .3, 1.15];
  function createDrink(i) {
    const D = DRINKS[i], g = GLASS[D.glass];
    D.cAccent = new T.Color(D.accent); D.cGlow = new T.Color(D.glow); D.cBg1 = new T.Color(D.bg[0]); D.cBg2 = new T.Color(D.bg[1]);
    const root = new T.Group(), tilt = new T.Group(), inner = new T.Group(), orbit = new T.Group();
    const hTot = g.y0 + g.H, f = D.fill, cav = g.cav, th = g.th, topY = g.y0 + g.H * f;
    inner.position.y = -hTot / 2; tilt.add(inner); root.add(tilt); root.add(orbit);

    /* glass */
    const geo = new T.LatheGeometry(glassProfile(g), SEG);
    const glass = new T.Mesh(geo, glassMat); glass.renderOrder = 3; inner.add(glass);
    const fc = new T.Color('#a9dcff').lerp(D.cGlow, .4);
    const rim = new T.Mesh(geo, fresnelMat(fc)); rim.renderOrder = 3; inner.add(rim);

    /* liquid */
    const lp = [new V2(0, g.y0 + .01)], M = 18;
    for (let k = 0; k <= M; k++) { const t = f * k / M; lp.push(new V2(Math.max(.02, cav(t) - .014), g.y0 + g.H * t + (k === 0 ? .01 : 0))); }
    const lg = new T.LatheGeometry(lp, SEG), pos = lg.attributes.position, col = new Float32Array(pos.count * 3);
    const cb = new T.Color(D.liq[0]), ct = new T.Color(D.liq[1]), cc = new T.Color();
    for (let v = 0; v < pos.count; v++) {
      const tt = clamp((pos.getY(v) - g.y0) / (g.H * f), 0, 1);
      cc.copy(cb).lerp(ct, Math.pow(tt, .9)); col.set([cc.r, cc.g, cc.b], v * 3);
    }
    lg.setAttribute('color', new T.BufferAttribute(col, 3));
    const liquid = new T.Mesh(lg, new T.MeshPhysicalMaterial({
      vertexColors: true, transparent: true, opacity: .86, roughness: .12, clearcoat: 1, clearcoatRoughness: .1,
      emissive: ct.clone().multiplyScalar(.3), side: T.DoubleSide, depthWrite: false, envMapIntensity: 1.2
    }));
    liquid.renderOrder = 2; inner.add(liquid);

    /* surface (animated) */
    const Rs = Math.max(.05, cav(f) - .014), sp = [];
    for (let k = 0; k <= 5; k++) sp.push(new V2(Rs * k / 5, topY));
    const sg = new T.LatheGeometry(sp, SEG), sp_ = sg.attributes.position, nS = sp_.count;
    const bx = new Float32Array(nS), bz = new Float32Array(nS), br = new Float32Array(nS), ba = new Float32Array(nS);
    for (let v = 0; v < nS; v++) { bx[v] = sp_.getX(v); bz[v] = sp_.getZ(v); br[v] = Math.hypot(bx[v], bz[v]) / Rs; ba[v] = Math.atan2(bz[v], bx[v]); }
    const surface = new T.Mesh(sg, new T.MeshPhysicalMaterial({
      color: D.surf, transparent: true, opacity: .92, roughness: .08, clearcoat: 1, emissive: D.surf, emissiveIntensity: .32,
      envMapIntensity: 2, side: T.DoubleSide, depthWrite: false
    }));
    surface.renderOrder = 2; inner.add(surface);
    const men = new T.Mesh(new T.TorusGeometry(Rs, .015, 6, SEG), new T.MeshBasicMaterial({ color: new T.Color(D.surf).lerp(new T.Color('#ffffff'), .5), transparent: true, opacity: .6, depthWrite: false }));
    men.rotation.x = Math.PI / 2; men.position.y = topY; men.renderOrder = 2; inner.add(men);

    /* ice */
    const ice = [];
    for (let k = 0; k < D.ice; k++) {
      const m = new T.Mesh(iceGeo, iceMat); m.renderOrder = 1;
      const s = rand(.34, .44); m.scale.set(s, s * rand(.9, 1.1), s * rand(.9, 1.1));
      const y = topY - .1 - Math.random() * .4, t = clamp((y - g.y0) / g.H, 0, 1);
      const rr = Math.max(0, cav(t) - s * .85) * (k === 0 ? .25 : rand(.45, 1)), a = k / D.ice * 6.28 + rand(0, 1);
      m.position.set(Math.cos(a) * rr, y, Math.sin(a) * rr);
      m.rotation.set(rand(0, 3), rand(0, 3), rand(0, 3));
      inner.add(m);
      ice.push({ m, y, ph: rand(0, 6), rs: new V3(rand(-.4, .4), rand(-.4, .4), rand(-.4, .4)) });
    }

    /* bubbles */
    const NB = LOW ? 22 : 48, bm = new T.InstancedMesh(bubGeo, bubMat, NB);
    bm.renderOrder = 4; bm.frustumCulled = false;
    const bub = { p: new Float32Array(NB), s: new Float32Array(NB), a: new Float32Array(NB), r: new Float32Array(NB), z: new Float32Array(NB) };
    for (let k = 0; k < NB; k++) { bub.p[k] = Math.random(); bub.s[k] = rand(.09, .24); bub.a[k] = rand(0, 6.28); bub.r[k] = rand(.1, .9); bub.z[k] = rand(.014, .036); }
    inner.add(bm);

    /* condensation */
    const ND = LOW ? 16 : 40, dm = new T.InstancedMesh(bubGeo, dropMat, ND);
    dm.renderOrder = 5; dm.frustumCulled = false;
    const drop = { a: new Float32Array(ND), t: new Float32Array(ND), s: new Float32Array(ND), v: new Float32Array(ND) };
    for (let k = 0; k < ND; k++) { drop.a[k] = rand(0, 6.28); drop.t[k] = rand(.05, .95); drop.s[k] = rand(.012, .034); drop.v[k] = Math.random() < .28 ? rand(.004, .012) : 0; }
    inner.add(dm);

    /* garnish + orbit */
    const specs = garnish(D, { cav, th, rimY: g.y0 + g.H, inner });
    const used = LOW ? specs.slice(0, 5) : specs;
    const items = [];
    used.forEach((s, k) => {
      const obj = s.f(); orbit.add(obj);
      items.push({
        obj, label: s.l, ang: k / used.length * Math.PI * 2 + rand(-.3, .3), rad: 1.65 + (k % 3) * .42,
        y: YS[k % 7] * hTot / 3.1, speed: rand(.22, .48) * (k % 2 ? 1 : .8), bob: rand(.06, .16), bs: rand(.6, 1.2), ph: rand(0, 6),
        spin: new V3(rand(-.9, .9), rand(-.9, .9), rand(-.5, .5)), o: new V3(), v: new V3()
      });
      obj.rotation.set(rand(0, 3), rand(0, 3), rand(0, 3));
    });

    /* hit proxy, glow, floor light */
    const proxy = new T.Mesh(new T.CylinderGeometry(.95, .95, hTot + .2, 8), new T.MeshBasicMaterial({ visible: false }));
    root.add(proxy);
    const sprite = new T.Sprite(new T.SpriteMaterial({ map: glowTex, color: D.glow, transparent: true, blending: T.AdditiveBlending, depthWrite: false, opacity: .4 }));
    sprite.scale.set(7.5, 7.5, 1); sprite.position.z = -1.3; root.add(sprite);
    const floor = new T.Mesh(new T.PlaneGeometry(4.6, 4.6), new T.MeshBasicMaterial({ map: floorTex, color: D.glow, transparent: true, blending: T.AdditiveBlending, depthWrite: false, opacity: .5 }));
    floor.rotation.x = -Math.PI / 2; floor.position.y = -hTot / 2 - .6; root.add(floor);

    root.visible = false;
    scene.add(root);

    /* DOM labels */
    const labelsEl = $('#labels');
    const lblItems = items.filter(it => it.label).slice(0, 3);
    const labels = lblItems.map(it => { const el = document.createElement('div'); el.className = 'ilabel'; el.innerHTML = `<span>${it.label}</span>`; labelsEl.appendChild(el); return el; });
    const lel = document.createElement('div'); lel.className = 'llabel';
    lel.innerHTML = `<button data-open="${i}" aria-label="Open ${D.name}"><b>${D.name}</b><small>$${D.price}</small></button>`;
    labelsEl.appendChild(lel);

    return {
      i, D, g, root, tilt, inner, orbit, items, ice, hTot, topY, f, cav, th, Rs, proxy, sprite, floor,
      surf: { geo: sg, pos: sp_, bx, bz, br, ba, n: nS }, bm, bub, NB, dm, drop, ND,
      labels, lblItems, lel, labelsOn: false, lineOn: false,
      ph: rand(0, 6.28), spin: rand(0, 6.28), hv: 0, clickable: false, pres: 0
    };
  }

  const drinks = DRINKS.map((_, i) => createDrink(i));

  /* ----- lights ----- */
  const amb = new T.AmbientLight(0xffffff, .28);
  const key = new T.SpotLight(0xfff3e0, 2.4, 0, .55, 1, 1); key.position.set(0, 9, 6);
  const rimL = new T.DirectionalLight(0xa8dcff, 2.2); rimL.position.set(-6, 2, -4);
  const rimR = new T.DirectionalLight(0xff3d7f, 2.2); rimR.position.set(6, 3, -4);
  const front = new T.DirectionalLight(0xffffff, .5); front.position.set(0, 1, 8);
  const glowL = new T.PointLight(0xff3d7f, 1.6, 14, 1.5);
  scene.add(amb, key, key.target, rimL, rimR, front, glowL);

  /* ----- particles ----- */
  const NP = LOW ? 160 : 460;
  const pgeo = new T.BufferGeometry(), pp = new Float32Array(NP * 3), ps = new Float32Array(NP);
  for (let k = 0; k < NP; k++) { pp[k * 3] = rand(-15, 15); pp[k * 3 + 1] = rand(-8, 8); pp[k * 3 + 2] = rand(-11, 6); ps[k] = Math.random(); }
  pgeo.setAttribute('position', new T.BufferAttribute(pp, 3)); pgeo.setAttribute('aSeed', new T.BufferAttribute(ps, 1));
  const pmat = new T.ShaderMaterial({
    uniforms: { uTime: { value: 0 }, uColor: { value: new T.Color('#ffffff') }, uPR: { value: pr } },
    vertexShader: 'attribute float aSeed; uniform float uTime; uniform float uPR; varying float vA; void main(){ vec3 p=position; float sp=.15+aSeed*.35; p.y=mod(p.y+uTime*sp+8.,16.)-8.; p.x+=sin(uTime*.3+aSeed*20.)*.6; p.z+=cos(uTime*.25+aSeed*15.)*.5; vec4 mv=modelViewMatrix*vec4(p,1.); gl_Position=projectionMatrix*mv; gl_PointSize=(2.+aSeed*5.)*uPR*(14./-mv.z); vA=.25+.75*fract(aSeed*7.3); }',
    fragmentShader: 'uniform vec3 uColor; varying float vA; void main(){ float d=length(gl_PointCoord-.5); float a=smoothstep(.5,.0,d); gl_FragColor=vec4(uColor,a*vA*.75); }',
    transparent: true, depthWrite: false, blending: T.AdditiveBlending
  });
  const points = new T.Points(pgeo, pmat); points.frustumCulled = false; scene.add(points);

  /* ----- light streaks ----- */
  const streaks = [];
  [[-2, 3, -7, .35], [3, -2, -6, -.4], [-5, -4, -8, .2], [5, 4, -9, -.25]].slice(0, LOW ? 2 : 4).forEach((s, k) => {
    const m = new T.Mesh(new T.PlaneGeometry(14, .07), new T.MeshBasicMaterial({ map: streakTex, color: 0xffffff, transparent: true, opacity: 0, blending: T.AdditiveBlending, depthWrite: false }));
    m.position.set(s[0], s[1], s[2]); m.rotation.z = s[3]; m.userData = { bx: s[0], k }; scene.add(m); streaks.push(m);
  });

  /* ----- layout ----- */
  const L = {};
  const tanH = Math.tan(T.MathUtils.degToRad(camera.fov / 2));
  const visH = R => 2 * R * tanH, visW = R => 2 * R * tanH * L.asp;
  function layout() {
    const w = innerWidth, h = innerHeight;
    L.asp = w / h; L.portrait = L.asp < .9;
    L.R = L.portrait ? 10.8 : 9.4;
    L.RL = L.portrait ? 13 : 11.5;
    L.RD = L.portrait ? 10.2 : 7.8;
    L.fx = Math.min(2.1, visW(L.R) * .2);
    L.heroS = L.portrait ? 1.12 : 1.2; L.heroY = L.portrait ? .25 : 0;
    L.orb = L.portrait ? .62 : (L.asp < 1.3 ? .8 : 1);
    if (L.portrait) { L.sp = visW(L.RL) / 2.5; L.ls = L.sp * .42; L.rowH = Math.min(2.5, visH(L.RL) / 3.2); }
    else { L.sp = Math.min(2.2, visW(L.RL) / 6.5); L.ls = L.sp * .42; }
  }
  const sgn = i => (i % 2 ? -1 : 1);
  const feat = i => (L.portrait ? { x: 0, y: 1.05, s: .8 } : { x: sgn(i) * L.fx, y: 0, s: 1 });
  const linePose = i => {
    if (L.portrait) { const c = i % 2, r = Math.floor(i / 2); return { x: (c - .5) * L.sp, y: (1 - r) * L.rowH - .3, z: 0, s: L.ls }; }
    return { x: (i - 2.5) * L.sp, y: Math.sin(i * 1.7) * .12, z: -Math.abs(i - 2.5) * .3, s: L.ls };
  };
  const detailPose = () => (L.portrait ? { x: 0, y: 1.2, s: .95 } : { x: -1.7, y: 0, s: 1.3 });

  const P = { x: 0, y: 0, z: 0, s: 1, ry: 0, vis: false, pres: 0 };
  function pose(i, S, w) {
    const ft = feat(i), sg = sgn(i), d = S - (i + 1);
    let x, y, z, s, ry, vis, pres;
    if (i === 0 && S < 1) {
      const u = easeInOut(S);
      x = lerp(0, ft.x, u); y = lerp(L.heroY, ft.y, u); s = lerp(L.heroS, ft.s, u);
      z = .9 * Math.pow(1 - Math.abs(d), 2); ry = 0; vis = true; pres = 1;
    } else if (d < 0) {
      const t = clamp(-d, 0, 1), e = easeInOut(t);
      x = ft.x + sg * e * (L.portrait ? 5 : 9); y = ft.y + e * .6; s = ft.s * (1 - .25 * e);
      z = -e * 5 + .9 * Math.pow(1 - t, 2); ry = e * 2.4; vis = t < 1; pres = 1 - t;
    } else {
      const u = clamp(d, 0, 1), e = easeInOut(u);
      x = ft.x - sg * e * 3.2; y = ft.y + e * 1.4; s = ft.s * (1 - .2 * e);
      z = -e * 10 + .9 * Math.pow(1 - u, 2); ry = -e * 1.5; vis = u < 1; pres = 1 - u;
    }
    if (w > 0) {
      const lp = linePose(i);
      x = lerp(x, lp.x, w); y = lerp(y, lp.y, w); z = lerp(z, lp.z, w); s = lerp(s, lp.s, w); ry = lerp(ry, 0, w);
      vis = true; pres = lerp(pres, 0, w);
    }
    P.x = x; P.y = y; P.z = z; P.s = s; P.ry = ry; P.vis = vis; P.pres = pres;
    return P;
  }

  /* ----- resize ----- */
  function resize() {
    const w = innerWidth, h = innerHeight;
    renderer.setSize(w, h, false);
    camera.aspect = w / h; camera.updateProjectionMatrix();
    layout();
  }
  resize();
  addEventListener('resize', resize);

  /* ----- picking ----- */
  function pick(nx, ny) {
    mouseV.set(nx, ny); ray.setFromCamera(mouseV, camera);
    let best = -1, bd = 1e9;
    drinks.forEach((d, i) => {
      if (!d.root.visible || !d.clickable) return;
      const hit = ray.intersectObject(d.proxy, false);
      if (hit.length && hit[0].distance < bd) { bd = hit[0].distance; best = i; }
    });
    return best;
  }
  canvas.addEventListener('click', e => {
    if (st.detailOpen) return;
    const i = pick((e.clientX / innerWidth) * 2 - 1, -(e.clientY / innerHeight) * 2 + 1);
    if (i >= 0) openDetail(i);
  });

  /* ----- colours ----- */
  const cA = new T.Color(), cB = new T.Color(), cG = new T.Color(), cN1 = new T.Color('#1a1c24'), cN2 = new T.Color('#050507'), cNA = new T.Color('#a9dcff');
  const bgEl = $('#bg');
  let frameN = 0, fpsAcc = 0, fpsN = 0;

  /* ----- update ----- */
  const update = (dt, t) => {
    frameN++;
    st.S = damp(st.S, st.St, RM ? 10 : 3.4, dt);
    const S = st.S, w = smooth(clamp(S - 6, 0, 1)), db = st.db, dI = st.detail;
    st.w = w;
    const intro = easeOut(clamp(st.intro, 0, 1));
    ray.setFromCamera(mouseV.set(st.nx, st.ny), camera);
    const ro = ray.ray.origin, rd = ray.ray.direction;
    const boost = 1 + st.energy * 2.2;

    let focus = null, bestP = -1;
    drinks.forEach((d, i) => {
      const p = pose(i, S, w);
      let x = p.x, y = p.y, z = p.z, s = p.s, ry = p.ry, vis = p.vis, pres = p.pres;
      if (dI >= 0 && db > 0) {
        if (i === dI) {
          const dp = detailPose();
          x = lerp(x, dp.x, db); y = lerp(y, dp.y, db); z = lerp(z, 0, db); s = lerp(s, dp.s, db); ry = lerp(ry, 0, db);
          pres = lerp(pres, 1, db); vis = true;
        } else {
          s *= (1 - db); x += (x >= 0 ? 1 : -1) * db * 3; pres *= (1 - db); vis = vis && s > .01;
        }
      }
      s *= intro;
      d.root.visible = vis;
      d.pres = pres;
      d.clickable = !st.detailOpen && vis && (w > .55 || (pres > .55 && w < .2));
      if (!vis) return;
      if (pres > bestP) { bestP = pres; focus = d; }

      const hv = st.hover === i ? 1 : 0; d.hv = damp(d.hv, hv, 6, dt);
      const follow = pres * (1 - w * .5) + (w > 0 ? w * .5 : 0);
      const fx = st.mx * .45 * follow, fy = st.my * .28 * follow;
      const flo = Math.sin(t * .9 + d.ph) * .13 * (RM ? .2 : 1);
      d.root.position.set(x + fx, y + fy + flo, z);
      d.root.scale.setScalar(Math.max(.001, s * (1 + .1 * d.hv)));
      d.spin += dt * ((RM ? .06 : .3) + d.hv * .9 + st.energy * .8);
      d.tilt.rotation.set(-st.my * .32 * follow + Math.sin(t * .6 + d.ph) * .03,
        d.spin + ry + st.mx * .9 * follow + S * .5, -st.mx * .07 * follow + Math.sin(t * .7 + d.ph) * .04);

      /* liquid surface ripple */
      const sf = d.surf, amp = .012 + st.energy * .028 + d.hv * .01, sp = sf.pos;
      for (let v = 0; v < sf.n; v++) {
        const r = sf.br[v];
        sp.setY(v, d.topY + (Math.sin(sf.ba[v] * 3 + t * 1.6) * .6 + Math.sin(sf.bx[v] * 6 - t * 2.2) * .4 + Math.sin(sf.bz[v] * 5 + t * 1.9) * .3) * amp * (.25 + r));
      }
      sp.needsUpdate = true; sf.geo.computeVertexNormals();

      /* ice */
      d.ice.forEach(ic => {
        ic.m.position.y = ic.y + Math.sin(t * .8 + ic.ph) * .03;
        const k = dt * (.5 + st.energy * 1.4);
        ic.m.rotation.x += ic.rs.x * k; ic.m.rotation.y += ic.rs.y * k; ic.m.rotation.z += ic.rs.z * k;
      });
      /* bubbles */
      const b = d.bub, bs = boost + (dI === i ? db * .6 : 0), g = d.g, hh = d.topY - g.y0 - .05;
      for (let k = 0; k < d.NB; k++) {
        b.p[k] = (b.p[k] + dt * b.s[k] * bs) % 1;
        const pr_ = b.p[k], rr = Math.max(.01, d.cav(pr_ * d.f) - .08) * b.r[k], a = b.a[k] + pr_ * 4 + Math.sin(t * 2 + k) * .2;
        dummy.position.set(Math.cos(a) * rr, g.y0 + .05 + hh * pr_, Math.sin(a) * rr);
        dummy.scale.setScalar(b.z[k] * (.6 + pr_ * .8)); dummy.rotation.set(0, 0, 0); dummy.updateMatrix();
        d.bm.setMatrixAt(k, dummy.matrix);
      }
      d.bm.instanceMatrix.needsUpdate = true;
      /* condensation */
      const dr = d.drop;
      for (let k = 0; k < d.ND; k++) {
        if (dr.v[k] > 0) { dr.t[k] -= dt * dr.v[k]; if (dr.t[k] < .03) dr.t[k] = .95; }
        const tt = dr.t[k], r = d.cav(tt) + d.th, a = dr.a[k], sz = dr.s[k];
        dummy.position.set(Math.sin(a) * r, g.y0 + g.H * tt, Math.cos(a) * r);
        dummy.rotation.set(0, a, 0); dummy.scale.set(sz, sz * 1.5, sz * .45); dummy.updateMatrix();
        d.dm.setMatrixAt(k, dummy.matrix);
      }
      d.dm.instanceMatrix.needsUpdate = true;

      /* glow + floor */
      d.sprite.material.opacity = (.3 + .08 * Math.sin(t * 1.1 + d.ph)) * (.4 + .6 * Math.max(pres, w));
      d.floor.material.opacity = .5 * Math.max(pres, w * .8);
      d.floor.scale.setScalar(1 + Math.sin(t * .9 + d.ph) * .06);

      /* orbit items */
      const os = easeOut(clamp(pres * (1 - w), 0, 1));
      d.orbit.visible = os > .02;
      if (d.orbit.visible) {
        d.orbit.scale.setScalar(Math.max(.001, os));
        const isD = dI === i, rm = lerp(1, 1.3, isD ? db : 0) * L.orb, spd = (1 + (isD ? db * 1.6 : 0)) * boost * (RM ? .25 : 1);
        const rs = d.root.scale.x * os, rp = d.root.position;
        const tz = rd.z !== 0 ? (rp.z - ro.z) / rd.z : 0;
        const lmx = (ro.x + rd.x * tz - rp.x) / rs, lmy = (ro.y + rd.y * tz - rp.y) / rs;
        d.items.forEach(it => {
          it.ang += dt * it.speed * spd;
          const cx = Math.cos(it.ang) * it.rad * rm, cz = Math.sin(it.ang) * it.rad * rm * .85;
          const cy = it.y + Math.sin(t * it.bs + it.ph) * it.bob;
          if (FINE || COARSE) {
            const dx = cx + it.o.x - lmx, dy = cy + it.o.y - lmy, dist = Math.hypot(dx, dy) + 1e-4, R = 1.05;
            if (dist < R && st.nx < 4) { const fo = 1 - dist / R; it.v.x += dx / dist * fo * dt * 38; it.v.y += dy / dist * fo * dt * 38; it.v.z += fo * dt * 18; }
          }
          it.v.x -= it.o.x * dt * 14; it.v.y -= it.o.y * dt * 14; it.v.z -= it.o.z * dt * 14;
          const dm = Math.exp(-dt * 3.5); it.v.multiplyScalar(dm);
          it.o.x += it.v.x * dt; it.o.y += it.v.y * dt; it.o.z += it.v.z * dt;
          it.obj.position.set(cx + it.o.x, cy + it.o.y, cz + it.o.z);
          const k = dt * (RM ? .3 : 1);
          it.obj.rotation.x += it.spin.x * k; it.obj.rotation.y += it.spin.y * k; it.obj.rotation.z += it.spin.z * k;
        });
      }
    });

    /* focus-based colours + lights */
    let fi = 0;
    if (dI >= 0 && db > .02) fi = dI; else fi = clamp(S - 1, 0, 5);
    const i0 = Math.floor(fi), i1 = Math.min(5, i0 + 1), ft = dI >= 0 && db > .02 ? 0 : fi - i0;
    const D0 = DRINKS[i0], D1 = DRINKS[i1];
    cA.copy(D0.cAccent).lerp(D1.cAccent, ft);
    cG.copy(D0.cGlow).lerp(D1.cGlow, ft);
    const bg1 = cB.copy(D0.cBg1).lerp(D1.cBg1, ft);
    const bg2 = new T.Color().copy(D0.cBg2).lerp(D1.cBg2, ft);
    bg1.lerp(cN1, w * .7); bg2.lerp(cN2, w * .7); cA.lerp(cNA, w * .6); cG.lerp(cNA, w * .5);
    const dim = 1 - .5 * db;
    bg1.multiplyScalar(1 - .55 * db);

    if (frameN % 2 === 0) {
      const fr = focus ? focus.root.position.x : 0;
      const bx = 50 + clamp(fr / visW(L.R), -.4, .4) * 100 * (1 - w) * (dI >= 0 ? (1 - db) : 1);
      bgEl.style.setProperty('--c1', `rgb(${bg1.r * 255 | 0},${bg1.g * 255 | 0},${bg1.b * 255 | 0})`);
      bgEl.style.setProperty('--c2', `rgb(${bg2.r * 255 | 0},${bg2.g * 255 | 0},${bg2.b * 255 | 0})`);
      bgEl.style.setProperty('--bx', bx.toFixed(1) + '%');
      if (frameN % 6 === 0 && !st.detailOpen) document.documentElement.style.setProperty('--accent', '#' + cA.getHexString());
    }

    rimR.color.copy(cA); glowL.color.copy(cG);
    amb.intensity = .28 * dim; rimL.intensity = 2.2 * (1 - .3 * db); rimR.intensity = 2.2 * (1 - .3 * db);
    key.intensity = 2.4 * (1 + .6 * db);
    if (focus) {
      glowL.position.copy(focus.root.position).add(tv.set(0, .2, 1.4));
      key.position.set(focus.root.position.x * .5, 9, 6); key.target.position.copy(focus.root.position);
    }
    pmat.uniforms.uColor.value.copy(cA).lerp(cNA, .35);
    pmat.uniforms.uTime.value = RM ? 0 : t;
    points.position.x = st.mx * -.5; points.position.y = st.my * -.3;
    streaks.forEach((m, k) => {
      m.material.color.copy(cA);
      m.material.opacity = (.10 + .09 * Math.sin(t * .5 + k * 1.7)) * (RM ? .5 : 1) * dim;
      m.position.x = m.userData.bx + Math.sin(t * .15 + k) * 2.5;
    });

    /* camera */
    const R0 = lerp(L.R, L.RL, w), Rz = lerp(R0, L.RD, db);
    const a = (Math.sin(S * 1.15) * .28 + S * .03) * (1 - w) + st.mx * .12 + db * st.mx * .15;
    const cy = (.7 + Math.sin(S * .8) * .5) * (1 - w * .5) + st.my * .35;
    camera.position.set(Math.sin(a) * Rz, cy, Math.cos(a) * Rz);
    camera.lookAt(0, 0, 0);
    camera.rotateZ(Math.sin(S * .9) * .025 * (1 - w));
    camera.updateMatrixWorld();

    /* DOM labels */
    scene.updateMatrixWorld();
    const W = innerWidth, H = innerHeight;
    drinks.forEach((d, i) => {
      if (!d.root.visible) { if (d.labelsOn) { d.labels.forEach(l => l.classList.remove('on')); d.labelsOn = false; } if (d.lineOn) { d.lel.classList.remove('on'); d.lineOn = false; } return; }
      const isD = dI === i;
      const showI = !L.portrait && w < .3 && ((dI < 0 && d === focus && d.pres > .8) || (isD && db > .85));
      if (showI !== d.labelsOn) { d.labels.forEach(l => l.classList.toggle('on', showI)); d.labelsOn = showI; }
      if (showI || d.pres > .3) {
        d.labels.forEach((el, k) => {
          const it = d.lblItems[k]; it.obj.getWorldPosition(tv); tv.project(camera);
          el.style.transform = `translate3d(${(tv.x * .5 + .5) * W}px,${(-tv.y * .5 + .5) * H}px,0)`;
        });
      }
      const showL = w > .8 && dI < 0;
      if (showL !== d.lineOn) { d.lel.classList.toggle('on', showL); d.lineOn = showL; }
      if (w > .3) {
        tv.copy(d.root.position); tv.y -= (d.hTot / 2 + .75) * d.root.scale.x; tv.project(camera);
        d.lel.style.transform = `translate3d(${(tv.x * .5 + .5) * W}px,${(-tv.y * .5 + .5) * H}px,0)`;
      }
    });

    /* hover raycast */
    if (gl.needHover && FINE) {
      gl.needHover = false;
      const h = st.detailOpen ? -1 : pick(st.nx, st.ny);
      if (h !== st.hover) { st.hover = h; document.body.classList.toggle('on-drink', h >= 0); }
    }

    renderer.render(scene, camera);

    /* adaptive resolution */
    fpsAcc += dt; fpsN++;
    if (fpsN >= 90) {
      const avg = fpsAcc / fpsN; fpsAcc = 0; fpsN = 0;
      if (avg > 1 / 38 && pr > 1) { pr = Math.max(1, pr - .25); renderer.setPixelRatio(pr); pmat.uniforms.uPR.value = pr; resize(); }
    }
  };

  /* precompile shaders to avoid first-scroll hitches */
  drinks.forEach(d => { d.root.visible = true; });
  camera.position.set(0, 0, 9);
  try { renderer.compile(scene, camera); } catch (e) { /* ignore */ }
  drinks.forEach(d => { d.root.visible = false; });

  return { update, resize, needHover: false, renderer };
}

/* =========================================================
   GSAP / SCROLLTRIGGER
   ========================================================= */
function setupScroll() {
  const rail = $$('.rail-dot'), heroNum = $('.hero-count span');
  let lastIdx = -1;

  ScrollTrigger.create({
    trigger: '#journey', start: 'top top', end: 'bottom bottom',
    onUpdate: self => {
      st.St = self.progress * 7;
      const idx = Math.round(st.St);
      if (idx !== lastIdx) { lastIdx = idx; rail.forEach((b, k) => b.classList.toggle('active', k === idx)); }
    },
    onRefresh: self => { st.St = self.progress * 7; },
    snap: RM ? false : { snapTo: 1 / 7, duration: { min: .3, max: .8 }, delay: .12, ease: 'power2.inOut' }
  });

  /* hero words scroll away */
  const heroTrig = { trigger: '#stage0', start: 'top top', end: 'bottom 15%', scrub: true };
  gsap.to('.hw-drip', { xPercent: -45, ease: 'none', scrollTrigger: heroTrig });
  gsap.to('.hw-pour', { xPercent: 45, ease: 'none', scrollTrigger: heroTrig });
  gsap.to('.hw-amp', { scale: 1.5, ease: 'none', scrollTrigger: heroTrig });
  gsap.to('#heroWords', { opacity: 0, ease: 'none', scrollTrigger: heroTrig });
  gsap.to('.hero-ui', { opacity: 0, y: -40, ease: 'none', scrollTrigger: { trigger: '#stage0', start: 'top top', end: '55% top', scrub: true } });

  /* per-stage typography timelines */
  $$('.drink-stage').forEach(sec => {
    const tl = gsap.timeline({ paused: true });
    tl.from($$('.title .ch', sec), { yPercent: 118, rotate: 7, opacity: 0, duration: .95, ease: 'power4.out', stagger: .035 }, 0)
      .from($('.kicker', sec), { x: -30, opacity: 0, duration: .7, ease: 'power3.out' }, 0)
      .from($$('.notes li', sec), { x: -24, opacity: 0, duration: .6, stagger: .1, ease: 'power3.out' }, .25)
      .from($('.desc', sec), { y: 20, opacity: 0, duration: .8, ease: 'power3.out' }, .45)
      .from($('.actions', sec), { y: 20, opacity: 0, duration: .8, ease: 'power3.out' }, .55)
      .from($('.stage-no', sec), { opacity: 0, scale: .92, duration: 1.4, ease: 'power3.out' }, 0);
    ScrollTrigger.create({
      trigger: sec, start: 'top 62%', end: 'bottom 38%',
      onEnter: () => tl.timeScale(1).play(), onEnterBack: () => tl.timeScale(1).play(),
      onLeave: () => tl.timeScale(1.7).reverse(), onLeaveBack: () => tl.timeScale(1.7).reverse()
    });
    if (RM) tl.progress(1);
  });

  /* finale */
  const ft = gsap.timeline({ paused: true });
  ft.from('#stage7 .kicker', { y: -20, opacity: 0, duration: .8 }, 0)
    .from('#stage7 .fin-title .ch', { yPercent: 120, opacity: 0, duration: 1, stagger: .04, ease: 'power4.out' }, 0)
    .from('#stage7 .fin-bottom > *', { y: 24, opacity: 0, stagger: .12, duration: .8 }, .5);
  ScrollTrigger.create({
    trigger: '#stage7', start: 'top 55%', end: 'bottom top',
    onEnter: () => ft.timeScale(1).play(), onEnterBack: () => ft.timeScale(1).play(),
    onLeaveBack: () => ft.timeScale(1.7).reverse()
  });

  /* about */
  gsap.to('#gl', { opacity: .1, ease: 'none', scrollTrigger: { trigger: '#about', start: 'top 85%', end: 'top 15%', scrub: true } });
  gsap.to('#labels', { opacity: 0, ease: 'none', scrollTrigger: { trigger: '#about', start: 'top 90%', end: 'top 50%', scrub: true } });
  gsap.from('#about .rv', { y: 60, opacity: 0, duration: 1, stagger: .12, ease: 'power3.out', scrollTrigger: { trigger: '#about', start: 'top 55%' } });
  $$('[data-count]').forEach(el => {
    const o = { v: 0 }, target = +el.dataset.count;
    ScrollTrigger.create({ trigger: '.stats', start: 'top 90%', once: true, onEnter: () => gsap.to(o, { v: target, duration: 2, ease: 'power2.out', onUpdate: () => { el.textContent = Math.round(o.v); } }) });
  });

  addEventListener('load', () => ScrollTrigger.refresh());
}

/* =========================================================
   LOADER + INTRO
   ========================================================= */
function startLoader() {
  const loader = $('#loader'), num = $('#ldNum'), bar = $('.ld-bar i');
  const finish = () => {
    loader.style.display = 'none';
    document.documentElement.classList.remove('locked');
  };
  if (!HAS_GSAP) { setTimeout(finish, 400); return; }
  document.documentElement.classList.add('locked');
  const o = { v: 0 };
  const tl = gsap.timeline({ onComplete: () => { /* safety */ finish(); } });
  tl.to(o, { v: 100, duration: RM ? .2 : 1.7, ease: 'power2.inOut', onUpdate: () => { num.textContent = String(Math.round(o.v)).padStart(3, '0'); bar.style.transform = `scaleX(${o.v / 100})`; } })
    .to('.ld-inner', { y: -30, opacity: 0, duration: .5, ease: 'power3.in' })
    .to(loader, { clipPath: 'inset(0 0 100% 0)', duration: 1.1, ease: 'power4.inOut' }, '-=.1')
    .add(() => { document.documentElement.classList.remove('locked'); loader.style.pointerEvents = 'none'; }, '-=.8')
    .to(st, { intro: 1, duration: RM ? .01 : 2.2, ease: 'power3.out' }, '-=.9')
    .from('#heroWords .ch', { yPercent: 115, opacity: 0, duration: 1.5, stagger: .07, ease: 'power4.out' }, '-=1.5')
    .from('.hero-ui > *', { y: 30, opacity: 0, duration: 1, stagger: .12, ease: 'power3.out', clearProps: 'transform,opacity' }, '-=1')
    .from('.nav > *', { y: -20, opacity: 0, duration: 1, stagger: .1, ease: 'power3.out' }, '-=1.2');
  /* hard safety so the loader can never get stuck */
  setTimeout(() => { if (loader.style.display !== 'none' && !tl.isActive()) finish(); }, 6000);
}

/* =========================================================
   MAIN LOOP
   ========================================================= */
let last = performance.now() / 1000;
const heroWordsEl = $('#heroWords');
function frame(ms) {
  requestAnimationFrame(frame);
  const t = ms / 1000;
  const dt = Math.min(.05, t - last); last = t;
  if (dt <= 0) return;

  st.mx = damp(st.mx, st.tx, RM ? 8 : 3.2, dt);
  st.my = damp(st.my, st.ty, RM ? 8 : 3.2, dt);
  st.energy *= Math.exp(-dt * 2.2);

  if (FINE) {
    cur.rx = damp(cur.rx, cur.x, 16, dt); cur.ry = damp(cur.ry, cur.y, 16, dt);
    cur.gx = damp(cur.gx, cur.x, 4, dt); cur.gy = damp(cur.gy, cur.y, 4, dt);
    elDot.style.transform = `translate3d(${cur.x}px,${cur.y}px,0)`;
    elRing.style.transform = `translate3d(${cur.rx}px,${cur.ry}px,0)`;
    elGlow.style.transform = `translate3d(${cur.gx}px,${cur.gy}px,0)`;
  }
  /* hero words mouse parallax */
  const hw = heroWordsEl;
  if (hw && st.S < 1.2) { hw.style.setProperty('--mx', st.mx.toFixed(3)); hw.style.setProperty('--my', st.my.toFixed(3)); }

  if (gl) gl.update(dt, t);
}

/* =========================================================
   BOOT
   ========================================================= */
function hasWebGL() {
  try { const c = document.createElement('canvas'); return !!(window.WebGLRenderingContext && (c.getContext('webgl2') || c.getContext('webgl'))); }
  catch (e) { return false; }
}

function boot() {
  buildStages();
  buildRail();
  setupUI();
  if (HAS_THREE && hasWebGL()) {
    try { gl = initGL(); }
    catch (err) { console.warn('WebGL init failed', err); gl = null; document.body.classList.add('no-gl'); }
  } else document.body.classList.add('no-gl');
  if (!HAS_GSAP) st.intro = 1;
  if (HAS_GSAP) { try { setupScroll(); } catch (err) { console.warn(err); } }
  else {
    addEventListener('scroll', () => { const j = $('#journey'); st.St = clamp(scrollY / (j.offsetHeight - innerHeight), 0, 1) * 7; }, { passive: true });
  }
  st.S = st.St;
  startLoader();
  requestAnimationFrame(frame);
}

if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
else boot();

})();
