/* עמוד הסטטיסטיקות: אוסף את כל הניחושים ומחשב את הפילוחים. */

(() => {
  'use strict';

  const $ = id => document.getElementById(id);
  const N = CONFIG.TEAM_COUNT;

  const note = (container, type, html) => {
    container.innerHTML = `<div class="note ${type}">${html}</div>`;
  };

  const esc = s => String(s).replace(/[&<>"]/g, c =>
    ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

  const relegationZone = CONFIG.ZONES.at(-1);

  /* ============ חישוב ============ */

  /** בונה טבלת נתונים לכל קבוצה מתוך רשימת ההגשות. */
  function analyse(entries) {
    const byTeam = new Map(CONFIG.TEAMS.map(t => [t.id, {
      team: t,
      positions: [],                       // כל המיקומים שניתנו לה
      counts: new Array(N).fill(0),        // counts[p-1] = כמה שמו אותה במקום p
    }]));

    for (const entry of entries) {
      entry.team_order.forEach((id, i) => {
        const rec = byTeam.get(id);
        if (!rec) return;                  // קבוצה שהוסרה מההגדרות — מתעלמים
        const pos = i + 1;
        rec.positions.push(pos);
        if (pos <= N) rec.counts[pos - 1]++;
      });
    }

    const stats = [...byTeam.values()].map(rec => {
      const p = rec.positions;
      const n = p.length;
      const avg = n ? p.reduce((a, b) => a + b, 0) / n : 0;
      const variance = n ? p.reduce((a, b) => a + (b - avg) ** 2, 0) / n : 0;
      return {
        ...rec,
        n,
        avg,
        sd:  Math.sqrt(variance),
        min: n ? Math.min(...p) : 0,
        max: n ? Math.max(...p) : 0,
        championVotes:   rec.counts[0] || 0,
        relegationVotes: rec.counts
          .slice(relegationZone.from - 1, relegationZone.to)
          .reduce((a, b) => a + b, 0),
      };
    }).filter(s => s.n > 0);

    stats.sort((a, b) => a.avg - b.avg);
    return stats;
  }

  /* ============ רכיבי תצוגה ============ */

  function voteBars(container, items, total, accent) {
    if (!items.length) { container.innerHTML = '<div class="empty">אין נתונים.</div>'; return; }
    const max = Math.max(...items.map(i => i.value), 1);
    const medals = ['🥇', '🥈', '🥉'];

    container.innerHTML = items.map((item, i) => `
      <div class="vote">
        <div class="rank">${medals[i] || `<span style="font-size:12px;color:var(--muted)">${i + 1}</span>`}</div>
        <div class="bar-wrap">
          <div class="bar-name">${esc(item.label)}</div>
          <div class="bar-bg">
            <div class="bar-fill" style="width:${(item.value / max) * 100}%;background:${accent || item.color}"></div>
          </div>
        </div>
        <div class="val">${item.text}</div>
      </div>`).join('');
  }

  function histogramHTML(stat) {
    const max = Math.max(...stat.counts, 1);
    const bars = stat.counts.map((c, i) => {
      const pos  = i + 1;
      const zone = CONFIG.zoneFor(pos);
      const h    = c ? Math.max(6, (c / max) * 100) : 2;
      const color = c
        ? (zone && zone.key === 'champion'   ? 'var(--gold)'
        :  zone && zone.key === 'relegation' ? 'var(--relegation)'
        :  stat.team.color)
        : 'rgba(255,255,255,.07)';
      return `<div class="hbar">
        <div class="c" style="color:${c ? 'var(--text)' : 'transparent'}">${c || 0}</div>
        <div class="b" style="height:${h}%;background:${color}"></div>
        <div class="n">${pos}</div>
      </div>`;
    }).join('');

    return `<div class="dist">
      <div class="dist-title">
        איפה מיקמו את <b style="color:${stat.team.color}">${esc(stat.team.name)}</b> —
        ממוצע <b>${stat.avg.toFixed(2)}</b> ·
        הכי גבוה <b>${stat.min}</b> · הכי נמוך <b>${stat.max}</b> ·
        פיזור <b>${stat.sd.toFixed(2)}</b>
      </div>
      <div class="hist">${bars}</div>
    </div>`;
  }

  function renderConsensus(stats) {
    const box = $('consensus');
    box.innerHTML = stats.map((s, i) => {
      const pos  = i + 1;
      const zone = CONFIG.zoneFor(pos);
      return `<div data-team="${s.team.id}">
        <button class="trow" type="button" aria-expanded="false">
          <div class="pos" data-zone="${zone ? zone.key : ''}">${pos}</div>
          <div class="nm"><i style="background:${s.team.color}"></i><span>${esc(s.team.name)}</span></div>
          <div class="avg">${s.avg.toFixed(2)}</div>
          <div class="rng">${s.min}–${s.max}</div>
        </button>
        <div class="panel" hidden></div>
      </div>`;
    }).join('');

    box.addEventListener('click', e => {
      const btn = e.target.closest('.trow');
      if (!btn) return;
      const wrap  = btn.parentElement;
      const panel = wrap.querySelector('.panel');
      const stat  = stats.find(s => s.team.id === wrap.dataset.team);
      const open  = !panel.hidden;

      // סוגר את כל השאר — פאנל אחד פתוח בכל רגע
      box.querySelectorAll('.panel').forEach(p => { p.hidden = true; p.innerHTML = ''; });
      box.querySelectorAll('.trow').forEach(b => { b.classList.remove('open'); b.setAttribute('aria-expanded', 'false'); });

      if (!open) {
        panel.innerHTML = histogramHTML(stat);
        panel.hidden = false;
        btn.classList.add('open');
        btn.setAttribute('aria-expanded', 'true');
      }
    });
  }

  /** מפת חום: קבוצות (לפי הטבלה המשוקללת) מול מיקומים. */
  function renderHeat(stats, total) {
    const box = $('heat');
    box.style.gridTemplateColumns = `minmax(112px, auto) repeat(${N}, minmax(22px, 1fr))`;

    const cells = ['<div></div>'];                                  // פינה ריקה
    for (let p = 1; p <= N; p++) cells.push(`<div class="hd">${p}</div>`);

    for (const s of stats) {
      cells.push(`<div class="rl"><i style="background:${s.team.color}"></i>${esc(s.team.name)}</div>`);
      for (let p = 1; p <= N; p++) {
        const c = s.counts[p - 1] || 0;
        if (!c) { cells.push('<div class="cell"></div>'); continue; }
        const share = c / total;                                    // 0..1
        const alpha = 0.18 + share * 0.82;
        cells.push(
          `<div class="cell on" style="background:rgba(61,220,132,${alpha.toFixed(2)})"
                title="${esc(s.team.name)} — מקום ${p}: ${c} מתוך ${total}">${c}</div>`);
      }
    }
    box.innerHTML = cells.join('');
    $('heat-note').textContent =
      `המספר בתא = כמה אנשים שמו את הקבוצה במקום הזה (מתוך ${total}).`;
  }

  function renderPeople(entries) {
    $('people-hint').textContent =
      `${entries.length} ${entries.length === 1 ? 'ניחוש' : 'ניחושים'} — לחצו על שם כדי לפתוח את הטבלה המלאה.`;

    $('people').innerHTML = entries.map(e => {
      const when = new Date(e.created_at).toLocaleDateString('he-IL', { day: 'numeric', month: 'short' });
      const champ = CONFIG.TEAM_BY_ID[e.team_order[0]];
      const table = e.team_order.map((id, i) => {
        const t = CONFIG.TEAM_BY_ID[id];
        if (!t) return '';
        const zone = CONFIG.zoneFor(i + 1);
        return `<div class="mini-row">
          <div class="pos" data-zone="${zone ? zone.key : ''}">${i + 1}</div>
          <div class="chip" style="background:${t.color}"></div>
          <div class="tname">${esc(t.name)}</div>
        </div>`;
      }).join('');

      return `<details class="person">
        <summary>
          <span>${esc(e.name)}</span>
          <small>${champ ? '🏆 ' + esc(champ.name) : ''} · ${when}</small>
        </summary>
        <div class="person-body"><div class="mini-table">${table}</div></div>
      </details>`;
    }).join('');
  }

  function renderKPIs(stats, entries) {
    const champ  = [...stats].sort((a, b) => b.championVotes - a.championVotes)[0];
    const drop   = [...stats].sort((a, b) => b.relegationVotes - a.relegationVotes)[0];
    const argued = [...stats].sort((a, b) => b.sd - a.sd)[0];
    const unique = new Set(entries.map(e => e.team_order.join('>'))).size;

    const pct = v => entries.length ? Math.round((v / entries.length) * 100) : 0;

    $('kpis').innerHTML = `
      <div class="stat"><div class="v">${entries.length}</div><div class="k">משתתפים</div></div>
      <div class="stat"><div class="v" style="color:var(--gold);font-size:17px">${esc(champ.team.name)}</div>
           <div class="k">האלופה המובילה · ${pct(champ.championVotes)}%</div></div>
      <div class="stat"><div class="v" style="color:var(--relegation);font-size:17px">${esc(drop.team.name)}</div>
           <div class="k">הכי הרבה קולות לירידה · ${pct(drop.relegationVotes)}%</div></div>
      <div class="stat"><div class="v" style="font-size:17px">${esc(argued.team.name)}</div>
           <div class="k">הכי שנויה במחלוקת</div></div>
      <div class="stat"><div class="v">${unique}</div><div class="k">טבלאות שונות מתוך ${entries.length}</div></div>`;
  }

  /* ============ אתחול ============ */

  async function init() {
    $('season').textContent = CONFIG.SEASON;

    if (!CONFIG.isConfigured()) {
      $('spinner').hidden = true;
      note($('sysnote'), 'warn',
        `<strong>עדיין לא מחובר ל-Supabase</strong>מלא את <code>SUPABASE_URL</code> ו-<code>SUPABASE_ANON_KEY</code> ` +
        `בקובץ <code>assets/js/config.js</code>. ההוראות המלאות ב-<code>README.md</code>.`);
      return;
    }

    let entries;
    try {
      entries = await Store.fetchAll();
    } catch (err) {
      $('spinner').hidden = true;
      note($('sysnote'), 'err', `<strong>לא הצלחתי לטעון את הנתונים</strong>${esc(err.message)}`);
      return;
    }

    // מסנן הגשות פגומות
    entries = entries.filter(e => Array.isArray(e.team_order) && e.team_order.length === N);

    $('spinner').hidden = true;

    if (!entries.length) {
      note($('sysnote'), 'info',
        `<strong>עוד אין ניחושים</strong>ברגע שמישהו יגיש, כל הסטטיסטיקות יופיעו כאן. ` +
        `<a href="index.html">היה הראשון</a>.`);
      return;
    }

    const stats = analyse(entries);
    $('content').hidden = false;

    renderKPIs(stats, entries);

    voteBars($('champs'),
      [...stats].filter(s => s.championVotes > 0)
                .sort((a, b) => b.championVotes - a.championVotes)
                .map(s => ({
                  label: s.team.name, value: s.championVotes, color: s.team.color,
                  text: `${s.championVotes} (${Math.round(s.championVotes / entries.length * 100)}%)`,
                })),
      entries.length);

    renderConsensus(stats);
    renderHeat(stats, entries.length);

    voteBars($('releg'),
      [...stats].filter(s => s.relegationVotes > 0)
                .sort((a, b) => b.relegationVotes - a.relegationVotes)
                .map(s => ({
                  label: s.team.name, value: s.relegationVotes, color: s.team.color,
                  text: `${s.relegationVotes} (${Math.round(s.relegationVotes / entries.length * 100)}%)`,
                })),
      entries.length, 'var(--relegation)');

    voteBars($('controversy'),
      [...stats].sort((a, b) => b.sd - a.sd).slice(0, 5)
                .map(s => ({
                  label: s.team.name, value: s.sd, color: s.team.color,
                  text: `${s.min}–${s.max}`,
                })),
      null, 'var(--europe)');

    renderPeople(entries);
  }

  init();
})();
