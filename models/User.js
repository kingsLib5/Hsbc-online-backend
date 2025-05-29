const mongoose = require('mongoose');

const accountSchema = new mongoose.Schema({
  type: { type: String, required: true }, // e.g., "Checking Account", "Savings Account"
  number: { type: String, required: true, unique: true }, // Account number
  balance: { type: Number, default: 0 }, // Account balance
});

const userSchema = new mongoose.Schema(
  {
    username: { type: String, required: true, unique: true },
    email: {
      type: String,
      required: true,
      unique: true,
      match: /^[^\s@]+@[^\s@]+\.[^\s@]+$/, // Email validation
    },
    password: { type: String, required: true },
    phone: {
      type: String,
      match: /^[0-9]{10,15}$/, // Example: Only allow 10-15 digits
      required: false, // Set to `true` if the phone number is mandatory
    },
    accountNumber: { type: String, unique: true },
    role: { type: String, enum: ['user', 'admin'], default: 'user' },
    accounts: [accountSchema], // Array of accounts
    profileImage: { type: String, default: 'https://via.placeholder.com/150' }, // Profile picture URL
    idDocument: { type: String, default: null }, // URL or path to the uploaded ID document
    status: {
      type: String,
      enum: ['active', 'inactive', 'suspended'],
      default: 'active',
    },
    lastLogin: { type: Date },
    resetPasswordToken: { type: String },
    resetPasswordExpires: { type: Date },
      verificationCode: { type: String },
  },
  { timestamps: true }
);

module.exports = mongoose.model('User', userSchema);