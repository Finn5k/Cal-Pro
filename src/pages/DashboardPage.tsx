import { useEffect, useState } from 'react'
import { LogOut, Settings } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import type { DailySummary, Meal } from '@/types'
import { signOut } from '@/services/auth'
import { getMealsForDate, getDailySummary, deleteMeal } from '@/services/meals'
import { MealForm } from '@/components/MealForm'
import { useAuth } from '@/hooks/useAuth'
import '@/styles/dashboard.css'

export function DashboardPage() {
  const navigate = useNavigate()
  const { user, isLoading } = useAuth()
  const [meals, setMeals] = useState<Meal[]>([])
  const [summary, setSummary] = useState<DailySummary | null>(null)
  const [isLoadingData, setIsLoadingData] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const today = new Date().toISOString().split('T')[0]

  useEffect(() => {
    if (!user) return

    const loadData = async () => {
      setIsLoadingData(true)
      setError(null)

      try {
        // Load meals
        const mealsResult = await getMealsForDate(user.id, today)
        if (mealsResult.success && mealsResult.meals) {
          setMeals(mealsResult.meals)
        }

        // Load daily summary
        const summaryResult = await getDailySummary(user.id, today)
        if (summaryResult.success && summaryResult.summary) {
          setSummary(summaryResult.summary)
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load data')
      } finally {
        setIsLoadingData(false)
      }
    }

    loadData()
  }, [user, today])

  const handleMealAdded = () => {
    // Reload data after meal is added
    if (user) {
      getMealsForDate(user.id, today).then((result) => {
        if (result.success && result.meals) {
          setMeals(result.meals)
        }
      })

      getDailySummary(user.id, today).then((result) => {
        if (result.success && result.summary) {
          setSummary(result.summary)
        }
      })
    }
  }

  const handleDeleteMeal = async (mealId: string) => {
    if (!confirm('Delete this meal?')) return

    const result = await deleteMeal(mealId)
    if (result.success) {
      setMeals(meals.filter((m) => m.id !== mealId))
      handleMealAdded() // Recalculate summary
    }
  }

  const handleLogout = async () => {
    const result = await signOut()
    if (result.success) {
      navigate('/login')
    }
  }

  if (isLoading) {
    return <div className="loading-page">Loading...</div>
  }

  if (!user) {
    return null
  }

  const calorieProgress =
    summary && user.daily_calorie_goal
      ? Math.round((summary.total_calories / user.daily_calorie_goal) * 100)
      : 0

  return (
    <div className="dashboard-container">
      {/* Header */}
      <header className="dashboard-header">
        <div className="header-content">
          <h1>Cal-Pro</h1>
          <div className="header-actions">
            <button
              className="header-button"
              onClick={() => navigate('/settings')}
              title="Settings"
            >
              <Settings size={20} />
            </button>
            <button className="header-button" onClick={handleLogout} title="Logout">
              <LogOut size={20} />
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="dashboard-main">
        {/* Daily Summary Card */}
        <div className="summary-card">
          <div className="summary-header">
            <h2>Today</h2>
            <div className="summary-date">{new Date(today).toLocaleDateString()}</div>
          </div>

          {/* Calorie Circle */}
          <div className="calorie-circle-container">
            <div className="calorie-circle">
              <svg viewBox="0 0 100 100">
                <circle
                  cx="50"
                  cy="50"
                  r="45"
                  fill="none"
                  stroke="#e0e0e0"
                  strokeWidth="8"
                />
                <circle
                  cx="50"
                  cy="50"
                  r="45"
                  fill="none"
                  stroke="#667eea"
                  strokeWidth="8"
                  strokeDasharray={`${(calorieProgress / 100) * 283} 283`}
                  className="progress-circle"
                />
              </svg>
              <div className="calorie-text">
                <div className="calorie-value">{summary?.total_calories || 0}</div>
                <div className="calorie-goal">/ {user.daily_calorie_goal}</div>
              </div>
            </div>
          </div>

          {/* Macro Summary */}
          <div className="macro-summary">
            <div className="macro-card">
              <div className="macro-label">Protein</div>
              <div className="macro-value">{summary?.total_protein.toFixed(1) || 0}g</div>
              <div className="macro-goal">Goal: {user.daily_protein_goal}g</div>
            </div>
            <div className="macro-card">
              <div className="macro-label">Fat</div>
              <div className="macro-value">{summary?.total_fat.toFixed(1) || 0}g</div>
              <div className="macro-goal">Goal: 78g</div>
            </div>
            <div className="macro-card">
              <div className="macro-label">Carbs</div>
              <div className="macro-value">{summary?.total_carbs.toFixed(1) || 0}g</div>
              <div className="macro-goal">Goal: 250g</div>
            </div>
          </div>
        </div>

        {/* Meals List */}
        {isLoadingData ? (
          <div className="loading-section">Loading meals...</div>
        ) : (
          <div className="meals-section">
            <h3>Meals</h3>
            {[
              { key: 'breakfast', label: 'Frühstück' },
              { key: 'lunch', label: 'Mittagessen' },
              { key: 'dinner', label: 'Abendessen' },
              { key: 'snack', label: 'Snacks' },
            ].map((type) => {
              const typeMeals = meals.filter((m) => m.meal_type === type.key)

              return (
                <div key={type.key} className="meal-type-group">
                  <h4 className="meal-type-title">{type.label}</h4>
                  {typeMeals.length === 0 ? (
                    <div className="meal-empty">Keine Einträge</div>
                  ) : (
                    typeMeals.map((meal) => (
                      <div key={meal.id} className="meal-item">
                        <div className="meal-info">
                          <div className="meal-name">{meal.food_item?.name}</div>
                          <div className="meal-details">
                            {meal.quantity_grams}g •{' '}
                            {Math.round(
                              (meal.food_item?.calories_per_100g || 0) * (meal.quantity_grams / 100)
                            )}{' '}
                            kcal
                          </div>
                        </div>
                        <button
                          className="delete-button"
                          onClick={() => handleDeleteMeal(meal.id)}
                          title="Delete meal"
                        >
                          ✕
                        </button>
                      </div>
                    ))
                  )}
                </div>
              )
            })}
          </div>
        )}

        {/* Error Message */}
        {error && (
          <div className="alert alert-error">
            <span>{error}</span>
          </div>
        )}

        {/* Meal Form */}
        <div className="meal-form-section">
          <MealForm userId={user.id} date={today} onMealAdded={handleMealAdded} />
        </div>
      </main>
    </div>
  )
}
