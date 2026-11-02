export function safeNext(next: string | null, fallback = '/'): string {
    return next && next.startsWith('/') && !next.startsWith('//') ? next : fallback;
}
