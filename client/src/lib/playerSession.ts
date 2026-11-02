export interface PlayerSession {
    code: string;
    token: string;
    playerId: string;
    name: string;
}

const KEY = 'quizmeister:player';

export function loadSession(): PlayerSession | null {
    try {
        const raw = sessionStorage.getItem(KEY);
        return raw ? JSON.parse(raw) : null;
    } catch {
        return null;
    }
}

export function saveSession(session: PlayerSession) {
    try {
        sessionStorage.setItem(KEY, JSON.stringify(session));
    } catch {
        return;
    }
}

export function clearSession() {
    try {
        sessionStorage.removeItem(KEY);
    } catch {
        return;
    }
}
