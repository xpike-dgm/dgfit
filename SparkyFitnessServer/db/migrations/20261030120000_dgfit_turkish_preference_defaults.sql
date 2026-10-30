-- DG FIT: Turkish defaults for new profiles (dates as 25.12.2024, 24-hour
-- clock, weeks start on Monday, Istanbul time). Existing rows still on the
-- upstream defaults are moved over too.
ALTER TABLE public.user_preferences ALTER COLUMN date_format SET DEFAULT 'dd.MM.yyyy';
ALTER TABLE public.user_preferences ALTER COLUMN time_format SET DEFAULT 'HH:mm';
ALTER TABLE public.user_preferences ALTER COLUMN first_day_of_week SET DEFAULT 1;
ALTER TABLE public.user_preferences ALTER COLUMN language SET DEFAULT 'tr';
ALTER TABLE public.user_preferences ALTER COLUMN timezone SET DEFAULT 'Europe/Istanbul';

UPDATE public.user_preferences SET date_format = 'dd.MM.yyyy' WHERE date_format IN ('MM/DD/YYYY', 'MM/dd/yyyy');
UPDATE public.user_preferences SET time_format = 'HH:mm' WHERE time_format = 'h:mm A';
UPDATE public.user_preferences SET first_day_of_week = 1 WHERE first_day_of_week = 0;
UPDATE public.user_preferences SET language = 'tr' WHERE language = 'en';
UPDATE public.user_preferences SET timezone = 'Europe/Istanbul' WHERE timezone IS NULL OR timezone = '';
