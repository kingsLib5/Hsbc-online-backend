const mongoose = require('mongoose');

const transferSchema = new mongoose.Schema(
  {
    senderAccount: { type: String, required: false },
    senderEmail: { type: String, required: true },
    recipientEmail: { type: String, required: true },
    recipientName: { type: String, required: true },
    recipientAccount: { type: String, required: true },
    recipientBank: { type: String, required: true },
    bankAddress: { type: String },
    branchCode: { type: String },
    recipientRouting: { type: String },
    recipientSwift: { type: String },
    recipientIban: { type: String },
    recipientCountry: { type: String },
    amount: { type: Number, required: true },
    currency: { type: String, default: 'USD' },
    transferType: { type: String, enum: ['Personal', 'Business'], default: 'Personal' },
    transferDate: { type: Date, required: true },
    reference: { type: String },
    status: { type: String, enum: ['PendingVerification', 'Pending', 'Approved', 'Failed'], default: 'PendingVerification' },
    verificationCode: { type: String },
    isVerified: { type: Boolean, default: false },
    approvedAt: { type: Date },
  },
  { timestamps: true }
);

// Auto-deduct savings account balance on creation of a new transfer
transferSchema.pre('save', async function(next) {
  if (this.isNew) {
    try {
      const User = require('./User');
      const user = await User.findOne({ email: this.senderEmail });
      if (user) {
        const account = user.accounts.find(acc => acc.type.toLowerCase().includes('savings'));
        if (account && account.balance >= this.amount) {
          account.balance -= this.amount;
          await user.save();
        }
      }
    } catch (err) {
      console.error('[Transfer pre-save] Error deducting balance:', err);
    }
  }
  next();
});

module.exports = mongoose.model('Transfer', transferSchema);
