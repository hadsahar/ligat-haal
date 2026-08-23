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

  /* ---- מדדים ברמת המשתתף ----
     המרחק בין שתי טבלאות = סכום הפרשי המיקומים של כל קבוצה
     (Spearman footrule). 0 = טבלאות זהות.
     המרחק המרבי האפשרי ל-14 קבוצות הוא 98, וזה מה שמנרמל לאחוזים. */

  const MAX_DIST = 2 * Math.floor((N * N) / 4);

  const posMap = entry => new Map(entry.team_order.map((id, i) => [id, i + 1]));

  const footrule = (a, b) => {
    let d = 0;
    for (const [id, p] of a) { const q = b.get(id); if (q) d += Math.abs(p - q); }
    return d;
  };

  const similarity = dist => Math.round((1 - dist / MAX_DIST) * 100);

  /** לכל משתתף: כמה הוא רחוק מהקונצנזוס, ומי הכי דומה לו. */
  function analysePeople(entries, consensusRank) {
    const people = entries.map(e => ({ entry: e, pos: posMap(e) }));

    for (const p of people) {
      p.distFromConsensus = footrule(p.pos, consensusRank);
      p.mainstream = similarity(p.distFromConsensus);
    }

    // זוגות — n קטן, אז השוואה מלאה היא זניחה
    const pairs = [];
    for (let i = 0; i < people.length; i++) {
      for (let j = i + 1; j < people.length; j++) {
        pairs.push({ a: people[i], b: people[j], dist: footrule(people[i].pos, people[j].pos) });
      }
    }
    pairs.sort((x, y) => x.dist - y.dist);

    for (const p of people) {
      const best = pairs.find(pr => pr.a === p || pr.b === p);
      p.twin = best ? { other: best.a === p ? best.b : best.a, dist: best.dist } : null;
    }

    return { people, pairs };
  }

  /** ההימורים הבודדים שהכי חורגים מהקונצנזוס. */
  function boldestCalls(people, consensusRank, limit = 6) {
    const calls = [];
    for (const p of people) {
      for (const [id, rank] of consensusRank) {
        const mine = p.pos.get(id);
        if (!mine) continue;
        calls.push({
          name: p.entry.name,
          team: CONFIG.TEAM_BY_ID[id],
          mine,
          consensus: rank,
          dev: mine - rank,          // שלילי = אופטימי (מיקם גבוה יותר)
        });
      }
    }
    calls.sort((a, b) => Math.abs(b.dev) - Math.abs(a.dev));
    return calls.slice(0, limit);
  }

  /** מספר מקומות האירופה מהליגה (ללא הגביע) — נגזר מ-ZONES. */
  const EU_LEAGUE_SPOTS = (CONFIG.ZONES.find(z => z.key === 'europe') || { to: 3 }).to;

  /** מי מעפילה לאירופה לפי ניחוש בודד.
      כלל: המקומות הראשונים בליגה + זוכת הגביע.
      אם זוכת הגביע כבר נמצאת בפנים, הכרטיס שלה מחליק למקום הבא —
      כלומר תמיד יוצאות בדיוק EU_LEAGUE_SPOTS + 1 קבוצות. */
  function europeanQualifiers(entry) {
    const top = entry.team_order.slice(0, EU_LEAGUE_SPOTS);
    const cup = entry.cup_winner;
    if (!cup) return { teams: top, cascaded: false };          // הגשה מלפני שדה הגביע
    if (top.includes(cup)) {
      return { teams: entry.team_order.slice(0, EU_LEAGUE_SPOTS + 1), cascaded: true };
    }
    return { teams: [...top, cup], cascaded: false };
  }

  /** כמה אנשים דירגו את idA מעל idB. */
  function headToHead(entries, idA, idB) {
    let a = 0, b = 0;
    for (const e of entries) {
      const ia = e.team_order.indexOf(idA);
      const ib = e.team_order.indexOf(idB);
      if (ia < 0 || ib < 0) continue;
      if (ia < ib) a++; else b++;
    }
    return { a, b, total: a + b };
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

  /* ---- מי הולך עם הזרם ---- */
  function renderMainstream(people) {
    const sorted = [...people].sort((a, b) => a.distFromConsensus - b.distFromConsensus);
    const worst = sorted.at(-1).distFromConsensus || 1;

    $('mainstream').innerHTML = sorted.map((p, i) => {
      const pct = (p.distFromConsensus / worst) * 100;
      // ירוק = זורם עם הקונצנזוס, כתום/אדום = הולך נגדו
      const hue = Math.round(140 - (p.distFromConsensus / worst) * 140);
      const tag = i === 0 ? ' 🐑' : (i === sorted.length - 1 ? ' 🦅' : '');
      return `<div class="vote">
        <div class="rank"><span style="font-size:12px;color:var(--muted)">${i + 1}</span></div>
        <div class="bar-wrap">
          <div class="bar-name">${esc(p.entry.name)}${tag}</div>
          <div class="bar-bg"><div class="bar-fill"
               style="width:${Math.max(4, pct)}%;background:hsl(${hue} 70% 55%)"></div></div>
        </div>
        <div class="val">${p.mainstream}% זהות</div>
      </div>`;
    }).join('');

    $('mainstream-note').innerHTML =
      `🐑 <b>${esc(sorted[0].entry.name)}</b> הכי קרוב לדעת הקהל · ` +
      `🦅 <b>${esc(sorted.at(-1).entry.name)}</b> הכי הולך נגד הזרם`;
  }

  /* ---- מי חושב כמוך ---- */
  function renderTwins(pairs) {
    const top = pairs.slice(0, 4);
    const opposite = pairs.at(-1);

    $('twins').innerHTML = top.map((pr, i) => `
      <div class="pair">
        <div class="pair-medal">${['🥇','🥈','🥉','4'][i]}</div>
        <div class="pair-names">${esc(pr.a.entry.name)} <span>↔</span> ${esc(pr.b.entry.name)}</div>
        <div class="pair-pct">${similarity(pr.dist)}%</div>
      </div>`).join('');

    $('twins-note').innerHTML = opposite
      ? `ובקצה השני: <b>${esc(opposite.a.entry.name)}</b> מול <b>${esc(opposite.b.entry.name)}</b> — ` +
        `כמעט לא מסכימים על כלום — ${similarity(opposite.dist)}% זהות בלבד.`
      : '';
  }

  /* ---- הקריאות האמיצות ---- */
  function renderBold(calls) {
    $('bold').innerHTML = calls.map(c => {
      const up = c.dev < 0;
      return `<div class="bold-call">
        <div class="bold-arrow ${up ? 'up' : 'down'}">${up ? '▲' : '▼'}</div>
        <div class="bold-text">
          <b>${esc(c.name)}</b> שם את
          <b style="color:${c.team.color}">${esc(c.team.name)}</b>
          במקום <b>${c.mine}</b>
          <span>· הקונצנזוס: ${c.consensus}</span>
        </div>
        <div class="bold-gap ${up ? 'up' : 'down'}">${up ? '+' : '−'}${Math.abs(c.dev)}</div>
      </div>`;
    }).join('');
  }

  /* ---- ראש בראש ---- */
  function renderH2H(entries, stats) {
    const selA = $('h2h-a'), selB = $('h2h-b');
    const opts = stats.map(s =>
      `<option value="${s.team.id}">${esc(s.team.name)}</option>`).join('');
    selA.innerHTML = opts;
    selB.innerHTML = opts;
    selA.value = stats[0].team.id;
    selB.value = stats[1].team.id;

    const paint = () => {
      const idA = selA.value, idB = selB.value;
      if (idA === idB) {
        $('h2h-result').innerHTML =
          '<div class="empty" style="padding:18px">בחרו שתי קבוצות שונות.</div>';
        return;
      }
      const tA = CONFIG.TEAM_BY_ID[idA], tB = CONFIG.TEAM_BY_ID[idB];
      const { a, b, total } = headToHead(entries, idA, idB);
      const pa = total ? Math.round((a / total) * 100) : 0;

      $('h2h-result').innerHTML = `
        <div class="h2h-bar">
          <div style="width:${pa}%;background:${tA.color}"></div>
          <div style="width:${100 - pa}%;background:${tB.color}"></div>
        </div>
        <div class="h2h-legend">
          <div><i style="background:${tA.color}"></i>${esc(tA.name)} <b>${a}</b> (${pa}%)</div>
          <div><i style="background:${tB.color}"></i>${esc(tB.name)} <b>${b}</b> (${100 - pa}%)</div>
        </div>
        <div class="h2h-verdict">${
          a === b ? 'תיקו מוחלט — הקבוצה חצויה.'
          : `<b>${esc(a > b ? tA.name : tB.name)}</b> מסיימת מעל ` +
            `<b>${esc(a > b ? tB.name : tA.name)}</b> אצל ${Math.max(pa, 100 - pa)}% מהמנחשים.`
        }</div>`;
    };

    selA.onchange = paint;
    selB.onchange = paint;
    paint();
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

    // זוכת הגביע — כולל קבוצות מהליגה הלאומית
    const cupVotes = new Map();
    for (const e of entries) {
      if (!e.cup_winner) continue;                   // הגשות מלפני שהשדה נוסף
      cupVotes.set(e.cup_winner, (cupVotes.get(e.cup_winner) || 0) + 1);
    }
    const cupTotal = [...cupVotes.values()].reduce((a, b) => a + b, 0);

    if (!cupTotal) {
      $('cup-card').hidden = true;
    } else {
      voteBars($('cup'),
        [...cupVotes.entries()]
          .map(([id, v]) => ({ team: CONFIG.CUP_TEAM_BY_ID[id], value: v }))
          .filter(x => x.team)
          .sort((a, b) => b.value - a.value)
          .map(x => ({
            label: x.team.name, value: x.value, color: x.team.color,
            text: `${x.value} (${Math.round(x.value / cupTotal * 100)}%)`,
          })),
        cupTotal);

      const leumitPicks = [...cupVotes.entries()]
        .filter(([id]) => id.startsWith('l-'))
        .reduce((a, [, v]) => a + v, 0);
      $('cup-hint').innerHTML =
        `זוכת הגביע מקבלת מקום באירופה. ${cupTotal} מתוך ${entries.length} ניחשו.` +
        (leumitPicks ? ` <b>${leumitPicks}</b> הימרו על קבוצה מהליגה הלאומית 😮` : '');
    }

    // מירוץ לאירופה — לפי הכלל האמיתי, כולל החלקת הכרטיס של הגביע
    const euVotes = new Map();
    let cascaded = 0;
    for (const e of entries) {
      const q = europeanQualifiers(e);
      if (q.cascaded) cascaded++;
      for (const id of q.teams) euVotes.set(id, (euVotes.get(id) || 0) + 1);
    }

    voteBars($('europe'),
      [...euVotes.entries()]
        .map(([id, v]) => ({ team: CONFIG.CUP_TEAM_BY_ID[id], value: v }))
        .filter(x => x.team)
        .sort((a, b) => b.value - a.value)
        .map(x => ({
          label: x.team.name, value: x.value, color: x.team.color,
          text: `${x.value} (${Math.round(x.value / entries.length * 100)}%)`,
        })),
      entries.length, 'var(--europe)');

    $('europe-hint').innerHTML =
      `${EU_LEAGUE_SPOTS} המקומות הראשונים בליגה, ועוד זוכת הגביע — ` +
      `${EU_LEAGUE_SPOTS + 1} קבוצות בכל ניחוש. ` +
      (cascaded
        ? `אצל <b>${cascaded}</b> מכם זוכת הגביע כבר בשלישייה, ולכן הכרטיס שלה ` +
          `מחליק למקום <b>${EU_LEAGUE_SPOTS + 1}</b>.`
        : `אצל אף אחד זוכת הגביע לא נמצאת בשלישייה, אז אף אחד לא נכנס דרך מקום ` +
          `${EU_LEAGUE_SPOTS + 1}.`);

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
      null, 'var(--relegation)');

    // הצד השני של המטבע: הקבוצות עם הפיזור הקטן ביותר
    const agreed = [...stats].sort((a, b) => a.sd - b.sd).slice(0, 5);
    const maxSd  = Math.max(...agreed.map(s => s.sd), 0.01);
    voteBars($('agreement'),
      agreed.map(s => ({
        label: s.team.name,
        value: maxSd - s.sd + 0.01,        // ככל שהפיזור קטן — הפס ארוך
        color: s.team.color,
        text: `${s.min}–${s.max}`,
      })),
      null, 'var(--accent)');

    /* ---- הפילוחים החברתיים — דורשים כמה משתתפים כדי להיות משמעותיים ---- */
    const MIN_SOCIAL = 3;
    const social = document.querySelectorAll('[data-needs-people]');

    if (entries.length >= MIN_SOCIAL) {
      const consensusRank = new Map(stats.map((s, i) => [s.team.id, i + 1]));
      const { people, pairs } = analysePeople(entries, consensusRank);

      renderMainstream(people);
      renderTwins(pairs);
      renderBold(boldestCalls(people, consensusRank));
      renderH2H(entries, stats);
    } else {
      social.forEach(el => el.hidden = true);
      note($('sysnote'), 'info',
        `<strong>עוד מעט</strong>חלק מהסטטיסטיקות (מי הולך עם הזרם, מי חושב כמוך, ` +
        `הקריאות האמיצות) נפתחות מ-${MIN_SOCIAL} משתתפים ומעלה. כרגע יש ` +
        `${entries.length}.`);
    }

    renderPeople(entries);
  }

  init();
})();
