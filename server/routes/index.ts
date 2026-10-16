import express, { type Request, type Response, type NextFunction } from 'express';
import quizzesRouter from "./quizzes.ts";
import authRouter from "./auth.ts";
const router = express.Router({ caseSensitive: true, strict: true });
router.get('/health', (req: Request, res: Response) => {
    res.send('Backend is healthy');
});
router.use('/auth', authRouter);
router.use('/quizzes', quizzesRouter);
export default router;