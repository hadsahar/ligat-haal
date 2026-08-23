/* שכבת גישה ל-Supabase דרך REST API.
   בלי ספריות חיצוניות — רק fetch. */

const Store = (() => {

  const TABLE = 'predictions';

  const base = () => `${CONFIG.SUPABASE_URL.replace(/\/+$/, '')}/rest/v1/${TABLE}`;

  const headers = extra => ({
    'apikey':        CONFIG.SUPABASE_ANON_KEY,
    'Authorization': `Bearer ${CONFIG.SUPABASE_ANON_KEY}`,
    'Content-Type':  'application/json',
    ...extra,
  });

  async function readError(res) {
    let detail = '';
    try {
      const body = await res.json();
      detail = body.message || body.hint || body.details || '';
    } catch { /* גוף לא-JSON — מתעלמים */ }

    if (res.status === 401 || res.status === 403) {
      return 'אין הרשאה לכתוב/לקרוא. ודא שהרצת את supabase/setup.sql ושהמפתחות ב-config.js נכונים.';
    }
    if (res.status === 404) {
      return 'הטבלה predictions לא נמצאה. הרץ את supabase/setup.sql ב-SQL Editor של Supabase.';
    }
    if (/deadline|check constraint|violates/i.test(detail)) {
      return 'ההגשה נדחתה על ידי השרת — כנראה שהדדליין עבר.';
    }
    return detail || `שגיאת שרת (${res.status}).`;
  }

  /** שולח ניחוש חדש. order = מערך של 14 מזהי קבוצות, אינדקס 0 = מקום ראשון. */
  async function submit(name, order) {
    const res = await fetch(base(), {
      method: 'POST',
      headers: headers({ 'Prefer': 'return=representation' }),
      body: JSON.stringify([{ name: name.trim(), team_order: order }]),
    });
    if (!res.ok) throw new Error(await readError(res));
    const rows = await res.json();
    return rows[0];
  }

  /** מחזיר את כל הניחושים, מהישן לחדש. */
  async function fetchAll() {
    const url = `${base()}?select=id,name,team_order,created_at&order=created_at.asc`;
    const res = await fetch(url, { headers: headers() });
    if (!res.ok) throw new Error(await readError(res));
    return await res.json();
  }

  return { submit, fetchAll };
})();
