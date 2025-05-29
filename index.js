const express = require('express');
const cors = require('cors');
const connectDB = require('./dbconnect/dbconfig');
const autoSeedUser = require('./seed/seedUsers'); // <-- Add this line

const app = express();

// Connect to DB and seed user after connection
connectDB().then(autoSeedUser).catch(err => {
  console.error('DB connection or seeding failed:', err);
});

// Use environment variables for configuration
const PORT = process.env.PORT || 5000;

// Allow any origin for CORS
app.use(cors({
  origin: true, // Accept requests from any origin
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true,
}));

// Middleware to parse JSON
app.use(express.json());

// Logging middleware
app.use((req, res, next) => {
  console.log(`${req.method} ${req.originalUrl}`, req.body);
  next();
});

// === Add authentication routes here ===
const authRoutes = require('./routes/authRoutes');
app.use('/api/auth', authRoutes);

const transferRoutes = require('./routes/transferRoutes');
app.use('/api/transfer', transferRoutes);

// Sample Route
app.get("/", (req, res) => {
  res.send("HSBC Backend is running");
});

// Handle undefined routes (404)
app.use((req, res, next) => {
  res.status(404).json({ message: 'Route not found.' });
});

// Global error handler
app.use((err, req, res, next) => {
  console.error('Unhandled error:', err);
  res.status(500).json({ message: 'Server error.' });
});

// Start the server
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));