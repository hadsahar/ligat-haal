# ⚽ ניחושי ליגת העל

עמוד סטטי שבו חברים גוררים 14 קבוצות לסדר שבו הן יסיימו את העונה — ועמוד תוצאות
עם סטטיסטיקות: מי האלופה לפי הקבוצה, ממוצע מיקומים, התפלגות לכל קבוצה, מפת חום ומחלוקות.

אין שרת ואין build. שלושה קבצי HTML/CSS/JS + טבלה אחת ב-Supabase.

---

## הקמה — 4 שלבים

### 1. יצירת בסיס הנתונים (חד־פעמי, ~5 דקות)

1. היכנס ל-[supabase.com](https://supabase.com) והירשם (חינם).
2. **New project** → תן שם (למשל `ligat-haal`), בחר סיסמה ל-DB ואזור **Central EU** (הכי קרוב).
3. המתן ~2 דקות עד שהפרויקט עולה.
4. בתפריט הצד → **SQL Editor** → **New query**.
5. העתק לשם את **כל** התוכן של [`supabase/setup.sql`](supabase/setup.sql) → **Run**.

> ⚠️ לפני ההרצה, ודא שתאריך הדדליין בשורת `insert before deadline`
> זהה ל-`DEADLINE` שב-`config.js`.

**אם Supabase מציג אזהרת "Potential issue detected / destructive operations":**
היא נדלקת אוטומטית על המילה `alter`, שמופיעה ב-`alter table ... enable row level security`.
השורה הזו **מפעילה** אבטחה ולא מוחקת כלום. `setup.sql` כולו רק יוצר —
פונקציה, טבלה, שתי הרשאות ואינדקס. אפשר לאשר בביטחון.

כל מה שבאמת משנה או מוחק נמצא בקובץ נפרד, [`supabase/snippets.sql`](supabase/snippets.sql),
שמריצים ממנו שאילתה אחת בכל פעם לפי הצורך.

### 2. חיבור האתר לבסיס הנתונים

שני הערכים יושבים בשני מסכים **שונים** תחת **Project Settings**:

| איפה למצוא | מה זה נראה | להעתיק אל |
|---|---|---|
| Settings → **Data API** | `Project URL` — `https://xxxx.supabase.co` | `SUPABASE_URL` |
| Settings → **API Keys** | `Publishable key` — מתחיל ב-`sb_publishable_` | `SUPABASE_ANON_KEY` |

הדבק אותם ב-[`assets/js/config.js`](assets/js/config.js), בשורות הראשונות.

> **על המפתחות:** סופאבייס עוברים ממערכת ישנה לחדשה, ולכן יש שתי לשוניות במסך API Keys.
> קח את ה-**Publishable key** החדש. מפתח ה-`anon` הישן (מתחיל ב-`eyJ`) עדיין עובד,
> אבל הוא בדרך להוצאה משימוש עד סוף 2026.
>
> שניהם בטוחים לגמרי בקוד פומבי — הם לא עוקפים RLS. ההגנה האמיתית היא
> ה-policies שהגדרנו ב-`setup.sql`: קריאה והוספה בלבד, ורק עד הדדליין.
>
> ⚠️ **לעולם לא** את `Secret key` / `service_role` — הם עוקפים הכל.
> ואל תלחץ על *Disable JWT-based API keys*.

### 3. שאר ההגדרות

הכל ב-`assets/js/config.js`, מסומן בהערות בעברית:

- `DEADLINE` — מתי הטופס ננעל (חייב להיות זהה לתאריך שב-SQL)
- `TEAMS` — 14 הקבוצות (שמות וצבעים)
- `ZONES` — מה כל מיקום אומר (אלופה / אירופה / ירידה)
- `TITLE`, `SEASON` — כותרות

### 4. העלאה ל-GitHub Pages

ב-[github.com/new](https://github.com/new): שם `ligat-haal`, **Public**,
בלי לסמן שום קובץ התחלתי (README/gitignore) — כבר יש כאלה כאן. ואז:

```bash
git remote add origin https://github.com/hadsahar/ligat-haal.git
git push -u origin main
```

ואז ב-GitHub: **Settings** → **Pages** → תחת *Source* בחר **Deploy from a branch**,
Branch = `main`, folder = `/ (root)` → **Save**.

אחרי דקה־שתיים האתר יהיה זמין בכתובת:

```
https://hadsahar.github.io/ligat-haal/
```

זה הלינק לשלוח לחברים. כל `git push` יעדכן את האתר אוטומטית.

---

## תפעול שוטף

**לראות את ההגשות הגולמיות** — Supabase → **Table Editor** → `predictions`.

**למחוק הגשה** (מישהו הגיש בטעות / פעמיים):
מסמנים את השורה ב-Table Editor ומוחקים. הסטטיסטיקות יתעדכנו מיד.

**לשנות את הדדליין אחרי שכבר העלית** — צריך לשנות בשני מקומות (הבלוק המוכן ב-`snippets.sql`):
`config.js` (התצוגה) **וגם** ה-policy ב-Supabase (האכיפה האמיתית):

```sql
drop policy if exists "insert before deadline" on public.predictions;
create policy "insert before deadline" on public.predictions
  for insert to anon
  with check ( now() < timestamptz '2026-09-10 23:59:00+03' );
```

**לנעול מיד** — הרץ את אותו SQL עם תאריך שכבר עבר.

---

## איך מונעים הגשה כפולה

אחרי שליחה מוצלחת נשמרת נעילה ב-`localStorage` של הדפדפן, והטופס מוחלף
במסך "כבר הגשת". זה עוצר הגשה כפולה בטעות, אבל **לא** מישהו שמתאמץ
(גלישה פרטית / מכשיר אחר). זו הייתה החלטה מודעת — סומכים על החברים.

יש כפתור *"זה לא אני — נקה את המכשיר"* למקרה שכמה אנשים חולקים מחשב.

אכיפה אמיתית הייתה דורשת התחברות (Google/אימייל), וזה overkill לפרויקט כזה.

---

## מבנה הקבצים

```
index.html              טופס הניחוש (הגרירה)
stats.html              עמוד התוצאות
assets/js/config.js     ⬅ כל ההגדרות — הקובץ היחיד שצריך לגעת בו
assets/js/store.js      קריאה/כתיבה ל-Supabase (fetch גולמי, בלי ספריות)
assets/js/app.js        לוגיקת הגרירה, הוולידציה והשליחה
assets/js/stats.js      חישוב הסטטיסטיקות והרינדור
assets/css/style.css    עיצוב (RTL, מובייל־first)
supabase/setup.sql      סכמת ה-DB + הרשאות (הרצה ראשונה)
supabase/snippets.sql   שאילתות תחזוקה: שינוי דדליין, מחיקת הגשה, דוחות
.nojekyll               אומר ל-GitHub Pages להגיש את הקבצים כמו שהם
```

---

## הרצה מקומית

`fetch` לא עובד מ-`file://`, אז צריך שרת קטן:

```bash
npx --yes serve .
```

ואז לפתוח את הכתובת שהוא מדפיס.

---

## תמיכה בדפדפנים

נבדק על מובייל (375px) ודסקטופ. הגרירה בנויה על Pointer Events —
עובדת גם בעכבר וגם במגע. יש גם חצים ▲▼ בכל שורה כגיבוי ולדיוק.

---

## נראוּת ופרטיות

האתר מוגדר עם `<meta name="robots" content="noindex">` בשני העמודים ו-`robots.txt`,
כדי שלא יופיע בגוגל. הלינק עצמו עובד רגיל. אם בא לך שכן יאנדקסו — מוחקים את שניהם.

שים לב מה ריפו ציבורי כן ולא חושף:

- קוד המקור גלוי — אבל הוא ממילא נשלח לדפדפן של כל מבקר.
- מפתח ה-`anon` גלוי — **וזה בסדר**, הוא נועד לכך. **ההגנה האמיתית היא ה-RLS.**
- **הניחושים עצמם לא נמצאים בריפו** אלא ב-Supabase, ואליהם אין גישה דרך גיטהאב.

### אם תרצה בכל זאת ריפו פרטי

GitHub Pages לא מפרסם מריפו פרטי בלי **GitHub Pro** בתשלום, אבל
**Cloudflare Pages** עושה את זה **בחינם**:

1. הפוך את הריפו ל-Private ב-**Settings** → *Danger Zone* → *Change visibility*.
2. ב-[dash.cloudflare.com](https://dash.cloudflare.com): **Workers & Pages** → **Create**
   → לשונית **Pages** → **Connect to Git**, ואשר גישה לריפו.
3. הגדרות build: *Framework preset* = **None**, *Build command* = **ריק**,
   *Build output directory* = `/`.

הכתובת תהיה `https://ligat-haal.pages.dev`. שום שינוי בקוד לא נדרש.

גם אז — **האתר עצמו נשאר ציבורי**; ריפו פרטי מסתיר רק את קוד המקור.
אתר עם הגבלת גישה אמיתית קיים רק ב-GitHub Enterprise Cloud.
