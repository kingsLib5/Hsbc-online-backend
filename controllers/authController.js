const jwt = require('jsonwebtoken');
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

exports.login = async (req, res) => {
  try {
    const { email, password } = req.body;
    console.log('[LOGIN] Login attempt:', { email });

    const user = await User.findOne({ email, password });
    if (!user) {
      console.warn('[LOGIN] Invalid credentials for:', email);
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    // Generate and save verification code
    const code = generateCode();
    user.verificationCode = code;
    await user.save();
    console.log(`[LOGIN] Verification code generated and saved for ${email}: ${code}`);

    // Send code to user's email
    try {
      const mailInfo = await transporter.sendMail({
        from: process.env.EMAIL_USER,
        to: user.email,
        subject: 'Your HSBC Verification Code',
        text: `Your verification code is: ${code}`,
      });
      console.log(`[LOGIN] Verification code sent to ${user.email}. Mail info:`, mailInfo);
    } catch (mailErr) {
      console.error(`[LOGIN] Failed to send verification code to ${user.email}:`, mailErr);
      return res.status(500).json({ message: 'Failed to send verification code email.', error: mailErr.message });
    }

    res.json({
      message: 'Verification code sent to your email.',
      step: 'verify',
      email: user.email,
    });
  } catch (error) {
    console.error('[LOGIN] Login error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

exports.verifyCode = async (req, res) => {
  try {
    const { email, code } = req.body;
    console.log('[VERIFY] Code verification attempt:', { email, code });

    const user = await User.findOne({ email });
    if (!user) {
      console.warn('[VERIFY] No user found for:', email);
      return res.status(401).json({ message: 'Invalid verification code.' });
    }

    // Debug: Show expected and received codes and their types
    console.log('[VERIFY] Comparing codes:', {
      expected: user.verificationCode,
      received: code,
      type_expected: typeof user.verificationCode,
      type_received: typeof code,
    });

    // Always compare as trimmed strings
    if ((user.verificationCode || '').toString().trim() !== (code || '').toString().trim()) {
      console.warn('[VERIFY] Incorrect code for:', email, 'Expected:', user.verificationCode, 'Received:', code);
      return res.status(401).json({ message: 'Invalid verification code.' });
    }

    // Clear the code after successful verification
    user.verificationCode = '';
    await user.save();
    console.log(`[VERIFY] Verification code cleared for ${email}`);

    // Generate JWT
    let token;
    try {
      token = jwt.sign(
        { userId: user._id, email: user.email },
        process.env.JWT_SECRET,
        { expiresIn: '1h' }
      );
      console.log(`[VERIFY] JWT generated for ${email}:`, token);
    } catch (jwtErr) {
      console.error('[VERIFY] JWT generation error:', jwtErr);
      return res.status(500).json({ message: 'Failed to generate token.', error: jwtErr.message });
    }

    res.json({
      message: 'Login successful',
      user: { email: user.email },
      token,
    });
  } catch (error) {
    console.error('[VERIFY] Verification error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};