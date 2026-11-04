import { data, isRouteErrorResponse, Link } from 'react-router';
import type { Route } from './+types/admin.history.$id';
import { requireUser } from '@/lib/api/auth';
import { getHistoryEntry } from '@/lib/api/history';
import { ApiError } from '@/lib/api';
import { formatDuration } from '@/lib/game';
import Leaderboard from '@/components/game/Leaderboard';
import QuestionStatsList from '@/components/game/QuestionStatsList';

export async function clientLoader({ request, params }: Route.ClientLoaderArgs) {
    await requireUser(request);
    try {
        return { game: await getHistoryEntry(Number(params.id)) };
    } catch (e) {
        if (e instanceof ApiError && e.status === 404) throw data('Game not found', { status: 404 });
        throw e;
    }
}

function AdminHistoryEntry({ loaderData }: Route.ComponentProps) {
    const { game } = loaderData;

    return (
        <>
            <div className="mb-3">
                <h2 className="h4 mb-1">{game.quiz_title}</h2>
                <p className="text-body-secondary mb-0">
                    {new Date(game.started_at).toLocaleString()} · {game.player_count} players · {formatDuration(game.duration_ms)} · PIN {game.pin}
                </p>
            </div>
            <div className="row g-4">
                <div className="col-lg-5">
                    <h3 className="h5 mb-3">Final results</h3>
                    <Leaderboard entries={game.stats.players}/>
                </div>
                <div className="col-lg-7">
                    <h3 className="h5 mb-3">Question summary</h3>
                    <QuestionStatsList questions={game.stats.questions} playerCount={game.stats.players.length}/>
                </div>
                <div className="col-12">
                    <Link to="/admin/history" className="btn btn-outline-secondary">Back to history</Link>
                </div>
            </div>
        </>
    );
}
export default AdminHistoryEntry;

export function ErrorBoundary({ error }: Route.ErrorBoundaryProps) {
    const notFound = isRouteErrorResponse(error) && error.status === 404;
    return (
        <div className="alert alert-danger" role="alert">
            {notFound ? 'This game does not exist.' : 'Could not load the game.'}{' '}
            <Link to="/admin/history">Back to history</Link>
        </div>
    );
}
