-- DG FIT: food is not split into breakfast/lunch/dinner; everything goes into
-- one "Yemekler" list ordered by the time it was eaten. The upstream meal
-- types stay (history, meal plans) but are hidden by default.
INSERT INTO public.meal_types (name, user_id, sort_order, is_visible, show_in_quick_log)
VALUES ('Yemekler', NULL, 5, TRUE, TRUE)
ON CONFLICT ON CONSTRAINT meal_types_name_user_unique DO NOTHING;

UPDATE public.meal_types
   SET is_visible = FALSE, show_in_quick_log = FALSE
 WHERE user_id IS NULL AND name IN ('breakfast', 'lunch', 'dinner', 'snacks');

-- Anything still logged to a hidden built-in meal type (AI tools, imports,
-- older clients) lands in "Yemekler" so it never disappears from the diary.
-- A person who switched a built-in type back on in Settings keeps using it.
CREATE OR REPLACE FUNCTION public.dgfit_route_hidden_meal_type()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
  target uuid;
BEGIN
  IF EXISTS (
       SELECT 1 FROM public.meal_types mt
        WHERE mt.id = NEW.meal_type_id AND mt.user_id IS NULL
          AND mt.is_visible = FALSE
          AND mt.name IN ('breakfast', 'lunch', 'dinner', 'snacks'))
     AND NOT EXISTS (
       SELECT 1 FROM public.user_meal_visibilities v
        WHERE v.user_id = NEW.user_id AND v.meal_type_id = NEW.meal_type_id
          AND v.is_visible = TRUE) THEN
    SELECT id INTO target FROM public.meal_types
     WHERE user_id IS NULL AND name = 'Yemekler';
    IF target IS NOT NULL THEN
      NEW.meal_type_id := target;
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS dgfit_route_hidden_meal_type ON public.food_entries;
CREATE TRIGGER dgfit_route_hidden_meal_type
  BEFORE INSERT ON public.food_entries
  FOR EACH ROW EXECUTE FUNCTION public.dgfit_route_hidden_meal_type();
