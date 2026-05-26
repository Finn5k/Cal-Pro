-- Add brand column to food_items
ALTER TABLE public.food_items
ADD COLUMN IF NOT EXISTS brand TEXT;

-- Optionally index brand for faster search
CREATE INDEX IF NOT EXISTS idx_food_items_brand ON public.food_items (brand);
