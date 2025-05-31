// middleware/authMiddleware.js

const jwt = require("jsonwebtoken");
const asyncHandler = require("express-async-handler");
const User = require("../models/User");

const protect = asyncHandler(async (req, res, next) => {
  let token;

  // 1) Log whatever arrived in the Authorization header
  console.log(">>> [authMiddleware] req.headers.authorization =", req.headers.authorization);

  if (
    req.headers.authorization &&
    req.headers.authorization.startsWith("Bearer")
  ) {
    try {
      // 2) Extract the token portion & log its length/content (trimmed)
      token = req.headers.authorization.split(" ")[1];
      console.log(">>> [authMiddleware] extracted token (length=" + (token ? token.length : 0) + "):", token);

      // 3) Print out which secret we are about to use
      console.log(">>> [authMiddleware] verifying with secret:", process.env.JWT_SECRET);

      // 4) Attempt to verify
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      console.log(">>> [authMiddleware] jwt.verify() succeeded, decoded payload =", decoded);

      // 5) Populate req.user exactly as you expect
      //    (decoded.userId & decoded.email must match how you signed it in authController)
      req.user = {
        userId: decoded.userId,
        email: decoded.email,
      };
      console.log(">>> [authMiddleware] req.user set to:", req.user);

      return next();
    } catch (error) {
      // 6) If verify throws, log the full error (including message and stack)
      console.error(">>> [authMiddleware] jwt.verify error:", error);
      console.error(">>> [authMiddleware] error.message:", error.message);

      res.status(401);
      throw new Error("Not authorized, token failed");
    }
  }

  // 7) If no token was found or did not start with "Bearer"
  if (!token) {
    console.warn(">>> [authMiddleware] No token found or header did not start with 'Bearer'");
    res.status(401);
    throw new Error("Not authorized, no token");
  }
});

module.exports = { protect };
