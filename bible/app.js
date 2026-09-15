/* Daily Bread: a small, offline first Bible reader. No framework. */
(function () {
  'use strict';
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
  /* Reading plans. days(bible) returns an array of days, each an array of ['JHN', 3] chapters. */
  var PLANS = [
    { id: 'nt90', name: 'New Testament in 90 days', sub: 'About 3 chapters a day, Matthew to Revelation.',
      days: function () {
        var all = [];
        bible.books.forEach(function (b) { if (b.t === 'NT') for (var c = 1; c <= b.ch.length; c++) all.push([b.id, c]); });
        var out = [], n = 90;
        for (var d = 0; d < n; d++) out.push(all.slice(Math.floor(d * all.length / n), Math.floor((d + 1) * all.length / n)));
        return out;
      } },
    { id: 'pp31', name: 'Psalms and Proverbs in 31 days', sub: 'Five psalms and one proverb a day. The classic pattern.',
      days: function () {
        var out = [];
        for (var d = 1; d <= 31; d++) {
          var day = [];
          for (var k = 0; k < 5; k++) { var p = d + 30 * k; if (p <= 150) day.push(['PSA', p]); }
          day.push(['PRO', d]);
          out.push(day);
        }
        return out;
      } }
  ];

  /* ---------- state ---------- */
  var bible = null, byId = {}, tr = store.get('tr', 'web');
  var size = store.get('size', 19);
  var theme = store.get('theme', 'auto');
  var pos = store.get('pos', null);          // {b:'JHN', c:1, y:0}
  var read = store.get('read', {});          // {'JHN.1': 1}
  var hl = store.get('hl', {});              // {'JHN.3.16': 1}
  var saved = store.get('saved', []);        // ['JHN.3.16', ...] newest first
  var plan = store.get('plan', null);        // {id:'nt90', start:'2026-09-15'}
  var cur = { b: null, c: null }, sel = null, back = 'home';

  /* ---------- helpers ---------- */
  function parseRef(ref) {
    var m = /^(\S+) (\d+):(\d+)(?:-(\d+))?$/.exec(ref);
    return { b: m[1], c: +m[2], v1: +m[3], v2: +(m[4] || m[3]) };
  }
  function bname(bk) { return bk.id === 'PSA' ? 'Psalm' : bk.name; }
  function refLabel(r) { var bk = byId[r.b]; return bname(bk) + ' ' + r.c + ':' + r.v1 + (r.v2 > r.v1 ? '-' + r.v2 : ''); }
  function refText(r) { var ch = byId[r.b].ch[r.c - 1] || []; return ch.slice(r.v1 - 1, r.v2).join(' '); }
  function keyRef(k) { var p = k.split('.'); return { b: p[0], c: +p[1], v1: +p[2], v2: +p[2] }; }
  function dayOfYear(d) { var s = new Date(d.getFullYear(), 0, 0); return Math.floor((d - s) / 864e5); }
  function esc(s) { return s.replace(/[&<>]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;' }[c]; }); }
  function toast(msg) { var t = $('toast'); t.textContent = msg; t.classList.add('on'); clearTimeout(toast.h); toast.h = setTimeout(function () { t.classList.remove('on'); }, 1800); }
  function show(id) {
    var s = document.querySelectorAll('.screen');
    for (var i = 0; i < s.length; i++) s[i].classList.toggle('on', s[i].id === id);
    if (id !== 'read') { sel = null; $('vbar').classList.remove('on'); }
    window.scrollTo(0, 0);
  }
  function applyPrefs() {
    document.documentElement.style.setProperty('--size', size + 'px');
    if (theme === 'auto') document.documentElement.removeAttribute('data-theme');
    else document.documentElement.setAttribute('data-theme', theme);
    var segs = document.querySelectorAll('[data-tr]'); for (var i = 0; i < segs.length; i++) segs[i].classList.toggle('on', segs[i].getAttribute('data-tr') === tr);
    var th = document.querySelectorAll('button[data-theme]'); for (var j = 0; j < th.length; j++) th[j].classList.toggle('on', th[j].getAttribute('data-theme') === theme);
  }
  function card(label, text, onOpen, onRemove) {
    var b = document.createElement('button'); b.className = 'card';
    b.innerHTML = (onRemove ? '<span class="x" aria-label="Remove">×</span>' : '') + '<div class="ref"></div><div class="txt"></div>';
    b.querySelector('.ref').textContent = label;
    if (typeof text === 'string') b.querySelector('.txt').textContent = text; else b.querySelector('.txt').innerHTML = text.html;
    b.onclick = function (e) { if (onRemove && e.target.className === 'x') onRemove(); else onOpen(); };
    return b;
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
    back = 'home';
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
    $('continueTitle').textContent = bname(bk) + ' ' + p.c;
    $('continueBar').style.width = Math.round(100 * (p.c - 1) / bk.ch.length) + '%';
    $('continueTile').onclick = function () { openChapter(p.b, p.c, null, pos && pos.y); };

    $('savedCount').textContent = saved.length;

    // active plan tile
    var ph = $('planHome'); ph.innerHTML = '';
    if (plan) {
      var P = planInfo();
      var t = document.createElement('button'); t.className = 'tile';
      t.innerHTML = '<div class="grow" style="flex:1;min-width:0"><div class="eyebrow"></div><div class="t"></div><div class="progress"><i></i></div></div><span class="go"><svg viewBox="0 0 24 24"><path d="M9 6l6 6-6 6"/></svg></span>';
      t.querySelector('.eyebrow').textContent = P.def.name;
      t.querySelector('.t').textContent = P.finished ? 'Finished. Well done.' : 'Day ' + P.day + ' of ' + P.days.length + ' · ' + P.doneToday + ' of ' + P.today.length + ' chapters';
      t.querySelector('i').style.width = Math.round(100 * (P.day - 1) / P.days.length) + '%';
      t.onclick = function () { openPlan(); };
      ph.appendChild(t);
    }

    var list = $('collections'); list.innerHTML = '';
    COLLECTIONS.forEach(function (c) {
      var b = document.createElement('button'); b.className = 'tile';
      b.innerHTML = '<div class="num">' + c.refs.length + '</div><div><div class="t"></div><div class="s"></div></div><span class="go"><svg viewBox="0 0 24 24"><path d="M9 6l6 6-6 6"/></svg></span>';
      b.querySelector('.t').textContent = c.name; b.querySelector('.s').textContent = c.sub;
      b.onclick = function () { openCollection(c.id); };
      list.appendChild(b);
    });

    var pl = $('plans'); pl.innerHTML = '';
    $('plansSection').style.display = plan ? 'none' : '';
    if (!plan) PLANS.forEach(function (d) {
      var b = document.createElement('button'); b.className = 'tile';
      b.innerHTML = '<div class="num">' + d.days().length + '</div><div><div class="t"></div><div class="s"></div></div><span class="go"><svg viewBox="0 0 24 24"><path d="M9 6l6 6-6 6"/></svg></span>';
      b.querySelector('.t').textContent = d.name; b.querySelector('.s').textContent = d.sub;
      b.onclick = function () { plan = { id: d.id, start: new Date().toISOString().slice(0, 10) }; store.set('plan', plan); openPlan(); };
      pl.appendChild(b);
    });

    var n = Object.keys(read).length;
    $('stat').textContent = n ? n + ' of 1,189 chapters read' : 'Tap a chapter to begin. Your place is saved automatically.';
    show('home');
  }
  $('searchOpen').onclick = function () { openSearch(); };
  $('savedTile').onclick = function () { openSaved(); };

  /* ---------- reader ---------- */
  function openChapter(b, c, v, y) {
    cur = { b: b, c: c };
    location.hash = '#/' + b + '/' + c + (v ? '/' + v : '');
    renderChapter(v, y);
  }
  function renderChapter(v, y) {
    var bk = byId[cur.b], verses = bk.ch[cur.c - 1];
    $('readTitle').textContent = bname(bk) + ' ' + cur.c;
    var html = '<h2>' + bname(bk) + ' ' + cur.c + '</h2>';
    for (var i = 0; i < verses.length; i++) {
      if (!verses[i]) continue;
      var k = cur.b + '.' + cur.c + '.' + (i + 1);
      html += '<span class="v' + (hl[k] ? ' hl' : '') + '" id="v' + (i + 1) + '" data-k="' + k + '"><sup>' + (i + 1) + '</sup>' + verses[i] + '</span>';
    }
    $('readBody').innerHTML = html;
    sel = null; $('vbar').classList.remove('on');
    $('prevCh').disabled = (cur.c === 1 && bk === bible.books[0]);
    var pn = back === 'plan' ? (function () { var P = planInfo(); return P.today.filter(function (ch) { return !read[ch[0] + '.' + ch[1]] && !(ch[0] === cur.b && ch[1] === cur.c); })[0]; })() : null;
    if (back === 'plan') $('nextCh').textContent = pn ? 'Next: ' + bname(byId[pn[0]]) + ' ' + pn[1] + ' →' : 'Done for today ✓';
    else $('nextCh').textContent = cur.c < bk.ch.length ? 'Next →' : (nextBook(bk) ? nextBook(bk).name + ' 1 →' : 'The end');
    show('read');
    if (v) { var el = $('v' + v); if (el) { el.classList.add('focus'); el.scrollIntoView({ block: 'center' }); } }
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
  function markRead() { if (!cur.b) return; read[cur.b + '.' + cur.c] = 1; store.set('read', read); }
  $('nextCh').onclick = function () {
    markRead();
    if (back === 'plan' && plan) { var pn = planNext(); if (pn) openChapter(pn[0], pn[1]); else openPlan(); return; }
    var bk = byId[cur.b];
    if (cur.c < bk.ch.length) openChapter(cur.b, cur.c + 1);
    else if (nextBook(bk)) openChapter(nextBook(bk).id, 1);
  };
  $('prevCh').onclick = function () {
    var bk = byId[cur.b];
    if (cur.c > 1) openChapter(cur.b, cur.c - 1);
    else if (prevBook(bk)) { var pb = prevBook(bk); openChapter(pb.id, pb.ch.length); }
  };
  $('readHome').onclick = function () { savePos(); location.hash = ''; goBack(); };
  $('readTitle').onclick = function () { savePos(); openBooks(); };
  function goBack() {
    // the house icon goes home, except inside a reading plan where it returns to today's list
    if (back === 'plan' && plan) openPlan(); else renderHome();
  }
  function planNext() {
    // next unread chapter of today's plan day, or null when the day is done
    if (back !== 'plan' || !plan) return null;
    var P = planInfo();
    if (P.finished) return null;
    return P.today.filter(function (ch) { return !read[ch[0] + '.' + ch[1]]; })[0] || null;
  }
  var scrollT; window.addEventListener('scroll', function () {
    if (!$('read').classList.contains('on')) return;
    clearTimeout(scrollT); scrollT = setTimeout(function () {
      savePos();
      if (window.innerHeight + window.scrollY >= document.body.scrollHeight - 40) markRead();
    }, 200);
  }, { passive: true });

  // tap a verse: select it and show the action bar
  $('readBody').addEventListener('click', function (e) {
    var el = e.target.closest ? e.target.closest('.v') : null;
    if (!el) return;
    var was = document.querySelector('.v.sel'); if (was) was.classList.remove('sel');
    if (sel === el.getAttribute('data-k')) { sel = null; $('vbar').classList.remove('on'); return; }
    sel = el.getAttribute('data-k'); el.classList.add('sel');
    var r = keyRef(sel);
    $('vbarRef').textContent = refLabel(r);
    $('vHl').classList.toggle('on', !!hl[sel]);
    $('vSave').classList.toggle('on', saved.indexOf(sel) !== -1);
    $('vbar').classList.add('on');
  });
  $('vHl').onclick = function () {
    if (!sel) return;
    if (hl[sel]) delete hl[sel]; else hl[sel] = 1;
    store.set('hl', hl);
    var el = document.querySelector('.v[data-k="' + sel + '"]'); if (el) el.classList.toggle('hl', !!hl[sel]);
    $('vHl').classList.toggle('on', !!hl[sel]);
  };
  $('vSave').onclick = function () {
    if (!sel) return;
    var i = saved.indexOf(sel);
    if (i === -1) { saved.unshift(sel); toast('Saved'); } else { saved.splice(i, 1); toast('Removed from Saved'); }
    store.set('saved', saved);
    $('vSave').classList.toggle('on', saved.indexOf(sel) !== -1);
  };
  $('vCopy').onclick = function () {
    if (!sel) return;
    var r = keyRef(sel), text = '“' + refText(r) + '” ' + refLabel(r) + ' (' + bible.tr + ')';
    if (navigator.clipboard) navigator.clipboard.writeText(text).then(function () { toast('Copied'); }, function () { toast('Could not copy'); });
    else toast('Copy is not available here');
  };

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
      b.querySelector('b').textContent = bk.abbr; b.querySelector('small').textContent = bk.ch.length + ' ch';
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
      b.onclick = function () { back = 'home'; openChapter(id, n); };
      g.appendChild(b);
    })(i);
    show('chapters');
  }
  $('chBack').onclick = function () { show('books'); };
  $('browseTile').onclick = function () { cur = { b: null, c: null }; openBooks(); };

  /* ---------- collections ---------- */
  function openCollection(id) {
    var c = COLLECTIONS.filter(function (x) { return x.id === id; })[0];
    if (!c) return renderHome();
    back = 'col:' + id;
    $('colTitle').textContent = c.name; $('colSub').textContent = c.sub;
    var list = $('colList'); list.innerHTML = '';
    c.refs.forEach(function (ref) {
      var r = parseRef(ref);
      list.appendChild(card(refLabel(r), refText(r), function () { openChapter(r.b, r.c, r.v1); }));
    });
    location.hash = '#/c/' + id;
    show('collection');
  }
  $('colBack').onclick = function () { location.hash = ''; renderHome(); };

  /* ---------- search ---------- */
  var BOOK_ALIASES = { 'psalm': 'PSA', 'psalms': 'PSA', 'song of solomon': 'SNG', 'songs': 'SNG', 'revelations': 'REV', 'philemon': 'PHM', 'philippians': 'PHP' };
  function findBook(name) {
    var q = name.toLowerCase().replace(/\./g, '').replace(/\s+/g, ' ').trim();
    if (BOOK_ALIASES[q]) return byId[BOOK_ALIASES[q]];
    for (var i = 0; i < bible.books.length; i++) {
      var b = bible.books[i], n = b.name.toLowerCase(), a = b.abbr.toLowerCase();
      if (n === q || a === q || b.id.toLowerCase() === q) return b;
    }
    for (var j = 0; j < bible.books.length; j++) if (bible.books[j].name.toLowerCase().indexOf(q) === 0) return bible.books[j];
    return null;
  }
  function parseQueryRef(q) {
    var m = /^([1-3]?\s?[a-z]+(?:\s[a-z]+)*)\s*(\d+)(?:[:.](\d+))?$/i.exec(q.trim());
    if (!m) return null;
    var b = findBook(m[1]); if (!b) return null;
    var c = +m[2]; if (!b.ch[c - 1]) return null;
    return { b: b.id, c: c, v: m[3] ? +m[3] : null };
  }
  function openSearch(keep) {
    back = 'search';
    show('search');
    if (!keep) { $('searchIn').value = ''; $('searchList').innerHTML = ''; $('searchHint').textContent = 'Type at least 3 letters. Or a reference like Psalm 23.'; }
    setTimeout(function () { $('searchIn').focus(); }, 50);
  }
  function runSearch() {
    var q = $('searchIn').value.trim(), list = $('searchList'), hint = $('searchHint');
    list.innerHTML = '';
    var ref = parseQueryRef(q);
    if (ref) {
      var bk = byId[ref.b];
      hint.textContent = 'Reference';
      list.appendChild(card(bname(bk) + ' ' + ref.c + (ref.v ? ':' + ref.v : ''), ref.v && bk.ch[ref.c - 1][ref.v - 1] ? bk.ch[ref.c - 1][ref.v - 1] : 'Open chapter', function () { openChapter(ref.b, ref.c, ref.v); }));
      return;
    }
    if (q.length < 3) { hint.textContent = 'Type at least 3 letters. Or a reference like Psalm 23.'; return; }
    var needle = q.toLowerCase(), hits = [], MAX = 150, total = 0;
    for (var i = 0; i < bible.books.length && hits.length < MAX; i++) {
      var b = bible.books[i];
      for (var c = 0; c < b.ch.length && hits.length < MAX; c++) {
        var vs = b.ch[c];
        for (var v = 0; v < vs.length; v++) {
          if (vs[v].toLowerCase().indexOf(needle) !== -1) { total++; if (hits.length < MAX) hits.push({ b: b, c: c + 1, v: v + 1, t: vs[v] }); }
        }
      }
    }
    if (!hits.length) { hint.textContent = 'Nothing found for “' + q + '”.'; return; }
    hint.textContent = (hits.length < MAX ? hits.length : 'First ' + MAX) + ' verses with “' + q + '”';
    var lastBook = null, re = new RegExp('(' + needle.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + ')', 'ig');
    hits.forEach(function (h) {
      if (h.b !== lastBook) { lastBook = h.b; var hd = document.createElement('div'); hd.className = 'bookhead'; hd.textContent = h.b.name; list.appendChild(hd); }
      list.appendChild(card(bname(h.b) + ' ' + h.c + ':' + h.v, { html: esc(h.t).replace(re, '<mark>$1</mark>') }, function () { openChapter(h.b.id, h.c, h.v); }));
    });
  }
  var searchT; $('searchIn').addEventListener('input', function () { clearTimeout(searchT); searchT = setTimeout(runSearch, 120); });
  $('searchIn').addEventListener('keydown', function (e) { if (e.key === 'Enter') { e.preventDefault(); runSearch(); $('searchIn').blur(); } });
  $('searchBack').onclick = function () { renderHome(); };

  /* ---------- saved ---------- */
  function openSaved() {
    back = 'saved';
    var list = $('savedList'); list.innerHTML = '';
    $('savedHint').textContent = saved.length ? saved.length + ' saved. Tap to read, × to remove.' : 'Tap a verse while reading, then Save.';
    saved.forEach(function (k) {
      var r = keyRef(k);
      if (!byId[r.b] || !byId[r.b].ch[r.c - 1]) return;
      list.appendChild(card(refLabel(r), refText(r), function () { openChapter(r.b, r.c, r.v1); }, function () {
        saved = saved.filter(function (x) { return x !== k; }); store.set('saved', saved); openSaved();
      }));
    });
    show('saved');
  }
  $('savedBack').onclick = function () { renderHome(); };

  /* ---------- reading plans ---------- */
  function planInfo() {
    var def = PLANS.filter(function (p) { return p.id === plan.id; })[0];
    var days = def.days(), day = days.length, finished = true;
    for (var d = 0; d < days.length; d++) {
      var allRead = days[d].every(function (ch) { return read[ch[0] + '.' + ch[1]]; });
      if (!allRead) { day = d + 1; finished = false; break; }
    }
    var today = finished ? days[days.length - 1] : days[day - 1];
    var doneToday = today.filter(function (ch) { return read[ch[0] + '.' + ch[1]]; }).length;
    return { def: def, days: days, day: day, today: today, doneToday: doneToday, finished: finished };
  }
  function openPlan() {
    if (!plan) return renderHome();
    back = 'plan';
    var P = planInfo();
    $('planTitle').textContent = P.def.name;
    $('planSub').textContent = P.def.sub + ' Started ' + new Date(plan.start + 'T12:00:00').toLocaleDateString(undefined, { month: 'long', day: 'numeric' }) + '.';
    var c = $('planCard'); c.innerHTML = '';
    var eyebrow = document.createElement('div'); eyebrow.className = 'eyebrow'; eyebrow.textContent = P.finished ? 'Complete' : 'Today'; c.appendChild(eyebrow);
    var h = document.createElement('div'); h.className = 'plan-day'; h.textContent = P.finished ? 'All ' + P.days.length + ' days done' : 'Day ' + P.day + ' of ' + P.days.length; c.appendChild(h);
    var bar = document.createElement('div'); bar.className = 'progress'; bar.style.marginBottom = '14px'; bar.innerHTML = '<i style="width:' + Math.round(100 * (P.finished ? P.days.length : P.day - 1) / P.days.length) + '%"></i>'; c.appendChild(bar);
    P.today.forEach(function (ch) {
      var done = !!read[ch[0] + '.' + ch[1]];
      var b = document.createElement('button'); b.className = 'check' + (done ? ' done' : '');
      b.innerHTML = '<span class="box">' + (done ? '<svg viewBox="0 0 24 24"><path d="M5 12l5 5 9-10"/></svg>' : '') + '</span><span></span>';
      b.querySelector('span:last-child').textContent = bname(byId[ch[0]]) + ' ' + ch[1];
      b.onclick = function () { openChapter(ch[0], ch[1]); };
      c.appendChild(b);
    });
    if (!P.finished) {
      var next = P.today.filter(function (ch) { return !read[ch[0] + '.' + ch[1]]; })[0];
      var go = document.createElement('button'); go.className = 'btn'; go.style.marginTop = '16px'; go.style.width = '100%';
      go.textContent = 'Read ' + bname(byId[next[0]]) + ' ' + next[1];
      go.onclick = function () { openChapter(next[0], next[1]); };
      c.appendChild(go);
    }
    show('plan');
  }
  $('planBack').onclick = function () { renderHome(); };
  $('planStop').onclick = function () {
    if (!confirm('Stop this plan? Chapters you read stay marked.')) return;
    plan = null; store.set('plan', null); toast('Plan stopped'); renderHome();
  };

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
    if (!location.hash && !$('home').classList.contains('on') && !$('read').classList.contains('on') && !$('collection').classList.contains('on')) return;
    route();
  });

  applyPrefs();
  load(tr, route);

  if ('serviceWorker' in navigator) {
    window.addEventListener('load', function () { navigator.serviceWorker.register('sw.js').catch(function () {}); });
  }
})();
