-- Cal-Pro Database Schema Migration
-- Run this in Supabase SQL Editor

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create users table (extends Supabase auth.users)
CREATE TABLE public.users (
  id UUID PRIMARY KEY REFERENCES auth.users (id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  daily_calorie_goal INTEGER DEFAULT 2000,
  daily_protein_goal INTEGER DEFAULT 160,
  daily_fat_goal INTEGER DEFAULT 78,
  daily_carbs_goal INTEGER DEFAULT 250,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create food_items table
CREATE TABLE public.food_items (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  calories_per_100g INTEGER NOT NULL,
  protein_per_100g DECIMAL(8, 2) NOT NULL,
  fat_per_100g DECIMAL(8, 2) NOT NULL,
  carbs_per_100g DECIMAL(8, 2) NOT NULL,
  external_id TEXT, -- For Open Food Facts product code
  barcode TEXT UNIQUE, -- EAN/UPC barcode
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create meals table
CREATE TABLE public.meals (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES public.users (id) ON DELETE CASCADE,
  food_item_id UUID NOT NULL REFERENCES public.food_items (id) ON DELETE CASCADE,
  quantity_grams INTEGER NOT NULL,
  meal_type TEXT NOT NULL CHECK (meal_type IN ('breakfast', 'lunch', 'dinner', 'snack')),
  date DATE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create daily_summaries table (materialized view for performance)
CREATE TABLE public.daily_summaries (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES public.users (id) ON DELETE CASCADE,
  date DATE NOT NULL,
  total_calories INTEGER DEFAULT 0,
  total_protein DECIMAL(10, 2) DEFAULT 0,
  total_fat DECIMAL(10, 2) DEFAULT 0,
  total_carbs DECIMAL(10, 2) DEFAULT 0,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  UNIQUE (user_id, date)
);

-- Create indexes for performance
CREATE INDEX idx_meals_user_id ON public.meals (user_id);
CREATE INDEX idx_meals_date ON public.meals (date);
CREATE INDEX idx_meals_user_date ON public.meals (user_id, date);
CREATE INDEX idx_daily_summaries_user_date ON public.daily_summaries (user_id, date);
CREATE INDEX idx_food_items_barcode ON public.food_items (barcode);

-- Enable Row Level Security (RLS)
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.food_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.meals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.daily_summaries ENABLE ROW LEVEL SECURITY;

-- RLS Policy: Users can only see their own profile
CREATE POLICY "Users can see their own profile"
  ON public.users
  FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "Users can update their own profile"
  ON public.users
  FOR UPDATE
  USING (auth.uid() = id);

CREATE POLICY "Users can insert their own profile"
  ON public.users
  FOR INSERT
  WITH CHECK (auth.uid() = id);

-- RLS Policy: Food items are readable by everyone, writable by none (admin only)
CREATE POLICY "Food items are public"
  ON public.food_items
  FOR SELECT
  USING (true);

-- RLS Policy: Users can only see and edit their own meals
CREATE POLICY "Users can see their own meals"
  ON public.meals
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own meals"
  ON public.meals
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own meals"
  ON public.meals
  FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own meals"
  ON public.meals
  FOR DELETE
  USING (auth.uid() = user_id);

-- RLS Policy: Users can only see and edit their own daily summaries
CREATE POLICY "Users can see their own daily summaries"
  ON public.daily_summaries
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own daily summaries"
  ON public.daily_summaries
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own daily summaries"
  ON public.daily_summaries
  FOR UPDATE
  USING (auth.uid() = user_id);

-- Create triggers to automatically update updated_at timestamps
CREATE OR REPLACE FUNCTION public.update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_users_updated_at
  BEFORE UPDATE ON public.users
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at();

CREATE TRIGGER update_meals_updated_at
  BEFORE UPDATE ON public.meals
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at();

CREATE TRIGGER update_food_items_updated_at
  BEFORE UPDATE ON public.food_items
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at();

CREATE TRIGGER update_daily_summaries_updated_at
  BEFORE UPDATE ON public.daily_summaries
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at();

-- Create function to recalculate daily summaries when meal is added/updated
CREATE OR REPLACE FUNCTION public.recalculate_daily_summary()
RETURNS TRIGGER AS $$
DECLARE
  v_user_id UUID;
  v_date DATE;
BEGIN
  IF TG_OP = 'DELETE' THEN
    v_user_id := OLD.user_id;
    v_date := OLD.date;
  ELSE
    v_user_id := NEW.user_id;
    v_date := NEW.date;
  END IF;

  -- Upsert the daily summary
  INSERT INTO public.daily_summaries (user_id, date, total_calories, total_protein, total_fat, total_carbs)
  SELECT
    v_user_id,
    v_date,
    COALESCE(SUM((f.calories_per_100g * m.quantity_grams) / 100), 0)::INTEGER,
    COALESCE(SUM((f.protein_per_100g * m.quantity_grams) / 100), 0),
    COALESCE(SUM((f.fat_per_100g * m.quantity_grams) / 100), 0),
    COALESCE(SUM((f.carbs_per_100g * m.quantity_grams) / 100), 0)
  FROM public.meals m
  JOIN public.food_items f ON m.food_item_id = f.id
  WHERE m.user_id = v_user_id AND m.date = v_date
  ON CONFLICT (user_id, date) DO UPDATE SET
    total_calories = EXCLUDED.total_calories,
    total_protein = EXCLUDED.total_protein,
    total_fat = EXCLUDED.total_fat,
    total_carbs = EXCLUDED.total_carbs;

  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Create triggers for meal changes
CREATE TRIGGER recalculate_summary_after_meal_insert
  AFTER INSERT ON public.meals
  FOR EACH ROW
  EXECUTE FUNCTION public.recalculate_daily_summary();

CREATE TRIGGER recalculate_summary_after_meal_update
  AFTER UPDATE ON public.meals
  FOR EACH ROW
  EXECUTE FUNCTION public.recalculate_daily_summary();

CREATE TRIGGER recalculate_summary_after_meal_delete
  AFTER DELETE ON public.meals
  FOR EACH ROW
  EXECUTE FUNCTION public.recalculate_daily_summary();
