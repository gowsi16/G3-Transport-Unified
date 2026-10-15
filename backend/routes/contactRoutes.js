const express = require('express');
const router = express.Router();
const db = require('../database/db');
const { requireAdminAuth } = require('../middleware/authMiddleware');

// Generate unique ticket ID
function generateTicketId() {
  const prefix = 'TKT';
  const date = new Date();
  const yy = date.getFullYear().toString().slice(-2);
  const mm = String(date.getMonth() + 1).padStart(2, '0');
  const rand = Math.floor(1000 + Math.random() * 9000);
  return `${prefix}${yy}${mm}-${rand}`;
}

// ─── PUBLIC: Submit Contact/Support Enquiry ───────────────────────────────────
router.post('/contact', (req, res) => {
  const { full_name, email, phone, subject, order_id, message } = req.body || {};

  // Validate required fields
  if (!full_name || !full_name.trim()) return res.status(400).json({ error: 'Full name is required.' });
  if (!email || !email.trim()) return res.status(400).json({ error: 'Email address is required.' });
  if (!subject || !subject.trim()) return res.status(400).json({ error: 'Subject is required.' });
  if (!message || !message.trim()) return res.status(400).json({ error: 'Message is required.' });

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email.trim())) return res.status(400).json({ error: 'Please enter a valid email address.' });

  // Anti-spam: limit to 3 submissions per email per hour
  db.get(
    `SELECT COUNT(*) as cnt FROM contact_messages WHERE email = ? AND created_at > datetime('now', '-1 hour')`,
    [email.trim().toLowerCase()],
    (err, row) => {
      if (!err && row && row.cnt >= 3) {
        return res.status(429).json({ error: 'Too many submissions. Please wait before submitting again.' });
      }

      const ticket_id = generateTicketId();
      const ip = req.ip || '';

      db.run(
        `INSERT INTO contact_messages (ticket_id, full_name, email, phone, subject, order_id, message, ip_address)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          ticket_id,
          full_name.trim(),
          email.trim().toLowerCase(),
          phone ? phone.trim() : '',
          subject.trim(),
          order_id ? order_id.trim() : '',
          message.trim(),
          ip
        ],
        function (insErr) {
          if (insErr) return res.status(500).json({ error: 'Failed to save your message. Please try again.' });

          // Also create an admin notification
          db.run(
            `INSERT INTO notifications (order_id, title, message, type, is_read) VALUES (?, ?, ?, 'contact', 0)`,
            [
              ticket_id,
              `New Support Enquiry: ${ticket_id}`,
              `${full_name.trim()} (${email.trim()}) submitted a "${subject.trim()}" enquiry.`
            ]
          );

          res.status(201).json({
            success: true,
            ticket_id,
            message: `Thank you for reaching out! Your enquiry has been received. Reference number: ${ticket_id}`
          });
        }
      );
    }
  );
});

// ─── ADMIN: Get All Contact Messages ─────────────────────────────────────────
router.get('/admin/contact-messages', requireAdminAuth, (req, res) => {
  const { search, status, subject, date_from, date_to, page = 1, limit = 20 } = req.query;

  let query = `SELECT * FROM contact_messages WHERE 1=1`;
  const params = [];

  if (status && status !== 'all') {
    query += ` AND status = ?`;
    params.push(status);
  }
  if (subject && subject !== 'all') {
    query += ` AND subject = ?`;
    params.push(subject);
  }
  if (date_from) {
    query += ` AND date(created_at) >= ?`;
    params.push(date_from);
  }
  if (date_to) {
    query += ` AND date(created_at) <= ?`;
    params.push(date_to);
  }
  if (search) {
    const term = `%${search}%`;
    query += ` AND (full_name LIKE ? OR email LIKE ? OR phone LIKE ? OR ticket_id LIKE ? OR order_id LIKE ?)`;
    params.push(term, term, term, term, term);
  }

  // Count query
  const countQuery = query.replace('SELECT *', 'SELECT COUNT(*) as total');
  db.get(countQuery, params, (err, countRow) => {
    if (err) return res.status(500).json({ error: err.message });

    const total = countRow ? countRow.total : 0;
    const offset = (parseInt(page) - 1) * parseInt(limit);
    query += ` ORDER BY created_at DESC LIMIT ? OFFSET ?`;
    params.push(parseInt(limit), offset);

    db.all(query, params, (err2, rows) => {
      if (err2) return res.status(500).json({ error: err2.message });
      res.json({ messages: rows || [], total, page: parseInt(page), limit: parseInt(limit) });
    });
  });
});

// ─── ADMIN: Get Single Contact Message ────────────────────────────────────────
router.get('/admin/contact-messages/:id', requireAdminAuth, (req, res) => {
  db.get(`SELECT * FROM contact_messages WHERE id = ?`, [req.params.id], (err, row) => {
    if (err) return res.status(500).json({ error: err.message });
    if (!row) return res.status(404).json({ error: 'Message not found.' });
    res.json(row);
  });
});

// ─── ADMIN: Update Message Status / Notes ────────────────────────────────────
router.put('/admin/contact-messages/:id', requireAdminAuth, (req, res) => {
  const { status, internal_notes, assigned_to } = req.body || {};
  const validStatuses = ['New', 'In Progress', 'Resolved', 'Closed'];

  if (status && !validStatuses.includes(status)) {
    return res.status(400).json({ error: `Invalid status. Must be one of: ${validStatuses.join(', ')}` });
  }

  const fields = [];
  const params = [];

  if (status) { fields.push('status = ?'); params.push(status); }
  if (internal_notes !== undefined) { fields.push('internal_notes = ?'); params.push(internal_notes); }
  if (assigned_to !== undefined) { fields.push('assigned_to = ?'); params.push(assigned_to); }
  fields.push("updated_at = datetime('now')");

  if (fields.length === 1) return res.status(400).json({ error: 'No fields to update.' });

  params.push(req.params.id);
  db.run(
    `UPDATE contact_messages SET ${fields.join(', ')} WHERE id = ?`,
    params,
    function (err) {
      if (err) return res.status(500).json({ error: err.message });
      if (this.changes === 0) return res.status(404).json({ error: 'Message not found.' });
      res.json({ success: true, message: 'Enquiry updated successfully.' });
    }
  );
});

// ─── ADMIN: Get Contact Stats ─────────────────────────────────────────────────
router.get('/admin/contact-stats', requireAdminAuth, (req, res) => {
  db.all(
    `SELECT status, COUNT(*) as count FROM contact_messages GROUP BY status`,
    [],
    (err, rows) => {
      if (err) return res.status(500).json({ error: err.message });
      const stats = { New: 0, 'In Progress': 0, Resolved: 0, Closed: 0, total: 0 };
      (rows || []).forEach(r => {
        stats[r.status] = r.count;
        stats.total += r.count;
      });
      res.json(stats);
    }
  );
});

module.exports = router;
