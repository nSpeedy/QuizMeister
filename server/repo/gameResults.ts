import { db } from '../lib/db.ts';

export interface GameResultSummary {
    id: number;
    quiz_id: number | null;
    quiz_title: string;
    pin: string;
    started_at: number;
    duration_ms: number;
    player_count: number;
}

export interface NewGameResult {
    ownerId: number;
    quizId: number;
    quizTitle: string;
    pin: string;
    startedAt: number;
    durationMs: number;
    stats: { players: unknown[] };
}

const SUMMARY_COLUMNS = 'id, quiz_id, quiz_title, pin, started_at, duration_ms, player_count';

export function save(result: NewGameResult): number {
    const quiz = db.prepare<[number], { id: number }>('SELECT id FROM quizzes WHERE id = ?').get(result.quizId);
    const row = db.prepare<[number, number | null, string, string, number, number, number, string], { id: number }>(
        `INSERT INTO game_results (owner_id, quiz_id, quiz_title, pin, started_at, duration_ms, player_count, stats)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?) RETURNING id`,
    ).get(
        result.ownerId, quiz?.id ?? null, result.quizTitle, result.pin, result.startedAt, result.durationMs,
        result.stats.players.length, JSON.stringify(result.stats),
    )!;
    return row.id;
}

export function listByOwner(ownerId: number): GameResultSummary[] {
    return db.prepare<[number], GameResultSummary>(
        `SELECT ${SUMMARY_COLUMNS} FROM game_results WHERE owner_id = ? ORDER BY started_at DESC, id DESC`,
    ).all(ownerId);
}

export function get(id: number, ownerId: number): (GameResultSummary & { stats: unknown }) | undefined {
    const row = db.prepare<[number, number], GameResultSummary & { stats: string }>(
        `SELECT ${SUMMARY_COLUMNS}, stats FROM game_results WHERE id = ? AND owner_id = ?`,
    ).get(id, ownerId);
    return row && { ...row, stats: JSON.parse(row.stats) };
}

export function remove(id: number, ownerId: number): boolean {
    return db.prepare('DELETE FROM game_results WHERE id = ? AND owner_id = ?').run(id, ownerId).changes > 0;
}
