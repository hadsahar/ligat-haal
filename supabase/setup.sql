-- ============================================================
--  ניחושי ליגת העל — הקמת בסיס הנתונים
--  להעתיק את כל הקובץ הזה ל-Supabase ➜ SQL Editor ➜ Run
--
--  ⚠️ לפני ההרצה: עדכן את תאריך הדדליין בשורה המסומנת למטה
--     לאותו תאריך שהגדרת ב-assets/js/config.js
-- ============================================================

-- ---------- הטבלה ----------
create table if not exists public.predictions (
  id          uuid primary key default gen_random_uuid(),
  name        text        not null,
  team_order  jsonb       not null,
  created_at  timestamptz not null default now(),

  -- שם סביר
  constraint name_len check (char_length(trim(name)) between 2 and 24),

  -- בדיוק 14 קבוצות, בלי כפילויות
  constraint order_is_14 check (jsonb_array_length(team_order) = 14),
  constraint order_unique check (
    (select count(distinct value) from jsonb_array_elements_text(team_order)) = 14
  )
);

-- ---------- אבטחה ----------
alter table public.predictions enable row level security;

-- כולם יכולים לקרוא (זה עמוד התוצאות)
drop policy if exists "public read" on public.predictions;
create policy "public read"
  on public.predictions
  for select
  to anon
  using (true);

-- כולם יכולים להוסיף — אבל רק עד הדדליין.
-- 👇 שנה כאן את התאריך (שעון ישראל) לאותו ערך שב-config.js
drop policy if exists "insert before deadline" on public.predictions;
create policy "insert before deadline"
  on public.predictions
  for insert
  to anon
  with check ( now() < timestamptz '2026-09-05 23:59:00+03' );

-- אף אחד לא יכול לערוך או למחוק (אין policy ל-update/delete = חסום).
-- אתה כמובן יכול לעשות הכל דרך ה-Table Editor של Supabase.

-- ---------- אינדקס ----------
create index if not exists predictions_created_at_idx
  on public.predictions (created_at);


-- ============================================================
--  שאילתות שימושיות לך (אופציונלי, להרצה מתי שבא לך)
-- ============================================================

-- כמה הגישו:
--   select count(*) from predictions;

-- הטבלה המשוקללת (ממוצע מיקומים):
--   select team, round(avg(pos), 2) as avg_pos, min(pos), max(pos), count(*) as votes
--   from predictions p,
--        lateral (select value #>> '{}' as team, ordinality as pos
--                 from jsonb_array_elements(p.team_order) with ordinality) t
--   group by team
--   order by avg_pos;

-- מחיקת הגשה ספציפית (אם מישהו הגיש בטעות):
--   delete from predictions where name = 'שם כלשהו';
