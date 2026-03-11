// routes/subscriptionRouter.ts
import express, { Router } from "express";
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

// Webhook — raw body BEFORE any other middleware, no auth
subscriptionRouter.post(
    "/webhook",
    express.raw({ type: "application/json" }),
    razorpayWebhook
);

subscriptionRouter.get("/plans", verifyUser, getPlans);
subscriptionRouter.get("/current", verifyUser, getCurrentSubscription);
subscriptionRouter.get("/payments", verifyUser, getPayments);
subscriptionRouter.post("/create-order", verifyUser, createOrder);
subscriptionRouter.post("/verify", verifyUser, verifyOrder);

export default subscriptionRouter;