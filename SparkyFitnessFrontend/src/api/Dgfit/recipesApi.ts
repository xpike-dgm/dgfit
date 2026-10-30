import { apiCall } from '@/api/api';

export type RecipeKind =
  'shake' | 'kahvalti' | 'ana_yemek' | 'salata' | 'atistirmalik' | 'tatli';

export interface RecipeRequest {
  kind: RecipeKind;
  ingredients: string[];
  only_these?: boolean;
  sweetness?: 'sekersiz' | 'az' | 'orta' | 'cok';
  volume_ml?: number;
  servings?: number;
  target_calories?: number;
  goal?: 'kilo_ver' | 'koru' | 'kas_kazan' | 'kilo_al';
  high_protein?: boolean;
  notes?: string;
}

export interface Recipe {
  title: string;
  description: string;
  servings: number;
  prep_minutes: number;
  ingredients: { name: string; amount: string; grams: number }[];
  steps: string[];
  per_serving: {
    calories: number;
    protein: number;
    carbs: number;
    fat: number;
  };
  tips: string[];
}

export interface SavedRecipe {
  id: string;
  title: string;
  kind: RecipeKind;
  recipe: Recipe;
  created_at: string;
}

const base = '/dgfit/recipes';

export const generateRecipe = (
  request: RecipeRequest
): Promise<{ recipe: Recipe; request: RecipeRequest }> =>
  apiCall(`${base}/generate`, { method: 'POST', body: request });
export const listRecipes = (): Promise<SavedRecipe[]> => apiCall(base);
export const saveRecipe = (
  recipe: Recipe,
  request: RecipeRequest | null
): Promise<SavedRecipe> =>
  apiCall(base, { method: 'POST', body: { recipe, request } });
export const deleteRecipe = (id: string): Promise<void> =>
  apiCall(`${base}/${id}`, { method: 'DELETE' });
export const logRecipe = (
  recipe: Recipe,
  date: string,
  servings = 1
): Promise<unknown> =>
  apiCall(`${base}/log`, { method: 'POST', body: { recipe, date, servings } });
