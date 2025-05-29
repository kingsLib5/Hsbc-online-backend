const Transfer = require('../models/Transfer');
const User = require('../models/User');
const nodemailer = require('nodemailer');

const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

function generateCode() {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

// LOCAL TRANSFER WITH EMAIL VERIFICATION
exports.localTransfer = async (req, res) => {
  const {
    recipientName,
    recipientAccount,
    recipientBank,
    recipientRouting,
    amount,
    transferType,
    transferDate,
    reference,
    securityPin,
    email // must be provided by frontend
  } = req.body;

  try {
    const code = generateCode();
    const transfer = new Transfer({
  recipientName,
  recipientAccount,
  recipientBank,
  recipientRouting,
  amount,
  transferType,
  transferDate,
  reference,
  securityPin,
  email,
  verificationCode: code,
  isVerified: false,
  status: 'PendingVerification', // <-- Set to PendingVerification
});
await transfer.save();

    // Send code to user's email
    await transporter.sendMail({
      from: process.env.EMAIL_USER,
      to: email,
      subject: 'Your Transfer Verification Code',
      text: `Your transfer verification code is: ${code}`,
    });

    res.status(201).json({
      message: 'Verification code sent to your email. Please verify to approve transfer.',
      transferId: transfer._id,
    });
  } catch (error) {
    console.error('Error processing local transfer:', error);
    res.status(500).json({ message: 'Server error. Please try again later.', details: error.message });
  }
};

// INTERNATIONAL TRANSFER WITH EMAIL VERIFICATION
exports.internationalTransfer = async (req, res) => {
  const {
    recipientName,
    recipientAccount,
    recipientBank,
    recipientSwift,
    recipientIban,
    recipientCountry,
    amount,
    currency,
    transferType,
    transferDate,
    reference,
    securityPin,
    email // must be provided by frontend
  } = req.body;

  try {
    const code = generateCode();
    const transfer = new Transfer({
  recipientName,
  recipientAccount,
  recipientBank,
  recipientRouting,
  amount,
  transferType,
  transferDate,
  reference,
  securityPin,
  email,
  verificationCode: code,
  isVerified: false,
  status: 'PendingVerification', // <-- Set to PendingVerification
});
await transfer.save();

    // Send code to user's email
    await transporter.sendMail({
      from: process.env.EMAIL_USER,
      to: email,
      subject: 'Your International Transfer Verification Code',
      text: `Your international transfer verification code is: ${code}`,
    });

    res.status(201).json({
      message: 'Verification code sent to your email. Please verify to approve transfer.',
      transferId: transfer._id,
    });
  } catch (error) {
    console.error('Error processing international transfer:', error);
    res.status(500).json({ message: 'Server error. Please try again later.', details: error.message });
  }
};

// VERIFY TRANSFER ENDPOINT
exports.verifyTransfer = async (req, res) => {
  const { transferId, code } = req.body;
  try {
    const transfer = await Transfer.findById(transferId);
    if (!transfer) {
      return res.status(404).json({ message: 'Transfer not found.' });
    }
    if (transfer.verificationCode !== code) {
      return res.status(401).json({ message: 'Invalid verification code.' });
    }
    transfer.status = 'Pending';
    transfer.isVerified = true;
    transfer.verificationCode = '';
    transfer.approvedAt = new Date();
    await transfer.save();
    res.json({ message: 'Transfer pending!', transfer });
  } catch (error) {
    console.error('Error verifying transfer:', error);
    res.status(500).json({ message: 'Server error. Please try again later.', details: error.message });
  }
};

// GET ALL TRANSFERS
// GET ALL TRANSFERS
// GET ALL TRANSFERS
exports.getAllTransfers = async (req, res) => {
  try {
    // Debug: Log request method, url, headers, and body
    console.log(`[${new Date().toISOString()}] ${req.method} ${req.originalUrl}`);
    console.log("Headers:", req.headers);
    console.log("Body:", req.body);

    // Debug: Log that we're fetching all transfers
    console.log("DEBUG: Fetching ALL transfers (no user filter)");

    const transfers = await Transfer.find().sort({ createdAt: -1 });

    // Debug: Log the number of transfers found
    console.log(`DEBUG: Found ${transfers.length} total transfers`);

    res.json(transfers);
  } catch (error) {
    console.error('Error fetching transfers:', error);
    res.status(500).json({ 
      message: 'Server error. Please try again later.', 
      details: error.message,
      stack: error.stack // Add stack trace for debugging
    });
  }
};