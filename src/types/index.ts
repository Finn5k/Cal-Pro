// Barcode Scanner types
export type BarcodeScannedCallback = (barcode: string) => void

export interface BarcodeCanvasProps {
  onBarcodeScanned: BarcodeScannedCallback
  onClose: () => void
}

// User types
export interface User {
  id: string;
  email: string;
  daily_calorie_goal: number;
  daily_protein_goal: number;
  created_at: string;
  updated_at: string;
}

// Food types
export interface FoodItem {
  id: string;
  name: string;
  calories_per_100g: number;
  protein_per_100g: number;
  fat_per_100g: number;
  carbs_per_100g: number;
  external_id?: string; // For Open Food Facts ID
  barcode?: string; // EAN/UPC barcode
  brand?: string;
}

// Meal types
export interface Meal {
  id: string;
  user_id: string;
  food_item_id: string;
  quantity_grams: number;
  meal_type: 'breakfast' | 'lunch' | 'dinner' | 'snack';
  date: string;
  created_at: string;
  food_item?: FoodItem; // Joined data
}

// Daily summary
export interface DailySummary {
  id: string;
  user_id: string;
  date: string;
  total_calories: number;
  total_protein: number;
  total_fat: number;
  total_carbs: number;
  updated_at: string;
}

// Macros
export interface Macros {
  calories: number;
  protein: number;
  fat: number;
  carbs: number;
}

// Open Food Facts API response
export interface OpenFoodFactsProduct {
  code: string;
  product_name: string;
  nutriments?: {
    'energy-kcal_100g'?: number;
    'protein_100g'?: number;
    'fat_100g'?: number;
    'carbohydrates_100g'?: number;
  };
}

// Barcode scan result
export interface BarcodeResult {
  codeResult: {
    code: string;
    format: string;
  };
}
