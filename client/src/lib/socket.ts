import { useEffect, useState } from 'react';
import { io, type Socket } from 'socket.io-client';

export function useSocket(): Socket {
    const [socket] = useState(() => io({ autoConnect: false }));
    useEffect(() => {
        socket.connect();
        return () => { socket.disconnect(); };
    }, [socket]);
    return socket;
}
