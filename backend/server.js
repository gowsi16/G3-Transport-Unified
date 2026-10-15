const express = require('express');
const cors = require('cors');
const path = require('path');
const dotenv = require('dotenv');

// Load environment variables
dotenv.config({ path: path.resolve(__dirname, '.env') });

const authRoutes = require('./routes/authRoutes');
const bookingRoutes = require('./routes/bookingRoutes');
const adminRoutes = require('./routes/adminRoutes');
const tripRoutes = require('./routes/tripRoutes');
const contactRoutes = require('./routes/contactRoutes');
const driverRoutes = require('./routes/driverRoutes');
const fleetRoutes = require('./routes/fleetRoutes');
const db = require('./database/db');
const { loadPricingFromDb } = require('./services/pricingConfig');

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Health Check
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    service: 'G3 Transport Unified Backend',
    timestamp: new Date().toISOString()
  });
});

// Register Modular Routers
app.use('/api', authRoutes);
app.use('/api', bookingRoutes);
app.use('/api', adminRoutes);
app.use('/api', contactRoutes);
app.use('/api', driverRoutes);
app.use('/api', fleetRoutes);
app.use('/api/trips', tripRoutes);

// Global Error Handler
app.use((err, req, res, next) => {
  console.error('[UNIFIED-BACKEND ERROR]', err);
  res.status(err.status || 500).json({
    error: err.message || 'Internal server error',
    path: req.originalUrl
  });
});

// Load persisted pricing config from DB on startup
loadPricingFromDb(db);

// Start Server
if (require.main === module) {
  app.listen(PORT, () => {
    console.log(`================================================================`);
    console.log(`  G3 UNIFIED BACKEND LISTENING ON http://localhost:${PORT}`);
    console.log(`================================================================`);
  });
}

module.exports = app;
