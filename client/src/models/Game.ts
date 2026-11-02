export type AckResponse<T = object> = ({ ok: true } & T) | { ok: false; error: string };

export interface LobbyPlayer {
    id: string;
    name: string;
    score: number;
    connected: boolean;
}

interface QuestionStartBase {
    questionIndex: number;
    total: number;
    durationMs: number;
    endsAt: number;
}

export interface HostQuestion extends QuestionStartBase {
    text: string;
    options: string[];
}

export interface PlayerQuestion extends QuestionStartBase {
    optionCount: number;
}

export interface LeaderboardEntry {
    id: string;
    name: string;
    score: number;
    rank: number;
}

export interface QuestionEnd {
    questionIndex: number;
    correctIndex: number;
    distribution: number[];
    leaderboard: LeaderboardEntry[];
}

export interface QuestionResult {
    answered: boolean;
    correct: boolean;
    points: number;
    score: number;
    rank: number;
}

export interface PlayerStats {
    id: string;
    name: string;
    rank: number;
    score: number;
    correct: number;
    incorrect: number;
    unanswered: number;
    accuracy: number;
    avgResponseMs: number | null;
    bestStreak: number;
}

export interface QuestionStats {
    index: number;
    text: string;
    options: string[];
    correctIndex: number;
    distribution: number[];
    correctRate: number;
}

export interface GameStats {
    code: string;
    quizTitle: string;
    durationMs: number;
    players: PlayerStats[];
    questions: QuestionStats[];
}

export interface Snapshot {
    code: string;
    phase: 'waiting' | 'question' | 'reveal' | 'finished';
    questionIndex: number;
    total: number;
    question?: { optionCount: number; durationMs: number; remainingMs: number };
    you: { id: string; name: string; score: number; answered: boolean };
}
