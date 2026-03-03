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

dotenv.config();

const app = express();
const httpServer = createServer(app);
const PORT = process.env.PORT || 6969;

// Middleware
app.use(cors());
app.use(express.json());
// Twilio webhooks send application/x-www-form-urlencoded by default
app.use(express.urlencoded({ extended: false }));
app.use(requestIp.mw());

connectDB();

const io = initializeSocket(httpServer);

app.set('io', io);

app.get("/", async (req, res) => {
  res.send(RootAPIResponse);
});

app.get("/health", (req, res) => {
  res.status(200).json({ status: "ok" })
})


app.use('/api/v1/user', userRouter);
app.use('/api/v1/interaction', interactionRouter);
app.use('/api/v1/aws', awsRouter);
app.use('/api/v1/messages', messageRouter);
app.use('/api/v1/stories', storyRouter);
app.use('/api/v1/subscriptions', subscriptionRouter);
app.use('/api/v1/admin', adminRouter);
app.use('/api/v1/support', supportRouter);
app.use('/api/v1/announcements', announcementRouter);
app.use('/api/v1/blog', blogRoutes);

httpServer.listen(PORT as number, "0.0.0.0", () => {
  console.info(`Socket.io & Server running on port ${PORT}`);
});
