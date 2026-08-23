-- ============================================================
--  שאילתות תחזוקה — להריץ לפי הצורך, אחת בכל פעם.
--  לא להריץ את כל הקובץ ברצף!
--
--  ⚠️ חלק מהשאילתות כאן באמת משנות דברים, ולכן Supabase יציג
--     אזהרת "destructive operations". כאן זה מוצדק — קרא מה
--     אתה מריץ לפני שאתה מאשר.
-- ============================================================


-- ------------------------------------------------------------
-- 📊 קריאה בלבד — בטוח לגמרי
-- ------------------------------------------------------------

-- כמה אנשים הגישו:
--   select count(*) from predictions;

-- מי הגיש ומתי:
--   select name, created_at from predictions order by created_at desc;

-- הטבלה המשוקללת (ממוצע מיקומים לכל קבוצה):
--   select team, round(avg(pos), 2) as avg_pos, min(pos), max(pos), count(*) as votes
--   from predictions p,
--        lateral (select value #>> '{}' as team, ordinality as pos
--                 from jsonb_array_elements(p.team_order) with ordinality) t
--   group by team
--   order by avg_pos;

-- מי האלופה לפי ההצבעות:
--   select team_order->>0 as champion, count(*) as votes
--   from predictions group by 1 order by votes desc;

-- איתור הגשות כפולות (אותו שם יותר מפעם אחת):
--   select name, count(*) from predictions group by name having count(*) > 1;


-- ------------------------------------------------------------
-- ⏰ שינוי הדדליין
-- ------------------------------------------------------------
-- מוחק את כלל ההרשאה הישן ויוצר חדש. לא נוגע בהגשות שכבר נשמרו.
-- זכור לעדכן את אותו תאריך גם ב-assets/js/config.js!

--   drop policy if exists "insert before deadline" on public.predictions;
--   create policy "insert before deadline"
--     on public.predictions
--     for insert
--     to anon
--     with check ( now() < timestamptz '2026-09-10 23:59:00+03' );

-- לנעילה מיידית — אותו דבר עם תאריך שכבר עבר, למשל '2020-01-01 00:00:00+03'.


-- ------------------------------------------------------------
-- 🗑️ מחיקת הגשה — פעולה בלתי הפיכה
-- ------------------------------------------------------------
-- קודם תריץ את ה-select כדי לראות בדיוק מה עומד להימחק:

--   select * from predictions where name = 'שם כלשהו';

-- ורק אם זו באמת השורה הנכונה:

--   delete from predictions where id = 'הדבק-כאן-את-ה-uuid';

-- עדיף למחוק לפי id ולא לפי name — כך אין סיכון למחוק שתי שורות בטעות.
-- הכי פשוט: לעשות את זה דרך ה-Table Editor של Supabase, בלי SQL בכלל.
