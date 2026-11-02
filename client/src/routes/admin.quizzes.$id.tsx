import { data, isRouteErrorResponse, Link } from 'react-router';
import type { Route } from './+types/admin.quizzes.$id';
import { requireUser } from '@/lib/api/auth';
import { createQuestion, deleteQuestion, getQuiz, updateQuestion, updateQuiz } from '@/lib/api/quizzes';
import { ApiError, errorMessage } from '@/lib/api';
import type { QuestionInput } from '@/models/QuizForm';
import QuizEditor from '@/components/admin/QuizEditor';
import QuestionsForm from '@/components/admin/QuestionsForm';

export async function clientLoader({ request, params }: Route.ClientLoaderArgs) {
    await requireUser(request);
    try {
        return { quiz: await getQuiz(Number(params.id)) };
    } catch (e) {
        if (e instanceof ApiError && e.status === 404) throw data('Quiz not found', { status: 404 });
        throw e;
    }
}
function readQuestion(form: FormData): QuestionInput {
    return {
        text: String(form.get('text') ?? '').trim(),
        options: form.getAll('option').map((o) => String(o).trim()),
        correctIndex: Number(form.get('correctIndex')),
        timeLimitS: Number(form.get('timeLimitS')),
    };
}

export async function clientAction({ request, params }: Route.ClientActionArgs) {
    const quizId = Number(params.id);
    const form = await request.formData();
    try {
        switch (form.get('intent')) {
            case 'update-quiz':
                await updateQuiz(quizId, { title: String(form.get('title') ?? '').trim(), is_public: form.get('is_public') === 'on' });
                break;
            case 'create-question':
                await createQuestion(quizId, readQuestion(form));
                break;
            case 'update-question':
                await updateQuestion(quizId, Number(form.get('id')), readQuestion(form));
                break;
            case 'delete-question':
                await deleteQuestion(quizId, Number(form.get('id')));
                break;
            default:
                return { ok: false, error: 'Unknown action' };
        }
        return { ok: true, error: null };
    } catch (e) {
        return { ok: false, error: errorMessage(e) };
    }
}

function QuizEditPage({ loaderData }: Route.ComponentProps) {
    const { quiz } = loaderData;

    return (
        <>
            <Link to="/admin" className="d-inline-block mb-3">&larr; Back to quizzes</Link>
            <QuizEditor quiz={quiz}/>

            <h2 className="h5 mt-4 mb-3">Questions ({quiz.questions.length})</h2>
            {quiz.questions.map((question, i) => <QuestionsForm key={question.id} question={question} number={i + 1}/>)}
            <QuestionsForm key={`new-${quiz.questions.length}`} number={quiz.questions.length + 1}/>
        </>
    )
}
export default QuizEditPage;

export function ErrorBoundary({ error }: Route.ErrorBoundaryProps) {
    const notFound = isRouteErrorResponse(error) && error.status === 404;
    return (
        <div className="alert alert-danger" role="alert">
            {notFound ? 'This quiz does not exist.' : 'Could not load this quiz.'}{' '}
            <Link to="/admin">Back to quizzes</Link>
        </div>
    )
}
