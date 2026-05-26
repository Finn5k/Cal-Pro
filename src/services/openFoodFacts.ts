import type { OpenFoodFactsProduct, FoodItem } from '@/types'

const JSONP_BASE =
  import.meta.env.VITE_OPEN_FOOD_FACTS_JSONP_BASE || 'https://world.openfoodfacts.org'
const JSONP_TIMEOUT_MS = 10000

const USER_AGENT = `Cal-Pro/1.0 (cal-pro@example.com)`

// Simple rate limiter: max requests per minute
const _requestTimestamps: number[] = []
const MAX_PER_MINUTE = Number(import.meta.env.VITE_OFF_RATE_LIMIT || 10)

async function rateLimit(): Promise<void> {
  const now = Date.now()
  // remove timestamps older than 60s
  while (_requestTimestamps.length > 0 && now - _requestTimestamps[0] > 60_000) {
    _requestTimestamps.shift()
  }

  if (_requestTimestamps.length >= MAX_PER_MINUTE) {
    const earliest = _requestTimestamps[0]
    const waitMs = 60_000 - (now - earliest) + 50
    await new Promise((res) => setTimeout(res, waitMs))
    return rateLimit()
  }

  _requestTimestamps.push(now)
}

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

    // Add user-agent header emulation via URL param (JSONP workaround)
    script.src = `${url}${separator}callback=${callbackName}&user_agent=${encodeURIComponent(USER_AGENT)}`
    document.head.appendChild(script)
  })
}

/**
 * Search for a food product by barcode (EAN/UPC)
 */
export async function searchByBarcode(barcode: string): Promise<FoodItem | null> {
  try {
    await rateLimit()
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
export async function searchByName(query: string, brand?: string, pageSize = 20): Promise<FoodItem[]> {
  try {
    await rateLimit()
    const brandParam = brand && brand.trim() ? `&brands=${encodeURIComponent(brand.trim())}` : ''
    const data = (await jsonp<{ products?: OpenFoodFactsProduct[] }>(
      `${JSONP_BASE}/cgi/search.pl?search_terms=${encodeURIComponent(
        query
      )}&action=process&json=1&page_size=${pageSize}&fields=product_name,nutriments,code${brandParam}`
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

  const getN = (...keys: string[]) => {
    for (const k of keys) {
      const v = (nutriments as any)[k]
      if (v !== undefined && v !== null && v !== '') return Number(v)
    }
    return 0
  }

  const calories = getN('energy-kcal_100g', 'energy-kcal', 'energy_100g', 'energy')
  const protein = getN('protein_100g', 'proteins_100g', 'proteins', 'protein_100g', 'protein')
  const fat = getN('fat_100g', 'fat')
  const carbs = getN('carbohydrates_100g', 'carbohydrates', 'carbs')

  return {
    id: `off_${product.code}`,
    name: product.product_name,
    calories_per_100g: isNaN(calories) ? 0 : calories,
    protein_per_100g: isNaN(protein) ? 0 : protein,
    fat_per_100g: isNaN(fat) ? 0 : fat,
    carbs_per_100g: isNaN(carbs) ? 0 : carbs,
    external_id: product.code,
    barcode: product.code,
  }
}
