-- ============================================================
--  הוספת ניחוש זוכת גביע המדינה
--
--  להריץ פעם אחת ב-Supabase ➜ SQL Editor, אם הטבלה שלך נוצרה
--  לפני שהשדה הזה נוסף. בהתקנה חדשה זה כבר כלול ב-setup.sql.
--
--  הפעולה בטוחה: רק *מוסיפה* עמודה. שום נתון קיים לא נמחק
--  ולא משתנה. הגשות ישנות פשוט יקבלו NULL בשדה החדש.
-- ============================================================

alter table public.predictions
  add column if not exists cup_winner text;

-- בדיקה: אמור להחזיר שורה אחת עם cup_winner
select column_name, data_type, is_nullable
from information_schema.columns
where table_schema = 'public'
  and table_name   = 'predictions'
  and column_name  = 'cup_winner';
