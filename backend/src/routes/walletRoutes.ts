import { Router } from "express";
import { verifyUser } from "../middleware/userMiddlewares";
import {
    getBalance,
    getTransactions,
    getPacks,
    createOrder,
    verifyOrder,
} from "../controllers/walletController";

const walletRouter = Router();

walletRouter.use(verifyUser);

walletRouter.get("/balance", getBalance);
walletRouter.get("/transactions", getTransactions);
walletRouter.get("/packs", getPacks);
walletRouter.post("/create-order", createOrder);
walletRouter.post("/verify", verifyOrder);

export default walletRouter;
