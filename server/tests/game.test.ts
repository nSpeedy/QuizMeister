import { test, type TestContext } from 'node:test';
import assert from 'node:assert/strict';
import type { Question } from '../models/question.ts';
import type { Game, PlayerState } from '../models/game.ts';
import { LIMITS } from '../lib/limits.ts';
import {
    INTRO_MS, RECONNECT_GRACE_MS, REVEAL_MS, addPlayer, attachHost, attachPlayer, calculatePoints, createGame, detachHost, disconnectPlayer, hostSnapshot,
    games, hostRoom, playersRoom, setResultSink, startGame, submitAnswer, type Emitter,
} from '../ws/game.ts';

const questions: Question[] = [
    { id: 1, quizId: 1, position: 0, text: '2 + 2?', options: ['3', '4'], correctIndex: 1, timeLimitS: 10 },
    { id: 2, quizId: 1, position: 1, text: 'Stolica Polski?', options: ['Kraków', 'Warszawa', 'Gdańsk'], correctIndex: 1, timeLimitS: 10 },
];

function fakeIo() {
    const sent: { room: string; event: string; payload: any }[] = [];
    const io: Emitter = {
        to: (room) => ({ emit: (event, payload) => sent.push({ room, event, payload }) }),
        in: () => ({ socketsLeave: () => {} }),
    };
    const last = (event: string, room?: string) =>
        sent.findLast((e) => e.event === event && (!room || e.room === room))?.payload;
    return { io, sent, last };
}

function join(io: Emitter, game: Game, name: string): PlayerState {
    const player = addPlayer(game, name);
    assert.equal(typeof player, 'object');
    attachPlayer(io, game, player as PlayerState, `s-${name}`);
    return player as PlayerState;
}

function setup(t: TestContext) {
    t.mock.timers.enable({ apis: ['setTimeout', 'Date'] });
    const { io, sent, last } = fakeIo();
    const game = createGame(1, 'Test quiz', questions);
    const alice = join(io, game, 'Alice');
    const bob = join(io, game, 'Bob');
    startGame(io, game);
    t.mock.timers.tick(INTRO_MS);
    return { io, sent, last, game, alice, bob };
}

function nextQuestionAfterReveal(t: TestContext) {
    t.mock.timers.tick(REVEAL_MS);
    t.mock.timers.tick(INTRO_MS);
}

test('PIN gry ma 6 cyfr', () => {
    const game = createGame(1, 'Test quiz', questions);
    assert.match(game.code, /^\d{6}$/);
});

test('punkty: 1000 za natychmiastową odpowiedź, 500 na koniec limitu, 0 za błędną', () => {
    assert.equal(calculatePoints(true, 0, 10_000), 1000);
    assert.equal(calculatePoints(true, 5_000, 10_000), 750);
    assert.equal(calculatePoints(true, 10_000, 10_000), 500);
    assert.equal(calculatePoints(true, 12_000, 10_000), 500);
    assert.equal(calculatePoints(false, 0, 10_000), 0);
});

test('walidacja nicku: unikalny, z limitem długości, bez niewidocznych znaków', () => {
    const game = createGame(1, 'Test quiz', questions);
    assert.equal(typeof addPlayer(game, 'Alice'), 'object');
    assert.equal(addPlayer(game, 'alice'), 'name_taken');
    assert.equal(addPlayer(game, 'Al​ice'), 'name_taken');
    assert.equal(addPlayer(game, 'x'.repeat(LIMITS.nickMax + 1)), 'invalid_name');
    assert.equal(addPlayer(game, '   '), 'invalid_name');
    assert.equal(addPlayer(game, 42), 'invalid_name');
});

test('limit graczy i brak dołączania do rozpoczętej gry', (t) => {
    const full = createGame(1, 'Test quiz', questions);
    for (let i = 0; i < LIMITS.playersPerGame; i++) addPlayer(full, `p${i}`);
    assert.equal(addPlayer(full, 'late'), 'game_full');

    const { game } = setup(t);
    assert.equal(addPlayer(game, 'Carol'), 'wrong_phase');
});

test('lista graczy w lobby trafia tylko do hosta', (t) => {
    const { sent, game } = setup(t);
    const lobbyRooms = sent.filter((e) => e.event === 'lobby:update').map((e) => e.room);
    assert.ok(lobbyRooms.length > 0);
    assert.ok(lobbyRooms.every((room) => room === hostRoom(game)));
});

test('gracz nie dostaje ani treści odpowiedzi, ani poprawnej odpowiedzi przy starcie pytania', (t) => {
    const { last, game } = setup(t);
    const forPlayers = last('question:start', playersRoom(game));
    assert.deepEqual(Object.keys(forPlayers).sort(), ['durationMs', 'endsAt', 'optionCount', 'questionIndex', 'text', 'total']);
    assert.equal('options' in forPlayers, false);

    const forHost = last('question:start', hostRoom(game));
    assert.deepEqual(forHost.options, ['3', '4']);
    assert.equal('correctIndex' in forHost, false);
});

test('przed pytaniem jest intro z samą treścią i bez możliwości odpowiedzi', (t) => {
    t.mock.timers.enable({ apis: ['setTimeout', 'Date'] });
    const { io, last } = fakeIo();
    const game = createGame(1, 'Test quiz', questions);
    const alice = join(io, game, 'Alice');
    startGame(io, game);

    assert.equal(game.phase, 'intro');
    assert.deepEqual(last('question:intro', hostRoom(game)), { questionIndex: 0, total: 2, introMs: INTRO_MS, text: '2 + 2?' });
    assert.deepEqual(last('question:intro', playersRoom(game)), { questionIndex: 0, total: 2, introMs: INTRO_MS, text: '2 + 2?' });
    assert.equal(last('question:start'), undefined);
    assert.equal(submitAnswer(io, game, alice, 0, 1), 'wrong_phase');

    t.mock.timers.tick(INTRO_MS);
    assert.equal(game.phase, 'question');
    assert.equal(game.questionStartedAt, INTRO_MS);
    assert.ok(last('question:start', playersRoom(game)));
});

test('odpowiedź po czasie jest odrzucana', (t) => {
    const { io, game, alice, bob } = setup(t);
    assert.equal(submitAnswer(io, game, alice, 0, 1, game.questionEndsAt + 1), 'too_late');

    t.mock.timers.tick(10_000);
    assert.equal(game.phase, 'reveal');
    assert.equal(submitAnswer(io, game, bob, 0, 1), 'too_late');
});

test('odrzuca drugą odpowiedź, złą opcję i odpowiedź do starego pytania', (t) => {
    const { io, game, alice, bob } = setup(t);
    assert.equal(submitAnswer(io, game, alice, 0, 7), 'invalid_option');
    assert.equal(submitAnswer(io, game, alice, 0, 1), null);
    assert.equal(submitAnswer(io, game, alice, 0, 0), 'already_answered');

    t.mock.timers.tick(10_000);
    nextQuestionAfterReveal(t);
    assert.equal(game.current, 1);
    assert.equal(submitAnswer(io, game, bob, 0, 1), 'stale_question');
});

test('pytanie kończy się, gdy wszyscy połączeni odpowiedzą', (t) => {
    const { io, last, game, alice, bob } = setup(t);
    disconnectPlayer(io, game, bob, false);
    assert.equal(game.phase, 'question');

    submitAnswer(io, game, alice, 0, 1);
    assert.equal(game.phase, 'reveal');
    const end = last('question:end');
    assert.deepEqual(end.distribution, [0, 1]);
    assert.deepEqual(end.leaderboard.map((p: any) => [p.name, p.rank]), [['Alice', 1], ['Bob', 2]]);
    assert.equal(last('question:result', 's-Alice').correct, true);
});

test('gracz rozłączony w poczekalni ma czas na powrót', (t) => {
    t.mock.timers.enable({ apis: ['setTimeout', 'Date'] });
    const { io } = fakeIo();
    const game = createGame(1, 'Test quiz', questions);
    const alice = join(io, game, 'Alice');
    const bob = join(io, game, 'Bob');

    disconnectPlayer(io, game, alice, false);
    t.mock.timers.tick(RECONNECT_GRACE_MS - 1);
    attachPlayer(io, game, alice, 's-alice-2');
    t.mock.timers.tick(1);
    assert.equal(game.players.has(alice.token), true);

    disconnectPlayer(io, game, bob, false);
    t.mock.timers.tick(RECONNECT_GRACE_MS);
    assert.equal(game.players.has(bob.token), false);
});

test('odświeżenie strony przez wszystkich graczy nie kończy pytania ani gry', (t) => {
    const { io, game, alice, bob } = setup(t);
    disconnectPlayer(io, game, alice, false);
    disconnectPlayer(io, game, bob, false);
    assert.equal(game.phase, 'question');

    t.mock.timers.tick(1_000);
    attachPlayer(io, game, alice, 's-alice-2');
    assert.equal(submitAnswer(io, game, alice, 0, 1), null);
    t.mock.timers.tick(RECONNECT_GRACE_MS);
    assert.equal(games.has(game.code), true);
});

test('gra bez graczy zamyka się po czasie na powrót', (t) => {
    const { io, last, game, alice, bob } = setup(t);
    disconnectPlayer(io, game, alice, false);
    disconnectPlayer(io, game, bob, false);
    t.mock.timers.tick(RECONNECT_GRACE_MS);
    assert.deepEqual(last('game:closed'), { reason: 'no_players' });
    assert.equal(games.has(game.code), false);
});

test('na koniec gry serwer wysyła statystyki graczy i pytań', (t) => {
    const { io, last, game, alice, bob } = setup(t);

    t.mock.timers.tick(2_000);
    submitAnswer(io, game, alice, 0, 1);
    submitAnswer(io, game, bob, 0, 0);
    nextQuestionAfterReveal(t);

    t.mock.timers.tick(5_000);
    submitAnswer(io, game, alice, 1, 1);
    t.mock.timers.tick(5_000);
    t.mock.timers.tick(REVEAL_MS);

    const stats = last('game:over');
    assert.equal(games.has(game.code), false);

    const [first, second] = stats.players;
    assert.equal(first.name, 'Alice');
    assert.equal(first.rank, 1);
    assert.equal(first.correct, 2);
    assert.equal(first.accuracy, 1);
    assert.equal(first.bestStreak, 2);
    assert.equal(first.score, 900 + 750);
    assert.equal(first.avgResponseMs, 3_500);

    assert.equal(second.name, 'Bob');
    assert.equal(second.rank, 2);
    assert.deepEqual([second.correct, second.incorrect, second.unanswered], [0, 1, 1]);
    assert.equal(second.score, 0);

    assert.equal(first.answers.length, 2);
    assert.deepEqual(first.answers[0], { optionIndex: 1, correct: true, responseMs: 2_000, points: 900 });
    assert.equal(first.answers[1].optionIndex, 1);
    assert.equal(second.answers[0].correct, false);
    assert.equal(second.answers[1], null);

    assert.deepEqual(stats.questions[0].distribution, [1, 1]);
    assert.equal(stats.questions[0].correctRate, 0.5);
    assert.deepEqual(stats.questions[1].distribution, [0, 1, 0]);
});

test('po zakończeniu gry wynik trafia do zapisu dokładnie raz', (t) => {
    const saved: { code: string; players: number; quizId: number }[] = [];
    setResultSink((game, stats) => saved.push({ code: game.code, players: stats.players.length, quizId: game.quizId }));
    t.after(() => setResultSink(() => {}));

    const { io, game, alice, bob } = setup(t);
    submitAnswer(io, game, alice, 0, 1);
    submitAnswer(io, game, bob, 0, 1);
    nextQuestionAfterReveal(t);
    submitAnswer(io, game, alice, 1, 1);
    submitAnswer(io, game, bob, 1, 1);
    t.mock.timers.tick(REVEAL_MS);

    assert.deepEqual(saved, [{ code: game.code, players: 2, quizId: 1 }]);
});

test('błąd zapisu wyniku nie blokuje wysłania statystyk graczom', (t) => {
    setResultSink(() => { throw new Error('db down'); });
    t.after(() => setResultSink(() => {}));
    t.mock.method(console, 'error', () => {});

    const { io, last, game, alice, bob } = setup(t);
    submitAnswer(io, game, alice, 0, 1);
    submitAnswer(io, game, bob, 0, 1);
    nextQuestionAfterReveal(t);
    submitAnswer(io, game, alice, 1, 1);
    submitAnswer(io, game, bob, 1, 1);
    t.mock.timers.tick(REVEAL_MS);

    assert.equal(last('game:over').players.length, 2);
    assert.equal(games.has(game.code), false);
});

test('host rozłączony w poczekalni ma czas na powrót, potem gra się zamyka', (t) => {
    t.mock.timers.enable({ apis: ['setTimeout', 'Date'] });
    const { io, last } = fakeIo();
    const game = createGame(1, 'Test quiz', questions);
    attachHost(game, 'host-1');

    detachHost(io, game);
    t.mock.timers.tick(RECONNECT_GRACE_MS - 1);
    assert.equal(attachHost(game, 'host-2'), null);
    t.mock.timers.tick(RECONNECT_GRACE_MS);
    assert.equal(games.has(game.code), true);

    detachHost(io, game);
    t.mock.timers.tick(RECONNECT_GRACE_MS);
    assert.deepEqual(last('game:closed'), { reason: 'host_left' });
    assert.equal(games.has(game.code), false);
});

test('rozłączenie hosta w trakcie gry nie zatrzymuje ani nie niszczy gry', (t) => {
    const { io, game, alice } = setup(t);
    attachHost(game, 'host-1');
    detachHost(io, game);
    t.mock.timers.tick(5_000);
    assert.equal(games.has(game.code), true);
    assert.equal(submitAnswer(io, game, alice, 0, 1), null);
    t.mock.timers.tick(5_000);
    assert.equal(game.phase, 'reveal');
    nextQuestionAfterReveal(t);
    assert.equal(game.phase, 'question');
    assert.equal(game.current, 1);
    assert.equal(games.has(game.code), true);
});

test('migawka hosta odtwarza stan każdej fazy bez poprawnej odpowiedzi przed końcem pytania', (t) => {
    t.mock.timers.enable({ apis: ['setTimeout', 'Date'] });
    const { io } = fakeIo();
    const game = createGame(1, 'Test quiz', questions);
    const alice = join(io, game, 'Alice');
    join(io, game, 'Bob');
    assert.equal(hostSnapshot(game).phase, 'waiting');
    assert.equal(hostSnapshot(game).players.length, 2);

    startGame(io, game);
    t.mock.timers.tick(1_000);
    const intro = hostSnapshot(game);
    assert.equal(intro.phase, 'intro');
    assert.deepEqual([intro.intro?.text, intro.intro?.introMs], ['2 + 2?', INTRO_MS - 1_000]);
    assert.equal(intro.question, null);

    t.mock.timers.tick(INTRO_MS);
    submitAnswer(io, game, alice, 0, 1);
    t.mock.timers.tick(2_000);
    const live = hostSnapshot(game);
    assert.equal(live.phase, 'question');
    assert.deepEqual(live.question?.options, ['3', '4']);
    assert.equal(live.question?.remainingMs, 10_000 - 2_000);
    assert.deepEqual([live.answered, live.answerTotal], [1, 2]);
    assert.equal('correctIndex' in (live.question ?? {}), false);
    assert.equal(live.reveal, null);

    t.mock.timers.tick(8_000);
    const reveal = hostSnapshot(game);
    assert.equal(reveal.phase, 'reveal');
    assert.equal((reveal.reveal as { correctIndex: number }).correctIndex, 1);
    assert.deepEqual(reveal.question?.options, ['3', '4']);
});
