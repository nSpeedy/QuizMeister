import { useEffect, useRef, useState } from 'react';
import { data, isRouteErrorResponse, Link } from 'react-router';
import type { Route } from './+types/host.$quizId';
import { requireUser } from '@/lib/api/auth';
import { getQuiz } from '@/lib/api/quizzes';
import { ApiError } from '@/lib/api';
import { useSocket } from '@/lib/socket';
import { gameError } from '@/lib/game';
import type { AckResponse, GameStats, HostQuestion, LobbyPlayer, QuestionEnd } from '@/models/Game';
import AnswerTile from '@/components/game/AnswerTile';
import Countdown from '@/components/game/Countdown';
import Leaderboard from '@/components/game/Leaderboard';
import QuestionStatsList from '@/components/game/QuestionStatsList';

export async function clientLoader({ request, params }: Route.ClientLoaderArgs) {
    await requireUser(request);
    try {
        return { quiz: await getQuiz(Number(params.quizId)) };
    } catch (e) {
        if (e instanceof ApiError && e.status === 404) throw data('Quiz not found', { status: 404 });
        throw e;
    }
}

interface HostState {
    phase: 'connecting' | 'lobby' | 'question' | 'reveal' | 'over' | 'error';
    code: string | null;
    players: LobbyPlayer[];
    question: HostQuestion | null;
    deadline: number;
    answered: number;
    answerTotal: number;
    reveal: QuestionEnd | null;
    stats: GameStats | null;
    error: string | null;
}

const INITIAL: HostState = {
    phase: 'connecting',
    code: null,
    players: [],
    question: null,
    deadline: 0,
    answered: 0,
    answerTotal: 0,
    reveal: null,
    stats: null,
    error: null,
};

function HostGame({ loaderData }: Route.ComponentProps) {
    const { quiz } = loaderData;
    const socket = useSocket();
    const [state, setState] = useState<HostState>(INITIAL);
    const [busy, setBusy] = useState(false);
    const [actionError, setActionError] = useState<string | null>(null);
    const codeRef = useRef<string | null>(null);

    useEffect(() => {
        const update = (patch: Partial<HostState>) => setState((s) => ({ ...s, ...patch }));
        const fail = (error: string) => update({ phase: 'error', error });

        const handlers = {
            connect: async () => {
                if (codeRef.current) return fail('Connection to the server was lost and the game was interrupted.');
                const res: AckResponse<{ code: string }> = await socket.emitWithAck('host:create', { quizId: quiz.id });
                if (!res.ok) return fail(gameError(res.error));
                codeRef.current = res.code;
                update({ phase: 'lobby', code: res.code });
            },
            'lobby:update': (players: LobbyPlayer[]) => update({ players }),
            'question:start': (question: HostQuestion) => setState((s) => ({
                ...s,
                phase: 'question',
                question,
                deadline: Date.now() + question.durationMs,
                answered: 0,
                answerTotal: s.players.filter((p) => p.connected).length,
                reveal: null,
            })),
            'answer:progress': ({ answered, total }: { answered: number; total: number }) => update({ answered, answerTotal: total }),
            'question:end': (reveal: QuestionEnd) => update({ phase: 'reveal', reveal }),
            'game:over': (stats: GameStats) => update({ phase: 'over', stats }),
            'game:closed': () => fail('The game ended because all players left.'),
        };

        for (const [event, handler] of Object.entries(handlers)) socket.on(event, handler);
        return () => {
            for (const [event, handler] of Object.entries(handlers)) socket.off(event, handler);
        };
    }, [socket, quiz.id]);

    async function send(event: 'host:start' | 'host:next') {
        setBusy(true);
        setActionError(null);
        const res: AckResponse = await socket.emitWithAck(event);
        setBusy(false);
        if (!res.ok) setActionError(gameError(res.error));
    }

    const { phase, question, reveal } = state;
    const connectedPlayers = state.players.filter((p) => p.connected);
    const isLastQuestion = question ? question.questionIndex + 1 === question.total : false;

    return (
        <div className="container py-2" style={{ maxWidth: 1100 }}>
            <div className="d-flex justify-content-between align-items-center mb-3">
                <h1 className="h4 mb-0">{quiz.title}</h1>
                {state.code && phase !== 'over' && <span className="badge text-bg-dark fs-6">PIN {state.code}</span>}
            </div>

            {actionError && <div className="alert alert-warning" role="alert">{actionError}</div>}

            {phase === 'connecting' && <p className="text-center text-body-secondary py-5">Creating game...</p>}

            {phase === 'error' && (
                <div className="alert alert-danger" role="alert">
                    {state.error} <Link to="/admin">Back to quizzes</Link>
                </div>
            )}

            {phase === 'lobby' && (
                <div className="text-center">
                    <p className="text-body-secondary mb-2">Join at <strong>{window.location.host}/lobby</strong> with PIN</p>
                    <div className="pin-display mb-4">{state.code}</div>
                    <h2 className="h5 mb-3">Players ({connectedPlayers.length})</h2>
                    <div className="d-flex flex-wrap justify-content-center gap-2 mb-4" style={{ minHeight: '2.5rem' }}>
                        {state.players.length === 0 && <span className="text-body-secondary">Waiting for players...</span>}
                        {state.players.map((p) => (
                            <span key={p.id} className={`player-chip${p.connected ? '' : ' offline'}`}>{p.name}</span>
                        ))}
                    </div>
                    <button className="btn btn-primary btn-lg px-5" onClick={() => send('host:start')}
                            disabled={busy || connectedPlayers.length === 0}>Start game</button>
                </div>
            )}

            {(phase === 'question' || phase === 'reveal') && question && (
                <>
                    <div className="d-flex justify-content-between text-body-secondary mb-2">
                        <span>Question {question.questionIndex + 1} of {question.total}</span>
                        {phase === 'question' && <span>Answers: {state.answered} / {state.answerTotal}</span>}
                    </div>
                    <p className="question-text my-4">{question.text}</p>
                    {phase === 'question' && (
                        <div className="mb-4">
                            <Countdown key={question.questionIndex} deadline={state.deadline} durationMs={question.durationMs}/>
                        </div>
                    )}
                    <div className="answer-grid mb-4">
                        {question.options.map((option, i) => (
                            <AnswerTile key={i} index={i}
                                        state={reveal ? (i === reveal.correctIndex ? 'correct' : 'wrong') : undefined}>
                                {option}
                                {reveal && <span className="ms-2 opacity-75">({reveal.distribution[i]})</span>}
                            </AnswerTile>
                        ))}
                    </div>
                    {phase === 'reveal' && reveal && (
                        <div className="row g-4 align-items-start">
                            <div className="col-md-7">
                                <h2 className="h5">Top players</h2>
                                <Leaderboard entries={reveal.leaderboard} limit={5}/>
                            </div>
                            <div className="col-md-5 text-md-end">
                                <button className="btn btn-primary btn-lg" onClick={() => send('host:next')} disabled={busy}>
                                    {isLastQuestion ? 'Show results' : 'Next question'}
                                </button>
                                <p className="small text-body-secondary mt-2 mb-0">Continues automatically in a few seconds.</p>
                            </div>
                        </div>
                    )}
                </>
            )}

            {phase === 'over' && state.stats && (
                <div className="row g-4">
                    <div className="col-lg-5">
                        <h2 className="h4 mb-3">Final results</h2>
                        <Leaderboard entries={state.stats.players}/>
                    </div>
                    <div className="col-lg-7">
                        <h2 className="h4 mb-3">Question summary</h2>
                        <QuestionStatsList questions={state.stats.questions} playerCount={state.stats.players.length}/>
                    </div>
                    <div className="col-12">
                        <Link to="/admin" className="btn btn-outline-secondary">Back to quizzes</Link>
                    </div>
                </div>
            )}
        </div>
    )
}
export default HostGame;

export function ErrorBoundary({ error }: Route.ErrorBoundaryProps) {
    const notFound = isRouteErrorResponse(error) && error.status === 404;
    return (
        <div className="container py-3">
            <div className="alert alert-danger" role="alert">
                {notFound ? 'This quiz does not exist.' : 'Could not start the game.'}{' '}
                <Link to="/admin">Back to quizzes</Link>
            </div>
        </div>
    )
}
