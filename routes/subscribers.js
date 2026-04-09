const express = require('express');
const router = express.Router();

function requireAdmin(req, res, next) {
  if (!req.session.admin) return res.status(401).json({ error: 'Unauthorized' });
  next();
}

// Public: subscribe
router.post('/subscribe', (req, res) => {
  const { email, name, source } = req.body;
  if (!email || !email.includes('@')) return res.status(400).json({ error: 'Valid email required' });

  const existing = req.db.prepare('SELECT id, subscribed FROM subscribers WHERE email = ?').get(email.toLowerCase().trim());
  if (existing) {
    if (!existing.subscribed) {
      req.db.prepare('UPDATE subscribers SET subscribed = 1 WHERE id = ?').run(existing.id);
    }
    return res.json({ success: true, message: 'Subscribed!' });
  }

  req.db.prepare('INSERT INTO subscribers (email, name, source) VALUES (?, ?, ?)').run(
    email.toLowerCase().trim(), name || null, source || 'website'
  );
  res.json({ success: true, message: 'Subscribed!' });
});

// Public: unsubscribe
router.get('/unsubscribe', (req, res) => {
  const { email } = req.query;
  if (email) {
    req.db.prepare('UPDATE subscribers SET subscribed = 0 WHERE email = ?').run(email.toLowerCase().trim());
  }
  res.send('<html><body style="background:#0a0a0a;color:#fff;font-family:Arial;text-align:center;padding:100px;"><h2>You have been unsubscribed.</h2><p style="color:#999;">You will no longer receive emails from us.</p></body></html>');
});

// Admin: get all subscribers
router.get('/', requireAdmin, (req, res) => {
  const subscribers = req.db.prepare('SELECT * FROM subscribers ORDER BY created_at DESC').all();
  const stats = {
    total: subscribers.length,
    active: subscribers.filter(s => s.subscribed).length,
    unsubscribed: subscribers.filter(s => !s.subscribed).length,
  };
  res.json({ subscribers, stats });
});

// Admin: export CSV
router.get('/export', requireAdmin, (req, res) => {
  const subscribers = req.db.prepare('SELECT email, name, source, subscribed, created_at FROM subscribers ORDER BY created_at DESC').all();
  let csv = 'Email,Name,Source,Subscribed,Date\n';
  subscribers.forEach(s => {
    csv += `"${s.email}","${s.name || ''}","${s.source}","${s.subscribed ? 'Yes' : 'No'}","${s.created_at}"\n`;
  });
  res.setHeader('Content-Type', 'text/csv');
  res.setHeader('Content-Disposition', 'attachment; filename=subscribers.csv');
  res.send(csv);
});

// Admin: add subscriber manually
router.post('/', requireAdmin, (req, res) => {
  const { email, name } = req.body;
  if (!email) return res.status(400).json({ error: 'Email required' });

  const existing = req.db.prepare('SELECT id FROM subscribers WHERE email = ?').get(email.toLowerCase().trim());
  if (existing) return res.status(400).json({ error: 'Already exists' });

  req.db.prepare('INSERT INTO subscribers (email, name, source) VALUES (?, ?, ?)').run(email.toLowerCase().trim(), name || null, 'admin');
  res.json({ success: true });
});

// Admin: delete subscriber
router.delete('/:id', requireAdmin, (req, res) => {
  req.db.prepare('DELETE FROM subscribers WHERE id = ?').run(parseInt(req.params.id));
  res.json({ success: true });
});

module.exports = router;
