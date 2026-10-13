import express, { type Express, type Request, type Response } from 'express';
import { Server } from 'socket.io';
const app: Express = express();
const port = process.env.PORT || 8080;
app.get('/api/v1/health', (req: Request, res: Response) => {
    res.send('Backend is running');
});

const server = app.listen(port, (error) => {
    if (error) throw error;
    console.log(`Example app listening on port ${port}`);
});
const io = new Server(server);
io.on('connection', (socket) => {
    console.log('User connected', socket.id);
});
