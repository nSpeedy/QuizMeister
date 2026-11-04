import { Router } from 'express';
import * as gameResultsRepo from '../repo/gameResults.ts';
import { requireAuth } from '../middleware/auth.ts';

const router = Router();

router.use(requireAuth);

router.get('/', (_req, res) => {
    res.json(gameResultsRepo.listByOwner(res.locals.userId));
});

router.get('/:id', (req, res) => {
    const result = gameResultsRepo.get(Number(req.params.id), res.locals.userId);
    if (!result) { res.sendStatus(404); return; }
    res.json(result);
});

router.delete('/:id', (req, res) => {
    if (!gameResultsRepo.remove(Number(req.params.id), res.locals.userId)) { res.sendStatus(404); return; }
    res.sendStatus(204);
});

export default router;
