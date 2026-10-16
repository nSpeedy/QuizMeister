import { Router } from 'express';
import * as quizzesRepo from '../repo/quizzes.ts';
import * as questionsRepo from '../repo/questions.ts';
import type { QuestionInput } from '../repo/questions.ts';

const router = Router({ mergeParams: true });

router.use((req, res, next) => {
    const quiz = quizzesRepo.get(Number(req.params.quizId), res.locals.userId);
    if (!quiz) { res.sendStatus(404); return; }
    res.locals.quizId = quiz.id;
    next();
});

function parseQuestion(body: any): QuestionInput | string {
    const { text, options, correctIndex, timeLimit: timeLimit = 20 } = body ?? {};
    if (typeof text !== 'string' || !text.trim()) return 'text is required';
    if (!Array.isArray(options) || options.length < 2 || !options.every(o => typeof o === 'string' && o.trim()))
        return 'options must be an array of at least 2 non-empty strings';
    if (!Number.isInteger(correctIndex) || correctIndex < 0 || correctIndex >= options.length)
        return 'correctIndex must point to one of the options';
    if (!Number.isInteger(timeLimit) || timeLimit <= 0) return 'timeLimitS must be a positive integer';
    return { text, options, correctIndex, timeLimitS: timeLimit };
}

router.get('/', (_req, res) => {
    res.json(questionsRepo.getAllByQuiz(res.locals.quizId));
});

router.post('/', (req, res) => {
    const input = parseQuestion(req.body);
    if (typeof input === 'string') { res.status(400).json({ error: input }); return; }
    res.status(201).json(questionsRepo.create(res.locals.quizId, input));
});

router.put('/:id', (req, res) => {
    const input = parseQuestion(req.body);
    if (typeof input === 'string') { res.status(400).json({ error: input }); return; }
    const question = questionsRepo.update(Number(req.params.id), res.locals.quizId, input);
    if (!question) { res.sendStatus(404); return; }
    res.json(question);
});

router.delete('/:id', (req, res) => {
    if (!questionsRepo.remove(Number(req.params.id), res.locals.quizId)) { res.sendStatus(404); return; }
    res.sendStatus(204);
});

export default router;
