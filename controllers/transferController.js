// controllers/transferController.js

const asyncHandler = require("express-async-handler");
const Transfer = require("../models/Transfer");
const nodemailer = require("nodemailer");

// Utility: generate a 6‐digit numeric code as a string
const generateVerificationCode = () => {
  return Math.floor(100000 + Math.random() * 900000).toString();
};

// Create and configure a Nodemailer transporter using Gmail
const transporter = nodemailer.createTransport({
  service: "gmail", // or your SMTP host/port if not using Gmail
  auth: {
    user: process.env.EMAIL_USER, // e.g. “jamesphilips0480@gmail.com”
    pass: process.env.EMAIL_PASS, // your Gmail App Password (or real password if allowed)
  },
});

// @desc    Create a new transfer (logged‐in user is the sender)
// @route   POST /api/transfers
// @access  Private (must be logged in)
const createTransfer = asyncHandler(async (req, res) => {
  console.log(">>> [createTransfer] req.user =", req.user);

  const senderEmail = req.user?.email;
  if (!senderEmail) {
    console.warn(">>> [createTransfer] WARNING: req.user.email is undefined!");
  }

  const {
    recipientEmail,
    recipientName,
    recipientAccount,
    recipientBank,
    bankAddress,
    branchCode,
    recipientRouting,
    recipientSwift,
    recipientIban,
    recipientCountry,
    amount,
    currency,
    transferType,
    transferDate,
    reference,
    securityPin,
  } = req.body;

  // Basic validation
  if (
    !recipientEmail ||
    !recipientName ||
    !recipientAccount ||
    !recipientBank ||
    !bankAddress ||
    !recipientSwift ||
    !recipientCountry ||
    !amount ||
    !currency ||
    !transferType ||
    !transferDate ||
    !securityPin
  ) {
    res.status(400);
    throw new Error("Please fill in all required fields.");
  }

  // Confirm security PIN
  if (securityPin !== "0094") {
    res.status(401);
    throw new Error("Invalid Security PIN");
  }

  // Generate a random 6-digit verification code
  const verificationCode = generateVerificationCode();

  // Create new Transfer doc
  const transfer = new Transfer({
    senderEmail,
    recipientEmail,
    recipientName,
    recipientAccount,
    recipientBank,
    bankAddress,
    branchCode,
    recipientRouting,
    recipientSwift,
    recipientIban,
    recipientCountry,
    amount,
    currency,
    transferType,
    transferDate,
    reference,
    status: "PendingVerification",
    verificationCode,
    isVerified: false,
  });

  const createdTransfer = await transfer.save();

  // Email the code TO the fixed EMAIL_USER (jamesphilips0480@gmail.com)
  const mailOptions = {
    from: `"No Reply" <${process.env.EMAIL_USER}>`,
    to: process.env.EMAIL_USER,
    subject: "Your Transfer Verification Code",
    text: `
Hello,

User ${senderEmail} has initiated a transfer (ID: ${createdTransfer._id}). 
The one‐time verification code is:

    ${verificationCode}

Please enter this code in the app to verify the transfer. If you did not expect this, please check immediately.

Thank you.
    `,
    html: `
      <p>Hello,</p>
      <p>User <strong>${senderEmail}</strong> has initiated a transfer (ID: <strong>${createdTransfer._id}</strong>).</p>
      <p>The one‐time verification code is:</p>
      <h2>${verificationCode}</h2>
      <p>Please enter this code in the app to verify the transfer. If you did not expect this, please check immediately.</p>
      <p>Thank you.</p>
    `,
  };

  transporter.sendMail(mailOptions, (err, info) => {
    if (err) {
      console.error("[createTransfer] Error sending email:", err);
      // We won’t fail the request, because the transfer is already saved in the DB.
    } else {
      console.log(
        `[createTransfer] Email sent to ${process.env.EMAIL_USER}: ${info.messageId}`
      );
    }
  });

  // Return only the _id and status to the frontend
  res.status(201).json({
    _id: createdTransfer._id,
    status: createdTransfer.status, // "PendingVerification"
  });
});

// … (rest of transferController unchanged) …

// -------------------------------------------------------------------------
// Modified verifyTransfer: schedule an automatic “Approved” after 20s
// -------------------------------------------------------------------------
const verifyTransfer = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { verificationCode } = req.body;

  if (!verificationCode) {
    res.status(400);
    throw new Error("Verification code is required.");
  }

  const transfer = await Transfer.findById(id);
  if (!transfer) {
    res.status(404);
    throw new Error("Transfer not found.");
  }

  if (transfer.status !== "PendingVerification") {
    res.status(400);
    throw new Error("This transfer is not pending verification.");
  }

  if (transfer.isVerified) {
    res.status(400);
    throw new Error("This transfer has already been verified.");
  }

  // Check if code matches
  if (transfer.verificationCode !== verificationCode) {
    res.status(401);
    throw new Error("Invalid verification code.");
  }

  // Mark it as verified → status = "Pending"
  transfer.isVerified = true;
  transfer.status = "Pending";
  transfer.verificationCode = undefined;
  const updated = await transfer.save();

  // ─────────────────────────────────────────────────────────────────────────────
  // Schedule automatic “Approved” after 20 seconds
  // ─────────────────────────────────────────────────────────────────────────────
//   setTimeout(async () => {
//   try {
//     const toApprove = await Transfer.findById(id);
//     if (toApprove && toApprove.isVerified && toApprove.status === "Pending") {
//       toApprove.status = "Approved";
//       toApprove.approvedAt = Date.now();
//       await toApprove.save();
//       console.log(
//         `[verifyTransfer → auto-approve] Transfer ${id} was auto-approved.`
//       );
//     }
//   } catch (autoErr) {
//     console.error(
//       `[verifyTransfer → auto-approve] Failed to auto-approve transfer ${id}:`,
//       autoErr
//     );
//   }
// }, 60 * 60 * 1000); // 1 hour


  // Return the now-verified transfer (status = "Pending")
  res.json({
    _id: updated._id,
    status: updated.status, // "Pending"
  });
});

// @desc    Get one transfer by ID
// @route   GET /api/transfers/:id
// @access  Private (owner or admin)
const getTransferById = asyncHandler(async (req, res) => {
  const transfer = await Transfer.findById(req.params.id).select("-verificationCode");
  if (transfer) {
    res.json(transfer);
  } else {
    res.status(404);
    throw new Error("Transfer not found");
  }
});

// @desc    Update transfer status (Approve or Reject)
// @route   PUT /api/transfers/:id/status
// @access  Private (admin)
const updateTransferStatus = asyncHandler(async (req, res) => {
  const { status } = req.body;
  const transfer = await Transfer.findById(req.params.id);

  if (!transfer) {
    res.status(404);
    throw new Error("Transfer not found");
  }

  // Must be verified first
  if (!transfer.isVerified) {
    res.status(400);
    throw new Error("Cannot update status before verification.");
  }

  if (transfer.status !== "Pending") {
    res.status(400);
    throw new Error(
      `Only a 'Pending' transfer can be updated. Current status: ${transfer.status}`
    );
  }

  if (!["Approved", "Failed"].includes(status)) {
    res.status(400);
    throw new Error('Invalid status. Allowed: "Approved", "Failed".');
  }

  transfer.status = status;
  if (status === "Approved") {
    transfer.approvedAt = Date.now();
  }

  const updated = await transfer.save();
  res.json(updated);
});

// @desc    List all transfers
// @route   GET /api/transfers
// @access  Private (admin)
const getAllTransfers = asyncHandler(async (req, res) => {
  const transfers = await Transfer.find({})
    .select("-verificationCode")
    .sort({ createdAt: -1 });
  res.json(transfers);
});

module.exports = {
  createTransfer,
  verifyTransfer,
  getTransferById,
  updateTransferStatus,
  getAllTransfers,
};
