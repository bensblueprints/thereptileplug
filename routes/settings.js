const express = require('express');
const router = express.Router();

function requireAdmin(req, res, next) {
  if (!req.session.admin) return res.status(401).json({ error: 'Unauthorized' });
  next();
}

// Get all settings
router.get('/', requireAdmin, (req, res) => {
  const rows = req.db.prepare('SELECT key, value FROM settings').all();
  const settings = {};
  rows.forEach(r => settings[r.key] = r.value);
  // Mask sensitive keys for display
  const masked = { ...settings };
  ['stripe_secret_key', 'authorizenet_transaction_key', 'smtp_pass', 'easypost_api_key', 'shipstation_api_secret'].forEach(k => {
    if (masked[k] && masked[k].length > 4) masked[k] = '••••' + masked[k].slice(-4);
  });
  res.json({ settings, masked });
});

// Update settings
router.put('/', requireAdmin, (req, res) => {
  const updates = req.body;
  for (const [key, value] of Object.entries(updates)) {
    // Don't save masked values
    if (typeof value === 'string' && value.startsWith('••••')) continue;
    const exists = req.db.prepare('SELECT key FROM settings WHERE key = ?').get(key);
    if (exists) {
      req.db.prepare('UPDATE settings SET value = ? WHERE key = ?').run(value, key);
    } else {
      req.db.prepare('INSERT INTO settings (key, value) VALUES (?, ?)').run(key, value);
    }
  }
  res.json({ success: true });
});

// Get a single setting (internal helper used by other routes)
router.getSetting = function(db, key) {
  const row = db.prepare('SELECT value FROM settings WHERE key = ?').get(key);
  return row ? row.value : '';
};

module.exports = router;
