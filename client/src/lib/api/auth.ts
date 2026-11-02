import apiRequest, { ApiError } from '@/lib/api';
import { redirect } from 'react-router';

export type User = { id: number; username: string };

let userPromise: Promise<User | null> | null = null;

export function getUser(): Promise<User | null> {
    userPromise ??= apiRequest<User>('/api/v1/auth/me').catch((e) => {
        if (e instanceof ApiError && e.status === 401) return null;
        userPromise = null;
        throw e;
    });
    return userPromise;
}

export function resetUser() { userPromise = null; }
export async function requireUser(request: Request): Promise<User> {
    const user = await getUser();
    if (!user) {
        const next = new URL(request.url).pathname;
        throw redirect(`/login?next=${encodeURIComponent(next)}`);
    }
    return user;
}

export async function login(username: string, password: string): Promise<User> {
    const user = await apiRequest<User>('/api/v1/auth/login', {
        method: 'POST',
        body: JSON.stringify({ username, password }),
    });
    userPromise = Promise.resolve(user);
    return user;
}

export async function register(username: string, password: string): Promise<User> {
    const user = await apiRequest<User>('/api/v1/auth/register', {
        method: 'POST',
        body: JSON.stringify({ username, password }),
    });
    userPromise = Promise.resolve(user);
    return user;
}

export async function logout() {
    await apiRequest('/api/v1/auth/logout', { method: 'POST' });
    resetUser();
}
