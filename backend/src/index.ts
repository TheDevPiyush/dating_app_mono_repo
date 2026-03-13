// app.ts
import express from "express";
import dotenv from "dotenv";
import { createServer } from "http";
import connectDB from "./config/mongoDB";
import userRouter from "./routes/userRoutes";
import { RootAPIResponse } from "./utils/rootAPIResponse";
import interactionRouter from "./routes/interactionRoutes";
import awsRouter from "./routes/awsRoutes";
import messageRouter from "./routes/messageRoutes";
import storyRouter from "./routes/storyRoutes";
import requestIp from "request-ip";
import { initializeSocket } from "./socket/socketHandler";
import cors from "cors";
import subscriptionRouter from "./routes/subscriptionRoutes";
import adminRouter from "./routes/adminRoutes";
import supportRouter from "./routes/supportRoutes";
import announcementRouter from "./routes/announcementRoutes";
import blogRoutes from "./routes/blog.routes";
import walletRouter from "./routes/walletRoutes";
import exploreRouter from "./routes/exploreRoutes";
import { seedDefaultMinutePacks } from "./models/MinutePack";

dotenv.config();

const app = express();
const httpServer = createServer(app);
const PORT = process.env.PORT || 6969;

app.use(cors());
app.use(requestIp.mw());

app.use('/api/v1/subscriptions', subscriptionRouter);

app.use(express.json());
app.use(express.urlencoded({ extended: false }));

connectDB();

const io = initializeSocket(httpServer);
app.set('io', io);

app.get("/", async (req, res) => {
    res.send(RootAPIResponse);
});

app.get("/health", (req, res) => {
    res.status(200).json({ status: "ok" });
});

app.use('/api/v1/wallet', walletRouter);
app.use('/api/v1/user', userRouter);
app.use('/api/v1/interaction', interactionRouter);
app.use('/api/v1/aws', awsRouter);
app.use('/api/v1/messages', messageRouter);
app.use('/api/v1/stories', storyRouter);
app.use('/api/v1/admin', adminRouter);
app.use('/api/v1/support', supportRouter);
app.use('/api/v1/announcements', announcementRouter);
app.use('/api/v1/blog', blogRoutes);
app.use('/api/v1/explore', exploreRouter);

httpServer.listen(PORT as number, "0.0.0.0", async () => {
    console.info(`Socket.io & Server running on port ${PORT}`);
    await seedDefaultMinutePacks().catch(console.error);
});