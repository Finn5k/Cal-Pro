import { supabase } from './supabase'
import type { Meal, Macros, DailySummary } from '@/types'

/**
 * Add a new meal
 */
export async function addMeal(
  userId: string,
  foodItemId: string,
  quantityGrams: number,
  mealType: 'breakfast' | 'lunch' | 'dinner' | 'snack',
  date: string
): Promise<{ success: boolean; error?: string; meal?: Meal }> {
  try {
    const { data, error } = await supabase
      .from('meals')
      .insert({
        user_id: userId,
        food_item_id: foodItemId,
        quantity_grams: quantityGrams,
        meal_type: mealType,
        date,
      })
      .select(
        `
        id,
        user_id,
        food_item_id,
        quantity_grams,
        meal_type,
        date,
        created_at,
        food_items:food_item_id (*)
      `
      )
      .single()

    if (error) {
      return { success: false, error: error.message }
    }

    return { success: true, meal: data as unknown as Meal }
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' }
  }
}

/**
 * Get meals for a specific date
 */
export async function getMealsForDate(
  userId: string,
  date: string
): Promise<{ success: boolean; error?: string; meals?: Meal[] }> {
  try {
    const { data, error } = await supabase
      .from('meals')
      .select(
        `
        id,
        user_id,
        food_item_id,
        quantity_grams,
        meal_type,
        date,
        created_at,
        food_items:food_item_id (*)
      `
      )
      .eq('user_id', userId)
      .eq('date', date)
      .order('created_at', { ascending: false })

    if (error) {
      return { success: false, error: error.message }
    }

    return { success: true, meals: data as unknown as Meal[] }
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' }
  }
}

/**
 * Get meals for a date range
 */
export async function getMealsForDateRange(
  userId: string,
  startDate: string,
  endDate: string
): Promise<{ success: boolean; error?: string; meals?: Meal[] }> {
  try {
    const { data, error } = await supabase
      .from('meals')
      .select(
        `
        id,
        user_id,
        food_item_id,
        quantity_grams,
        meal_type,
        date,
        created_at,
        food_items:food_item_id (*)
      `
      )
      .eq('user_id', userId)
      .gte('date', startDate)
      .lte('date', endDate)
      .order('date', { ascending: false })
      .order('created_at', { ascending: false })

    if (error) {
      return { success: false, error: error.message }
    }

    return { success: true, meals: data as unknown as Meal[] }
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' }
  }
}

/**
 * Update a meal
 */
export async function updateMeal(
  mealId: string,
  quantityGrams?: number,
  mealType?: 'breakfast' | 'lunch' | 'dinner' | 'snack'
): Promise<{ success: boolean; error?: string; meal?: Meal }> {
  try {
    const updates: Record<string, unknown> = {}
    if (quantityGrams !== undefined) updates.quantity_grams = quantityGrams
    if (mealType !== undefined) updates.meal_type = mealType

    const { data, error } = await supabase
      .from('meals')
      .update(updates)
      .eq('id', mealId)
      .select(
        `
        id,
        user_id,
        food_item_id,
        quantity_grams,
        meal_type,
        date,
        created_at,
        food_items:food_item_id (*)
      `
      )
      .single()

    if (error) {
      return { success: false, error: error.message }
    }

    return { success: true, meal: data as unknown as Meal }
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' }
  }
}

/**
 * Delete a meal
 */
export async function deleteMeal(mealId: string): Promise<{ success: boolean; error?: string }> {
  try {
    const { error } = await supabase.from('meals').delete().eq('id', mealId)

    if (error) {
      return { success: false, error: error.message }
    }

    return { success: true }
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' }
  }
}

/**
 * Get daily summary
 */
export async function getDailySummary(
  userId: string,
  date: string
): Promise<{ success: boolean; error?: string; summary?: DailySummary }> {
  try {
    const { data, error } = await supabase
      .from('daily_summaries')
      .select()
      .eq('user_id', userId)
      .eq('date', date)
      .single()

    if (error && error.code !== 'PGRST116') {
      // PGRST116 = no rows found, which is OK
      return { success: false, error: error.message }
    }

    // Return empty summary if not found
    if (!data) {
      return {
        success: true,
        summary: {
          id: '',
          user_id: userId,
          date,
          total_calories: 0,
          total_protein: 0,
          total_fat: 0,
          total_carbs: 0,
          updated_at: new Date().toISOString(),
        },
      }
    }

    return { success: true, summary: data }
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' }
  }
}

/**
 * Get daily summaries for a date range
 */
export async function getDailySummariesForRange(
  userId: string,
  startDate: string,
  endDate: string
): Promise<{ success: boolean; error?: string; summaries?: DailySummary[] }> {
  try {
    const { data, error } = await supabase
      .from('daily_summaries')
      .select()
      .eq('user_id', userId)
      .gte('date', startDate)
      .lte('date', endDate)
      .order('date', { ascending: true })

    if (error) {
      return { success: false, error: error.message }
    }

    return { success: true, summaries: data || [] }
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' }
  }
}

/**
 * Calculate macros for meals
 */
export function calculateMacros(meals: Meal[]): Macros {
  return meals.reduce(
    (acc, meal) => {
      if (!meal.food_item) return acc

      const multiplier = meal.quantity_grams / 100
      acc.calories += Math.round(meal.food_item.calories_per_100g * multiplier)
      acc.protein += Number((meal.food_item.protein_per_100g * multiplier).toFixed(2))
      acc.fat += Number((meal.food_item.fat_per_100g * multiplier).toFixed(2))
      acc.carbs += Number((meal.food_item.carbs_per_100g * multiplier).toFixed(2))

      return acc
    },
    { calories: 0, protein: 0, fat: 0, carbs: 0 }
  )
}
