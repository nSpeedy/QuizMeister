import type { Question } from './question.ts';

export interface AnswerRecord {
    optionIndex: number;
    correct: boolean;
    responseMs: number;
    points: number;
}

export interface PlayerState {
    id: string;
    token: string;
    name: string;
    socketId: string | null;
    score: number;
    answers: (AnswerRecord | null)[];
    streak: number;
    bestStreak: number;
    removeTimer?: NodeJS.Timeout;
}

export interface Game {
    code: string;
    quizId: number;
    quizTitle: string;
    hostUserId: number;
    hostSocketId: string | null;
    phase: 'waiting' | 'intro' | 'question' | 'reveal' | 'finished';
    questions: Question[];
    current: number;
    questionStartedAt: number;
    questionEndsAt: number;
    introEndsAt: number;
    reveal: object | null;
    players: Map<string, PlayerState>;
    timer?: NodeJS.Timeout;
    idleTimer?: NodeJS.Timeout;
    hostTimer?: NodeJS.Timeout;
    startedAt?: number;
}
