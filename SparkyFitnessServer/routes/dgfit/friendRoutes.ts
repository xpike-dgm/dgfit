import express, { type NextFunction, type Response } from 'express';
import { z } from 'zod';
import { authenticate } from '../../middleware/authMiddleware.js';
import { requireSelfActor } from '../../middleware/requireSelfMiddleware.js';
import {
  FriendError,
  acceptRequest,
  getExerciseHistory,
  getFeed,
  getFriendProfile,
  getLeaderboard,
  getLeaderboardExercises,
  getPrivacy,
  listFriends,
  removeFriendship,
  searchUsers,
  sendRequest,
  updatePrivacy,
} from '../../services/dgfit/friendService.js';
import { copyFriendProgram } from '../../services/dgfit/programCopyService.js';
import { getUsername } from '../../services/dgfit/inviteService.js';

// DG FIT friends: always the signed-in person's own view (no acting on behalf).
const router = express.Router();
router.use(authenticate, requireSelfActor);

const handleError = (error: unknown, res: Response, next: NextFunction) => {
  if (error instanceof FriendError) {
    res.status(error.status).json({ error: error.message });
    return;
  }
  next(error);
};

const uuid = z.string().uuid();

router.get('/', async (req, res, next) => {
  try {
    res.json(await listFriends(req.authenticatedUserId));
  } catch (error) {
    handleError(error, res, next);
  }
});

router.get('/search', async (req, res, next) => {
  try {
    res.json(
      await searchUsers(req.authenticatedUserId, String(req.query.q ?? ''))
    );
  } catch (error) {
    handleError(error, res, next);
  }
});

router.post('/requests', async (req, res, next) => {
  try {
    const username = z.string().min(1).max(40).parse(req.body?.username);
    res.status(201).json(await sendRequest(req.authenticatedUserId, username));
  } catch (error) {
    if (error instanceof z.ZodError) {
      res.status(400).json({ error: 'Kullanıcı adı gerekli.' });
      return;
    }
    handleError(error, res, next);
  }
});

router.post('/requests/:id/accept', async (req, res, next) => {
  try {
    await acceptRequest(req.authenticatedUserId, Number(req.params.id));
    res.status(204).end();
  } catch (error) {
    handleError(error, res, next);
  }
});

router.delete('/friendships/:id', async (req, res, next) => {
  try {
    await removeFriendship(req.authenticatedUserId, Number(req.params.id));
    res.status(204).end();
  } catch (error) {
    handleError(error, res, next);
  }
});

const privacySchema = z
  .object({
    share_workouts: z.boolean(),
    share_weight: z.boolean(),
    share_nutrition: z.boolean(),
    share_measurements: z.boolean(),
    share_photos: z.boolean(),
    share_programs: z.boolean(),
  })
  .partial();

router.get('/privacy', async (req, res, next) => {
  try {
    res.json(await getPrivacy(req.authenticatedUserId));
  } catch (error) {
    handleError(error, res, next);
  }
});

router.put('/privacy', async (req, res, next) => {
  try {
    const parsed = privacySchema.safeParse(req.body ?? {});
    if (!parsed.success) {
      res.status(400).json({ error: 'Geçersiz gizlilik ayarı.' });
      return;
    }
    res.json(await updatePrivacy(req.authenticatedUserId, parsed.data));
  } catch (error) {
    handleError(error, res, next);
  }
});

router.get('/feed', async (req, res, next) => {
  try {
    res.json(await getFeed(req.authenticatedUserId));
  } catch (error) {
    handleError(error, res, next);
  }
});

router.get('/leaderboard/exercises', async (req, res, next) => {
  try {
    res.json(await getLeaderboardExercises(req.authenticatedUserId));
  } catch (error) {
    handleError(error, res, next);
  }
});

router.get('/leaderboard', async (req, res, next) => {
  try {
    const metric = z
      .enum(['exercise', 'weekly_volume', 'weekly_workouts'])
      .catch('weekly_workouts')
      .parse(req.query.metric);
    const exerciseId = uuid.safeParse(req.query.exerciseId);
    res.json(
      await getLeaderboard(
        req.authenticatedUserId,
        metric,
        exerciseId.success ? exerciseId.data : undefined
      )
    );
  } catch (error) {
    handleError(error, res, next);
  }
});

router.get('/users/:userId', async (req, res, next) => {
  try {
    const userId = uuid.parse(req.params.userId);
    res.json(await getFriendProfile(req.authenticatedUserId, userId));
  } catch (error) {
    if (error instanceof z.ZodError) {
      res.status(404).end();
      return;
    }
    handleError(error, res, next);
  }
});

router.get('/users/:userId/exercises/:exerciseId', async (req, res, next) => {
  try {
    res.json(
      await getExerciseHistory(
        req.authenticatedUserId,
        uuid.parse(req.params.userId),
        uuid.parse(req.params.exerciseId)
      )
    );
  } catch (error) {
    if (error instanceof z.ZodError) {
      res.status(404).end();
      return;
    }
    handleError(error, res, next);
  }
});

router.post('/users/:userId/programs/:planId/copy', async (req, res, next) => {
  try {
    const ownerId = uuid.parse(req.params.userId);
    const result = await copyFriendProgram(
      req.authenticatedUserId,
      ownerId,
      Number(req.params.planId),
      await getUsername(ownerId)
    );
    res.status(201).json(result);
  } catch (error) {
    if (error instanceof z.ZodError) {
      res.status(404).end();
      return;
    }
    handleError(error, res, next);
  }
});

export default router;
