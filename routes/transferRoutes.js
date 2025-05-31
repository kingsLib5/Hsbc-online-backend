// routes/transferRoutes.js
const express = require("express");
const router = express.Router();
const { protect } = require("../middleware/authMiddleware");
const {
  createTransfer,
  verifyTransfer,
  getTransferById,
  updateTransferStatus,
  getAllTransfers,
} = require("../controllers/transferController");

// 1) Create a new transfer (protected)
router.post("/", protect, createTransfer);

// 2) Verify a transfer by its ID (public or protected as you prefer)
router.post("/:id/verify", verifyTransfer);

// 3) List all transfers (protected) — must come BEFORE '/:id'
router.get("/all", protect, getAllTransfers);

// 4) Get a single transfer by ID (protected)
router.get("/:id", protect, getTransferById);

// 5) Update transfer status (protected)
router.put("/:id/status", protect, updateTransferStatus);

module.exports = router;
