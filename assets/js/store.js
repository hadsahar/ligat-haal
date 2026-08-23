/* שכבת גישה ל-Supabase דרך REST API.
   בלי ספריות חיצוניות — רק fetch. */

const Store = (() => {

  const TABLE = 'predictions';

  /* מקבל גם URL בסיסי וגם כזה שכולל כבר /rest/v1 — טעות נפוצה בהעתקה. */
  const base = () => {
    const root = CONFIG.SUPABASE_URL.trim()
      .replace(/\/+$/, '')
      .replace(/\/rest\/v1$/, '');
    return `${root}/rest/v1/${TABLE}`;
  };

  /* ⚠️ אל תשנה: שני ההדרים חייבים לשאת את *אותו* ערך בדיוק.
     מפתחות מהדור החדש (sb_publishable_...) נדחים ב-Authorization: Bearer
     אלא אם הערך זהה ל-apikey — וזה בדיוק המצב כאן.
     מפתחות legacy (anon, מתחילים ב-eyJ) עובדים כך ממילא.
     כלומר הצורה הזו תקפה לשני סוגי המפתחות. */
  const headers = extra => ({
    'apikey':        CONFIG.SUPABASE_ANON_KEY,
    'Authorization': `Bearer ${CONFIG.SUPABASE_ANON_KEY}`,
    'Content-Type':  'application/json',
    ...extra,
  });

  /* ממפה שגיאת שרת להודעה בעברית.
     סדר הבדיקות חשוב: קודם לפי תוכן/קוד השגיאה, ורק אחר כך לפי סטטוס.
     הדדליין נאכף כ-RLS policy ולכן חוזר כ-403 — בלי הבדיקה הזו הוא היה
     מוצג בטעות כ"בעיית מפתחות". */
  async function readError(res) {
    let detail = '', code = '';
    try {
      const body = await res.json();
      detail = body.message || body.hint || body.details || '';
      code   = body.code || '';
    } catch { /* גוף לא-JSON — מתעלמים */ }

    // ה-policy היחידה שחוסמת הוספה היא זו של הדדליין
    if (code === '42501' || /row-level security/i.test(detail)) {
      return 'ההגשות נסגרו — הדדליין עבר, ולא ניתן להגיש יותר.';
    }
    if (code === '23514' || /check constraint/i.test(detail)) {
      return 'הניחוש נדחה כלא תקין (צריך בדיוק 14 קבוצות שונות ושם באורך 2–24 תווים).';
    }
    if (code === '42P01' || res.status === 404) {
      return 'הטבלה predictions לא נמצאה. הרץ את supabase/setup.sql ב-SQL Editor של Supabase.';
    }
    if (res.status === 401 || res.status === 403) {
      return 'אין הרשאה. ודא שהמפתחות ב-config.js נכונים ושהרצת את supabase/setup.sql.';
    }
    if (!res.status) {
      return 'אין חיבור לאינטרנט, או שהשרת לא זמין. נסה שוב.';
    }
    return detail || `שגיאת שרת (${res.status}).`;
  }

  /** שולח ניחוש חדש.
      order      = מערך של 14 מזהי קבוצות, אינדקס 0 = מקום ראשון
      cupWinner  = מזהה הקבוצה שתזכה בגביע (יכולה להיות גם מהליגה הלאומית) */
  async function submit(name, order, cupWinner) {
    const res = await fetch(base(), {
      method: 'POST',
      headers: headers({ 'Prefer': 'return=representation' }),
      body: JSON.stringify([{
        name: name.trim(),
        team_order: order,
        cup_winner: cupWinner || null,
      }]),
    });
    if (!res.ok) throw new Error(await readError(res));
    const rows = await res.json();
    return rows[0];
  }

  /** מחזיר את כל הניחושים, מהישן לחדש. */
  async function fetchAll() {
    const url = `${base()}?select=id,name,team_order,cup_winner,created_at&order=created_at.asc`;
    const res = await fetch(url, { headers: headers() });
    if (!res.ok) throw new Error(await readError(res));
    return await res.json();
  }

  return { submit, fetchAll };
})();
