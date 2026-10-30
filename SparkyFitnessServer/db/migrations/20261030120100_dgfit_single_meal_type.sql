-- DG FIT: food is not split into breakfast/lunch/dinner; everything goes into
-- one "Yemekler" list ordered by the time it was eaten. The upstream meal
-- types stay (history, meal plans) but are hidden by default.
INSERT INTO public.meal_types (name, user_id, sort_order, is_visible, show_in_quick_log)
VALUES ('Yemekler', NULL, 5, TRUE, TRUE)
ON CONFLICT ON CONSTRAINT meal_types_name_user_unique DO NOTHING;

UPDATE public.meal_types
   SET is_visible = FALSE, show_in_quick_log = FALSE
 WHERE user_id IS NULL AND name IN ('breakfast', 'lunch', 'dinner', 'snacks');
