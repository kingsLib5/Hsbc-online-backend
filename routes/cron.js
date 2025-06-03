// routes/cron.js
const express = require("express");
const router = express.Router();
const Transfer = require("../models/Transfer");

// External cron-safe GET route
router.get("/auto-approve", async (req, res) => {
  try {
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);

    const pendingTransfers = await Transfer.find({
      isVerified: true,
      status: "Pending",
      updatedAt: { $lte: oneHourAgo },
    });

    for (const transfer of pendingTransfers) {
      transfer.status = "Approved";
      transfer.approvedAt = Date.now();
      await transfer.save();
      console.log(`[cron/auto-approve] Auto-approved transfer ${transfer._id}`);
    }

    res.send("Checked and approved pending transfers.");
  } catch (err) {
    console.error("[cron/auto-approve] Error:", err);
    res.status(500).send("Error while auto-approving.");
  }
});

module.exports = router;
