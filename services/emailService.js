const nodemailer = require('nodemailer');
const dotenv = require('dotenv');
dotenv.config();

const transporter = nodemailer.createTransport({
  service: 'Outlook',
  auth: {
    user: process.env.EMAIL_USER, // Your Outlook email address
    pass: process.env.EMAIL_PASS, // Your Outlook password or app password
  },
});

exports.sendVerificationCode = async (email, code) => {
  try {
    console.log(`Attempting to send verification code to: ${email}`);
    await transporter.sendMail({
      from: `"HSBC" <${process.env.EMAIL_USER}>`,
      to: email,
      subject: 'Your HSBC Verification Code',
      text: `Your verification code is: ${code}`,
    });
    console.log(`Verification code sent successfully to: ${email}`);
  } catch (error) {
    console.error(`Failed to send verification code to ${email}:`, error);
    throw error;
  }
};