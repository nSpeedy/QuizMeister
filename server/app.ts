import express, { type Express } from 'express';
import cookieParser from 'cookie-parser';
import { Server } from 'socket.io';
import router from "./routes/index.ts";
import {registerSocketHandlers} from "./ws/index.ts";
import * as usersRepo from './repo/users.ts';
const app: Express = express();
const port = process.env.PORT || 8080;
app.use(express.json());
app.use(cookieParser());
app.use('/api/v1', router);
usersRepo.deleteExpiredSessions();
const server = app.listen(port, (error) => {
    if (error) throw error;
    console.log(`QuizMeister server listening on port ${port}`);
});
const io = new Server(server);
registerSocketHandlers(io);
