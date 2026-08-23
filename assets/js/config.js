/* ============================================================
   קובץ ההגדרות היחיד שצריך לגעת בו.
   סהר — כל מה שאתה צריך לשנות נמצא כאן ובקובץ הזה בלבד.
   ============================================================ */

const CONFIG = {

  /* ---------- 1. חיבור ל-Supabase ----------
     URL:  Project Settings ➜ Data API ➜ "Project URL"
     KEY:  Project Settings ➜ API Keys ➜ "Publishable key" (מתחיל ב-sb_publishable_)
           מפתח legacy מסוג anon (מתחיל ב-eyJ) עובד גם הוא.

     ⚠️ לעולם לא את Secret key / service_role — הם עוקפים את כל ההגנות.
     המפתח הפומבי נועד להיות גלוי בקוד; ההגנה היא ה-RLS שב-setup.sql. */
  SUPABASE_URL:      'https://ybroktrkezxjdraderia.supabase.co',
  SUPABASE_ANON_KEY: 'sb_publishable_T1Fjr9G47yn7Sc9Tjgltpw_DgX81RMj',

  /* ---------- 2. דדליין להגשות ----------
     אחרי התאריך הזה הטופס ננעל ורואים רק סטטיסטיקות.
     פורמט: שנה-חודש-יום שעה:דקה (שעון ישראל).
     שים לב: יש לעדכן את אותו תאריך גם ב-supabase/setup.sql
     כדי שהנעילה תהיה אמיתית ולא רק בדפדפן. */
  DEADLINE: '2026-08-31T23:59:00+03:00',

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
    { from: 13, to: 14, key: 'relegation', label: 'ירידה לליגה הלאומית' },
  ],

  /* ---------- 5. הקבוצות ----------
     14 הקבוצות של ליגת העל 2026/27.
     כדי להחליף קבוצה: פשוט שנה את ה-name. הסדר כאן לא משנה —
     הטופס מגריל סדר אקראי לכל משתתף כדי לא להטות את הניחושים.
     ה-color משמש רק לגרפים; שנה בחופשיות.
     ⚠️ ה-id חייב להישאר ייחודי ויציב — זה מה שנשמר בבסיס הנתונים.
        אל תשנה id אחרי שכבר הוגשו ניחושים.

     ✅ = הצבע אומת במקור כתוב · ❓ = לא הצלחתי לאמת, שווה שתעבור עליו.
     כשיש כמה קבוצות באותו צבע (חמש אדומות!) משתמשים באותו גוון
     בבהירויות שונות, כדי שהגרפים יישארו קריאים. */
  TEAMS: [
    { id: 'beitar',   name: 'בית״ר ירושלים',      color: '#eaff2c' }, // ✅ צהוב-שחור
    { id: 'mta',      name: 'מכבי תל אביב',       color: '#eaff2c' }, // ✅ צהוב-כחול
    { id: 'hbs',      name: 'הפועל באר שבע',      color: '#ff0008' }, // ✅ אדום
    { id: 'hta',      name: 'הפועל תל אביב',      color: '#ff0008' }, // ✅ אדום
    { id: 'mhaifa',   name: 'מכבי חיפה',          color: '#139b50' }, // ✅ ירוק
    { id: 'mnetanya', name: 'מכבי נתניה',         color: '#eaff2c' }, // ✅ צהוב
    { id: 'hhaifa',   name: 'הפועל חיפה',         color: '#c20300' }, // ✅ אדום-שחור
    { id: 'ks',       name: 'עירוני קריית שמונה', color: '#110fa3' }, // ✅ כחול (תוקן מבורדו)
    { id: 'hpt',      name: 'הפועל פתח תקווה',    color: '#110fa3' }, // ✅ "כחול שחור ולבן"
    { id: 'mpt',      name: 'מכבי פתח תקווה',     color: '#110fa3' }, // ✅ תכלת
    { id: 'sakhnin',  name: 'בני סכנין',          color: '#c20006' }, // ❓ לא ירוק — מה כן?
    { id: 'hrg',      name: 'הפועל רמת גן',       color: '#dd0007' }, // ✅ אדום עם שחור
    { id: 'hjer',     name: 'הפועל ירושלים',      color: '#c20300' }, // ✅ "אדום ושחור"
    { id: 'tveria',   name: 'עירוני טבריה',       color: '#3b8fd9' }, // ✅ כחול-לבן
  ],
  /* ---------- 6. קבוצות הליגה הלאומית ----------
     רלוונטי רק לניחוש זוכת גביע המדינה — הן משתתפות בגביע
     ויכולות לזכות בו, אבל הן לא חלק מטבלת ליגת העל.

     ⬅️ סהר: הדבק כאן את הרשימה. צריך רק id ו-name;
        אם לא תיתן color, ייבחר אפור ניטרלי אוטומטית.
        ה-id חייב להיות ייחודי ולא להתנגש עם ה-id-ים למעלה.

     דוגמה לפורמט:
       { id: 'leumit-example', name: 'שם הקבוצה' },

     כל עוד הרשימה ריקה — בבחירת הגביע יופיעו רק 14 קבוצות ליגת העל. */
  LEUMIT_TEAMS: [
    { id: 'l-bneiyehuda', name: 'בני יהודה תל אביב',    color: '#ea580c' },
    { id: 'l-raanana',    name: 'הפועל רעננה',          color: '#eb0000' },
    { id: 'l-kiryatyam',  name: 'מ.ס. קריית ים',        color: '#4154ff' },
    { id: 'l-kafrqasem',  name: 'מ.ס. כפר קאסם',        color: '#108039' },
    { id: 'l-afula',      name: 'הפועל עפולה',          color: '#2b3ee6' },
    { id: 'l-kiryatgat',  name: 'מכבי עירוני קריית גת', color: '#cdeb25' },
    { id: 'l-rishon',     name: 'הפועל ראשון לציון',    color: '#ffae00' },
    { id: 'l-modiin',     name: 'עירוני מודיעין',       color: '#4a00ca' },
    { id: 'l-herzliya',   name: 'מכבי הרצליה',          color: '#fffc2e' },
    { id: 'l-kfarshalem', name: 'הפועל כפר שלם',        color: '#db7c00' },
    { id: 'l-raina',      name: 'מכבי בני ריינה',       color: '#123186' },
    { id: 'l-nazareth',   name: 'מכבי אחי נצרת',        color: '#059669' },
    { id: 'l-ashdod',     name: 'מ.ס. אשדוד',           color: '#dfdc43' },
    { id: 'l-yafo',       name: 'מכבי קביליו יפו',      color: '#f3f2fd' },
    { id: 'l-kfarsaba',   name: 'הפועל כפר סבא',        color: '#16a34a' },
    { id: 'l-akko',       name: 'הפועל עכו',            color: '#562deb' },
  ],
};

/* ------------------------------------------------------------
   מכאן והלאה — לוגיקת עזר. אין צורך לשנות.
   ------------------------------------------------------------ */

CONFIG.TEAM_BY_ID = Object.fromEntries(CONFIG.TEAMS.map(t => [t.id, t]));
CONFIG.TEAM_COUNT = CONFIG.TEAMS.length;

/* צבע ברירת מחדל לקבוצות הליגה הלאומית שלא הוגדר להן צבע */
CONFIG.LEUMIT_TEAMS = (CONFIG.LEUMIT_TEAMS || []).map(t => ({ color: '#7c8aa8', ...t }));

/* מי יכולה לזכות בגביע — ליגת העל + הליגה הלאומית */
CONFIG.CUP_TEAMS = [...CONFIG.TEAMS, ...CONFIG.LEUMIT_TEAMS];
CONFIG.CUP_TEAM_BY_ID = Object.fromEntries(CONFIG.CUP_TEAMS.map(t => [t.id, t]));
CONFIG.hasLeumit = () => CONFIG.LEUMIT_TEAMS.length > 0;

CONFIG.zoneFor = pos => CONFIG.ZONES.find(z => pos >= z.from && pos <= z.to) || null;

CONFIG.isConfigured = () =>
  !CONFIG.SUPABASE_URL.includes('YOUR-PROJECT-REF') &&
  !CONFIG.SUPABASE_ANON_KEY.includes('YOUR-ANON-KEY');

CONFIG.deadlineDate = () => new Date(CONFIG.DEADLINE);
CONFIG.isPastDeadline = () => Date.now() > CONFIG.deadlineDate().getTime();
