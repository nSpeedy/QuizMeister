import type { Player } from "./player.ts";

export interface Lobby {
    code: string;
    quizId: number;
    hostUserId: number;
    hostSocketId: string;
    phase: 'waiting' | 'playing' | 'finished';
    players: Player[];
}
