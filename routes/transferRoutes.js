const express = require('express');
const router = express.Router();
const transferController = require('../controllers/transferController');
const authMiddleware = require('../middleware/authMiddleware');

// Debugging middleware for all transfer routes
router.use((req, res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.originalUrl}`);
  console.log('Headers:', req.headers);
  console.log('Body:', req.body);
  next();
});

// Local transfer (protected)
router.post('/local', authMiddleware, transferController.localTransfer);

// International transfer (protected)
router.post('/international', authMiddleware, transferController.internationalTransfer);

// General transfer creation (protected)
// router.post('/create', authMiddleware, transferController.createTransfer);

// Transfer verification (NOT protected)
router.post('/verify', transferController.verifyTransfer);

module.exports = router;