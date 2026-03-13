import { Router } from "express";
import { verifyUser } from "../middleware/userMiddlewares";
import { listEmployees, getEmployee } from "../controllers/exploreController";

const exploreRouter = Router();

exploreRouter.use(verifyUser);

exploreRouter.get("/employees", listEmployees);
exploreRouter.get("/employees/:employeeId", getEmployee);

export default exploreRouter;
