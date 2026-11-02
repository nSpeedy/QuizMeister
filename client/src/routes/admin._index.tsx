import { Form, Link, redirect, useFetcher, useNavigation } from 'react-router';
import type { Route } from './+types/admin._index';
import { requireUser } from '@/lib/api/auth';
import { createQuiz, deleteQuiz, listQuizzes } from '@/lib/api/quizzes';
import { errorMessage } from '@/lib/api';
import type { Quiz } from '@/models/QuizForm';

export async function clientLoader({ request }: Route.ClientLoaderArgs) {
    await requireUser(request);
    return { quizzes: await listQuizzes() };
}

export async function clientAction({ request }: Route.ClientActionArgs) {
    const form = await request.formData();
    try {
        switch (form.get('intent')) {
            case 'create': {
                const quiz = await createQuiz({ title: String(form.get('title') ?? '').trim(), is_public: false });
                return redirect(`/admin/quizzes/${quiz.id}`);
            }
            case 'delete':
                await deleteQuiz(Number(form.get('id')));
                return { error: null };
        }
        return { error: 'Unknown action' };
    } catch (e) {
        return { error: errorMessage(e) };
    }
}

function QuizRow({ quiz }: { quiz: Quiz }) {
    const fetcher = useFetcher<typeof clientAction>();
    const deleting = fetcher.state !== 'idle';

    return (
        <div className="list-group-item d-flex flex-wrap align-items-center gap-2" style={deleting ? { opacity: 0.5 } : undefined}>
            <Link to={`/admin/quizzes/${quiz.id}`} className="flex-grow-1 text-decoration-none fw-semibold">{quiz.title}</Link>
            {quiz.is_public && <span className="badge text-bg-success">public</span>}
            {fetcher.data?.error && <span className="text-danger small">{fetcher.data.error}</span>}
            <Link to={`/host/${quiz.id}`} className="btn btn-sm btn-success">Host game</Link>
            <Link to={`/admin/quizzes/${quiz.id}`} className="btn btn-sm btn-outline-primary">Edit</Link>
            <fetcher.Form method="post" onSubmit={(e) => { if (!confirm(`Delete "${quiz.title}"?`)) e.preventDefault(); }}>
                <input type="hidden" name="intent" value="delete"/>
                <input type="hidden" name="id" value={quiz.id}/>
                <button className="btn btn-sm btn-outline-danger" disabled={deleting}>Delete</button>
            </fetcher.Form>
        </div>
    )
}

function AdminIndex({ loaderData, actionData }: Route.ComponentProps) {
    const { quizzes } = loaderData;
    const creating = useNavigation().state === 'submitting';

    return (
        <>
            <Form method="post" className="d-flex gap-2 mb-3">
                <input type="hidden" name="intent" value="create"/>
                <input name="title" className="form-control" placeholder="New quiz title" aria-label="New quiz title"
                       required maxLength={100}/>
                <button className="btn btn-primary text-nowrap" disabled={creating}>Create quiz</button>
            </Form>
            {actionData?.error && <div className="alert alert-danger" role="alert">{actionData.error}</div>}

            <h2 className="h5 mt-4 mb-3">Your quizzes</h2>
            {quizzes.length === 0
                ? <p className="text-body-secondary">You don't have any quizzes yet. Create the first one above.</p>
                : <div className="list-group">{quizzes.map((quiz) => <QuizRow key={quiz.id} quiz={quiz}/>)}</div>}
        </>
    )
}
export default AdminIndex;
