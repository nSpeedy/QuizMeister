import express, { type Request, type Response, type NextFunction } from 'express';
const router = express.Router({ caseSensitive: true, strict: true });
router.get('/health', (req: Request, res: Response) => {
    res.send('Backend is healthy');
});
export default router;