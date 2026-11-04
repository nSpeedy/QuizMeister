import { Link, useFetcher } from 'react-router';
import type { Route } from './+types/admin.history._index';
import { requireUser } from '@/lib/api/auth';
import { deleteHistoryEntry, listHistory } from '@/lib/api/history';
import { errorMessage } from '@/lib/api';
import { formatDuration } from '@/lib/game';
import type { GameResultSummary } from '@/models/Game';

export async function clientLoader({ request }: Route.ClientLoaderArgs) {
    await requireUser(request);
    return { games: await listHistory() };
}

export async function clientAction({ request }: Route.ClientActionArgs) {
    const form = await request.formData();
    try {
        await deleteHistoryEntry(Number(form.get('id')));
        return { error: null };
    } catch (e) {
        return { error: errorMessage(e) };
    }
}

function GameRow({ game }: { game: GameResultSummary }) {
    const fetcher = useFetcher<typeof clientAction>();
    const deleting = fetcher.state !== 'idle';

    return (
        <div className="list-group-item d-flex flex-wrap align-items-center gap-2" style={deleting ? { opacity: 0.5 } : undefined}>
            <Link to={`/admin/history/${game.id}`} className="flex-grow-1 text-decoration-none">
                <span className="fw-semibold">{game.quiz_title}</span>
                <span className="d-block small text-body-secondary">
                    {new Date(game.started_at).toLocaleString()} · {game.player_count} players · {formatDuration(game.duration_ms)} · PIN {game.pin}
                </span>
            </Link>
            {fetcher.data?.error && <span className="text-danger small">{fetcher.data.error}</span>}
            <fetcher.Form method="post" onSubmit={(e) => { if (!confirm(`Delete the result of "${game.quiz_title}"?`)) e.preventDefault(); }}>
                <input type="hidden" name="id" value={game.id}/>
                <button className="btn btn-sm btn-outline-danger" disabled={deleting}>Delete</button>
            </fetcher.Form>
        </div>
    );
}

function AdminHistory({ loaderData }: Route.ComponentProps) {
    const { games } = loaderData;

    return (
        <>
            <h2 className="h5 mb-3">Game history</h2>
            {games.length === 0
                ? <p className="text-body-secondary">No games have been finished yet.</p>
                : <div className="list-group">{games.map((game) => <GameRow key={game.id} game={game}/>)}</div>}
        </>
    );
}
export default AdminHistory;
