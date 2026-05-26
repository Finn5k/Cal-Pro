# Supabase Database Setup Guide

## Prerequisites
- Supabase project created at https://app.supabase.com
- Supabase URL and Anon Key from project settings

## Setup Instructions

### 1. Create Supabase Project
1. Go to https://app.supabase.com
2. Create a new project (free tier is fine)
3. Copy your project URL and anon key
4. Paste them in `.env` file:
   ```
   VITE_SUPABASE_URL=https://your-project.supabase.co
   VITE_SUPABASE_ANON_KEY=your-anon-key
   ```

### 2. Run Database Migration
1. Go to Supabase Dashboard → SQL Editor
2. Create new query
3. Copy contents of `supabase/migrations/001_create_schema.sql`
4. Paste into SQL Editor and run
5. All tables, functions, and policies will be created automatically

### 3. Verify Setup
Run this query in SQL Editor to confirm all tables exist:
```sql
SELECT tablename FROM pg_tables WHERE schemaname = 'public' ORDER BY tablename;
```

Should return:
- daily_summaries
- food_items
- meals
- users

## Database Schema

### users
- Linked to Supabase `auth.users`
- Stores user goals and preferences
- RLS enabled (users can only see their own data)

### food_items
- Stores food product information
- Can be populated from Open Food Facts API
- Has barcode field for quick lookup
- Public read access (all users can see items)

### meals
- Stores individual meal entries
- Links to user and food_item
- Includes meal type and date for filtering
- Automatically triggers daily_summary recalculation

### daily_summaries
- Automatically calculated from meals
- Stores total macros per day
- Unique constraint on (user_id, date)
- Updated by database trigger

## API Functions

### Triggers & Functions
1. **update_updated_at()** - Automatically updates `updated_at` timestamp
2. **recalculate_daily_summary()** - Recalculates daily totals when meals change

## Security (RLS Policies)

- Users can only access their own data (meals, summaries, profile)
- Food items are public read-only
- No user can modify another user's data
- Enforced at database level (secure)

## Common Queries

### Get user's meals for today
```sql
SELECT m.*, f.* FROM meals m
JOIN food_items f ON m.food_item_id = f.id
WHERE m.user_id = auth.uid() AND m.date = CURRENT_DATE;
```

### Get user's daily summary
```sql
SELECT * FROM daily_summaries
WHERE user_id = auth.uid() AND date = CURRENT_DATE;
```

### Search food by barcode
```sql
SELECT * FROM food_items WHERE barcode = '5000112128493';
```

