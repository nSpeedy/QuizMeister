import {db} from "../lib/db.ts"
import type { Quiz } from '../models/quiz.ts';

type QuizRow = Omit<Quiz, 'is_public'> & { is_public: number };
const toQuiz = (row: QuizRow): Quiz => ({ ...row, is_public: row.is_public === 1 });

export function getAllByOwner(owner_id: number): Quiz[] {
    return db.prepare<[number], QuizRow>('SELECT * FROM quizzes WHERE owner_id = ? ORDER BY id DESC').all(owner_id).map(toQuiz);
}

export function get(id: number, owner_id: number): Quiz | undefined {
    const row = db.prepare<[number, number], QuizRow>('SELECT * FROM quizzes WHERE id = ? AND owner_id = ?').get(id, owner_id);
    return row && toQuiz(row);
}

export function create(owner_id: number, title: string, is_public: boolean): Quiz {
    const row = db.prepare<[number, string, number], QuizRow>(
        'INSERT INTO quizzes (owner_id, title, is_public) VALUES (?, ?, ?) RETURNING *',
    ).get(owner_id, title, is_public ? 1 : 0)!;
    return toQuiz(row);
}

export function update(id: number, owner_id: number, title: string, is_public: boolean): Quiz | undefined {
    const row = db.prepare<[string, number, number, number], QuizRow>(
        'UPDATE quizzes SET title = ?, is_public = ? WHERE id = ? AND owner_id = ? RETURNING *',
    ).get(title, is_public ? 1 : 0, id, owner_id);
    return row && toQuiz(row);
}

export function remove(id: number, owner_id: number): boolean {
    return db.prepare('DELETE FROM quizzes WHERE id = ? AND owner_id = ?').run(id, owner_id).changes > 0;
}
