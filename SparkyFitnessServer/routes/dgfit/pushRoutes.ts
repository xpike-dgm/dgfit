import express from 'express';
import { z } from 'zod';
import { authenticate } from '../../middleware/authMiddleware.js';
import { requireSelfActor } from '../../middleware/requireSelfMiddleware.js';
import {
  countSubscriptions,
  deleteSubscription,
  ensureVapid,
  getSettings,
  saveSubscription,
  sendToUser,
  updateSettings,
} from '../../services/dgfit/pushService.js';

const router = express.Router();
router.use(authenticate, requireSelfActor);

const time = z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/);
const settingsSchema = z
  .object({
    workout_reminder: z.boolean(),
    workout_reminder_time: time,
    food_reminder: z.boolean(),
    food_reminder_time: time,
    water_reminder: z.boolean(),
    friend_activity: z.boolean(),
  })
  .partial();

const subscriptionSchema = z.object({
  endpoint: z.string().url().max(1000),
  keys: z.object({ p256dh: z.string().max(200), auth: z.string().max(100) }),
});

router.get('/', async (req, res, next) => {
  try {
    const [publicKey, settings, devices] = await Promise.all([
      ensureVapid(),
      getSettings(req.authenticatedUserId),
      countSubscriptions(req.authenticatedUserId),
    ]);
    res.json({ publicKey, settings, devices });
  } catch (error) {
    next(error);
  }
});

router.put('/settings', async (req, res, next) => {
  try {
    const parsed = settingsSchema.safeParse(req.body ?? {});
    if (!parsed.success) {
      res.status(400).json({ error: 'Geçersiz bildirim ayarı.' });
      return;
    }
    res.json(await updateSettings(req.authenticatedUserId, parsed.data));
  } catch (error) {
    next(error);
  }
});

router.post('/subscriptions', async (req, res, next) => {
  try {
    const parsed = subscriptionSchema.safeParse(req.body ?? {});
    if (!parsed.success) {
      res.status(400).json({ error: 'Geçersiz abonelik.' });
      return;
    }
    await saveSubscription(
      req.authenticatedUserId,
      parsed.data,
      req.get('user-agent')
    );
    res.status(201).json({ ok: true });
  } catch (error) {
    next(error);
  }
});

router.delete('/subscriptions', async (req, res, next) => {
  try {
    const endpoint = z.string().url().parse(req.body?.endpoint);
    await deleteSubscription(req.authenticatedUserId, endpoint);
    res.status(204).end();
  } catch (error) {
    if (error instanceof z.ZodError) {
      res.status(400).json({ error: 'endpoint gerekli.' });
      return;
    }
    next(error);
  }
});

router.post('/test', async (req, res, next) => {
  try {
    const delivered = await sendToUser(req.authenticatedUserId, {
      title: 'DG FIT bildirimleri açık ✅',
      body: 'Antrenman ve beslenme hatırlatmaları bu cihaza gelecek.',
      url: '/',
      tag: 'test',
    });
    res.json({ delivered });
  } catch (error) {
    next(error);
  }
});

export default router;
