import express, { type Express, type NextFunction, type Request, type Response } from 'express';
import cookieParser from 'cookie-parser';
import { Server } from 'socket.io';
import router from "./routes/index.ts";
import {registerSocketHandlers} from "./ws/index.ts";
import * as usersRepo from './repo/users.ts';
const app: Express = express();
const port = process.env.PORT || 8080;
if (process.env.TRUST_PROXY === 'true') app.set('trust proxy', 1);
app.use(express.json());
app.use(cookieParser());
app.use('/api/v1', router);
app.use('/api', (_req: Request, res: Response) => {
    res.status(404).json({ error: 'Not found' });
});
app.use((err: any, _req: Request, res: Response, next: NextFunction) => {
    if (res.headersSent) return next(err);
    const clientError = Number.isInteger(err?.status) && err.status >= 400 && err.status < 500;
    if (!clientError) console.error(err);
    res.status(clientError ? err.status : 500).json({ error: clientError ? 'Invalid request' : 'Internal server error' });
});
usersRepo.deleteExpiredSessions();
setInterval(usersRepo.deleteExpiredSessions, 60 * 60 * 1000).unref();
const server = app.listen(port, (error) => {
    if (error) throw error;
    console.log(`QuizMeister server listening on port ${port}`);
});
const io = new Server(server, {
    pingInterval: 10_000,
    pingTimeout: 5_000,
    maxHttpBufferSize: 10_000,
});
registerSocketHandlers(io);
