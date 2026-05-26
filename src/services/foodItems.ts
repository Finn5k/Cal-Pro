import { supabase } from './supabase'
import type { FoodItem } from '@/types'

/**
 * Get or create a food item from Open Food Facts
 */
export async function getOrCreateFoodItem(
  foodData: FoodItem
): Promise<{ success: boolean; error?: string; foodItem?: FoodItem }> {
  try {
    // Check if food item already exists
    if (foodData.barcode) {
      const { data: existing } = await supabase
        .from('food_items')
        .select()
        .eq('barcode', foodData.barcode)
        .single()

      if (existing) {
        return { success: true, foodItem: existing }
      }
    }

    // Create new food item
    const { data, error } = await supabase
      .from('food_items')
      .insert({
        name: foodData.name,
        calories_per_100g: foodData.calories_per_100g,
        protein_per_100g: foodData.protein_per_100g,
        fat_per_100g: foodData.fat_per_100g,
        carbs_per_100g: foodData.carbs_per_100g,
        external_id: foodData.external_id,
        barcode: foodData.barcode,
      })
      .select()
      .single()

    if (error) {
      return { success: false, error: error.message }
    }

    return { success: true, foodItem: data }
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' }
  }
}

/**
 * Search food items by name
 */
export async function searchFoodItems(query: string): Promise<{
  success: boolean
  error?: string
  items?: FoodItem[]
}> {
  try {
    const { data, error } = await supabase
      .from('food_items')
      .select()
      .ilike('name', `%${query}%`)
      .limit(20)

    if (error) {
      return { success: false, error: error.message }
    }

    return { success: true, items: data || [] }
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' }
  }
}

/**
 * Get food item by barcode
 */
export async function getFoodItemByBarcode(
  barcode: string
): Promise<{ success: boolean; error?: string; foodItem?: FoodItem }> {
  try {
    const { data, error } = await supabase
      .from('food_items')
      .select()
      .eq('barcode', barcode)
      .single()

    if (error && error.code !== 'PGRST116') {
      // PGRST116 = no rows found
      return { success: false, error: error.message }
    }

    if (!data) {
      return { success: false, error: 'Food item not found' }
    }

    return { success: true, foodItem: data }
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' }
  }
}

/**
 * Get food item by ID
 */
export async function getFoodItemById(
  id: string
): Promise<{ success: boolean; error?: string; foodItem?: FoodItem }> {
  try {
    const { data, error } = await supabase
      .from('food_items')
      .select()
      .eq('id', id)
      .single()

    if (error) {
      return { success: false, error: error.message }
    }

    return { success: true, foodItem: data }
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' }
  }
}

/**
 * Get popular food items (for quick access)
 */
export async function getPopularFoodItems(limit = 50): Promise<{
  success: boolean
  error?: string
  items?: FoodItem[]
}> {
  try {
    const { data, error } = await supabase
      .from('food_items')
      .select()
      .limit(limit)
      .order('created_at', { ascending: false })

    if (error) {
      return { success: false, error: error.message }
    }

    return { success: true, items: data || [] }
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' }
  }
}
