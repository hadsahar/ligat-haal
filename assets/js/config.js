/* ============================================================
   קובץ ההגדרות היחיד שצריך לגעת בו.
   סהר — כל מה שאתה צריך לשנות נמצא כאן ובקובץ הזה בלבד.
   ============================================================ */

const CONFIG = {

  /* ---------- 1. חיבור ל-Supabase ----------
     אחרי שתיצור פרויקט ב-supabase.com:
     Project Settings ➜ API ➜ העתק את שני הערכים לכאן.
     המפתח ה-anon נועד להיות פומבי — זה בסדר שהוא בקוד. */
  SUPABASE_URL:      'https://YOUR-PROJECT-REF.supabase.co',
  SUPABASE_ANON_KEY: 'YOUR-ANON-KEY',

  /* ---------- 2. דדליין להגשות ----------
     אחרי התאריך הזה הטופס ננעל ורואים רק סטטיסטיקות.
     פורמט: שנה-חודש-יום שעה:דקה (שעון ישראל).
     שים לב: יש לעדכן את אותו תאריך גם ב-supabase/setup.sql
     כדי שהנעילה תהיה אמיתית ולא רק בדפדפן. */
  DEADLINE: '2026-09-05T23:59:00+03:00',

  /* ---------- 3. כותרות ---------- */
  TITLE:    'ניחושי ליגת העל',
  SEASON:   'עונת 2026/27',
  SUBTITLE: 'סדרו את 14 הקבוצות לפי המקום שבו הן יסיימו את העונה',

  /* ---------- 4. משמעות המיקומים בטבלה ----------
     צובע את המקומות בטופס ובסטטיסטיקות. */
  ZONES: [
    { from: 1,  to: 1,  key: 'champion',   label: 'אלופה'          },
    { from: 2,  to: 3,  key: 'europe',     label: 'אירופה'         },
    { from: 4,  to: 6,  key: 'top',        label: 'פלייאוף עליון'  },
    { from: 7,  to: 12, key: 'mid',        label: 'פלייאוף תחתון'  },
    { from: 13, to: 14, key: 'relegation', label: 'ירידה לליגה א׳' },
  ],

  /* ---------- 5. הקבוצות ----------
     14 הקבוצות של ליגת העל 2026/27.
     כדי להחליף קבוצה: פשוט שנה את ה-name. הסדר כאן לא משנה —
     הטופס מגריל סדר אקראי לכל משתתף כדי לא להטות את הניחושים.
     ה-color משמש רק לגרפים; שנה בחופשיות.
     ⚠️ ה-id חייב להישאר ייחודי ויציב — זה מה שנשמר בבסיס הנתונים.
        אל תשנה id אחרי שכבר הוגשו ניחושים. */
  TEAMS: [
    { id: 'beitar',   name: 'בית״ר ירושלים',      color: '#f59e0b' },
    { id: 'mta',      name: 'מכבי תל אביב',       color: '#fde047' },
    { id: 'hbs',      name: 'הפועל באר שבע',      color: '#e11d48' },
    { id: 'hta',      name: 'הפועל תל אביב',      color: '#dc2626' },
    { id: 'mhaifa',   name: 'מכבי חיפה',          color: '#16a34a' },
    { id: 'mnetanya', name: 'מכבי נתניה',         color: '#d4a017' },
    { id: 'hhaifa',   name: 'הפועל חיפה',         color: '#ef4444' },
    { id: 'ks',       name: 'עירוני קריית שמונה', color: '#991b1b' },
    { id: 'hpt',      name: 'הפועל פתח תקווה',    color: '#38bdf8' },
    { id: 'mpt',      name: 'מכבי פתח תקווה',     color: '#1d4ed8' },
    { id: 'sakhnin',  name: 'בני סכנין',          color: '#fb7185' },
    { id: 'hrg',      name: 'הפועל רמת גן',       color: '#a855f7' },
    { id: 'hjer',     name: 'הפועל ירושלים',      color: '#7f1d1d' },
    { id: 'tveria',   name: 'עירוני טבריה',       color: '#0891b2' },
  ],
};

/* ------------------------------------------------------------
   מכאן והלאה — לוגיקת עזר. אין צורך לשנות.
   ------------------------------------------------------------ */

CONFIG.TEAM_BY_ID = Object.fromEntries(CONFIG.TEAMS.map(t => [t.id, t]));
CONFIG.TEAM_COUNT = CONFIG.TEAMS.length;

CONFIG.zoneFor = pos => CONFIG.ZONES.find(z => pos >= z.from && pos <= z.to) || null;

CONFIG.isConfigured = () =>
  !CONFIG.SUPABASE_URL.includes('YOUR-PROJECT-REF') &&
  !CONFIG.SUPABASE_ANON_KEY.includes('YOUR-ANON-KEY');

CONFIG.deadlineDate = () => new Date(CONFIG.DEADLINE);
CONFIG.isPastDeadline = () => Date.now() > CONFIG.deadlineDate().getTime();
