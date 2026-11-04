import { ANSWER_STYLES } from '@/lib/game';
import type { GameStats, PlayerStats } from '@/models/Game';

interface Props {
    me: PlayerStats;
    stats: GameStats;
}

const seconds = (ms: number) => `${(ms / 1000).toFixed(1)}s`;

function PlayerSummary({ me, stats }: Props) {
    return (
        <div className="py-4">
            <div className="text-center mb-4">
                <h1 className="h2 mb-3">Game over</h1>
                <div className="result-icon mb-2">#{me.rank}</div>
                <p className="fs-4 fw-bold mb-0">{me.score} points</p>
            </div>

            <div className="row g-2 text-center mb-3">
                <div className="col-6 col-sm-3">
                    <div className="small text-body-secondary">Correct</div>
                    <div className="fs-4 fw-bold text-success">{me.correct}</div>
                </div>
                <div className="col-6 col-sm-3">
                    <div className="small text-body-secondary">Wrong</div>
                    <div className="fs-4 fw-bold text-danger">{me.incorrect}</div>
                </div>
                <div className="col-6 col-sm-3">
                    <div className="small text-body-secondary">Missed</div>
                    <div className="fs-4 fw-bold">{me.unanswered}</div>
                </div>
                <div className="col-6 col-sm-3">
                    <div className="small text-body-secondary">Accuracy</div>
                    <div className="fs-4 fw-bold">{Math.round(me.accuracy * 100)}%</div>
                </div>
            </div>

            <p className="text-center text-body-secondary">
                Avg. response {me.avgResponseMs === null ? '-' : seconds(me.avgResponseMs)} · best streak {me.bestStreak}
            </p>

            <table className="table align-middle">
                <thead>
                    <tr>
                        <th>#</th>
                        <th>Your answer</th>
                        <th className="text-end">Time</th>
                        <th className="text-end">Points</th>
                    </tr>
                </thead>
                <tbody>
                    {stats.questions.map((q) => {
                        const a = me.answers[q.index];
                        return (
                            <tr key={q.index}>
                                <td>{q.index + 1}</td>
                                <td>
                                    {a ? (
                                        <>
                                            <span className={`stat-symbol answer-${ANSWER_STYLES[a.optionIndex].color}`}>
                                                {ANSWER_STYLES[a.optionIndex].symbol}
                                            </span>
                                            {' '}{a.correct ? '✓' : '✗'}
                                        </>
                                    ) : '⏱'}
                                </td>
                                <td className="text-end">{a ? seconds(a.responseMs) : '-'}</td>
                                <td className="text-end">+{a?.points ?? 0}</td>
                            </tr>
                        );
                    })}
                </tbody>
            </table>
        </div>
    );
}
export default PlayerSummary;
