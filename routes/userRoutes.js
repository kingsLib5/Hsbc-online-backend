const express = require('express');
const router = express.Router();
const userController = require('../controllers/userController');
const auth = require('../middleware/authMiddleware'); // Your JWT auth middleware
const authMiddleware = require('../middleware/authMiddleware');

// Secure route to get user accounts
router.get('/me', authMiddleware.protect, userController.getUserAccounts);


module.exports = router;