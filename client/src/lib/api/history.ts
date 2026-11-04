import apiRequest from '@/lib/api';
import type { GameResultDetail, GameResultSummary } from '@/models/Game';

const BASE = '/api/v1/history';

export function listHistory() {
    return apiRequest<GameResultSummary[]>(BASE);
}

export function getHistoryEntry(id: number) {
    return apiRequest<GameResultDetail>(`${BASE}/${id}`);
}

export function deleteHistoryEntry(id: number) {
    return apiRequest<void>(`${BASE}/${id}`, { method: 'DELETE' });
}
