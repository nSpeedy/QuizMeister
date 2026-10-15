import type { Server } from 'socket.io';

export function registerSocketHandlers(io: Server) {
    io.on('connection', (socket) => {
        console.log('User connected', socket.id);
    });
}