import type { QuestionStats } from '@/models/Game';
import { ANSWER_STYLES } from '@/lib/game';

export default function QuestionStatsList({ questions, playerCount }: { questions: QuestionStats[]; playerCount: number }) {
    return (
        <div className="d-flex flex-column gap-3">
            {questions.map((q) => (
                <div key={q.index} className="card card-body">
                    <div className="d-flex justify-content-between align-items-baseline gap-2 mb-2">
                        <strong>{q.index + 1}. {q.text}</strong>
                        <span className="text-body-secondary small text-nowrap">{Math.round(q.correctRate * 100)}% correct</span>
                    </div>
                    {q.options.map((option, i) => {
                        const percent = playerCount ? Math.round((q.distribution[i] / playerCount) * 100) : 0;
                        return (
                            <div key={i} className={`stat-row${i === q.correctIndex ? ' stat-correct' : ''}`}>
                                <span className={`stat-symbol answer-${ANSWER_STYLES[i].color}`} aria-hidden="true">{ANSWER_STYLES[i].symbol}</span>
                                <span className="stat-label">{option}</span>
                                <div className="stat-bar">
                                    <div className={`stat-fill answer-${ANSWER_STYLES[i].color}`} style={{ width: `${percent}%` }}/>
                                </div>
                                <span className="stat-value">{percent}%</span>
                            </div>
                        );
                    })}
                </div>
            ))}
        </div>
    );
}
