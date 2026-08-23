-- ============================================================
--  ניחושי ליגת העל — הקמת בסיס הנתונים (הרצה ראשונה)
--  להעתיק את כל הקובץ ל-Supabase ➜ SQL Editor ➜ Run
--
--  הסקריפט הזה רק *יוצר* — טבלה, הרשאות ואינדקס.
--  הוא לא מוחק ולא משנה שום נתון קיים.
--
--  ⚠️ לפני ההרצה: ודא שתאריך הדדליין למטה זהה ל-DEADLINE
--     שב-assets/js/config.js
-- ============================================================


-- ---------- 1. פונקציית עזר ----------
-- סופרת כמה ערכים *שונים* יש במערך JSON.
-- נחוצה כי PostgreSQL לא מרשה תת-שאילתה (SELECT) בתוך CHECK,
-- אבל כן מרשה קריאה לפונקציה immutable.
create or replace function public.jsonb_distinct_count(arr jsonb)
returns integer
language sql
immutable
strict
as $$
  select count(distinct value)::int from jsonb_array_elements_text(arr);
$$;


-- ---------- 2. הטבלה ----------
-- אם היא כבר קיימת, השורה הזו לא עושה כלום ולא נוגעת בתוכן.
create table if not exists public.predictions (
  id          uuid primary key default gen_random_uuid(),
  name        text        not null,
  team_order  jsonb       not null,
  cup_winner  text,                      -- מזהה הקבוצה שתזכה בגביע המדינה
  created_at  timestamptz not null default now(),

  -- שם סביר
  constraint name_len check (char_length(trim(name)) between 2 and 24),

  -- בדיוק 14 קבוצות, בלי כפילויות
  constraint order_is_14  check (jsonb_array_length(team_order) = 14),
  constraint order_unique check (public.jsonb_distinct_count(team_order) = 14)
);


-- ---------- 3. הפעלת אבטחת שורות ----------
-- מפעיל RLS. מרגע זה הטבלה חסומה לחלוטין, וכל גישה חייבת policy מפורשת.
-- זו הגדרת אבטחה — היא לא מוחקת דבר.
alter table public.predictions enable row level security;


-- ---------- 4. הרשאות ----------

-- כל אחד יכול לקרוא — זה מה שמפעיל את עמוד התוצאות.
create policy "public read"
  on public.predictions
  for select
  to anon
  using (true);

-- כל אחד יכול להוסיף ניחוש — אבל רק עד הדדליין.
-- 👇 התאריך הזה הוא האכיפה האמיתית (בשרת), לא רק בדפדפן.
create policy "insert before deadline"
  on public.predictions
  for insert
  to anon
  with check ( now() < timestamptz '2026-08-31 23:59:00+03' );

-- שים לב: לא הגדרנו policy ל-update ול-delete.
-- המשמעות: אף גולש לא יכול לערוך או למחוק הגשות. אתה כן יכול,
-- דרך ה-Table Editor של Supabase.


-- ---------- 5. אינדקס ----------
create index if not exists predictions_created_at_idx
  on public.predictions (created_at);


-- ============================================================
--  זהו. לשאילתות תחזוקה (שינוי דדליין, מחיקת הגשה, דוחות)
--  ראה את הקובץ snippets.sql שלידו.
--
--  הערה: הרצה חוזרת של הקובץ הזה תיתן שגיאה
--  "policy already exists" — זו שגיאה בטוחה, שום דבר לא נהרס.
--  כדי לשנות policy קיימת, השתמש ב-snippets.sql.
-- ============================================================
