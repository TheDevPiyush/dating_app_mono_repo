// subscriptionRoutes.ts
import express, { Router, Request, Response, NextFunction } from "express";
import { verifyUser } from "../middleware/userMiddlewares";
import {
    createOrder,
    getCurrentSubscription,
    getPayments,
    getPlans,
    verifyOrder,
    razorpayWebhook,
} from "../controllers/subscriptionController";

const subscriptionRouter = Router();

subscriptionRouter.post(
    "/webhook",
    express.raw({ type: "*/*" }),
    razorpayWebhook
);

subscriptionRouter.use(express.json());
subscriptionRouter.use(verifyUser);

subscriptionRouter.get("/plans", getPlans);
subscriptionRouter.get("/current", getCurrentSubscription);
subscriptionRouter.get("/payments", getPayments);
subscriptionRouter.post("/create-order", createOrder);
subscriptionRouter.post("/verify", verifyOrder);

export default subscriptionRouter;