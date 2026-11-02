import { Router } from 'express';
import * as quizzesRepo from '../repo/quizzes.ts';
import * as questionsRepo from '../repo/questions.ts';
import { requireAuth } from '../middleware/auth.ts';
import { LIMITS } from '../lib/limits.ts';
import questionsRouter from './questions.ts';

const router = Router();

router.use(requireAuth);

function parseQuiz(body: any): { title: string; is_public: boolean } | string {
    const { title, is_public = false } = body ?? {};
    if (typeof title !== 'string' || !title.trim()) return 'Title is required';
    if (title.trim().length > LIMITS.quizTitleMax) return `Title can be at most ${LIMITS.quizTitleMax} characters`;
    if (typeof is_public !== 'boolean') return 'is_public must be true or false';
    return { title: title.trim(), is_public };
}

router.get('/', (_req, res) => {
    res.json(quizzesRepo.getAllByOwner(res.locals.userId));
});

router.get('/:id', (req, res) => {
    const quiz = quizzesRepo.get(Number(req.params.id), res.locals.userId);
    if (!quiz) { res.sendStatus(404); return; }
    res.json({ ...quiz, questions: questionsRepo.getAllByQuiz(quiz.id) });
});

router.post('/', (req, res) => {
    const input = parseQuiz(req.body);
    if (typeof input === 'string') { res.status(400).json({ error: input }); return; }
    if (quizzesRepo.countByOwner(res.locals.userId) >= LIMITS.quizzesPerUser) {
        res.status(400).json({ error: `You can have at most ${LIMITS.quizzesPerUser} quizzes` }); return;
    }
    res.status(201).json(quizzesRepo.create(res.locals.userId, input.title, input.is_public));
});

router.put('/:id', (req, res) => {
    const input = parseQuiz(req.body);
    if (typeof input === 'string') { res.status(400).json({ error: input }); return; }
    const quiz = quizzesRepo.update(Number(req.params.id), res.locals.userId, input.title, input.is_public);
    if (!quiz) { res.sendStatus(404); return; }
    res.json(quiz);
});

router.delete('/:id', (req, res) => {
    if (!quizzesRepo.remove(Number(req.params.id), res.locals.userId)) { res.sendStatus(404); return; }
    res.sendStatus(204);
});

router.use('/:quizId/questions', questionsRouter);

export default router;
