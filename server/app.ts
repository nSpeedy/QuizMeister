import express, { type Express, type Request, type Response } from 'express';
import { Server } from 'socket.io';
import router from "./routes/index.js";
import {registerSocketHandlers} from "./ws/index.js";
const app: Express = express();
const port = process.env.PORT || 8080;
app.use(express.json());
app.use('/api/v1', router);
const server = app.listen(port, (error) => {
    if (error) throw error;
    console.log(`QuizMeister server listening on port ${port}`);
});
const io = new Server(server);
registerSocketHandlers(io);
