const User = require('../models/User');

async function autoSeedUser() {
  const seedEmail = process.env.SEED_USER_EMAIL;
  const seedPassword = process.env.SEED_USER_PASSWORD;

  if (!seedEmail || !seedPassword) {
    console.warn('Seed user email or password not set in .env');
    return;
  }

  const existing = await User.findOne({ email: seedEmail });
  if (!existing) {
    await User.create({
      username: seedEmail.split('@')[0],
      email: seedEmail,
      password: seedPassword, // In production, hash this!
      isVerified: false,
      verificationCode: '',
      accounts: [
        {
          type: 'Savings Account',
          number: '1002003001',
          balance: 12000000,
        },
      ],
      role: 'user',
      status: 'active',
    });
    console.log('Default user seeded:', seedEmail);
  } else {
    console.log('Default user already exists:', seedEmail);
  }
}

module.exports = autoSeedUser;