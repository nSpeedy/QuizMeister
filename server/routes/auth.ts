import { Router, type Response } from 'express';
import * as usersRepo from '../repo/users.ts';
import { hashPassword, verifyPassword } from '../lib/password.ts';
import { requireAuth, readToken } from '../middleware/auth.ts';
import { rateLimit } from '../lib/rateLimit.ts';

const router = Router();

const COOKIE_OPTS = {
    httpOnly: true,
    sameSite: 'lax',
    secure: (process.env.COOKIE_SECURE ?? String(process.env.NODE_ENV === 'production')) === 'true',
    path: '/',
} as const;

function startSession(res: Response, userId: number) {
    res.cookie('session', usersRepo.createSession(userId), { ...COOKIE_OPTS, maxAge: usersRepo.SESSION_MS });
}

const authLimit = rateLimit(10, 60_000);

router.post('/register', authLimit, async (req, res) => {
    const { username, password } = req.body ?? {};
    if (typeof username !== 'string' || username.trim().length < 3 || username.trim().length > 32) {
        res.status(400).json({ error: 'Username must be 3-32 characters' }); return;
    }
    if (typeof password !== 'string' || password.length < 8 || password.length > 128) {
        res.status(400).json({ error: 'Password must be 8-128 characters' }); return;
    }
    const name = username.trim();
    const hash = await hashPassword(password);
    if (usersRepo.getByUsername(name)) { res.status(409).json({ error: 'Username is already taken' }); return; }
    const id = usersRepo.createUser(name, hash);
    startSession(res, id);
    res.status(201).json({ id, username: name });
});

router.post('/login', authLimit, async (req, res) => {
    const { username, password } = req.body ?? {};
    if (typeof username !== 'string' || typeof password !== 'string' || password.length > 128) { res.sendStatus(401); return; }
    const user = usersRepo.getByUsername(username.trim());
    if (!user || !(await verifyPassword(password, user.password_hash))) { res.sendStatus(401); return; }
    startSession(res, user.id);
    res.json({ id: user.id, username: user.username });
});

router.get('/me', requireAuth, (_req, res) => {
    const user = usersRepo.getById(res.locals.userId);
    if (!user) { res.sendStatus(401); return; }
    res.json(user);
});

router.post('/logout', requireAuth, (req, res) => {
    usersRepo.deleteSession(readToken(req)!);
    res.clearCookie('session', COOKIE_OPTS);
    res.sendStatus(204);
});

export default router;
