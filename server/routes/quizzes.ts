import { Router } from 'express';
import * as quizzesRepo from '../repo/quizzes.ts';
import * as questionsRepo from '../repo/questions.ts';
import { requireAuth } from '../middleware/auth.ts';
import questionsRouter from './questions.ts';

const router = Router();

router.use(requireAuth);

router.get('/', (_req, res) => {
    res.json(quizzesRepo.getAllByOwner(res.locals.userId));
});

router.get('/:id', (req, res) => {
    const quiz = quizzesRepo.get(Number(req.params.id), res.locals.userId);
    if (!quiz) { res.sendStatus(404); return; }
    res.json({ ...quiz, questions: questionsRepo.getAllByQuiz(quiz.id) });
});

router.post('/', (req, res) => {
    const { title, is_public = false } = req.body;
    if (!title) { res.status(400).json({ error: 'title is required' }); return; }
    res.status(201).json(quizzesRepo.create(res.locals.userId, title, is_public));
});

router.put('/:id', (req, res) => {
    const { title, is_public = false } = req.body;
    if (!title) { res.status(400).json({ error: 'title is required' }); return; }
    const quiz = quizzesRepo.update(Number(req.params.id), res.locals.userId, title, is_public);
    if (!quiz) { res.sendStatus(404); return; }
    res.json(quiz);
});

router.delete('/:id', (req, res) => {
    if (!quizzesRepo.remove(Number(req.params.id), res.locals.userId)) { res.sendStatus(404); return; }
    res.sendStatus(204);
});

router.use('/:quizId/questions', questionsRouter);

export default router;
