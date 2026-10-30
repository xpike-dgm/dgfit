import express from 'express';
import { z } from 'zod';
import { authenticate, isAdmin } from '../../middleware/authMiddleware.js';
import { requireSelfActor } from '../../middleware/requireSelfMiddleware.js';
import {
  SignupRejectedError,
  createInviteCode,
  deleteInviteCode,
  getUsername,
  listInviteCodes,
  setUsername,
} from '../../services/dgfit/inviteService.js';
import { getAiUsageReport } from '../../services/dgfit/aiUsageService.js';

const router = express.Router();
router.use(authenticate);

// The signed-in user's own username.
router.get('/me/username', requireSelfActor, async (req, res, next) => {
  try {
    res.json({ username: await getUsername(req.authenticatedUserId!) });
  } catch (error) {
    next(error);
  }
});

router.put('/me/username', requireSelfActor, async (req, res, next) => {
  try {
    const username = await setUsername(
      req.authenticatedUserId!,
      req.body?.username
    );
    res.json({ username });
  } catch (error) {
    if (error instanceof SignupRejectedError) {
      res.status(400).json({ error: error.message });
      return;
    }
    next(error);
  }
});

const createInviteSchema = z.object({
  note: z.string().trim().max(200).nullish(),
  maxUses: z.number().int().min(1).max(100).optional(),
  expiresInDays: z.number().int().min(1).max(365).optional(),
});

router.get('/invites', isAdmin, async (_req, res, next) => {
  try {
    res.json(await listInviteCodes());
  } catch (error) {
    next(error);
  }
});

router.post('/invites', isAdmin, async (req, res, next) => {
  try {
    const parsed = createInviteSchema.safeParse(req.body ?? {});
    if (!parsed.success) {
      res.status(400).json({ error: 'Geçersiz davet ayarları.' });
      return;
    }
    res
      .status(201)
      .json(await createInviteCode(req.authenticatedUserId!, parsed.data));
  } catch (error) {
    next(error);
  }
});

router.delete('/invites/:code', isAdmin, async (req, res, next) => {
  try {
    const deleted = await deleteInviteCode(String(req.params.code));
    res.status(deleted ? 204 : 404).end();
  } catch (error) {
    next(error);
  }
});

router.get('/ai-usage', isAdmin, async (req, res, next) => {
  try {
    const days = Math.min(365, Math.max(1, Number(req.query.days) || 30));
    res.json(await getAiUsageReport(days));
  } catch (error) {
    next(error);
  }
});

export default router;
