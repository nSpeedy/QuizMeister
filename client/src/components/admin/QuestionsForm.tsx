import { useState } from 'react';
import { useFetcher } from 'react-router';
import type { Question } from '@/models/QuizForm';

const MIN_OPTIONS = 2;
const MAX_OPTIONS = 4;

type ActionResult = { ok: boolean; error: string | null };

type Props = {
    question?: Question;
    number: number;
};

export default function QuestionsForm({ question, number }: Props){
    const fetcher = useFetcher<ActionResult>();
    const [options, setOptions] = useState<string[]>(question?.options ?? ['', '']);
    const [correctIndex, setCorrectIndex] = useState(question?.correctIndex ?? 0);
    const busy = fetcher.state !== 'idle';
    const isNew = !question;

    function updateOption(index: number, value: string) {
        setOptions((opts) => opts.map((o, i) => (i === index ? value : o)));
    }

    function removeOption(index: number) {
        setOptions((opts) => opts.filter((_, i) => i !== index));
        setCorrectIndex((c) => (c === index ? 0 : c > index ? c - 1 : c));
    }

    function handleDelete() {
        if (!question || !confirm(`Delete question ${number}?`)) return;
        fetcher.submit({ intent: 'delete-question', id: question.id }, { method: 'post' });
    }

    return(
        <fetcher.Form method="post" className={`card mb-3${isNew ? ' border-primary' : ''}`}
                      style={busy ? { opacity: 0.6 } : undefined}>
            <div className="card-header d-flex justify-content-between align-items-center">
                <strong>{isNew ? 'New question' : `Question ${number}`}</strong>
                {!isNew && <button type="button" className="btn btn-sm btn-outline-danger" onClick={handleDelete}
                                   disabled={busy}>Delete</button>}
            </div>
            <div className="card-body">
                <input type="hidden" name="intent" value={isNew ? 'create-question' : 'update-question'}/>
                {question && <input type="hidden" name="id" value={question.id}/>}

                <div className="mb-3">
                    <label htmlFor={`text-${number}`} className="form-label">Question</label>
                    <textarea id={`text-${number}`} name="text" className="form-control" rows={2}
                              defaultValue={question?.text} maxLength={300} required/>
                </div>

                <label className="form-label">
                    Answers <small className="text-body-secondary">(select the correct one)</small>
                </label>
                {options.map((option, i) => (
                    <div className="input-group mb-2" key={i}>
                        <div className="input-group-text">
                            <input type="radio" className="form-check-input mt-0" name="correctIndex" value={i}
                                   checked={correctIndex === i} onChange={() => setCorrectIndex(i)}
                                   aria-label={`Answer ${i + 1} is correct`}/>
                        </div>
                        <input name="option" className="form-control" value={option} placeholder={`Answer ${i + 1}`}
                               onChange={(e) => updateOption(i, e.target.value)} maxLength={100} required/>
                        <button type="button" className="btn btn-outline-secondary" aria-label={`Remove answer ${i + 1}`}
                                onClick={() => removeOption(i)} disabled={options.length <= MIN_OPTIONS}>&times;</button>
                    </div>
                ))}
                {options.length < MAX_OPTIONS && (
                    <button type="button" className="btn btn-sm btn-outline-secondary mb-3"
                            onClick={() => setOptions((opts) => [...opts, ''])}>+ Add answer</button>
                )}

                <div className="mb-3" style={{ maxWidth: 200 }}>
                    <label htmlFor={`time-${number}`} className="form-label">Time limit (seconds)</label>
                    <input id={`time-${number}`} type="number" name="timeLimitS" className="form-control"
                           min={5} max={120} defaultValue={question?.timeLimitS ?? 20} required/>
                </div>

                {fetcher.data?.error && <div className="alert alert-danger py-2" role="alert">{fetcher.data.error}</div>}
                <div className="d-flex align-items-center gap-2">
                    <button type="submit" className="btn btn-primary" disabled={busy}>
                        {isNew ? 'Add question' : 'Save question'}
                    </button>
                    {!isNew && !busy && fetcher.data?.ok && <span className="text-success small">Saved</span>}
                </div>
            </div>
        </fetcher.Form>
    )
}
