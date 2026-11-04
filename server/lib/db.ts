import Database from 'better-sqlite3';
import { mkdirSync } from 'node:fs';
import { dirname } from 'node:path';

const dbPath = process.env.DB_PATH ?? './data/quiz.db';

mkdirSync(dirname(dbPath), { recursive: true });

export const db = new Database(dbPath);

db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');
db.pragma('busy_timeout = 5000');

const migrations: string[] = [
    `
        CREATE TABLE users
        (
            id            INTEGER PRIMARY KEY,
            username      TEXT UNIQUE NOT NULL COLLATE NOCASE,
            password_hash TEXT        NOT NULL
        ) STRICT;

        CREATE TABLE quizzes
        (
            id        INTEGER PRIMARY KEY,
            owner_id  INTEGER NOT NULL REFERENCES users (id) ON DELETE CASCADE,
            title     TEXT    NOT NULL,
            is_public INTEGER NOT NULL DEFAULT 0 CHECK (is_public IN (0, 1))
        ) STRICT;
        CREATE INDEX idx_quizzes_owner ON quizzes (owner_id);

        CREATE TABLE questions
        (
            id            INTEGER PRIMARY KEY,
            quiz_id       INTEGER NOT NULL REFERENCES quizzes (id) ON DELETE CASCADE,
            position      INTEGER NOT NULL,
            text          TEXT    NOT NULL,
            options       TEXT    NOT NULL CHECK (json_valid(options) AND json_type(options) = 'array'),
            correct_index INTEGER NOT NULL,
            time_limit_s  INTEGER NOT NULL DEFAULT 20 CHECK (time_limit_s > 0),
            UNIQUE (quiz_id, position),
            CHECK (correct_index >= 0 AND correct_index < json_array_length(options))
        ) STRICT;
        CREATE TABLE sessions
        (
            token      TEXT PRIMARY KEY,
            user_id    INTEGER NOT NULL REFERENCES users (id) ON DELETE CASCADE,
            expires_at INTEGER NOT NULL
        ) STRICT;
    `,
    `
        CREATE TABLE game_results
        (
            id           INTEGER PRIMARY KEY,
            owner_id     INTEGER NOT NULL REFERENCES users (id) ON DELETE CASCADE,
            quiz_id      INTEGER REFERENCES quizzes (id) ON DELETE SET NULL,
            quiz_title   TEXT    NOT NULL,
            pin          TEXT    NOT NULL,
            started_at   INTEGER NOT NULL,
            duration_ms  INTEGER NOT NULL,
            player_count INTEGER NOT NULL,
            stats        TEXT    NOT NULL CHECK (json_valid(stats))
        ) STRICT;
        CREATE INDEX idx_game_results_owner ON game_results (owner_id, started_at DESC);
    `,
];

const current = db.pragma('user_version', { simple: true }) as number;

if (current > migrations.length) {
    throw new Error(`Baza ma user_version=${current}, a kod zna tylko ${migrations.length} migracji`);
}

if (current < migrations.length) {
    db.transaction(() => {
        for (let i = current; i < migrations.length; i++) db.exec(migrations[i]);
        db.pragma(`user_version = ${migrations.length}`);
    })();
}
