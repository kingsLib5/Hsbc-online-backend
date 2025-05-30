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

// Generate a 6-digit verification code
function generateCode() {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

// Schedule auto-approval after 20 seconds
function scheduleAutoApproval(transferId) {
  setTimeout(async () => {
    try {
      const updated = await Transfer.findByIdAndUpdate(
        transferId,
        {
          status: 'Approved',
          isVerified: true,
          approvedAt: new Date(),
          verificationCode: ''
        },
        { new: true }
      );
      console.log(`[scheduleAutoApproval] Transfer ${transferId} auto-approved: status=${updated.status}`);
    } catch (err) {
      console.error(`[scheduleAutoApproval] Error auto-approving transfer ${transferId}:`, err);
    }
  }, 20000);
}

// LOCAL TRANSFER WITH EMAIL VERIFICATION
exports.localTransfer = async (req, res) => {
  const senderEmail = req.user.email;
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
    recipientEmail,
  } = req.body;

  try {
    const user = await User.findOne({ email: senderEmail });
    if (!user) return res.status(404).json({ message: 'User not found.' });

    const account = user.accounts.find(acc => acc.type.toLowerCase().includes('savings'));
    if (!account) return res.status(400).json({ message: 'No Savings account found.' });
    if (account.balance < amount) return res.status(400).json({ message: 'Insufficient balance.' });

    const code = generateCode();

    const transfer = await Transfer.create({
      senderEmail,
      recipientEmail,
      recipientName,
      recipientAccount,
      recipientBank,
      recipientRouting,
      amount,
      currency: 'USD',
      transferType,
      transferDate,
      reference,
      verificationCode: code,
      isVerified: false,
      status: 'PendingVerification',
    });
    console.log('[localTransfer] Transfer created with id:', transfer._id);

    // Debug: read back from DB to confirm initial status
    const fresh = await Transfer.findById(transfer._id);
    console.log(`[localTransfer] DB status after creation: ${fresh.status}`);

    await transporter.sendMail({
      from: process.env.EMAIL_USER,
      to: recipientEmail,
      subject: 'Your Transfer Verification Code',
      text: `Your verification code is: ${code}`,
    });
    console.log(`[localTransfer] Code emailed to ${recipientEmail}`);

    // Debug: log timestamps
    console.log(`[${new Date().toISOString()}] Scheduling auto-approval for transfer ${transfer._id}`);
    console.log(`CreatedAt: ${transfer.createdAt.toISOString()}, Now: ${new Date().toISOString()}, Difference (ms): ${new Date() - transfer.createdAt}`);
    // Schedule auto approval only once
    scheduleAutoApproval(transfer._id);

    // Respond including initial DB status
    return res.status(201).json({
      message: 'Verification code sent',
      transferId: transfer._id,
      status: fresh.status,
      isVerified: fresh.isVerified
    });
  } catch (error) {
    console.error('[localTransfer] Error:', error);
    return res.status(500).json({ message: 'Server error', details: error.message });
  }
};

// INTERNATIONAL TRANSFER WITH EMAIL VERIFICATION
exports.internationalTransfer = async (req, res) => {
  const senderEmail = req.user.email;
  const {
    recipientName,
    recipientAccount,
    recipientBank,
    bankAddress,
    branchCode,
    recipientSwift,
    recipientIban,
    recipientCountry,
    amount,
    currency,
    transferType,
    transferDate,
    reference,
    securityPin,
    recipientEmail,
  } = req.body;

  try {
    const user = await User.findOne({ email: senderEmail });
    if (!user) return res.status(404).json({ message: 'User not found.' });

    const account = user.accounts.find(acc => acc.type.toLowerCase().includes('savings'));
    if (!account) return res.status(400).json({ message: 'No Savings account found.' });
    if (account.balance < amount) return res.status(400).json({ message: 'Insufficient balance.' });

    const code = generateCode();

    const transfer = await Transfer.create({
      senderEmail,
      recipientEmail,
      recipientName,
      recipientAccount,
      recipientBank,
      bankAddress,
      branchCode,
      recipientSwift,
      recipientIban,
      recipientCountry,
      amount,
      currency,
      transferType,
      transferDate,
      reference,
      verificationCode: code,
      isVerified: false,
      status: 'PendingVerification',
    });
    console.log('[internationalTransfer] Transfer created with id:', transfer._id);

    // Debug: read back from DB to confirm initial status
    const fresh = await Transfer.findById(transfer._id);
    console.log(`[internationalTransfer] DB status after creation: ${fresh.status}`);

    await transporter.sendMail({
      from: process.env.EMAIL_USER,
      to: recipientEmail,
      subject: 'Your International Transfer Verification Code',
      text: `Your verification code is: ${code}`,
    });
    console.log(`[internationalTransfer] Code emailed to ${recipientEmail}`);

    // Schedule auto approval
    scheduleAutoApproval(transfer._id);

    // Respond including initial DB status
    return res.status(201).json({
      message: 'Verification code sent',
      transferId: transfer._id,
      status: fresh.status,
      isVerified: fresh.isVerified
    });
  } catch (error) {
    console.error('[internationalTransfer] Error:', error);
    return res.status(500).json({ message: 'Server error', details: error.message });
  }
};

// VERIFY TRANSFER ENDPOINT
exports.verifyTransfer = async (req, res) => {
  const { transferId, code } = req.body;
  try {
    const transfer = await Transfer.findById(transferId);
    if (!transfer) return res.status(404).json({ message: 'Transfer not found.' });
    if (transfer.verificationCode !== code) return res.status(401).json({ message: 'Invalid verification code.' });

    transfer.status = 'Approved';
    transfer.isVerified = true;
    transfer.verificationCode = '';
    transfer.approvedAt = new Date();
    await transfer.save();

    return res.json({ message: 'Transfer approved', transfer });
  } catch (err) {
    console.error('[verifyTransfer] Error:', err);
    return res.status(500).json({ message: 'Server error' });
  }
};

// GET ALL TRANSFERS
exports.getAllTransfers = async (req, res) => {
  try {
    const transfers = await Transfer.find().sort({ createdAt: -1 });
    return res.json(transfers);
  } catch (error) {
    console.error('[getAllTransfers] Error:', error);
    return res.status(500).json({ message: 'Server error' });
  }
};
