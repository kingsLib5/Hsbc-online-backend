const mongoose = require('mongoose');

const transferSchema = new mongoose.Schema(
  {
    senderAccount: { type: String, required: false }, // Account number of the sender
    recipientName: { type: String, required: true },
    recipientAccount: { type: String, required: true },
    recipientBank: { type: String, required: true },
    bankAddress: { type: String }, // <-- Added bank address
    branchCode: { type: String }, // <-- Added branch code (optional)
    recipientRouting: { type: String }, // Optional for international transfers
    recipientSwift: { type: String }, // SWIFT/BIC code for international transfers
    recipientIban: { type: String }, // IBAN for international transfers
    recipientCountry: { type: String }, // Country for international transfers
    amount: { type: Number, required: true },
    currency: { type: String, default: 'USD' }, // Currency for international transfers
    transferType: { type: String, enum: ['Personal', 'Business'], default: 'Personal' },
    transferDate: { type: Date, required: true },
    reference: { type: String },
    status: { type: String, enum: ['Pending', 'Approved', 'PendingVerification'], default: 'Pending' },
    email: { type: String },
    verificationCode: { type: String },
    isVerified: { type: Boolean, default: false },
    approvedAt: { type: Date },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Transfer', transferSchema);