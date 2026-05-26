import type { OpenFoodFactsProduct, FoodItem } from '@/types'

const API_BASE = import.meta.env.VITE_OPEN_FOOD_FACTS_BASE_URL || 'https://world.openfoodfacts.org/api/v0'

/**
 * Search for a food product by barcode (EAN/UPC)
 */
export async function searchByBarcode(barcode: string): Promise<FoodItem | null> {
  try {
    const response = await fetch(`${API_BASE}/product/${barcode}.json`)
    
    if (!response.ok) {
      console.warn(`Product not found for barcode: ${barcode}`)
      return null
    }

    const data = (await response.json()) as OpenFoodFactsProduct & { status: number }

    if (data.status === 0) {
      console.warn(`Product not found for barcode: ${barcode}`)
      return null
    }

    return parseFoodItem(data)
  } catch (error) {
    console.error('Error searching by barcode:', error)
    return null
  }
}

/**
 * Search for food products by name
 */
export async function searchByName(query: string, pageSize = 20): Promise<FoodItem[]> {
  try {
    const response = await fetch(
      `${API_BASE}/cgi/search.pl?search_terms=${encodeURIComponent(query)}&action=process&json=1&page_size=${pageSize}`
    )

    if (!response.ok) {
      console.error('Error searching by name')
      return []
    }

    const data = (await response.json()) as { products?: OpenFoodFactsProduct[] }
    return (data.products || []).map(parseFoodItem).filter(Boolean) as FoodItem[]
  } catch (error) {
    console.error('Error searching by name:', error)
    return []
  }
}

/**
 * Parse Open Food Facts API response to FoodItem
 */
function parseFoodItem(product: OpenFoodFactsProduct): FoodItem | null {
  if (!product.product_name) return null

  const nutriments = product.nutriments || {}

  return {
    id: `off_${product.code}`,
    name: product.product_name,
    calories_per_100g: nutriments['energy-kcal_100g'] || 0,
    protein_per_100g: nutriments['protein_100g'] || 0,
    fat_per_100g: nutriments['fat_100g'] || 0,
    carbs_per_100g: nutriments['carbohydrates_100g'] || 0,
    external_id: product.code,
    barcode: product.code,
  }
}
