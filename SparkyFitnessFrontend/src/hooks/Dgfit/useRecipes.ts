import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  deleteRecipe,
  generateRecipe,
  listRecipes,
  logRecipe,
  saveRecipe,
  type Recipe,
  type RecipeRequest,
} from '@/api/Dgfit/recipesApi';
import { useDiaryInvalidation } from '@/hooks/useInvalidateKeys';
import { getErrorMessage } from '@/utils/api';

export type {
  Recipe,
  RecipeKind,
  RecipeRequest,
  SavedRecipe,
} from '@/api/Dgfit/recipesApi';

const recipeKeys = { list: ['dgfit', 'recipes'] as const };

export const useRecipes = () =>
  useQuery({ queryKey: recipeKeys.list, queryFn: listRecipes });

export const useGenerateRecipe = () =>
  useMutation({
    mutationFn: generateRecipe,
    meta: { errorMessage: (error: unknown) => getErrorMessage(error) },
  });

export const useSaveRecipe = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      recipe,
      request,
    }: {
      recipe: Recipe;
      request: RecipeRequest | null;
    }) => saveRecipe(recipe, request),
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: recipeKeys.list }),
    meta: {
      successMessage: 'Tarif kaydedildi.',
      errorMessage: (error: unknown) => getErrorMessage(error),
    },
  });
};

export const useDeleteRecipe = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: deleteRecipe,
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: recipeKeys.list }),
    meta: { errorMessage: (error: unknown) => getErrorMessage(error) },
  });
};

export const useLogRecipe = () => {
  const invalidateDiary = useDiaryInvalidation();
  return useMutation({
    mutationFn: ({
      recipe,
      date,
      servings,
    }: {
      recipe: Recipe;
      date: string;
      servings?: number;
    }) => logRecipe(recipe, date, servings),
    onSuccess: () => invalidateDiary(),
    meta: {
      successMessage: 'Bugünün yemeklerine eklendi.',
      errorMessage: (error: unknown) => getErrorMessage(error),
    },
  });
};
