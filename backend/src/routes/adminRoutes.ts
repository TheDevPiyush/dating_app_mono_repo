import { Router } from "express";
import { verifyAdmin } from "../middleware/adminMiddlewares";
import * as adminControllers from "../controllers/adminControllers";

const router = Router();

// All admin routes require admin authentication
router.use(verifyAdmin);

// Dashboard
router.get("/dashboard", adminControllers.getDashboardStats);

// User Analytics
router.get("/analytics/users", adminControllers.getUserAnalytics);
router.get("/users", adminControllers.getUsersList);
router.get("/users/location", adminControllers.getUsersByLocation);

// Interactions
router.get("/analytics/interactions", adminControllers.getInteractionStats);
router.get("/users/:userId", adminControllers.getUserDetails);
router.get("/users/:userId/interactions", adminControllers.getUserInteractions);

// Premium & Revenue
router.get("/premium/stats", adminControllers.getPremiumStats);

// Reports & Moderation
router.get("/reports", adminControllers.getReports);
router.patch("/users/:userId/status", adminControllers.updateUserStatus);
router.patch("/users/:userId/moderate", adminControllers.moderateUser);

// Support Messages
router.get("/support", adminControllers.getSupportMessages);
router.patch("/support/:supportId", adminControllers.updateSupportStatus);

// Women employees (@pookiey.com + female)
router.get("/women-employees", adminControllers.getWomenEmployees);
router.get("/women-employees/:userId/analytics", adminControllers.getWomenEmployeeAnalytics);

export default router;
