import React, { useEffect, useState } from 'react'
import { Loader, Camera, X, Search } from 'lucide-react'
import type { FoodItem } from '@/types'
import { searchByBarcode, searchByName } from '@/services/openFoodFacts'
import { getOrCreateFoodItem, searchFoodItems } from '@/services/foodItems'
import { addMeal } from '@/services/meals'
import { BarcodeScanner } from './BarcodeScanner'
import '@/styles/barcode-scanner.css'

interface MealFormProps {
  userId: string
  date: string
  onMealAdded?: (mealId: string) => void
}

export function MealForm({ userId, date, onMealAdded }: MealFormProps) {
  const [showScanner, setShowScanner] = useState(false)
  const [selectedFood, setSelectedFood] = useState<FoodItem | null>(null)
  const [quantity, setQuantity] = useState(100)
  const [mealType, setMealType] = useState<'breakfast' | 'lunch' | 'dinner' | 'snack'>(
    'lunch'
  )
  const [searchQuery, setSearchQuery] = useState('')
  const [searchBrand, setSearchBrand] = useState('')
  const [searchResults, setSearchResults] = useState<FoodItem[]>([])
  const [isSearching, setIsSearching] = useState(false)
  const [searchAttempted, setSearchAttempted] = useState(false)
  const [isAdding, setIsAdding] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleBarcodeScanned = async (barcode: string) => {
    setIsSearching(true)
    setError(null)

    try {
      const result = await searchByBarcode(barcode)

      if (!result) {
        setError('Product not found. Try searching manually.')
        setShowScanner(false)
        setIsSearching(false)
        return
      }

      // Get or create food item in database
      const dbResult = await getOrCreateFoodItem(result)

      if (dbResult.success && dbResult.foodItem) {
        setSelectedFood(dbResult.foodItem)
        setShowScanner(false)
      } else {
        setError(dbResult.error || 'Failed to add food item')
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to scan barcode')
    } finally {
      setIsSearching(false)
    }
  }

  useEffect(() => {
    let isActive = true
    const trimmedQuery = searchQuery.trim()

    if (trimmedQuery.length < 2) {
      return
    }

    const handle = window.setTimeout(async () => {
      setError(null)

      try {
        setIsSearching(true)
        // Search local database first (respect brand if provided)
        const dbResult = await searchFoodItems(trimmedQuery, searchBrand)

        if (dbResult.success && dbResult.items && dbResult.items.length > 0) {
          if (isActive) setSearchResults(dbResult.items)
        } else {
          // Try Open Food Facts API as fallback
          const apiResults = await searchByName(trimmedQuery, searchBrand)
          if (isActive) setSearchResults(apiResults)
        }

        if (isActive) setSearchAttempted(true)
      } catch (err) {
        console.error('Search error:', err)
      } finally {
        if (isActive) setIsSearching(false)
      }
    }, 300)

    return () => {
      isActive = false
      window.clearTimeout(handle)
    }
  }, [searchQuery])

  const handleSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
    const nextValue = e.target.value
    setSearchQuery(nextValue)
    if (nextValue.trim().length < 2) {
      setSearchResults([])
      setSearchAttempted(false)
    }
  }

  const handleBrandChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchBrand(e.target.value)
  }

  const doSearch = async (query?: string) => {
    const q = (query ?? searchQuery).trim()
    if (q.length < 2) {
      setError('Please enter at least 2 characters for name')
      return
    }

    setIsSearching(true)
    setError(null)
    setSearchResults([])

    try {
      const dbResult = await searchFoodItems(q, searchBrand)
      if (dbResult.success && dbResult.items && dbResult.items.length > 0) {
        setSearchResults(dbResult.items)
      } else {
        const apiResults = await searchByName(q, searchBrand)
        setSearchResults(apiResults)
      }
      setSearchAttempted(true)
    } catch (err) {
      console.error('Search error:', err)
      setError('Search failed')
    } finally {
      setIsSearching(false)
    }
  }

  const handleSelectFood = async (food: FoodItem) => {
    // Ensure food is in database
    const result = await getOrCreateFoodItem(food)

    if (result.success && result.foodItem) {
      setSelectedFood(result.foodItem)
      setSearchQuery('')
      setSearchResults([])
    } else {
      setError(result.error || 'Failed to select food')
    }
  }

  const handleAddMeal = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!selectedFood) {
      setError('Please select a food item')
      return
    }

    if (quantity <= 0) {
      setError('Quantity must be greater than 0')
      return
    }

    setIsAdding(true)
    setError(null)

    try {
      const result = await addMeal(userId, selectedFood.id, quantity, mealType, date)

      if (result.success && result.meal) {
        // Reset form
        setSelectedFood(null)
        setQuantity(100)
        setMealType('lunch')
        onMealAdded?.(result.meal.id)
      } else {
        setError(result.error || 'Failed to add meal')
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to add meal')
    } finally {
      setIsAdding(false)
    }
  }

  if (showScanner) {
    return (
      <BarcodeScanner
        onBarcodeScanned={handleBarcodeScanned}
        onClose={() => setShowScanner(false)}
      />
    )
  }

  return (
    <form onSubmit={handleAddMeal} className="meal-form">
      <div className="form-section">
        <h3>Add Meal</h3>

        {/* Barcode Scanner Button */}
        <button
          type="button"
          className="btn btn-primary btn-wide"
          onClick={() => setShowScanner(true)}
        >
          <Camera size={18} />
          Scan Barcode
        </button>

        {/* Or Divider */}
        <div className="form-divider">or search</div>

        {/* Food Search */}
        <div className="form-group">
          <label htmlFor="food-search">Search Food</label>
          <div className="input-wrapper">
            <Search size={18} />
            <input
              id="food-search"
              type="text"
              placeholder="Search for food..."
              value={searchQuery}
              onChange={handleSearch}
              onKeyDown={(event) => {
                if (event.key === 'Enter') {
                  event.preventDefault()
                  doSearch()
                }
              }}
              disabled={isAdding}
            />
            <input
              id="food-brand"
              type="text"
              placeholder="Brand (optional)"
              value={searchBrand}
              onChange={handleBrandChange}
              className="brand-input"
              disabled={isAdding}
            />
            <button type="button" className="btn" onClick={() => doSearch()} disabled={isSearching || isAdding}>
              {isSearching ? <Loader size={16} className="spinner" /> : 'Search'}
            </button>
          </div>

          {/* Loading bar */}
          {isSearching && <div className="search-loading" />}

          {/* Search Results */}
          {searchResults.length > 0 ? (
            <div className="search-results">
              {searchResults.map((food) => (
                <button
                  key={food.id}
                  type="button"
                  className="search-result-item"
                  onClick={() => handleSelectFood(food)}
                >
                  <div>
                    <div className="search-result-name">{food.name}</div>
                    {food.brand && <div className="search-result-brand">{food.brand}</div>}
                  </div>
                  <div className="search-result-macros">
                    {food.calories_per_100g} kcal
                  </div>
                </button>
              ))}
            </div>
          ) : searchAttempted ? (
            <div className="search-results empty">No results found</div>
          ) : null}
        </div>

        {/* Selected Food */}
        {selectedFood && (
          <div className="selected-food">
            <div className="selected-food-header">
              <div>
                <div className="selected-food-name">{selectedFood.name}</div>
                <div className="selected-food-macros">
                  {selectedFood.calories_per_100g} kcal • Protein: {selectedFood.protein_per_100g}g
                  • Fat: {selectedFood.fat_per_100g}g • Carbs: {selectedFood.carbs_per_100g}g
                </div>
              </div>
              <button
                type="button"
                className="remove-button"
                onClick={() => setSelectedFood(null)}
                aria-label="Remove food"
              >
                <X size={20} />
              </button>
            </div>

            {/* Quantity Input */}
            <div className="form-group">
              <label htmlFor="quantity">Quantity (grams)</label>
              <div className="input-wrapper">
                <input
                  id="quantity"
                  type="number"
                  min="1"
                  step="1"
                  value={quantity}
                  onChange={(e) => setQuantity(Math.max(1, Number(e.target.value)))}
                  disabled={isAdding}
                />
              </div>
            </div>

            {/* Meal Type */}
            <div className="form-group">
              <label htmlFor="meal-type">Meal Type</label>
              <select
                id="meal-type"
                value={mealType}
                onChange={(e) =>
                  setMealType(e.target.value as 'breakfast' | 'lunch' | 'dinner' | 'snack')
                }
                disabled={isAdding}
              >
                <option value="breakfast">Breakfast</option>
                <option value="lunch">Lunch</option>
                <option value="dinner">Dinner</option>
                <option value="snack">Snack</option>
              </select>
            </div>

            {/* Calculated Macros Preview */}
            <div className="macros-preview">
              <div className="macro-item">
                <span>Calories</span>
                <strong>
                  {Math.round((selectedFood.calories_per_100g * quantity) / 100)}
                </strong>
              </div>
              <div className="macro-item">
                <span>Protein</span>
                <strong>{((selectedFood.protein_per_100g * quantity) / 100).toFixed(1)}g</strong>
              </div>
              <div className="macro-item">
                <span>Fat</span>
                <strong>{((selectedFood.fat_per_100g * quantity) / 100).toFixed(1)}g</strong>
              </div>
              <div className="macro-item">
                <span>Carbs</span>
                <strong>{((selectedFood.carbs_per_100g * quantity) / 100).toFixed(1)}g</strong>
              </div>
            </div>
          </div>
        )}

        {/* Error Message */}
        {error && (
          <div className="alert alert-error">
            <X size={18} />
            <span>{error}</span>
          </div>
        )}

        {/* Add Button */}
        {selectedFood && (
          <button
            type="submit"
            className="btn btn-primary btn-wide"
            disabled={isAdding || !selectedFood}
          >
            {isAdding ? (
              <>
                <Loader size={18} className="spinner" />
                Adding Meal...
              </>
            ) : (
              'Add to My Day'
            )}
          </button>
        )}
      </div>
    </form>
  )
}
