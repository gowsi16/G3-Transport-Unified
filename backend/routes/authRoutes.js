const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const jwt = require('jsonwebtoken');
const db = require('../database/db');
const { requireAdminAuth, JWT_SECRET } = require('../middleware/authMiddleware');
const { sendAdminOtpEmail, maskEmail } = require('../services/emailService');

// In-memory sessions for 2FA OTP
const adminOtpSessions = new Map();

// Helper to hash password
function hashPassword(plainText) {
  return crypto.createHash('sha256').update(plainText).digest('hex');
}

function verifyPassword(plainText, hashed) {
  return hashPassword(plainText) === hashed;
}

// -------------------------------------------------------------
// 1. PRIMARY TRANSPORT ADMIN LOGIN (admin.g3 / gggbrothers)
// -------------------------------------------------------------
router.post('/login', (req, res) => {
  const { username, password } = req.body;

  if (!username || !password) {
    return res.status(400).json({ message: 'Username and password required' });
  }

  db.get('SELECT * FROM users WHERE username = ?', [username], (err, user) => {
    if (err) {
      console.error('Database error in /api/login:', err.message);
      return res.status(500).json({ message: 'Database error' });
    }

    if (!user) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    if (user.role !== 'admin') {
      return res.status(403).json({ message: 'Access denied. Admin privileges required.' });
    }

    const passwordMatch = bcrypt.compareSync(password, user.password);
    if (!passwordMatch) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    const token = jwt.sign(
      { id: user.id, username: user.username, role: 'admin', name: user.name },
      JWT_SECRET,
      { expiresIn: '24h' }
    );

    res.json({
      token,
      username: user.username,
      name: user.name,
      role: user.role
    });
  });
});

// -------------------------------------------------------------
// 2. PUBLIC CUSTOMER AUTHENTICATION
// -------------------------------------------------------------
router.post('/auth/register', (req, res) => {
  const { name, phone, password, email, customer_address, gst_number, company } = req.body;

  if (!name || !phone || !password) {
    return res.status(400).json({ error: 'Name, phone number, and password are required.' });
  }

  const cleanPhone = phone.trim();
  db.get("SELECT * FROM customers WHERE phone = ?", [cleanPhone], (err, existing) => {
    if (err) return res.status(500).json({ error: err.message });
    if (existing) {
      return res.status(409).json({ error: 'An account with this phone number already exists. Please log in.' });
    }

    db.get("SELECT COUNT(id) as count FROM customers", (cErr, row) => {
      if (cErr) return res.status(500).json({ error: cErr.message });
      const nextId = (row ? row.count : 0) + 1;
      const customerId = `CUS${String(nextId).padStart(6, '0')}`;
      const hashed = hashPassword(password);

      const stmt = db.prepare(`
        INSERT INTO customers (customer_id, name, phone, password, email, customer_address, gst_number, company) 
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `);

      stmt.run([customerId, name.trim(), cleanPhone, hashed, email || '', customer_address || '', gst_number || '', company || ''], function(insErr) {
        if (insErr) return res.status(500).json({ error: insErr.message });

        const token = jwt.sign(
          { customer_id: customerId, role: 'customer', name: name.trim(), phone: cleanPhone },
          JWT_SECRET,
          { expiresIn: '30d' }
        );

        const customer = {
          customer_id: customerId,
          name: name.trim(),
          phone: cleanPhone,
          email: email || '',
          customer_address: customer_address || '',
          company: company || '',
          gst_number: gst_number || ''
        };

        res.json({
          success: true,
          message: 'Account registered successfully!',
          token,
          customer
        });
      });
      stmt.finalize();
    });
  });
});

router.post('/auth/login', (req, res) => {
  const { phone, password } = req.body;

  if (!phone || !password) {
    return res.status(400).json({ error: 'Phone number and password are required.' });
  }

  const cleanPhone = phone.trim();
  db.get("SELECT * FROM customers WHERE phone = ?", [cleanPhone], (err, customer) => {
    if (err) return res.status(500).json({ error: err.message });
    if (!customer) {
      return res.status(404).json({ error: 'No account found with this phone number. Please register first.' });
    }

    const valid = verifyPassword(password, customer.password);
    if (!valid) {
      return res.status(401).json({ error: 'Incorrect password. Please try again.' });
    }

    const token = jwt.sign(
      { customer_id: customer.customer_id, role: 'customer', name: customer.name, phone: customer.phone },
      JWT_SECRET,
      { expiresIn: '30d' }
    );

    const { password: _, ...customerProfile } = customer;
    res.json({
      success: true,
      message: 'Login successful!',
      token,
      customer: customerProfile
    });
  });
});

router.get('/auth/me', (req, res) => {
  const { customer_id, phone } = req.query;

  if (!customer_id && !phone) {
    return res.status(400).json({ error: 'Customer ID or Phone required' });
  }

  const query = customer_id ? "SELECT * FROM customers WHERE customer_id = ?" : "SELECT * FROM customers WHERE phone = ?";
  const param = customer_id || phone;

  db.get(query, [param], (err, customer) => {
    if (err) return res.status(500).json({ error: err.message });
    if (!customer) return res.status(404).json({ error: 'Customer not found' });

    const { password: _, ...customerProfile } = customer;
    res.json(customerProfile);
  });
});

router.put('/customer/profile', (req, res) => {
  const { customer_id, name, email, customer_address } = req.body;
  if (!customer_id) {
    return res.status(400).json({ error: 'Customer ID is required' });
  }

  db.run(
    "UPDATE customers SET name = COALESCE(?, name), email = COALESCE(?, email), customer_address = COALESCE(?, customer_address) WHERE customer_id = ?",
    [name, email, customer_address, customer_id],
    function(err) {
      if (err) return res.status(500).json({ error: err.message });
      res.json({ success: true, message: 'Profile updated successfully' });
    }
  );
});

// -------------------------------------------------------------
// 3. ADMIN 2FA OTP ACCESS (Backward Compatibility)
// -------------------------------------------------------------
router.post('/admin/auth/login', (req, res) => {
  const { username, password } = req.body || {};

  if (!username || !password) {
    return res.status(400).json({ error: 'Username and password are required' });
  }

  const validAdminUser = process.env.ADMIN_USER || 'admin';
  const validAdminPass = process.env.ADMIN_PASS || 'admin123';
  const adminEmail = process.env.ADMIN_EMAIL || 'gowsilan16@gmail.com';

  // Check database first
  db.get('SELECT * FROM users WHERE username = ?', [username], async (err, dbUser) => {
    let isAuthenticated = false;
    let verifiedName = 'Admin';

    if (!err && dbUser && dbUser.role === 'admin') {
      const match = bcrypt.compareSync(password, dbUser.password);
      if (match) {
        isAuthenticated = true;
        verifiedName = dbUser.name || 'Admin';
      }
    }

    // Fallback to env or default admin credentials
    if (!isAuthenticated) {
      if ((username === validAdminUser && password === validAdminPass) || (username === 'admin.g3' && password === 'gggbrothers')) {
        isAuthenticated = true;
      }
    }

    if (!isAuthenticated) {
      return res.status(401).json({ error: 'Invalid admin username or password' });
    }

    const sessionToken = crypto.randomBytes(32).toString('hex');
    const otpCode = crypto.randomInt(100000, 1000000).toString();
    const hashedOtp = crypto.createHash('sha256').update(otpCode).digest('hex');

    const now = Date.now();
    adminOtpSessions.set(sessionToken, {
      username,
      name: verifiedName,
      email: adminEmail,
      hashedOtp,
      expiresAt: now + 5 * 60 * 1000, // 5 minutes single-use expiry
      attempts: 0,
      maxAttempts: 5,
      resendCooldownUntil: now + 60 * 1000
    });

    const sendResult = await sendAdminOtpEmail(adminEmail, otpCode);

    res.json({
      success: true,
      message: `Verification OTP sent to registered admin email (${maskEmail(adminEmail)}).`,
      sessionToken,
      maskedEmail: maskEmail(adminEmail),
      expiresInSeconds: 300,
      resendCooldownSeconds: 60
    });
  });
});

router.post('/admin/auth/resend-otp', async (req, res) => {
  const { sessionToken } = req.body || {};
  if (!sessionToken) {
    return res.status(400).json({ error: 'Session token is required.' });
  }

  const session = adminOtpSessions.get(sessionToken);
  if (!session) {
    return res.status(400).json({ error: 'Invalid or expired OTP session. Please log in again.' });
  }

  const now = Date.now();
  if (session.resendCooldownUntil && now < session.resendCooldownUntil) {
    const secondsRemaining = Math.ceil((session.resendCooldownUntil - now) / 1000);
    return res.status(429).json({
      error: `Please wait ${secondsRemaining}s before requesting a new OTP.`,
      secondsRemaining
    });
  }

  const otpCode = crypto.randomInt(100000, 1000000).toString();
  const hashedOtp = crypto.createHash('sha256').update(otpCode).digest('hex');

  session.hashedOtp = hashedOtp;
  session.expiresAt = now + 5 * 60 * 1000;
  session.attempts = 0;
  session.resendCooldownUntil = now + 60 * 1000;
  adminOtpSessions.set(sessionToken, session);

  const sendResult = await sendAdminOtpEmail(session.email, otpCode);

  res.json({
    success: true,
    message: `A new 6-digit OTP has been sent to ${maskEmail(session.email)}.`,
    maskedEmail: maskEmail(session.email),
    expiresInSeconds: 300,
    resendCooldownSeconds: 60
  });
});

router.post('/admin/auth/verify-otp', (req, res) => {
  const { sessionToken, otp } = req.body;

  if (!sessionToken || !otp) {
    return res.status(400).json({ error: 'Session token and 6-digit OTP code are required.' });
  }

  const session = adminOtpSessions.get(sessionToken);
  if (!session) {
    return res.status(400).json({ error: 'Invalid or expired OTP session. Please log in again.' });
  }

  if (Date.now() > session.expiresAt) {
    adminOtpSessions.delete(sessionToken);
    return res.status(400).json({ error: 'This OTP has expired. Please request a new OTP.' });
  }

  if (session.attempts >= session.maxAttempts) {
    adminOtpSessions.delete(sessionToken);
    return res.status(429).json({ error: 'Maximum attempts exceeded. Please log in again.' });
  }

  const candidateHash = crypto.createHash('sha256').update(String(otp).trim()).digest('hex');
  if (candidateHash !== session.hashedOtp) {
    session.attempts += 1;
    const remaining = session.maxAttempts - session.attempts;
    if (remaining <= 0) {
      adminOtpSessions.delete(sessionToken);
      return res.status(429).json({ error: 'Maximum attempts exceeded. Please log in again.' });
    }
    return res.status(400).json({ error: `Incorrect OTP code. ${remaining} attempt(s) remaining.`, remainingAttempts: remaining });
  }

  adminOtpSessions.delete(sessionToken);

  const token = jwt.sign(
    { role: 'admin', username: session.username, name: session.name || 'Admin' },
    JWT_SECRET,
    { expiresIn: '24h' }
  );

  res.json({
    success: true,
    message: 'Admin authentication successful!',
    token,
    username: session.username,
    name: session.name || 'Admin',
    role: 'admin',
    admin: { username: session.username, name: session.name || 'Admin', email: session.email, role: 'admin' }
  });
});

router.get('/admin/auth/verify-token', requireAdminAuth, (req, res) => {
  res.json({ valid: true, admin: req.admin });
});

module.exports = router;
