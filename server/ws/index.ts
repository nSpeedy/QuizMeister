import type { Server, Socket } from 'socket.io';
import * as usersRepo from '../repo/users.ts';
import * as quizzesRepo from '../repo/quizzes.ts';
import * as questionsRepo from '../repo/questions.ts';
import type { Game, PlayerState } from '../models/game.ts';
import { createLimiter } from '../lib/rateLimit.ts';
import {
    addPlayer, attachHost, attachPlayer, detachHost, createGame, disconnectPlayer, games, hostRoom, hostSnapshot, hostedGame,
    nextQuestion, playersRoom, publicPlayers, setResultSink, snapshot, startGame, submitAnswer,
} from './game.ts';
import * as gameResultsRepo from '../repo/gameResults.ts';

setResultSink((game, stats) => {
    gameResultsRepo.save({
        ownerId: game.hostUserId,
        quizId: game.quizId,
        quizTitle: game.quizTitle,
        pin: game.code,
        startedAt: game.startedAt ?? Date.now(),
        durationMs: stats.durationMs,
        stats,
    });
});

type Ack = (res: object) => void;

const joinFailures = createLimiter(20, 60_000);

function sessionFromCookie(header = ''): string | undefined {
    return header.match(/(?:^|;\s*)session=([^;]+)/)?.[1];
}

function handle(socket: Socket, event: string, handler: (payload: any, ack: Ack) => void) {
    socket.on(event, (...args: unknown[]) => {
        const last = args.at(-1);
        const ack: Ack = typeof last === 'function' ? (last as Ack) : () => {};
        const payload = typeof args[0] === 'object' && args[0] !== null ? args[0] : {};
        try {
            handler(payload, ack);
        } catch (err) {
            console.error(`[ws] ${event} failed`, err);
            ack({ ok: false, error: 'internal' });
        }
    });
}

export function registerSocketHandlers(io: Server) {
    io.use((socket, next) => {
        const token = sessionFromCookie(socket.handshake.headers.cookie);
        socket.data.userId = token ? usersRepo.getUserIdBySession(token) : undefined;
        next();
    });

    io.engine.on('connection_error', (err: { code: number; message: string }) => {
        console.warn('[ws] connection error', err.code, err.message);
    });

    io.on('connection', (socket) => {
        const ip = socket.handshake.address;
        const currentGame = (): Game | undefined => games.get(socket.data.code);
        const currentPlayer = (game: Game): PlayerState | undefined => game.players.get(socket.data.token);

        function findGameForJoin(code: unknown, ack: Ack): Game | undefined {
            if (joinFailures.blocked(ip)) { ack({ ok: false, error: 'too_many_attempts' }); return; }
            if (currentGame()) { ack({ ok: false, error: 'already_in_game' }); return; }
            const game = games.get(String(code).trim());
            if (!game) { joinFailures.hit(ip); ack({ ok: false, error: 'not_found' }); }
            return game;
        }

        function joinAsPlayer(game: Game, player: PlayerState) {
            socket.data.code = game.code;
            socket.data.token = player.token;
            socket.join([game.code, playersRoom(game)]);
            const previous = attachPlayer(io, game, player, socket.id);
            if (previous) io.sockets.sockets.get(previous)?.disconnect(true);
        }

        handle(socket, 'host:create', ({ quizId }, ack) => {
            if (!socket.data.userId) return ack({ ok: false, error: 'unauthorized' });
            if (currentGame()) return ack({ ok: false, error: 'already_in_game' });
            if (hostedGame(socket.data.userId)) return ack({ ok: false, error: 'already_hosting' });
            const quiz = quizzesRepo.get(Number(quizId), socket.data.userId);
            if (!quiz) return ack({ ok: false, error: 'not_found' });
            const questions = questionsRepo.getAllByQuiz(quiz.id);
            if (!questions.length) return ack({ ok: false, error: 'no_questions' });

            const game = createGame(socket.data.userId, quiz.title, questions);
            attachHost(game, socket.id);
            socket.data.code = game.code;
            socket.join([game.code, hostRoom(game)]);
            ack({ ok: true, code: game.code });
        });

        handle(socket, 'host:rejoin', ({ quizId }, ack) => {
            if (!socket.data.userId) return ack({ ok: false, error: 'unauthorized' });
            if (currentGame()) return ack({ ok: false, error: 'already_in_game' });
            const game = hostedGame(socket.data.userId);
            if (!game || game.quizId !== Number(quizId)) return ack({ ok: false, error: 'not_found' });
            const previous = attachHost(game, socket.id);
            socket.data.code = game.code;
            socket.join([game.code, hostRoom(game)]);
            if (previous) io.sockets.sockets.get(previous)?.disconnect(true);
            ack({ ok: true, state: hostSnapshot(game) });
        });

        handle(socket, 'host:start', (_payload, ack) => {
            const game = currentGame();
            if (!game || game.hostSocketId !== socket.id) return ack({ ok: false, error: 'unauthorized' });
            if (game.phase !== 'waiting') return ack({ ok: false, error: 'wrong_phase' });
            if (!publicPlayers(game).some((p) => p.connected)) return ack({ ok: false, error: 'no_players' });
            startGame(io, game);
            ack({ ok: true });
        });

        handle(socket, 'host:next', (_payload, ack) => {
            const game = currentGame();
            if (!game || game.hostSocketId !== socket.id) return ack({ ok: false, error: 'unauthorized' });
            if (game.phase !== 'reveal') return ack({ ok: false, error: 'wrong_phase' });
            nextQuestion(io, game);
            ack({ ok: true });
        });

        handle(socket, 'player:join', ({ code, name }, ack) => {
            const game = findGameForJoin(code, ack);
            if (!game) return;
            const player = addPlayer(game, name);
            if (typeof player === 'string') return ack({ ok: false, error: player });
            joinAsPlayer(game, player);
            ack({ ok: true, playerId: player.id, name: player.name, token: player.token });
        });

        handle(socket, 'player:rejoin', ({ code, token }, ack) => {
            const game = findGameForJoin(code, ack);
            if (!game) return;
            const player = game.players.get(String(token));
            if (!player) { joinFailures.hit(ip); return ack({ ok: false, error: 'not_found' }); }
            joinAsPlayer(game, player);
            ack({ ok: true, state: snapshot(game, player) });
        });

        handle(socket, 'player:answer', ({ questionIndex, optionIndex }, ack) => {
            const now = Date.now();
            const game = currentGame();
            const player = game && currentPlayer(game);
            if (!game || !player) return ack({ ok: false, error: 'not_found' });
            const error = submitAnswer(io, game, player, questionIndex, optionIndex, now);
            ack(error ? { ok: false, error } : { ok: true });
        });

        socket.on('disconnect', (reason) => {
            try {
                const game = currentGame();
                if (!game) return;
                if (game.hostSocketId === socket.id) {
                    detachHost(io, game);
                    return;
                }
                const player = currentPlayer(game);
                if (player?.socketId === socket.id) disconnectPlayer(io, game, player, reason === 'client namespace disconnect');
            } catch (err) {
                console.error('[ws] disconnect failed', err);
            }
        });
    });
}
