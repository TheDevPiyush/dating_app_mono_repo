import { Request, Response } from "express";
import { Types } from "mongoose";
import crypto from "crypto";
import {
    getWalletBalance,
    getWalletTransactions,
    getActiveMinutePacks,
    createRechargeOrder,
    getRechargeByOrderId,
    abandonPendingRecharges,
} from "../services/walletService";
import { getRazorpayPublicKey } from "../config/razorpay";

export const getBalance = async (req: Request, res: Response) => {
    try {
        const user = req.user;
        if (!user?.user_id) {
            return res.status(401).json({ success: false, message: "Unauthorized" });
        }

        const wallet = await getWalletBalance(user.user_id);
        res.json({ success: true, data: wallet });
    } catch (error) {
        res.status(500).json({ success: false, message: "Failed to fetch balance" });
    }
};

export const getTransactions = async (req: Request, res: Response) => {
    try {
        const user = req.user;
        if (!user?._id) {
            return res.status(401).json({ success: false, message: "Unauthorized" });
        }

        const transactions = await getWalletTransactions(
            new Types.ObjectId(user._id.toString())
        );
        res.json({ success: true, data: transactions });
    } catch (error) {
        res.status(500).json({ success: false, message: "Failed to fetch transactions" });
    }
};

export const getPacks = async (_req: Request, res: Response) => {
    try {
        const packs = await getActiveMinutePacks();
        res.json({ success: true, data: packs });
    } catch (error) {
        res.status(500).json({ success: false, message: "Failed to fetch packs" });
    }
};

export const createOrder = async (req: Request, res: Response) => {
    try {
        const { packId } = req.body;
        if (!packId) {
            return res.status(400).json({ success: false, message: "packId is required" });
        }

        const user = req.user;
        if (!user?._id || !user?.user_id) {
            return res.status(401).json({ success: false, message: "Unauthorized" });
        }

        await abandonPendingRecharges(new Types.ObjectId(user._id.toString()));

        const { order, pack } = await createRechargeOrder({
            userId: user.user_id,
            packId,
        });

        res.json({
            success: true,
            data: {
                order,
                pack,
                razorpayKey: getRazorpayPublicKey(),
            },
        });
    } catch (error) {
        res.status(400).json({
            success: false,
            message: error instanceof Error ? error.message : "Failed to create order",
        });
    }
};

export const verifyOrder = async (req: Request, res: Response) => {
    try {
        const {
            razorpay_order_id: razorpayOrderId,
            razorpay_payment_id: razorpayPaymentId,
            razorpay_signature: razorpaySignature,
        } = req.body;

        if (!razorpayOrderId || !razorpayPaymentId || !razorpaySignature) {
            return res.status(400).json({
                success: false,
                message: "Missing Razorpay payment details",
            });
        }

        const user = req.user;
        if (!user?._id) {
            return res.status(401).json({ success: false, message: "Unauthorized" });
        }

        const expectedSignature = crypto
            .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET!)
            .update(`${razorpayOrderId}|${razorpayPaymentId}`)
            .digest("hex");

        if (expectedSignature !== razorpaySignature) {
            return res.status(400).json({
                success: false,
                message: "Invalid payment signature",
            });
        }

        const userMongoId = new Types.ObjectId(user._id.toString());
        const payment = await getRechargeByOrderId(razorpayOrderId, userMongoId);

        if (!payment) {
            return res.status(404).json({ success: false, message: "Order not found" });
        }

        const wallet = payment.status === "captured"
            ? await getWalletBalance(user.user_id)
            : null;

        res.json({
            success: true,
            data: {
                payment,
                wallet,
            },
        });
    } catch (error) {
        res.status(400).json({
            success: false,
            message: error instanceof Error ? error.message : "Payment verification failed",
        });
    }
};

