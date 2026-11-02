import { randomBytes, randomInt } from 'node:crypto';
import type { Question } from '../models/question.ts';
import type { AnswerRecord, Game, PlayerState } from '../models/game.ts';
import { LIMITS } from '../lib/limits.ts';

export interface Emitter {
    to(room: string): { emit(event: string, ...args: any[]): unknown };
    in(room: string): { socketsLeave(rooms: string | string[]): void };
}

export type JoinError = 'wrong_phase' | 'invalid_name' | 'name_taken' | 'game_full';
export type AnswerError = 'wrong_phase' | 'stale_question' | 'too_late' | 'already_answered' | 'invalid_option';

export const REVEAL_MS = 5000;
export const RECONNECT_GRACE_MS = 30_000;
export const LEADERBOARD_SIZE = 10;
export const games = new Map<string, Game>();

export const hostRoom = (game: Game) => `host:${game.code}`;
export const playersRoom = (game: Game) => `players:${game.code}`;

function newCode(): string {
    let code: string;
    do code = String(randomInt(100_000, 1_000_000));
    while (games.has(code));
    return code;
}

export function calculatePoints(correct: boolean, responseMs: number, durationMs: number): number {
    if (!correct) return 0;
    return Math.round(1000 - (500 * Math.min(responseMs, durationMs)) / durationMs);
}

export function normalizeNick(raw: unknown): string | null {
    if (typeof raw !== 'string') return null;
    const nick = raw.normalize('NFKC').replace(/\p{C}/gu, '').replace(/\s+/g, ' ').trim();
    return nick && nick.length <= LIMITS.nickMax ? nick : null;
}

export function createGame(hostUserId: number, quizTitle: string, questions: Question[]): Game {
    const game: Game = {
        code: newCode(),
        quizTitle,
        hostUserId,
        hostSocketId: null,
        phase: 'waiting',
        questions,
        current: -1,
        questionStartedAt: 0,
        questionEndsAt: 0,
        players: new Map(),
    };
    games.set(game.code, game);
    return game;
}

export function hostedGame(hostUserId: number): Game | undefined {
    for (const game of games.values()) if (game.hostUserId === hostUserId) return game;
}

export function addPlayer(game: Game, rawNick: unknown): PlayerState | JoinError {
    if (game.phase !== 'waiting') return 'wrong_phase';
    const name = normalizeNick(rawNick);
    if (!name) return 'invalid_name';
    if (game.players.size >= LIMITS.playersPerGame) return 'game_full';
    const lower = name.toLowerCase();
    if ([...game.players.values()].some((p) => p.name.toLowerCase() === lower)) return 'name_taken';

    const player: PlayerState = {
        id: randomBytes(4).toString('hex'),
        token: randomBytes(16).toString('hex'),
        name,
        socketId: null,
        score: 0,
        answers: [],
        streak: 0,
        bestStreak: 0,
    };
    game.players.set(player.token, player);
    return player;
}

export function attachPlayer(io: Emitter, game: Game, player: PlayerState, socketId: string): string | null {
    const previous = player.socketId;
    clearTimeout(player.removeTimer);
    player.socketId = socketId;
    emitLobby(io, game);
    return previous !== socketId ? previous : null;
}

export const publicPlayers = (game: Game) =>
    [...game.players.values()].map((p) => ({ id: p.id, name: p.name, score: p.score, connected: p.socketId !== null }));

function emitLobby(io: Emitter, game: Game) {
    io.to(hostRoom(game)).emit('lobby:update', publicPlayers(game));
}

const connectedPlayers = (game: Game) => [...game.players.values()].filter((p) => p.socketId !== null);

const everyoneAnswered = (game: Game) => connectedPlayers(game).every((p) => p.answers[game.current]);

function rankPlayers(game: Game) {
    const sorted = [...game.players.values()].sort((a, b) => b.score - a.score);
    const ranks: number[] = [];
    sorted.forEach((p, i) => { ranks[i] = i > 0 && p.score === sorted[i - 1].score ? ranks[i - 1] : i + 1; });
    return sorted.map((p, i) => ({ player: p, rank: ranks[i] }));
}

export function startGame(io: Emitter, game: Game) {
    game.startedAt = Date.now();
    game.current = 0;
    startQuestion(io, game);
}

function startQuestion(io: Emitter, game: Game) {
    clearTimeout(game.timer);
    const q = game.questions[game.current];
    const durationMs = q.timeLimitS * 1000;
    game.phase = 'question';
    game.questionStartedAt = Date.now();
    game.questionEndsAt = game.questionStartedAt + durationMs;

    const base = { questionIndex: game.current, total: game.questions.length, durationMs, endsAt: game.questionEndsAt };
    io.to(hostRoom(game)).emit('question:start', { ...base, text: q.text, options: q.options });
    io.to(playersRoom(game)).emit('question:start', { ...base, optionCount: q.options.length });
    game.timer = setTimeout(() => endQuestion(io, game), durationMs);
}

export function submitAnswer(
    io: Emitter, game: Game, player: PlayerState,
    questionIndex: unknown, optionIndex: unknown, now = Date.now(),
): AnswerError | null {
    if (game.phase !== 'question' && game.phase !== 'reveal') return 'wrong_phase';
    if (questionIndex !== game.current) return 'stale_question';
    if (game.phase === 'reveal' || now > game.questionEndsAt) return 'too_late';
    if (player.answers[game.current]) return 'already_answered';

    const q = game.questions[game.current];
    if (typeof optionIndex !== 'number' || !Number.isInteger(optionIndex) || optionIndex < 0 || optionIndex >= q.options.length)
        return 'invalid_option';

    const responseMs = now - game.questionStartedAt;
    const correct = optionIndex === q.correctIndex;
    player.answers[game.current] = {
        optionIndex,
        correct,
        responseMs,
        points: calculatePoints(correct, responseMs, q.timeLimitS * 1000),
    };

    const answered = connectedPlayers(game).filter((p) => p.answers[game.current]).length;
    io.to(hostRoom(game)).emit('answer:progress', { answered, total: connectedPlayers(game).length });
    if (everyoneAnswered(game)) endQuestion(io, game);
    return null;
}

export function endQuestion(io: Emitter, game: Game) {
    if (game.phase !== 'question') return;
    clearTimeout(game.timer);
    game.phase = 'reveal';

    const q = game.questions[game.current];
    const distribution = q.options.map(() => 0);
    for (const p of game.players.values()) {
        const answer = p.answers[game.current] ?? null;
        p.answers[game.current] = answer;
        if (answer) distribution[answer.optionIndex]++;
        p.score += answer?.points ?? 0;
        p.streak = answer?.correct ? p.streak + 1 : 0;
        p.bestStreak = Math.max(p.bestStreak, p.streak);
    }

    const ranking = rankPlayers(game);
    io.to(game.code).emit('question:end', {
        questionIndex: game.current,
        correctIndex: q.correctIndex,
        distribution,
        leaderboard: ranking.slice(0, LEADERBOARD_SIZE).map(({ player, rank }) => ({ id: player.id, name: player.name, score: player.score, rank })),
    });
    for (const { player, rank } of ranking) {
        if (!player.socketId) continue;
        const answer = player.answers[game.current];
        io.to(player.socketId).emit('question:result', {
            answered: !!answer,
            correct: !!answer?.correct,
            points: answer?.points ?? 0,
            score: player.score,
            rank,
        });
    }

    game.timer = setTimeout(() => nextQuestion(io, game), REVEAL_MS);
}

export function nextQuestion(io: Emitter, game: Game) {
    if (game.phase !== 'reveal') return;
    game.current++;
    if (game.current < game.questions.length) startQuestion(io, game);
    else finishGame(io, game);
}

export function disconnectPlayer(io: Emitter, game: Game, player: PlayerState, left: boolean) {
    player.socketId = null;
    if (game.phase === 'waiting') {
        if (left) game.players.delete(player.token);
        else player.removeTimer = setTimeout(() => {
            if (game.phase !== 'waiting' || player.socketId) return;
            game.players.delete(player.token);
            emitLobby(io, game);
        }, RECONNECT_GRACE_MS);
    } else if (connectedPlayers(game).length === 0) {
        return closeGame(io, game, 'no_players');
    }

    emitLobby(io, game);
    if (game.phase === 'question' && everyoneAnswered(game)) endQuestion(io, game);
}

export function snapshot(game: Game, player: PlayerState) {
    const q = game.phase === 'question' ? game.questions[game.current] : undefined;
    return {
        code: game.code,
        phase: game.phase,
        questionIndex: game.current,
        total: game.questions.length,
        question: q && { optionCount: q.options.length, endsAt: game.questionEndsAt },
        you: { id: player.id, name: player.name, score: player.score, answered: !!player.answers[game.current] },
    };
}

export function buildStats(game: Game) {
    const total = game.questions.length;
    const ranking = rankPlayers(game);

    const players = ranking.map(({ player: p, rank }) => {
        const given = p.answers.filter((a): a is AnswerRecord => a !== null);
        const correct = given.filter((a) => a.correct).length;
        return {
            id: p.id,
            name: p.name,
            rank,
            score: p.score,
            correct,
            incorrect: given.length - correct,
            unanswered: total - given.length,
            accuracy: total ? correct / total : 0,
            avgResponseMs: given.length ? Math.round(given.reduce((sum, a) => sum + a.responseMs, 0) / given.length) : null,
            bestStreak: p.bestStreak,
        };
    });

    const all = [...game.players.values()];
    const questions = game.questions.map((q, i) => {
        const answers = all.map((p) => p.answers[i]).filter((a): a is AnswerRecord => !!a);
        return {
            index: i,
            text: q.text,
            options: q.options,
            correctIndex: q.correctIndex,
            distribution: q.options.map((_, o) => answers.filter((a) => a.optionIndex === o).length),
            correctRate: all.length ? answers.filter((a) => a.correct).length / all.length : 0,
        };
    });

    return {
        code: game.code,
        quizTitle: game.quizTitle,
        durationMs: Date.now() - (game.startedAt ?? Date.now()),
        players,
        questions,
    };
}

function dispose(io: Emitter, game: Game) {
    clearTimeout(game.timer);
    for (const p of game.players.values()) clearTimeout(p.removeTimer);
    game.phase = 'finished';
    io.in(game.code).socketsLeave([game.code, hostRoom(game), playersRoom(game)]);
    games.delete(game.code);
}

export function finishGame(io: Emitter, game: Game) {
    io.to(game.code).emit('game:over', buildStats(game));
    dispose(io, game);
}

export function closeGame(io: Emitter, game: Game, reason: 'host_left' | 'no_players') {
    io.to(game.code).emit('game:closed', { reason });
    dispose(io, game);
}
