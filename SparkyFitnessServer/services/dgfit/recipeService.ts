import { z } from 'zod';
import chatRepository from '../../models/chatRepository.js';
import foodRepository from '../../models/foodRepository.js';
import { getSystemClient } from '../../db/poolManager.js';
import { log } from '../../config/logging.js';
import {
  dispatchAiRequest,
  type JsonSchemaNode,
  type ProviderConfig,
} from '../../ai/providerDispatch.js';
import { resolveAiNetworkPolicy } from '../../utils/outboundUrlPolicy.js';
import { recordAiUsage } from './aiUsageService.js';

// DG FIT recipe builder: the person lists what they have, picks a kind of dish
// and a few targets, and PT AI writes one recipe with per-serving macros.

export class RecipeError extends Error {
  constructor(
    message: string,
    public status = 400
  ) {
    super(message);
  }
}

export const recipeRequestSchema = z.object({
  kind: z.enum([
    'shake',
    'kahvalti',
    'ana_yemek',
    'salata',
    'atistirmalik',
    'tatli',
  ]),
  ingredients: z.array(z.string().trim().min(1).max(60)).min(1).max(25),
  only_these: z.boolean().default(false),
  sweetness: z.enum(['sekersiz', 'az', 'orta', 'cok']).optional(),
  volume_ml: z.number().int().min(100).max(1500).optional(),
  servings: z.number().int().min(1).max(8).default(1),
  target_calories: z.number().int().min(50).max(2500).optional(),
  goal: z.enum(['kilo_ver', 'koru', 'kas_kazan', 'kilo_al']).optional(),
  high_protein: z.boolean().default(false),
  notes: z.string().trim().max(300).optional(),
});
export type RecipeRequest = z.infer<typeof recipeRequestSchema>;

const macroSchema = z.object({
  calories: z.number(),
  protein: z.number(),
  carbs: z.number(),
  fat: z.number(),
});

const recipeSchema = z.object({
  title: z.string(),
  description: z.string(),
  servings: z.number(),
  prep_minutes: z.number(),
  ingredients: z.array(
    z.object({ name: z.string(), amount: z.string(), grams: z.number() })
  ),
  steps: z.array(z.string()),
  per_serving: macroSchema,
  tips: z.array(z.string()),
});
export type Recipe = z.infer<typeof recipeSchema>;

const MACROS: JsonSchemaNode = {
  type: 'object',
  properties: {
    calories: { type: 'number', description: 'kcal' },
    protein: { type: 'number', description: 'grams' },
    carbs: { type: 'number', description: 'grams' },
    fat: { type: 'number', description: 'grams' },
  },
  required: ['calories', 'protein', 'carbs', 'fat'],
  additionalProperties: false,
};

const RESPONSE_SCHEMA: JsonSchemaNode = {
  type: 'object',
  properties: {
    title: { type: 'string', description: 'Short Turkish recipe name.' },
    description: {
      type: 'string',
      description: 'One Turkish sentence on taste and why it fits the goal.',
    },
    servings: { type: 'number' },
    prep_minutes: { type: 'number' },
    ingredients: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          name: { type: 'string', description: 'Turkish ingredient name.' },
          amount: {
            type: 'string',
            description:
              'Kitchen amount in Turkish, e.g. "1 adet", "2 yemek kaşığı", "250 ml".',
          },
          grams: {
            type: 'number',
            description: 'Weight (or ml) of this amount for the whole recipe.',
          },
        },
        required: ['name', 'amount', 'grams'],
        additionalProperties: false,
      },
    },
    steps: {
      type: 'array',
      items: { type: 'string' },
      description: 'Numbered-order Turkish steps, one action each.',
    },
    per_serving: MACROS,
    tips: {
      type: 'array',
      items: { type: 'string' },
      description: '0-3 short Turkish tips or swaps.',
    },
  },
  required: [
    'title',
    'description',
    'servings',
    'prep_minutes',
    'ingredients',
    'steps',
    'per_serving',
    'tips',
  ],
  additionalProperties: false,
};

const KIND_LABEL: Record<RecipeRequest['kind'], string> = {
  shake: 'a protein shake / smoothie (blender drink)',
  kahvalti: 'a breakfast dish',
  ana_yemek: 'a main dish',
  salata: 'a salad',
  atistirmalik: 'a snack',
  tatli: 'a healthy dessert',
};

const SWEETNESS: Record<string, string> = {
  sekersiz: 'no added sweetness at all',
  az: 'lightly sweet',
  orta: 'medium sweet',
  cok: 'quite sweet (use fruit, honey or sweetener)',
};

const GOAL: Record<string, string> = {
  kilo_ver: 'losing fat (keep calories in check, high satiety)',
  koru: 'maintaining weight',
  kas_kazan: 'building muscle (high protein)',
  kilo_al: 'gaining weight (calorie dense)',
};

function buildPrompt(req: RecipeRequest): string {
  const lines = [
    'You are the recipe builder of DG FIT, a Turkish fitness app. Write ONE recipe in Turkish.',
    `Dish: ${KIND_LABEL[req.kind]}.`,
    `Available ingredients: ${req.ingredients.join(', ')}.`,
    req.only_these
      ? 'Use ONLY these ingredients (water, ice, salt and spices are allowed).'
      : 'Build the recipe around these ingredients; you may add a few common pantry items (spices, oil, water, ice, milk) if needed, and say so in the ingredient list.',
    `Servings: ${req.servings}.`,
  ];
  if (req.kind === 'shake' && req.volume_ml) {
    lines.push(`Total drink volume about ${req.volume_ml} ml per serving.`);
  }
  if (req.sweetness) lines.push(`Sweetness: ${SWEETNESS[req.sweetness]}.`);
  if (req.target_calories) {
    lines.push(
      `Target about ${req.target_calories} kcal per serving (stay within ±10%).`
    );
  }
  if (req.goal) lines.push(`The person's goal: ${GOAL[req.goal]}.`);
  if (req.high_protein) lines.push('Make it high in protein.');
  if (req.notes) lines.push(`Extra wishes: ${req.notes}`);
  lines.push(
    'Use realistic amounts and standard food composition values; per_serving macros must add up (kcal ≈ 4×protein + 4×carbs + 9×fat).',
    'Return only the JSON object described by the schema.'
  );
  return lines.join('\n');
}

export async function generateRecipe(
  userId: string,
  isAdmin: boolean,
  req: RecipeRequest
): Promise<Recipe> {
  const setting = await chatRepository.getActiveAiServiceSetting(userId);
  const aiService = setting
    ? await chatRepository.getAiServiceSettingForBackend(setting.id, userId)
    : null;
  if (!aiService) {
    throw new RecipeError(
      'PT AI henüz ayarlanmamış. Yöneticiden AI servisini eklemesini iste.',
      503
    );
  }
  const provider: ProviderConfig = {
    service_type: aiService.service_type,
    api_key: aiService.api_key ?? undefined,
    model_name: aiService.model_name ?? undefined,
    custom_url: aiService.custom_url ?? undefined,
  };
  const result = await dispatchAiRequest({
    provider,
    networkPolicy: await resolveAiNetworkPolicy(aiService, isAdmin),
    prompt: buildPrompt(req),
    jsonSchema: RESPONSE_SCHEMA,
    schemaName: 'recipe',
  });
  void recordAiUsage(userId, `${provider.model_name ?? 'default'} (tarif)`, {});
  if (!result.ok) {
    log(
      'error',
      `[DGFIT] Recipe generation failed for ${userId} (${result.category}): ${result.detail}`
    );
    throw new RecipeError('Tarif oluşturulamadı, tekrar dene.', 502);
  }
  const parsed = recipeSchema.safeParse(result.json);
  if (!parsed.success) {
    log('error', `[DGFIT] Recipe JSON invalid: ${result.text.slice(0, 1000)}`);
    throw new RecipeError('Tarif oluşturulamadı, tekrar dene.', 502);
  }
  return parsed.data;
}

export async function saveRecipe(
  userId: string,
  recipe: Recipe,
  request: RecipeRequest | null
) {
  const client = await getSystemClient();
  try {
    const result = await client.query(
      `INSERT INTO dgfit_recipes (user_id, title, kind, recipe, request)
       VALUES ($1, $2, $3, $4::jsonb, $5::jsonb)
       RETURNING id, title, kind, recipe, created_at`,
      [
        userId,
        recipe.title,
        request?.kind ?? 'ana_yemek',
        JSON.stringify(recipe),
        request ? JSON.stringify(request) : null,
      ]
    );
    return result.rows[0];
  } finally {
    client.release();
  }
}

export async function listRecipes(userId: string) {
  const client = await getSystemClient();
  try {
    const result = await client.query(
      `SELECT id, title, kind, recipe, created_at FROM dgfit_recipes
        WHERE user_id = $1 ORDER BY created_at DESC LIMIT 100`,
      [userId]
    );
    return result.rows;
  } finally {
    client.release();
  }
}

export async function deleteRecipe(userId: string, recipeId: string) {
  const client = await getSystemClient();
  try {
    const result = await client.query(
      'DELETE FROM dgfit_recipes WHERE id = $1 AND user_id = $2',
      [recipeId, userId]
    );
    if (!result.rowCount) throw new RecipeError('Tarif bulunamadı.', 404);
  } finally {
    client.release();
  }
}

/**
 * Logs one serving of a recipe to today's food list: the recipe becomes the
 * person's own food (one "porsiyon" with the per-serving macros) so it can be
 * logged again later from food search.
 */
export async function logRecipe(
  userId: string,
  recipe: Recipe,
  entryDate: string,
  servings = 1
) {
  const created = await foodRepository.createFood({
    name: recipe.title,
    brand: null,
    user_id: userId,
    is_custom: true,
    is_quick_food: false,
    shared_with_public: false,
    provider_type: null,
    provider_external_id: null,
    provider_verified: false,
    serving_size: 1,
    serving_unit: 'porsiyon',
    source: 'ai_estimate',
    calories: recipe.per_serving.calories,
    protein: recipe.per_serving.protein,
    carbs: recipe.per_serving.carbs,
    fat: recipe.per_serving.fat,
  });
  return foodRepository.createFoodEntry(
    {
      user_id: userId,
      food_id: created.id,
      variant_id: created.default_variant?.id,
      quantity: servings,
      unit: 'porsiyon',
      entry_date: entryDate,
      meal_type: 'Yemekler',
    },
    userId
  );
}
