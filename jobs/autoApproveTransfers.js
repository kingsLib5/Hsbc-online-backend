// jobs/autoApproveTransfers.js

const cron = require("node-cron");
const Transfer = require("../models/Transfer");

// Runs every minute
const autoApproveTransfers = () => {
  cron.schedule("* * * * *", async () => {
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
        console.log(`[autoApproveTransfers] Transfer ${transfer._id} auto-approved.`);
      }
    } catch (err) {
      console.error("[autoApproveTransfers] Error while auto-approving:", err);
    }
  });
};

module.exports = autoApproveTransfers;
