type Entry = { id: string; name: string; score: number; rank: number };

export default function Leaderboard({ entries, limit, highlightId }: { entries: Entry[]; limit?: number; highlightId?: string }) {
    const shown = limit ? entries.slice(0, limit) : entries;
    return (
        <ol className="leaderboard list-unstyled mb-0">
            {shown.map((entry) => (
                <li key={entry.id} className={`leaderboard-row${entry.id === highlightId ? ' leaderboard-me' : ''}`}>
                    <span className="leaderboard-rank">{entry.rank}</span>
                    <span className="leaderboard-name">{entry.name}</span>
                    <span className="leaderboard-score">{entry.score}</span>
                </li>
            ))}
        </ol>
    );
}
