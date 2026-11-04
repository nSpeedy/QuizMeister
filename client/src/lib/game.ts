export const ANSWER_STYLES = [
    { color: 'red', symbol: '▲', name: 'Triangle' },
    { color: 'blue', symbol: '◆', name: 'Diamond' },
    { color: 'yellow', symbol: '●', name: 'Circle' },
    { color: 'green', symbol: '■', name: 'Square' },
] as const;

const ERRORS: Record<string, string> = {
    not_found: 'Game not found. Check the PIN.',
    wrong_phase: 'This game has already started.',
    invalid_name: 'Nickname must be 1-20 characters.',
    name_taken: 'This nickname is already taken.',
    game_full: 'This game is full.',
    too_many_attempts: 'Too many attempts. Wait a minute and try again.',
    already_in_game: 'You are already in a game.',
    already_hosting: 'You are already hosting another game. Finish it first.',
    no_questions: 'This quiz has no questions yet.',
    no_players: 'Wait for at least one player to join.',
    unauthorized: 'Log in to host a game.',
    too_late: "Time's up!",
    already_answered: 'You have already answered.',
};

export function gameError(code: string): string {
    return ERRORS[code] ?? 'Something went wrong. Try again.';
}

export function formatDuration(ms: number): string {
    const totalSeconds = Math.round(ms / 1000);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return minutes ? `${minutes} min ${seconds} s` : `${seconds} s`;
}
