import { Router } from 'express';
import * as usersRepo from '../repo/users.ts';
import { hashPassword, verifyPassword } from '../lib/password.ts';
import { requireAuth } from '../middleware/auth.ts';

const router = Router();

router.post('/register', (req, res) => {
    const { username, password } = req.body ?? {};
    if (!username || !password) { res.status(400).json({ error: 'username and password are required' }); return; }
    if (usersRepo.getByUsername(username)) { res.status(409).json({ error: 'username taken' }); return; }
    const userId = usersRepo.createUser(username, hashPassword(password));
    res.status(201).json({ token: usersRepo.createSession(userId) });
});

router.post('/login', (req, res) => {
    const { username, password } = req.body ?? {};
    const user = username && usersRepo.getByUsername(username);
    if (!user || !password || !verifyPassword(password, user.password_hash)) { res.sendStatus(401); return; }
    res.json({ token: usersRepo.createSession(user.id) });
});

router.post('/logout', requireAuth, (req, res) => {
    usersRepo.deleteSession(req.get('authorization')!.slice(7).trim());
    res.sendStatus(204);
});

export default router;
