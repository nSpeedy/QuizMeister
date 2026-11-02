import { randomBytes } from 'node:crypto';
import { db } from '../lib/db.ts';

export const SESSION_MS = 7 * 24 * 60 * 60 * 1000; // 7 dni

export function createUser(username: string, password_hash: string): number {
    return Number(db.prepare('INSERT INTO users (username, password_hash) VALUES (?, ?)').run(username, password_hash).lastInsertRowid);
}

export function getById(id: number) {
    return db.prepare<[number], { id: number; username: string }>(
        'SELECT id, username FROM users WHERE id = ?').get(id);
}

export function getByUsername(username: string) {
    return db.prepare<[string], { id: number; username: string; password_hash: string }>(
        'SELECT id, username, password_hash FROM users WHERE username = ?').get(username);
}

export function createSession(user_id: number): string {
    const token = randomBytes(32).toString('hex');
    db.prepare('INSERT INTO sessions (token, user_id, expires_at) VALUES (?, ?, ?)').run(token, user_id, Date.now() + SESSION_MS);
    return token;
}

export function getUserIdBySession(token: string): number | undefined {
    return db.prepare<[string, number], { user_id: number }>(
        'SELECT user_id FROM sessions WHERE token = ? AND expires_at > ?').get(token, Date.now())?.user_id;
}

export function deleteSession(token: string): void {
    db.prepare('DELETE FROM sessions WHERE token = ?').run(token);
}

export function deleteExpiredSessions(): void {
    db.prepare('DELETE FROM sessions WHERE expires_at <= ?').run(Date.now());
}
