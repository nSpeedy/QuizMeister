import { useEffect, useState, type FormEvent } from 'react';
import { useSocket } from '@/lib/socket';
import { ANSWER_STYLES, gameError } from '@/lib/game';
import { clearSession, loadSession, saveSession, type PlayerSession } from '@/lib/playerSession';
import type {
    AckResponse, GameStats, PlayerQuestion, PlayerStats, QuestionEnd, QuestionIntroData, QuestionResult, Snapshot,
} from '@/models/Game';
import QuestionIntro from '@/components/game/QuestionIntro';
import AnswerTile from '@/components/game/AnswerTile';
import Countdown from '@/components/game/Countdown';
import PlayerSummary from '@/components/game/PlayerSummary';

interface PlayerState {
    phase: 'connecting' | 'join' | 'waiting' | 'intro' | 'question' | 'answered' | 'result' | 'over' | 'closed';
    me: PlayerSession | null;
    intro: QuestionIntroData | null;
    question: PlayerQuestion | null;
    deadline: number;
    chosen: number | null;
    correctIndex: number | null;
    result: QuestionResult | null;
    final: PlayerStats | null;
    stats: GameStats | null;
    totalQuestions: number;
    notice: string | null;
}

const INITIAL: PlayerState = {
    phase: 'join',
    me: null,
    intro: null,
    question: null,
    deadline: 0,
    chosen: null,
    correctIndex: null,
    result: null,
    final: null,
    stats: null,
    totalQuestions: 0,
    notice: null,
};

function Lobby() {
    const socket = useSocket();
    const [state, setState] = useState<PlayerState>(() => ({ ...INITIAL, phase: loadSession() ? 'connecting' : 'join' }));
    const [online, setOnline] = useState(true);
    const [joining, setJoining] = useState(false);
    const [joinError, setJoinError] = useState<string | null>(null);

    useEffect(() => {
        const update = (patch: Partial<PlayerState>) => setState((s) => ({ ...s, ...patch }));

        const handlers = {
            connect: async () => {
                setOnline(true);
                const session = loadSession();
                if (!session) return setState((s) => (s.phase === 'connecting' ? { ...s, phase: 'join' } : s));

                const res: AckResponse<{ state: Snapshot }> = await socket.emitWithAck('player:rejoin', { code: session.code, token: session.token });
                if (!res.ok) {
                    clearSession();
                    return update({ ...INITIAL, notice: 'Your previous game is no longer available.' });
                }
                const snap = res.state;
                const base = { me: session, totalQuestions: snap.total, notice: null };
                if (snap.phase === 'waiting') return update({ ...base, phase: 'waiting' });
                if (snap.phase === 'intro') {
                    return update({ ...base, phase: 'intro', intro: { questionIndex: snap.questionIndex, total: snap.total, introMs: 0 } });
                }
                if (snap.phase === 'question' && snap.question && !snap.you.answered) {
                    return update({
                        ...base,
                        phase: 'question',
                        chosen: null,
                        deadline: Date.now() + snap.question.remainingMs,
                        question: {
                            questionIndex: snap.questionIndex,
                            total: snap.total,
                            optionCount: snap.question.optionCount,
                            durationMs: snap.question.durationMs,
                            endsAt: 0,
                        },
                    });
                }
                update({ ...base, phase: 'answered', chosen: null });
            },
            disconnect: () => setOnline(false),
            'question:intro': (intro: QuestionIntroData) => update({
                phase: 'intro',
                intro,
                totalQuestions: intro.total,
                chosen: null,
                correctIndex: null,
                result: null,
                notice: null,
            }),
            'question:start': (question: PlayerQuestion) => update({
                phase: 'question',
                question,
                totalQuestions: question.total,
                deadline: Date.now() + question.durationMs,
                chosen: null,
                correctIndex: null,
                result: null,
                notice: null,
            }),
            'question:end': ({ correctIndex }: QuestionEnd) => update({ correctIndex }),
            'question:result': (result: QuestionResult) => update({ phase: 'result', result }),
            'game:over': (stats: GameStats) => {
                clearSession();
                setState((s) => ({
                    ...s,
                    phase: 'over',
                    stats,
                    final: stats.players.find((p) => p.id === s.me?.playerId) ?? null,
                }));
            },
            'game:closed': () => {
                clearSession();
                update({ phase: 'closed' });
            },
        };

        for (const [event, handler] of Object.entries(handlers)) socket.on(event, handler);
        return () => {
            for (const [event, handler] of Object.entries(handlers)) socket.off(event, handler);
        };
    }, [socket]);

    async function handleJoin(e: FormEvent<HTMLFormElement>) {
        e.preventDefault();
        const form = new FormData(e.currentTarget);
        const code = String(form.get('pin') ?? '').trim();
        const name = String(form.get('name') ?? '').trim();

        setJoining(true);
        setJoinError(null);
        try {
            const res: AckResponse<{ playerId: string; name: string; token: string }> =
                await socket.timeout(5000).emitWithAck('player:join', { code, name });
            if (!res.ok) return setJoinError(gameError(res.error));
            const session = { code, token: res.token, playerId: res.playerId, name: res.name };
            saveSession(session);
            setState((s) => ({ ...s, phase: 'waiting', me: session, notice: null }));
        } catch {
            setJoinError('Cannot reach the server. Check your connection and try again.');
        } finally {
            setJoining(false);
        }
    }

    async function answer(optionIndex: number) {
        if (!state.question) return;
        const { questionIndex } = state.question;
        setState((s) => ({ ...s, phase: 'answered', chosen: optionIndex }));
        const res: AckResponse = await socket.emitWithAck('player:answer', { questionIndex, optionIndex });
        if (!res.ok) setState((s) => ({ ...s, notice: gameError(res.error) }));
    }

    function leave() {
        clearSession();
        socket.disconnect().connect();
        setState(INITIAL);
    }

    const { phase, me, question, result } = state;

    return (
        <div className="container py-2" style={{ maxWidth: 720 }}>
            {!online && phase !== 'join' && (
                <div className="alert alert-warning py-2" role="status">Connection lost. Reconnecting...</div>
            )}
            {me && phase !== 'over' && phase !== 'closed' && (
                <div className="d-flex justify-content-between text-body-secondary small mb-3">
                    <span>Playing as <strong className="text-body">{me.name}</strong></span>
                    <span>PIN {me.code}</span>
                </div>
            )}

            {phase === 'connecting' && <p className="text-center text-body-secondary py-5">Reconnecting to your game...</p>}

            {phase === 'join' && (
                <div className="card card-body mx-auto" style={{ maxWidth: 420 }}>
                    <h1 className="h3 mb-3 text-center">Join a game</h1>
                    {state.notice && <div className="alert alert-info py-2">{state.notice}</div>}
                    {joinError && <div className="alert alert-danger py-2" role="alert">{joinError}</div>}
                    <form onSubmit={handleJoin}>
                        <div className="mb-3">
                            <label htmlFor="pin" className="form-label">Game PIN</label>
                            <input id="pin" name="pin" className="form-control form-control-lg text-center" inputMode="numeric"
                                   pattern="[0-9]{6}" maxLength={6} autoComplete="off" placeholder="123456" required/>
                        </div>
                        <div className="mb-3">
                            <label htmlFor="nick" className="form-label">Nickname</label>
                            <input id="nick" name="name" className="form-control form-control-lg" maxLength={20}
                                   autoComplete="off" required/>
                        </div>
                        <button type="submit" className="btn btn-primary btn-lg w-100" disabled={joining}>
                            {joining ? 'Joining...' : 'Join'}
                        </button>
                    </form>
                </div>
            )}

            {phase === 'waiting' && (
                <div className="text-center py-5">
                    <h1 className="h2">You're in!</h1>
                    <p className="text-body-secondary">Look for your name on the host's screen. The game starts soon.</p>
                    <button className="btn btn-link text-body-secondary" onClick={leave}>Leave game</button>
                </div>
            )}

            {phase === 'intro' && state.intro && <QuestionIntro key={state.intro.questionIndex} {...state.intro}/>}

            {phase === 'question' && question && (
                <>
                    <p className="text-center text-body-secondary mb-2">Question {question.questionIndex + 1} of {question.total}</p>
                    <div className="mb-3">
                        <Countdown key={question.questionIndex} deadline={state.deadline} durationMs={question.durationMs}/>
                    </div>
                    <div className="answer-grid player-answers">
                        {Array.from({ length: question.optionCount }, (_, i) => (
                            <AnswerTile key={i} index={i} onClick={() => answer(i)}/>
                        ))}
                    </div>
                </>
            )}

            {phase === 'answered' && (
                <div className="text-center py-5">
                    {state.chosen !== null && (
                        <div className={`answer-chosen answer-${ANSWER_STYLES[state.chosen].color} mb-3`}>
                            {ANSWER_STYLES[state.chosen].symbol}
                        </div>
                    )}
                    <h1 className="h3">{state.notice ?? 'Answer locked in!'}</h1>
                    <p className="text-body-secondary">Waiting for the others...</p>
                </div>
            )}

            {phase === 'result' && result && (
                <div className="text-center py-4">
                    <div className={`result-icon mb-2 ${result.correct ? 'text-success' : 'text-danger'}`}>
                        {result.correct ? '✓' : result.answered ? '✗' : '⏱'}
                    </div>
                    <h1 className="h2">{result.correct ? 'Correct!' : result.answered ? 'Wrong answer' : 'No answer'}</h1>
                    <p className="fs-4 fw-bold mb-1">+{result.points} points</p>
                    {state.correctIndex !== null && !result.correct && (
                        <p className="text-body-secondary">
                            Correct answer: <span className={`stat-symbol answer-${ANSWER_STYLES[state.correctIndex].color}`}>
                                {ANSWER_STYLES[state.correctIndex].symbol}
                            </span>
                        </p>
                    )}
                    <div className="d-flex justify-content-center gap-4 mt-4">
                        <div><div className="text-body-secondary small">Score</div><div className="fs-3 fw-bold">{result.score}</div></div>
                        <div><div className="text-body-secondary small">Rank</div><div className="fs-3 fw-bold">#{result.rank}</div></div>
                    </div>
                </div>
            )}

            {phase === 'over' && (
                <div className="text-center">
                    {state.final && state.stats ? (
                        <PlayerSummary me={state.final} stats={state.stats}/>
                    ) : (
                        <div className="py-4">
                            <h1 className="h2 mb-3">Game over</h1>
                            <p className="text-body-secondary">Thanks for playing!</p>
                        </div>
                    )}
                    <button className="btn btn-primary mt-3" onClick={() => setState(INITIAL)}>Play again</button>
                </div>
            )}

            {phase === 'closed' && (
                <div className="text-center py-5">
                    <h1 className="h3">The game was closed by the host.</h1>
                    <button className="btn btn-primary mt-3" onClick={() => setState(INITIAL)}>Join another game</button>
                </div>
            )}
        </div>
    )
}
export default Lobby;
