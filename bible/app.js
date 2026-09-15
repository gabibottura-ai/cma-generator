/* Daily Bread: a small, offline first Bible reader. No framework. */
(function () {
  'use strict';
  var VERSION = '1';
  var $ = function (id) { return document.getElementById(id); };
  var store = {
    get: function (k, d) { try { var v = localStorage.getItem('bible.' + k); return v === null ? d : JSON.parse(v); } catch (e) { return d; } },
    set: function (k, v) { try { localStorage.setItem('bible.' + k, JSON.stringify(v)); } catch (e) {} }
  };

  /* ---------- curated content ---------- */
  var TODAY = ['JHN 3:16','PSA 23:1-3','PHP 4:6-7','ISA 41:10','PRO 3:5-6','ROM 8:28','JER 29:11','PSA 46:1','MAT 11:28','JOS 1:9','PSA 119:105','ISA 40:31','ROM 8:38-39','PSA 27:1','GAL 5:22-23','1PE 5:7','PSA 100:4-5','MIC 6:8','1CO 13:4-7','EPH 2:8-9','PSA 37:4','PRO 16:3','COL 3:23','JAS 1:5','1JN 4:19','PSA 139:14','MAT 5:16','PSA 91:1-2','PSA 121:1-2','PRO 18:10','ROM 5:8','HEB 13:8','PSA 34:8','ZEP 3:17','PSA 16:11','JHN 8:12','PSA 90:12','PRO 4:23','1TH 5:16-18','MAT 7:7','PSA 32:8','ISA 55:8-9','PSA 19:14','JHN 15:5','PSA 27:4','PSA 63:1','PSA 143:8','PRO 17:17','MAT 6:33','ECC 3:1','PSA 62:1-2','JHN 10:10','ROM 12:2','2CO 12:9','PSA 33:4','PSA 118:24','1JN 1:9','PSA 51:10','PSA 103:2-4','PSA 145:18','EPH 3:20','HEB 4:16','JAS 4:8','PSA 40:1-2','PSA 56:3','PRO 3:3-4','MAT 22:37-39','LUK 1:37','PSA 84:11','PSA 25:4-5','ISA 30:21','JER 33:3','JHN 16:33','PSA 116:1-2','PSA 73:26','HAB 3:19','PSA 9:9-10','PSA 138:8','PRO 19:21','PSA 20:7','PSA 3:3','COL 3:15','PSA 31:24','1PE 2:9','PSA 36:5','PSA 86:5','DEU 6:5','PSA 130:5','PSA 55:22','ISA 12:2','PSA 89:1','PSA 5:3','JHN 14:27','ISA 26:3','PSA 94:19','2TI 1:7','LAM 3:22-23','ISA 43:18-19','2CO 5:17','PSA 30:5','HEB 11:1','ROM 15:13','PHP 4:13','DEU 31:6','PSA 28:7','EPH 6:10','NEH 8:10','PSA 147:3','REV 21:4','ROM 12:12','PSA 42:11','MAT 6:34','PSA 4:8','2TH 3:16','ISA 41:13','PSA 18:2','1CO 16:13','PSA 46:10'];
  var COLLECTIONS = [
    { id: 'peace', name: 'Peace for an anxious mind', sub: 'For the moments your thoughts will not slow down.',
      refs: ['PHP 4:6-7','MAT 11:28-30','JHN 14:27','PSA 94:19','ISA 26:3','1PE 5:7','PSA 46:10','MAT 6:34','PSA 23:4','ISA 41:10','PSA 4:8','2TH 3:16'] },
    { id: 'strength', name: 'Strength and courage', sub: 'For the days that ask more of you than you have.',
      refs: ['JOS 1:9','ISA 40:31','PHP 4:13','PSA 27:1','DEU 31:6','2TI 1:7','PSA 28:7','ISA 41:13','EPH 6:10','PSA 18:2','1CO 16:13','NEH 8:10'] },
    { id: 'hope', name: 'Hope and new beginnings', sub: 'For starting again, and again.',
      refs: ['JER 29:11','ROM 15:13','LAM 3:22-23','ISA 43:18-19','ROM 8:28','PSA 30:5','2CO 5:17','PSA 42:11','HEB 11:1','ROM 12:12','PSA 147:3','REV 21:4'] }
  ];

  /* ---------- state ---------- */
  var bible = null, byId = {}, tr = store.get('tr', 'web');
  var size = store.get('size', 19);
  var theme = store.get('theme', 'auto');
  var pos = store.get('pos', null);          // {b:'JHN', c:1, y:0}
  var read = store.get('read', {});          // {'JHN.1': 1}
  var cur = { b: null, c: null };

  /* ---------- helpers ---------- */
  function parseRef(ref) {
    var m = /^(\S+) (\d+):(\d+)(?:-(\d+))?$/.exec(ref);
    return { b: m[1], c: +m[2], v1: +m[3], v2: +(m[4] || m[3]) };
  }
  function refLabel(r) { var bk = byId[r.b]; return bk.name + ' ' + r.c + ':' + r.v1 + (r.v2 > r.v1 ? '-' + r.v2 : ''); }
  function refText(r) {
    var ch = byId[r.b].ch[r.c - 1] || [];
    return ch.slice(r.v1 - 1, r.v2).join(' ');
  }
  function dayOfYear(d) { var s = new Date(d.getFullYear(), 0, 0); return Math.floor((d - s) / 864e5); }
  function toast(msg) { var t = $('toast'); t.textContent = msg; t.classList.add('on'); clearTimeout(toast.h); toast.h = setTimeout(function () { t.classList.remove('on'); }, 1800); }
  function show(id) {
    var s = document.querySelectorAll('.screen');
    for (var i = 0; i < s.length; i++) s[i].classList.toggle('on', s[i].id === id);
    window.scrollTo(0, 0);
  }
  function applyPrefs() {
    document.documentElement.style.setProperty('--size', size + 'px');
    if (theme === 'auto') document.documentElement.removeAttribute('data-theme');
    else document.documentElement.setAttribute('data-theme', theme);
    var segs = document.querySelectorAll('[data-tr]'); for (var i = 0; i < segs.length; i++) segs[i].classList.toggle('on', segs[i].getAttribute('data-tr') === tr);
    var th = document.querySelectorAll('[data-theme]'); for (var j = 0; j < th.length; j++) if (th[j].tagName === 'BUTTON') th[j].classList.toggle('on', th[j].getAttribute('data-theme') === theme);
  }

  /* ---------- data ---------- */
  function load(which, cb) {
    fetch('data/' + which + '.json').then(function (r) { return r.json(); }).then(function (d) {
      bible = d; byId = {};
      for (var i = 0; i < d.books.length; i++) byId[d.books[i].id] = d.books[i];
      cb();
    }).catch(function () { $('todayText').textContent = 'Could not load the Bible text. Check your connection once, then it works offline.'; });
  }

  /* ---------- home ---------- */
  function renderHome() {
    var now = new Date(), h = now.getHours();
    $('greeting').textContent = h < 12 ? 'Good morning' : h < 18 ? 'Good afternoon' : 'Good evening';
    $('dateLine').textContent = now.toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric' });
    var r = parseRef(TODAY[dayOfYear(now) % TODAY.length]);
    $('todayText').textContent = refText(r);
    $('todayRef').textContent = refLabel(r) + ' · ' + bible.tr;
    $('todayGo').onclick = function () { openChapter(r.b, r.c, r.v1); };

    var p = pos || { b: 'JHN', c: 1 };
    var bk = byId[p.b];
    $('continueLabel').textContent = pos ? 'Continue reading' : 'Start reading';
    $('continueTitle').textContent = bk.name + ' ' + p.c;
    $('continueBar').style.width = Math.round(100 * (p.c - 1) / bk.ch.length) + '%';
    $('continueTile').onclick = function () { openChapter(p.b, p.c, null, pos && pos.y); };

    var list = $('collections'); list.innerHTML = '';
    COLLECTIONS.forEach(function (c) {
      var b = document.createElement('button'); b.className = 'tile';
      b.innerHTML = '<div class="num">' + c.refs.length + '</div><div><div class="t"></div><div class="s"></div></div><span class="go"><svg viewBox="0 0 24 24"><path d="M9 6l6 6-6 6"/></svg></span>';
      b.querySelector('.t').textContent = c.name; b.querySelector('.s').textContent = c.sub;
      b.onclick = function () { openCollection(c.id); };
      list.appendChild(b);
    });
    var n = Object.keys(read).length;
    $('stat').textContent = n ? n + ' of 1,189 chapters read' : 'Tap a chapter to begin. Your place is saved automatically.';
    show('home');
  }

  /* ---------- reader ---------- */
  function openChapter(b, c, v, y) {
    cur = { b: b, c: c };
    location.hash = '#/' + b + '/' + c + (v ? '/' + v : '');
    renderChapter(v, y);
  }
  function renderChapter(v, y) {
    var bk = byId[cur.b], verses = bk.ch[cur.c - 1];
    $('readTitle').textContent = bk.name + ' ' + cur.c;
    var html = '<h2>' + bk.name + ' ' + cur.c + '</h2>';
    for (var i = 0; i < verses.length; i++) {
      if (!verses[i]) continue;
      html += '<span class="v" id="v' + (i + 1) + '"><sup>' + (i + 1) + '</sup>' + verses[i] + '</span>';
    }
    $('readBody').innerHTML = html;
    $('prevCh').disabled = (cur.c === 1 && bk === bible.books[0]);
    $('nextCh').textContent = cur.c < bk.ch.length ? 'Next →' : (nextBook(bk) ? nextBook(bk).name + ' 1 →' : 'The end');
    show('read');
    if (v) { var el = $('v' + v); if (el) { el.classList.add('hl'); el.scrollIntoView({ block: 'center' }); } }
    else if (y) window.scrollTo(0, y);
    savePos();
  }
  function nextBook(bk) { var i = bible.books.indexOf(bk); return bible.books[i + 1] || null; }
  function prevBook(bk) { var i = bible.books.indexOf(bk); return bible.books[i - 1] || null; }
  function savePos() {
    if (!cur.b) return;
    pos = { b: cur.b, c: cur.c, y: window.scrollY };
    store.set('pos', pos);
  }
  function markRead() { read[cur.b + '.' + cur.c] = 1; store.set('read', read); }
  $('nextCh').onclick = function () {
    markRead();
    var bk = byId[cur.b];
    if (cur.c < bk.ch.length) openChapter(cur.b, cur.c + 1);
    else if (nextBook(bk)) openChapter(nextBook(bk).id, 1);
  };
  $('prevCh').onclick = function () {
    var bk = byId[cur.b];
    if (cur.c > 1) openChapter(cur.b, cur.c - 1);
    else if (prevBook(bk)) { var pb = prevBook(bk); openChapter(pb.id, pb.ch.length); }
  };
  $('readHome').onclick = function () { savePos(); location.hash = ''; renderHome(); };
  $('readTitle').onclick = function () { savePos(); openBooks(); };
  var scrollT; window.addEventListener('scroll', function () {
    if (!$('read').classList.contains('on')) return;
    clearTimeout(scrollT); scrollT = setTimeout(function () {
      savePos();
      if (window.innerHeight + window.scrollY >= document.body.scrollHeight - 40) markRead();
    }, 200);
  }, { passive: true });

  /* ---------- pickers ---------- */
  var tab = 'OT';
  function openBooks() {
    if (cur.b) tab = byId[cur.b].t;
    renderBooks(); show('books');
  }
  function renderBooks() {
    $('tabOT').classList.toggle('on', tab === 'OT'); $('tabNT').classList.toggle('on', tab === 'NT');
    var g = $('bookGrid'); g.innerHTML = '';
    bible.books.forEach(function (bk) {
      if (bk.t !== tab) return;
      var b = document.createElement('button');
      b.innerHTML = '<b></b><small></small>';
      b.querySelector('b').textContent = bk.abbr; b.querySelector('small').textContent = bk.ch.length + (bk.ch.length === 1 ? ' ch' : ' ch');
      b.setAttribute('aria-label', bk.name);
      b.onclick = function () { openChapters(bk.id); };
      g.appendChild(b);
    });
  }
  $('tabOT').onclick = function () { tab = 'OT'; renderBooks(); };
  $('tabNT').onclick = function () { tab = 'NT'; renderBooks(); };
  $('booksBack').onclick = function () { if (cur.b) show('read'); else renderHome(); };
  function openChapters(id) {
    var bk = byId[id]; $('chTitle').textContent = bk.name;
    var g = $('chGrid'); g.innerHTML = '';
    for (var i = 1; i <= bk.ch.length; i++) (function (n) {
      var b = document.createElement('button'); b.innerHTML = '<b>' + n + '</b>';
      if (read[id + '.' + n]) b.className = 'done';
      b.onclick = function () { openChapter(id, n); };
      g.appendChild(b);
    })(i);
    show('chapters');
  }
  $('chBack').onclick = function () { show('books'); };
  $('browseTile').onclick = function () { cur = { b: null, c: null }; openBooks(); };

  /* ---------- collections ---------- */
  function openCollection(id) {
    var c = COLLECTIONS.filter(function (x) { return x.id === id; })[0];
    $('colTitle').textContent = c.name; $('colSub').textContent = c.sub;
    var list = $('colList'); list.innerHTML = '';
    c.refs.forEach(function (ref) {
      var r = parseRef(ref);
      var b = document.createElement('button'); b.className = 'card';
      b.innerHTML = '<div class="ref"></div><div class="txt"></div>';
      b.querySelector('.ref').textContent = refLabel(r); b.querySelector('.txt').textContent = refText(r);
      b.onclick = function () { openChapter(r.b, r.c, r.v1); };
      list.appendChild(b);
    });
    location.hash = '#/c/' + id;
    show('collection');
  }
  $('colBack').onclick = function () { location.hash = ''; renderHome(); };

  /* ---------- settings sheet ---------- */
  function sheet(on) { $('sheet').classList.toggle('on', on); $('sheetBg').classList.toggle('on', on); }
  $('readAa').onclick = function () { sheet(true); };
  $('sheetBg').onclick = function () { sheet(false); };
  $('sizeDown').onclick = function () { size = Math.max(15, size - 1); store.set('size', size); applyPrefs(); };
  $('sizeUp').onclick = function () { size = Math.min(28, size + 1); store.set('size', size); applyPrefs(); };
  Array.prototype.forEach.call(document.querySelectorAll('[data-tr]'), function (b) {
    b.onclick = function () {
      var t = b.getAttribute('data-tr'); if (t === tr) return;
      tr = t; store.set('tr', tr); applyPrefs(); toast('Loading ' + tr.toUpperCase() + '…');
      load(tr, function () { if (cur.b) renderChapter(null, window.scrollY); toast(bible.name); });
    };
  });
  Array.prototype.forEach.call(document.querySelectorAll('button[data-theme]'), function (b) {
    b.onclick = function () { theme = b.getAttribute('data-theme'); store.set('theme', theme); applyPrefs(); };
  });

  /* ---------- routing ---------- */
  function route() {
    var m = /^#\/([1-3A-Z]{3})\/(\d+)(?:\/(\d+))?$/.exec(location.hash);
    var c = /^#\/c\/(\w+)$/.exec(location.hash);
    if (m && byId[m[1]] && byId[m[1]].ch[m[2] - 1]) { cur = { b: m[1], c: +m[2] }; renderChapter(m[3] ? +m[3] : null); }
    else if (c) openCollection(c[1]);
    else renderHome();
  }
  window.addEventListener('hashchange', function () {
    // react to back/forward and external links; in-app navigation already rendered
    var m = /^#\/([1-3A-Z]{3})\/(\d+)/.exec(location.hash);
    if (m && m[1] === cur.b && +m[2] === cur.c && $('read').classList.contains('on')) return;
    if (/^#\/c\//.test(location.hash) && $('collection').classList.contains('on')) return;
    route();
  });

  applyPrefs();
  load(tr, route);

  if ('serviceWorker' in navigator) {
    window.addEventListener('load', function () { navigator.serviceWorker.register('sw.js').catch(function () {}); });
  }
})();
