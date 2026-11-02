import { Router } from 'express';
import * as quizzesRepo from '../repo/quizzes.ts';
import * as questionsRepo from '../repo/questions.ts';
import type { QuestionInput } from '../repo/questions.ts';
import { LIMITS } from '../lib/limits.ts';

const router = Router({ mergeParams: true });

router.use((req, res, next) => {
    const quiz = quizzesRepo.get(Number(req.params.quizId), res.locals.userId);
    if (!quiz) { res.sendStatus(404); return; }
    res.locals.quizId = quiz.id;
    next();
});

function parseQuestion(body: any): QuestionInput | string {
    const { text, options, correctIndex, timeLimitS = 20 } = body ?? {};
    if (typeof text !== 'string' || !text.trim()) return 'Question text is required';
    if (text.trim().length > LIMITS.questionTextMax) return `Question text can be at most ${LIMITS.questionTextMax} characters`;
    if (!Array.isArray(options) || options.length < LIMITS.optionsMin || options.length > LIMITS.optionsMax)
        return `A question needs ${LIMITS.optionsMin} to ${LIMITS.optionsMax} answers`;
    if (!options.every((o) => typeof o === 'string' && o.trim())) return 'Answers cannot be empty';
    const trimmed = options.map((o: string) => o.trim());
    if (trimmed.some((o) => o.length > LIMITS.optionTextMax)) return `Each answer can be at most ${LIMITS.optionTextMax} characters`;
    if (new Set(trimmed.map((o) => o.toLowerCase())).size !== trimmed.length) return 'Answers must be different';
    if (!Number.isInteger(correctIndex) || correctIndex < 0 || correctIndex >= trimmed.length) return 'Mark exactly one correct answer';
    if (!Number.isInteger(timeLimitS) || timeLimitS < LIMITS.timeLimitMinS || timeLimitS > LIMITS.timeLimitMaxS)
        return `Time limit must be between ${LIMITS.timeLimitMinS} and ${LIMITS.timeLimitMaxS} seconds`;
    return { text: text.trim(), options: trimmed, correctIndex, timeLimitS };
}

router.get('/', (_req, res) => {
    res.json(questionsRepo.getAllByQuiz(res.locals.quizId));
});

router.post('/', (req, res) => {
    const input = parseQuestion(req.body);
    if (typeof input === 'string') { res.status(400).json({ error: input }); return; }
    if (questionsRepo.countByQuiz(res.locals.quizId) >= LIMITS.questionsPerQuiz) {
        res.status(400).json({ error: `A quiz can have at most ${LIMITS.questionsPerQuiz} questions` }); return;
    }
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
