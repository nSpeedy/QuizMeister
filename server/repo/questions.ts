import { db } from '../lib/db.ts';
import type { Question } from '../models/question.ts';

export type QuestionInput = Pick<Question, 'text' | 'options' | 'correctIndex' | 'timeLimitS'>;

type QuestionRow = Omit<Question, 'options'> & { options: string };
const toQuestion = (row: QuestionRow): Question => ({ ...row, options: JSON.parse(row.options) });

const COLUMNS = 'id, quiz_id AS quizId, position, text, options, correct_index AS correctIndex, time_limit_s AS timeLimitS';

export function getAllByQuiz(quiz_id: number): Question[] {
    return db.prepare<[number], QuestionRow>(`SELECT ${COLUMNS} FROM questions WHERE quiz_id = ? ORDER BY position`).all(quiz_id).map(toQuestion);
}

export function create(quiz_id: number, q: QuestionInput): Question {
    const row = db.prepare<[number, number, string, string, number, number], QuestionRow>(`
        INSERT INTO questions (quiz_id, position, text, options, correct_index, time_limit_s)
        VALUES (?, (SELECT COALESCE(MAX(position), -1) + 1 FROM questions WHERE quiz_id = ?), ?, ?, ?, ?)
        RETURNING ${COLUMNS}`,
    ).get(quiz_id, quiz_id, q.text, JSON.stringify(q.options), q.correctIndex, q.timeLimitS)!;
    return toQuestion(row);
}

export function update(id: number, quiz_id: number, q: QuestionInput): Question | undefined {
    const row = db.prepare<[string, string, number, number, number, number], QuestionRow>(`
        UPDATE questions SET text = ?, options = ?, correct_index = ?, time_limit_s = ?
        WHERE id = ? AND quiz_id = ?
        RETURNING ${COLUMNS}`,
    ).get(q.text, JSON.stringify(q.options), q.correctIndex, q.timeLimitS, id, quiz_id);
    return row && toQuestion(row);
}

export function remove(id: number, quiz_id: number): boolean {
    return db.prepare('DELETE FROM questions WHERE id = ? AND quiz_id = ?').run(id, quiz_id).changes > 0;
}
