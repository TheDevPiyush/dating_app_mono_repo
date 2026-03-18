// subscriptionRoutes.ts
import express, { Router, Request, Response, NextFunction } from "express";
import { verifyUser } from "../middleware/userMiddlewares";
import {
    createOrder,
    getCurrentSubscription,
    getPayments,
    getPlans,
    verifyOrder,
    subscriptionWebhook,
    createSubscriptionOrder,
    verifySubscriptionOrder,
    cancelSubscription,
} from "../controllers/subscriptionController";

const subscriptionRouter = Router();

subscriptionRouter.post(
    "/subscription-webhook",
    express.raw({ type: "*/*" }),
    subscriptionWebhook
);

subscriptionRouter.use(express.json());
subscriptionRouter.use(verifyUser);

subscriptionRouter.get("/plans", getPlans);
subscriptionRouter.get("/current", getCurrentSubscription);
subscriptionRouter.get("/payments", getPayments);

// One-time order flow (web backward compat)
subscriptionRouter.post("/create-order", createOrder);
subscriptionRouter.post("/verify", verifyOrder);

// E-mandate subscription flow (native app)
subscriptionRouter.post("/create-subscription", createSubscriptionOrder);
subscriptionRouter.post("/verify-subscription", verifySubscriptionOrder);
subscriptionRouter.post("/cancel", cancelSubscription);

export default subscriptionRouter;