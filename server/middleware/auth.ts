import type { Request, Response, NextFunction } from 'express';
import * as usersRepo from '../repo/users.ts';

export function readToken(req: Request): string | undefined {
    const header = req.get('authorization');
    if (header?.startsWith('Bearer ')) return header.slice(7).trim();
    return req.cookies?.session;
}

export function requireAuth(req: Request, res: Response, next: NextFunction) {
    const token = readToken(req);
    const userId = token && usersRepo.getUserIdBySession(token);
    if (!userId) { res.sendStatus(401); return; }
    res.locals.userId = userId;
    next();
}
