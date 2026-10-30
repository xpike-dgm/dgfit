import express, { type NextFunction, type Response } from 'express';
import { z } from 'zod';
import { isDayString } from '@workspace/shared';
import { authenticate } from '../../middleware/authMiddleware.js';
import { requireSelfActor } from '../../middleware/requireSelfMiddleware.js';
import {
  RecipeError,
  deleteRecipe,
  generateRecipe,
  listRecipes,
  logRecipe,
  recipeRequestSchema,
  saveRecipe,
  type Recipe,
} from '../../services/dgfit/recipeService.js';

const router = express.Router();
router.use(authenticate, requireSelfActor);

const handleError = (error: unknown, res: Response, next: NextFunction) => {
  if (error instanceof RecipeError) {
    res.status(error.status).json({ error: error.message });
    return;
  }
  if (error instanceof z.ZodError) {
    res.status(400).json({ error: 'Geçersiz tarif isteği.' });
    return;
  }
  next(error);
};

// The recipe body comes back from the client as the server produced it.
const recipeBody = z.object({
  title: z.string().min(1).max(120),
  description: z.string().max(500),
  servings: z.number().min(1).max(20),
  prep_minutes: z.number().min(0).max(600),
  ingredients: z
    .array(
      z.object({
        name: z.string().max(80),
        amount: z.string().max(60),
        grams: z.number().min(0).max(5000),
      })
    )
    .max(40),
  steps: z.array(z.string().max(500)).max(30),
  per_serving: z.object({
    calories: z.number().min(0).max(5000),
    protein: z.number().min(0).max(500),
    carbs: z.number().min(0).max(1000),
    fat: z.number().min(0).max(500),
  }),
  tips: z.array(z.string().max(300)).max(5),
});

router.post('/generate', async (req, res, next) => {
  try {
    const request = recipeRequestSchema.parse(req.body ?? {});
    const recipe = await generateRecipe(
      req.authenticatedUserId,
      req.user?.role === 'admin',
      request
    );
    res.json({ recipe, request });
  } catch (error) {
    handleError(error, res, next);
  }
});

router.get('/', async (req, res, next) => {
  try {
    res.json(await listRecipes(req.authenticatedUserId));
  } catch (error) {
    handleError(error, res, next);
  }
});

router.post('/', async (req, res, next) => {
  try {
    const recipe = recipeBody.parse(req.body?.recipe) as Recipe;
    const request = recipeRequestSchema
      .nullable()
      .catch(null)
      .parse(req.body?.request ?? null);
    res
      .status(201)
      .json(await saveRecipe(req.authenticatedUserId, recipe, request));
  } catch (error) {
    handleError(error, res, next);
  }
});

router.delete('/:id', async (req, res, next) => {
  try {
    await deleteRecipe(
      req.authenticatedUserId,
      z.string().uuid().parse(req.params.id)
    );
    res.status(204).end();
  } catch (error) {
    handleError(error, res, next);
  }
});

router.post('/log', async (req, res, next) => {
  try {
    const recipe = recipeBody.parse(req.body?.recipe) as Recipe;
    const date = z.string().refine(isDayString).parse(req.body?.date);
    const servings = z
      .number()
      .min(0.25)
      .max(10)
      .catch(1)
      .parse(req.body?.servings);
    res
      .status(201)
      .json(await logRecipe(req.authenticatedUserId, recipe, date, servings));
  } catch (error) {
    handleError(error, res, next);
  }
});

export default router;
