/* לוגיקת עמוד ההגשה: גרירה, ולידציה, שליחה ונעילה. */

(() => {
  'use strict';

  const LOCK_KEY = 'lhaal:submitted:v1';

  const $ = id => document.getElementById(id);

  const el = {
    list:       $('list'),
    name:       $('name'),
    submit:     $('submit'),
    submitNote: $('submit-note'),
    sysNote:    $('sysnote'),
    formView:   $('form-view'),
    doneView:   $('done-view'),
    doneName:   $('done-name'),
    doneTable:  $('done-table'),
    deadline:   $('deadline'),
  };

  /** order[i] = מזהה הקבוצה שנמצאת במקום ה-i+1 */
  let order = [];
  let rows  = [];   // אלמנטי ה-<li> לפי סדר ה-DOM (תואם ל-order)

  /* ============ עזרים ============ */

  const shuffled = arr => {
    const a = arr.slice();
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  };

  const note = (container, type, html) => {
    container.innerHTML = `<div class="note ${type}">${html}</div>`;
  };

  const readLock = () => {
    try { return JSON.parse(localStorage.getItem(LOCK_KEY)); }
    catch { return null; }
  };

  /* ============ רינדור ============ */

  function positionBadge(pos) {
    const zone = CONFIG.zoneFor(pos);
    return `<div class="pos" data-zone="${zone ? zone.key : ''}">${pos}</div>`;
  }

  function render() {
    el.list.innerHTML = '';
    order.forEach((id, i) => {
      const team = CONFIG.TEAM_BY_ID[id];
      const pos  = i + 1;
      const zone = CONFIG.zoneFor(pos);

      const li = document.createElement('li');
      li.className = 'row';
      li.dataset.id = id;
      li.innerHTML = `
        ${positionBadge(pos)}
        <div class="chip" style="background:${team.color}"></div>
        <div class="tname">${team.name}</div>
        <div class="zonetag" data-zone="${zone ? zone.key : ''}">${zone ? zone.label : ''}</div>
        <div class="arrows">
          <button type="button" data-dir="-1" aria-label="העלה מקום אחד" ${i === 0 ? 'disabled' : ''}>▲</button>
          <button type="button" data-dir="1"  aria-label="הורד מקום אחד" ${i === order.length - 1 ? 'disabled' : ''}>▼</button>
        </div>
        <div class="grip" aria-hidden="true">
          <svg width="15" height="15" viewBox="0 0 16 16" fill="currentColor">
            <circle cx="5" cy="3.2" r="1.5"/><circle cx="11" cy="3.2" r="1.5"/>
            <circle cx="5" cy="8"   r="1.5"/><circle cx="11" cy="8"   r="1.5"/>
            <circle cx="5" cy="12.8" r="1.5"/><circle cx="11" cy="12.8" r="1.5"/>
          </svg>
        </div>`;
      el.list.appendChild(li);
    });
    rows = Array.from(el.list.children);
  }

  /** מעדכן רק את תגי המיקום, לפי מיפוי אינדקס-DOM ➜ מיקום ויזואלי. */
  function paintPositions(visualIndexOf) {
    rows.forEach((row, domIdx) => {
      const pos  = (visualIndexOf ? visualIndexOf(domIdx) : domIdx) + 1;
      const zone = CONFIG.zoneFor(pos);
      const badge = row.querySelector('.pos');
      badge.textContent = pos;
      badge.dataset.zone = zone ? zone.key : '';
      const tag = row.querySelector('.zonetag');
      tag.dataset.zone = zone ? zone.key : '';
      tag.textContent = zone ? zone.label : '';
    });
  }

  /* ============ חצים ============ */

  el.list.addEventListener('click', e => {
    const btn = e.target.closest('.arrows button');
    if (!btn) return;
    const row  = btn.closest('.row');
    const from = rows.indexOf(row);
    const to   = from + Number(btn.dataset.dir);
    if (to < 0 || to >= order.length) return;

    [order[from], order[to]] = [order[to], order[from]];
    render();

    // מחזיר את הפוקוס לאותו כפתור בשורה שזזה, כדי לאפשר לחיצות רצופות
    const moved = rows[to].querySelector(`.arrows button[data-dir="${btn.dataset.dir}"]`);
    if (moved && !moved.disabled) moved.focus();
  });

  /* ============ גרירה (עכבר + מגע) ============ */

  let drag = null;
  let autoScrollTimer = null;

  function rowStep() {
    if (rows.length < 2) return rows.length ? rows[0].offsetHeight : 0;
    return rows[1].getBoundingClientRect().top - rows[0].getBoundingClientRect().top;
  }

  el.list.addEventListener('pointerdown', e => {
    const grip = e.target.closest('.grip');
    if (!grip || e.button > 0) return;

    const row = grip.closest('.row');
    const from = rows.indexOf(row);
    if (from < 0) return;

    e.preventDefault();
    try { grip.setPointerCapture(e.pointerId); } catch { /* דפדפן ישן — ממשיכים בלי */ }

    drag = {
      grip,
      row,
      from,
      to: from,
      startY: e.clientY,
      startScroll: window.scrollY,
      step: rowStep(),
      clientY: e.clientY,
    };

    row.classList.add('dragging');
    rows.forEach(r => { if (r !== row) r.classList.add('shifting'); });
    document.body.style.cursor = 'grabbing';

    autoScrollTimer = requestAnimationFrame(autoScrollTick);
  });

  el.list.addEventListener('pointermove', e => {
    if (!drag) return;
    e.preventDefault();
    drag.clientY = e.clientY;
    updateDrag();
  });

  function updateDrag() {
    const dy = (drag.clientY - drag.startY) + (window.scrollY - drag.startScroll);
    drag.row.style.transform = `translateY(${dy}px)`;

    const raw = drag.from + Math.round(dy / drag.step);
    const to  = Math.max(0, Math.min(order.length - 1, raw));
    if (to === drag.to) return;
    drag.to = to;

    const { from } = drag;
    rows.forEach((r, i) => {
      if (r === drag.row) return;
      let shift = 0;
      if (from < to && i > from && i <= to) shift = -drag.step;
      else if (from > to && i < from && i >= to) shift = drag.step;
      r.style.transform = shift ? `translateY(${shift}px)` : '';
    });

    paintPositions(i => {
      if (i === from) return to;
      if (from < to && i > from && i <= to) return i - 1;
      if (from > to && i < from && i >= to) return i + 1;
      return i;
    });
  }

  /** גלילה אוטומטית כשגוררים לקצה המסך. */
  function autoScrollTick() {
    if (!drag) return;
    const margin = 90;
    const y = drag.clientY;
    let delta = 0;
    if (y < margin)                       delta = -Math.ceil((margin - y) / 6);
    else if (y > innerHeight - margin)    delta =  Math.ceil((y - (innerHeight - margin)) / 6);

    if (delta) {
      window.scrollBy(0, delta);
      updateDrag();
    }
    autoScrollTimer = requestAnimationFrame(autoScrollTick);
  }

  function endDrag(e) {
    if (!drag) return;
    const { from, to } = drag;

    cancelAnimationFrame(autoScrollTimer);
    try { drag.grip.releasePointerCapture(e.pointerId); } catch { /* כבר שוחרר */ }

    rows.forEach(r => { r.style.transform = ''; r.classList.remove('shifting'); });
    drag.row.classList.remove('dragging');
    document.body.style.cursor = '';
    drag = null;

    if (from !== to) {
      const [moved] = order.splice(from, 1);
      order.splice(to, 0, moved);
    }
    render();
  }

  el.list.addEventListener('pointerup', endDrag);
  el.list.addEventListener('pointercancel', endDrag);

  /* ============ כפתורי עזר ============ */

  $('shuffle').addEventListener('click', () => { order = shuffled(order); render(); });
  $('reset').addEventListener('click',   () => { order = CONFIG.TEAMS.map(t => t.id); render(); });

  /* ============ ספירה לאחור ============ */

  function paintDeadline() {
    const ms = CONFIG.deadlineDate().getTime() - Date.now();
    el.deadline.hidden = false;

    if (ms <= 0) {
      el.deadline.className = 'deadline closed';
      el.deadline.innerHTML = '🔒 <b>ההגשות נסגרו</b>';
      return;
    }

    const s = Math.floor(ms / 1000);
    const d = Math.floor(s / 86400);
    const h = Math.floor((s % 86400) / 3600);
    const m = Math.floor((s % 3600) / 60);
    const sec = s % 60;

    const days  = d === 1 ? 'יום <b>אחד</b>' : `<b>${d}</b> ימים`;
    const hours = h === 1 ? 'שעה <b>אחת</b>' : `<b>${h}</b> שעות`;

    const left = d > 0
      ? `${days} ו-${hours}`
      : `<b>${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(sec).padStart(2, '0')}</b>`;

    el.deadline.className = 'deadline';
    el.deadline.innerHTML = `⏳ נותרו ${left} לסגירת ההגשות`;
  }

  /* ============ שליחה ============ */

  async function onSubmit() {
    const name = el.name.value.trim();
    el.submitNote.innerHTML = '';

    if (name.length < 2) {
      note(el.submitNote, 'err', 'צריך למלא שם (לפחות 2 תווים) לפני השליחה.');
      el.name.focus();
      el.name.scrollIntoView({ behavior: 'smooth', block: 'center' });
      return;
    }
    if (CONFIG.isPastDeadline()) {
      note(el.submitNote, 'err', 'הדדליין עבר — לא ניתן להגיש יותר.');
      return;
    }

    el.submit.disabled = true;
    el.submit.textContent = 'שולח…';

    try {
      await Store.submit(name, order);
      localStorage.setItem(LOCK_KEY, JSON.stringify({ name, order, at: Date.now() }));
      showDone({ name, order });
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch (err) {
      note(el.submitNote, 'err', `<strong>ההגשה נכשלה</strong>${err.message}`);
      el.submit.disabled = false;
      el.submit.textContent = 'שלח את הניחוש שלי 🔒';
    }
  }

  /* ============ מצב "כבר הגשת" ============ */

  function showDone(lock) {
    el.formView.hidden = true;
    el.doneView.hidden = false;
    el.doneName.textContent = `הניחוש של ${lock.name} נשלח!`;

    el.doneTable.innerHTML = lock.order.map((id, i) => {
      const team = CONFIG.TEAM_BY_ID[id];
      if (!team) return '';
      return `<div class="mini-row">
        ${positionBadge(i + 1)}
        <div class="chip" style="background:${team.color}"></div>
        <div class="tname">${team.name}</div>
      </div>`;
    }).join('');
  }

  $('unlock').addEventListener('click', () => {
    if (!confirm('לנקות את הנעילה מהמכשיר הזה? ההגשה שכבר נשלחה תישאר בתוצאות.')) return;
    localStorage.removeItem(LOCK_KEY);
    location.reload();
  });

  /* ============ אתחול ============ */

  function init() {
    document.getElementById('title').textContent  = CONFIG.TITLE;
    document.getElementById('season').textContent = CONFIG.SEASON;
    document.getElementById('order-hint').innerHTML =
      `גררו את הידית <b>⠿</b> כדי להזיז קבוצה, או השתמשו בחצים. ` +
      `הקבוצה העליונה היא האלופה, ${CONFIG.ZONES.at(-1).to - CONFIG.ZONES.at(-1).from + 1} התחתונות יורדות ליגה.`;

    const lock = readLock();
    if (lock && Array.isArray(lock.order)) { showDone(lock); paintDeadline(); return; }

    if (CONFIG.isPastDeadline()) {
      note(el.sysNote, 'err',
        `<strong>ההגשות נסגרו</strong>הדדליין (${CONFIG.deadlineDate().toLocaleString('he-IL')}) עבר. ` +
        `אפשר עדיין לראות את <a href="stats.html">התוצאות</a>.`);
      paintDeadline();
      return;
    }

    el.formView.hidden = false;
    order = shuffled(CONFIG.TEAMS.map(t => t.id));   // סדר אקראי כדי לא להטות
    render();
    paintDeadline();
    setInterval(paintDeadline, 1000);

    if (!CONFIG.isConfigured()) {
      note(el.sysNote, 'warn',
        `<strong>מצב תצוגה בלבד</strong>עדיין לא הוגדר חיבור ל-Supabase, ולכן ההגשה מושבתת. ` +
        `מלא את <code>SUPABASE_URL</code> ו-<code>SUPABASE_ANON_KEY</code> בקובץ <code>assets/js/config.js</code> ` +
        `(ההוראות המלאות ב-<code>README.md</code>).`);
      el.submit.disabled = true;
      el.submit.textContent = 'ההגשה מושבתת — חסרות הגדרות';
      return;
    }

    el.submit.addEventListener('click', onSubmit);
  }

  init();
})();
