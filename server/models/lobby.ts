import type { Player } from "./player.ts";

export interface Lobby {
    id: number;
    players: Player[];
}
