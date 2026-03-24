import { Router } from "express";
import { requireAuth } from "../middleware/auth.js";
import {
  login,
  signup,
  googleLogin,
  callback,
  logout,
  me,
} from "../controllers/authController.js";

const authRouter = Router();

authRouter.post("/login", login);
authRouter.post("/signup", signup);
authRouter.get("/google", googleLogin);
authRouter.get("/callback", callback);
authRouter.post("/logout", requireAuth, logout);
authRouter.get("/me", requireAuth, me);

export default authRouter;
