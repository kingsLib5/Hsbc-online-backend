const User = require('../models/User');

// Get user accounts
exports.getUserAccounts = async (req, res) => {
  try {
    console.log('[getUserAccounts] req.user:', req.user);

    // Check authentication
    if (!req.user || !req.user.userId) {
      console.warn('[getUserAccounts] Unauthorized access attempt. req.user:', req.user);
      return res.status(401).json({ message: "Unauthorized", debug: req.user });
    }

    // Optional: Log all users (for debugging, remove in production)
    const allUsers = await User.find({});
    console.log('[getUserAccounts] All users in DB:', allUsers.map(u => ({ id: u._id, email: u.email })));

    // Find the user by ID
    const user = await User.findById(req.user.userId);
    if (!user) {
      console.warn('[getUserAccounts] User not found for userId:', req.user.userId);
      return res.status(404).json({ message: "User not found.", userId: req.user.userId });
    }

    console.log('[getUserAccounts] Found user:', user.username, 'Accounts:', user.accounts);

    // Return user accounts
    res.json({
      username: user.username, // Use actual username
      accounts: user.accounts
    });
  } catch (error) {
    console.error('[getUserAccounts] Server error:', error);
    res.status(500).json({ message: 'Server error', error: error.message, stack: error.stack });
  }
};