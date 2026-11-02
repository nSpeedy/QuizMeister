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
    quizTitle: string;
    hostUserId: number;
    hostSocketId: string | null;
    phase: 'waiting' | 'question' | 'reveal' | 'finished';
    questions: Question[];
    current: number;
    questionStartedAt: number;
    questionEndsAt: number;
    players: Map<string, PlayerState>;
    timer?: NodeJS.Timeout;
    startedAt?: number;
}
