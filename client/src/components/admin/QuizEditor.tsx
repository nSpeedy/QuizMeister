import { useFetcher } from 'react-router';
import type { Quiz } from '@/models/QuizForm';

type ActionResult = { ok: boolean; error: string | null };

export default function QuizEditor({ quiz }: { quiz: Quiz }){
    const fetcher = useFetcher<ActionResult>();
    const saving = fetcher.state !== 'idle';

    return (
        <fetcher.Form method="post" className="card card-body">
            <input type="hidden" name="intent" value="update-quiz"/>
            <div className="mb-3">
                <label htmlFor="quizTitle" className="form-label">Title</label>
                <input id="quizTitle" name="title" className="form-control" defaultValue={quiz.title}
                       required maxLength={100}/>
            </div>
            <div className="form-check mb-3">
                <input id="quizPublic" type="checkbox" name="is_public" className="form-check-input"
                       defaultChecked={quiz.is_public}/>
                <label htmlFor="quizPublic" className="form-check-label">Public</label>
            </div>
            {fetcher.data?.error && <div className="alert alert-danger py-2" role="alert">{fetcher.data.error}</div>}
            <div className="d-flex align-items-center gap-2">
                <button type="submit" className="btn btn-primary" disabled={saving}>{saving ? 'Saving...' : 'Save quiz'}</button>
                {!saving && fetcher.data?.ok && <span className="text-success small">Saved</span>}
            </div>
        </fetcher.Form>
    )
}
