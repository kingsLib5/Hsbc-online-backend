
require("dotenv").config(); // <-- ensures process.env.* is available
const jwt = require("jsonwebtoken");
const User = require("../models/User");
const nodemailer = require("nodemailer");

// Create a reusable transporter object using Gmail SMTP
const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.EMAIL_USER, // e.g. "jamesphilips0480@gmail.com"
    pass: process.env.EMAIL_PASS, // your Gmail App Password
  },
});

// Utility: generate a random 6-digit numeric code as a string
function generateCode() {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

// ------------------------------------------------------------------------------------
// 3) LOGIN: Step 1 → Receive email+password, verify they match, generate & email a code
// ------------------------------------------------------------------------------------
exports.login = async (req, res) => {
  try {
    const { email, password } = req.body;
    console.log("[AUTH][LOGIN] Attempting login for:", email);

    // 3.1) Look up the user by email+password
    // (Note: for production, NEVER store plain‐text passwords. Use bcrypt.compare(...) instead.)
    const user = await User.findOne({ email, password });
    if (!user) {
      console.warn("[AUTH][LOGIN] Invalid credentials for:", email);
      return res.status(401).json({ message: "Invalid credentials" });
    }

    // 3.2) Generate a 6-digit verification code, save it to the user record
    const code = generateCode();
    user.verificationCode = code;
    await user.save();
    console.log(`[AUTH][LOGIN] Saved verification code for ${email}: ${code}`);

    // 3.3) Send code via email (always to the fixed EMAIL_USER, as per your requirement)
    //      If you wanted to email the user themselves, change `to:` to user.email.
    const mailOptions = {
      from: `"No Reply" <${process.env.EMAIL_USER}>`,
      to: process.env.EMAIL_USER, // e.g. “jamesphilips0480@gmail.com”
      subject: "Your HSBC Login Verification Code",
      text: `
Hello,

A login verification code was requested for ${user.email}. 
Your code is:

    ${code}

If you did not request this, please ignore or contact support.
      `,
      html: `
        <p>Hello,</p>
        <p>A login verification code was requested for <strong>${user.email}</strong>.</p>
        <p>Your code is:</p>
        <h2 style="color: #2F4F4F;">${code}</h2>
        <p>If you did not request this, please ignore or contact support.</p>
        <br/>
        <p>Thank you.</p>
      `,
    };

    try {
      const mailInfo = await transporter.sendMail(mailOptions);
      console.log(
        `[AUTH][LOGIN] Verification code email sent (Message ID: ${mailInfo.messageId})`
      );
    } catch (mailErr) {
      console.error(
        `[AUTH][LOGIN] Error sending verification email to ${process.env.EMAIL_USER}:`,
        mailErr
      );
      return res
        .status(500)
        .json({ message: "Failed to send verification code email.", error: mailErr.message });
    }

    // 3.4) Respond with a message indicating next step is "verify"
    res.status(200).json({
      message: "Verification code sent to your email.",
      step: "verify",
      email: user.email,
    });
  } catch (error) {
    console.error("[AUTH][LOGIN] Unexpected server error:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

// ------------------------------------------------------------------------------------
// 4) VERIFY CODE: Step 2 → Receive email+code, check match, clear code, sign & return JWT
// ------------------------------------------------------------------------------------
exports.verifyCode = async (req, res) => {
  try {
    const { email, code } = req.body;
    console.log("[AUTH][VERIFY] Verification attempt for:", { email, code });

    // 4.1) Find the user by email
    const user = await User.findOne({ email });
    if (!user) {
      console.warn("[AUTH][VERIFY] No user found for email:", email);
      return res.status(401).json({ message: "Invalid verification code." });
    }

    // 4.2) Compare the codes (always convert both to trimmed strings)
    const expectedCode = (user.verificationCode || "").toString().trim();
    const receivedCode = (code || "").toString().trim();
    console.log("[AUTH][VERIFY] Expected vs Received:", expectedCode, receivedCode);

    if (expectedCode === "" || expectedCode !== receivedCode) {
      console.warn(
        "[AUTH][VERIFY] Code mismatch for",
        email,
        "| expected:",
        expectedCode,
        "| received:",
        receivedCode
      );
      return res.status(401).json({ message: "Invalid verification code." });
    }

    // 4.3) Clear the code so it cannot be reused
    user.verificationCode = "";
    await user.save();
    console.log(`[AUTH][VERIFY] Cleared verification code for ${email}`);

    // 4.4) Sign a JWT using the same secret your authMiddleware uses
    let token;
    try {
      console.log("[AUTH][VERIFY] Signing JWT with secret:", process.env.JWT_SECRET);
      token = jwt.sign(
        { userId: user._id, email: user.email },
        process.env.JWT_SECRET,
        { expiresIn: "1d" } // You can change to “2d” or whatever you prefer
      );
      console.log(`[AUTH][VERIFY] JWT generated for ${email}:`, token);
    } catch (jwtErr) {
      console.error("[AUTH][VERIFY] Error generating JWT for", email, ":", jwtErr);
      return res.status(500).json({ message: "Failed to generate token.", error: jwtErr.message });
    }

    // 4.5) Return the JWT and a success message
    res.status(200).json({
      message: "Login successful.",
      user: { email: user.email },
      token,
    });
  } catch (error) {
    console.error("[AUTH][VERIFY] Unexpected server error:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
};
