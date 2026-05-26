import type { OpenFoodFactsProduct, FoodItem } from '@/types'

const JSONP_BASE =
  import.meta.env.VITE_OPEN_FOOD_FACTS_JSONP_BASE || 'https://world.openfoodfacts.org'
const JSONP_TIMEOUT_MS = 10000

type JsonpResponse<T> = T | { status?: number; product?: T }

function jsonp<T>(url: string, timeoutMs = JSONP_TIMEOUT_MS): Promise<T> {
  return new Promise((resolve, reject) => {
    const callbackName = `offJsonp_${Date.now()}_${Math.random().toString(36).slice(2)}`
    const script = document.createElement('script')
    const separator = url.includes('?') ? '&' : '?'
    const timeoutId = window.setTimeout(() => {
      cleanup()
      reject(new Error('JSONP request timed out'))
    }, timeoutMs)

    function cleanup() {
      window.clearTimeout(timeoutId)
      delete (window as Window & Record<string, unknown>)[callbackName]
      if (script.parentNode) {
        script.parentNode.removeChild(script)
      }
    }

    ;(window as Window & Record<string, (data: T) => void>)[callbackName] = (data: T) => {
      cleanup()
      resolve(data)
    }

    script.onerror = () => {
      cleanup()
      reject(new Error('JSONP request failed'))
    }

    script.src = `${url}${separator}callback=${callbackName}`
    document.head.appendChild(script)
  })
}

/**
 * Search for a food product by barcode (EAN/UPC)
 */
export async function searchByBarcode(barcode: string): Promise<FoodItem | null> {
  try {
    const data = (await jsonp<JsonpResponse<OpenFoodFactsProduct>>(
      `${JSONP_BASE}/api/v0/product/${encodeURIComponent(
        barcode
      )}.json?fields=product_name,nutriments,code`
    )) as JsonpResponse<OpenFoodFactsProduct>
    const product = 'product' in data && data.product ? data.product : data

    if (!product || ('status' in data && data.status === 0)) {
      console.warn(`Product not found for barcode: ${barcode}`)
      return null
    }

    return parseFoodItem(product)
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
    const data = (await jsonp<{ products?: OpenFoodFactsProduct[] }>(
      `${JSONP_BASE}/cgi/search.pl?search_terms=${encodeURIComponent(
        query
      )}&action=process&json=1&page_size=${pageSize}&fields=product_name,nutriments,code`
    )) as { products?: OpenFoodFactsProduct[] }
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
