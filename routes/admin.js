const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const multer = require('multer');
const path = require('path');

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, path.join(__dirname, '..', 'uploads')),
  filename: (req, file, cb) => cb(null, Date.now() + '-' + file.originalname.replace(/\s+/g, '-'))
});
const upload = multer({ storage, limits: { fileSize: 10 * 1024 * 1024 } });

function requireAdmin(req, res, next) {
  if (!req.session.admin) return res.status(401).json({ error: 'Unauthorized' });
  next();
}

router.post('/login', (req, res) => {
  const { username, password } = req.body;
  const user = req.db.prepare('SELECT * FROM admin_users WHERE username = ?').get(username);
  if (!user || !bcrypt.compareSync(password, user.password)) {
    return res.status(401).json({ error: 'Invalid credentials' });
  }
  req.session.admin = { id: user.id, username: user.username };
  res.json({ success: true, username: user.username });
});

router.post('/logout', (req, res) => {
  req.session.destroy();
  res.json({ success: true });
});

router.get('/check', (req, res) => {
  res.json({ authenticated: !!req.session.admin, user: req.session.admin || null });
});

router.get('/stats', requireAdmin, (req, res) => {
  const db = req.db;
  const totalProducts = db.prepare('SELECT COUNT(*) as c FROM products').get().c;
  const totalOrders = db.prepare('SELECT COUNT(*) as c FROM orders').get().c;
  const totalRevenue = db.prepare("SELECT COALESCE(SUM(total), 0) as t FROM orders WHERE status != 'cancelled'").get().t;
  const pendingOrders = db.prepare("SELECT COUNT(*) as c FROM orders WHERE status = 'pending'").get().c;
  const lowStock = db.prepare('SELECT COUNT(*) as c FROM products WHERE stock < 3 AND active = 1').get().c;
  const recentOrders = db.prepare('SELECT * FROM orders ORDER BY created_at DESC LIMIT 5').all();
  res.json({ totalProducts, totalOrders, totalRevenue, pendingOrders, lowStock, recentOrders });
});

router.get('/products', requireAdmin, (req, res) => {
  res.json(req.db.prepare(`
    SELECT p.*, c.name as category_name
    FROM products p LEFT JOIN categories c ON p.category_id = c.id
    ORDER BY p.created_at DESC
  `).all());
});

router.get('/products/:id', requireAdmin, (req, res) => {
  const product = req.db.prepare(`
    SELECT p.*, c.name as category_name
    FROM products p LEFT JOIN categories c ON p.category_id = c.id
    WHERE p.id = ?
  `).get(parseInt(req.params.id));
  if (!product) return res.status(404).json({ error: 'Not found' });
  res.json(product);
});

router.post('/products', requireAdmin, upload.single('image'), (req, res) => {
  const { name, description, price, compare_price, category_id, stock, featured, active, sex, age, morph, weight } = req.body;
  const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
  const image = req.file ? '/uploads/' + req.file.filename : null;
  const result = req.db.prepare(`
    INSERT INTO products (name, slug, description, price, compare_price, category_id, image, stock, featured, active, sex, age, morph, weight)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(name, slug, description, parseFloat(price), compare_price ? parseFloat(compare_price) : null,
    parseInt(category_id) || null, image, parseInt(stock) || 0, featured === 'true' || featured === '1' ? 1 : 0,
    active === 'false' || active === '0' ? 0 : 1, sex || null, age || null, morph || null, weight || null);
  res.json({ success: true, id: result.lastInsertRowid });
});

router.put('/products/:id', requireAdmin, upload.single('image'), (req, res) => {
  const { name, description, price, compare_price, category_id, stock, featured, active, sex, age, morph, weight } = req.body;
  const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
  let image = req.body.existing_image || null;
  if (req.file) image = '/uploads/' + req.file.filename;
  req.db.prepare(`
    UPDATE products SET name=?, slug=?, description=?, price=?, compare_price=?, category_id=?, image=?, stock=?, featured=?, active=?, sex=?, age=?, morph=?, weight=?
    WHERE id=?
  `).run(name, slug, description, parseFloat(price), compare_price ? parseFloat(compare_price) : null,
    parseInt(category_id) || null, image, parseInt(stock) || 0, featured === 'true' || featured === '1' ? 1 : 0,
    active === 'false' || active === '0' ? 0 : 1, sex || null, age || null, morph || null, weight || null, parseInt(req.params.id));
  res.json({ success: true });
});

router.delete('/products/:id', requireAdmin, (req, res) => {
  req.db.prepare('DELETE FROM products WHERE id = ?').run(parseInt(req.params.id));
  res.json({ success: true });
});

router.get('/categories', requireAdmin, (req, res) => {
  res.json(req.db.prepare('SELECT * FROM categories ORDER BY sort_order').all());
});

router.post('/categories', requireAdmin, (req, res) => {
  const { name, description } = req.body;
  const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
  const result = req.db.prepare('INSERT INTO categories (name, slug, description) VALUES (?, ?, ?)').run(name, slug, description);
  res.json({ success: true, id: result.lastInsertRowid });
});

router.delete('/categories/:id', requireAdmin, (req, res) => {
  req.db.prepare('UPDATE products SET category_id = NULL WHERE category_id = ?').run(parseInt(req.params.id));
  req.db.prepare('DELETE FROM categories WHERE id = ?').run(parseInt(req.params.id));
  res.json({ success: true });
});

// Sale discount management
router.get('/sale', requireAdmin, (req, res) => {
  const discount = req.db.prepare("SELECT value FROM settings WHERE key = 'sale_discount_percent'").get();
  const minMarkup = req.db.prepare("SELECT value FROM settings WHERE key = 'min_markup_percent'").get();
  const salePercent = discount ? parseFloat(discount.value) : 0;
  const minMarkupPercent = minMarkup ? parseFloat(minMarkup.value) : 100;

  // Check which products would drop below minimum markup
  const products = req.db.prepare('SELECT id, name, price, cost_price FROM products WHERE cost_price IS NOT NULL AND cost_price > 0').all();
  const warnings = [];
  for (const p of products) {
    const salePrice = p.price * (1 - salePercent / 100);
    const effectiveMarkup = ((salePrice - p.cost_price) / p.cost_price) * 100;
    if (effectiveMarkup < minMarkupPercent) {
      warnings.push({
        id: p.id,
        name: p.name,
        costPrice: p.cost_price,
        retailPrice: p.price,
        salePrice: +salePrice.toFixed(2),
        effectiveMarkup: +effectiveMarkup.toFixed(1),
        minRequired: minMarkupPercent
      });
    }
  }

  res.json({ salePercent, minMarkupPercent, warnings, totalWarnings: warnings.length });
});

router.put('/sale', requireAdmin, (req, res) => {
  const { sale_discount_percent, min_markup_percent } = req.body;
  const salePercent = parseFloat(sale_discount_percent) || 0;
  const minMarkupPercent = parseFloat(min_markup_percent) || 100;

  // Validate: check how many products would fall below minimum markup
  const products = req.db.prepare('SELECT id, name, price, cost_price FROM products WHERE cost_price IS NOT NULL AND cost_price > 0').all();
  const violations = [];
  for (const p of products) {
    const salePrice = p.price * (1 - salePercent / 100);
    const effectiveMarkup = ((salePrice - p.cost_price) / p.cost_price) * 100;
    if (effectiveMarkup < minMarkupPercent) {
      violations.push({ name: p.name, effectiveMarkup: +effectiveMarkup.toFixed(1) });
    }
  }

  // Save settings
  req.db.prepare("UPDATE settings SET value = ? WHERE key = 'sale_discount_percent'").run(String(salePercent));
  req.db.prepare("UPDATE settings SET value = ? WHERE key = 'min_markup_percent'").run(String(minMarkupPercent));

  const warning = violations.length > 0
    ? `WARNING: ${violations.length} product(s) will drop below ${minMarkupPercent}% markup with this ${salePercent}% discount!`
    : null;

  res.json({ success: true, warning, violationCount: violations.length, violations: violations.slice(0, 20) });
});

router.get('/orders', requireAdmin, (req, res) => {
  res.json(req.db.prepare('SELECT * FROM orders ORDER BY created_at DESC').all());
});

router.put('/orders/:id/status', requireAdmin, (req, res) => {
  req.db.prepare('UPDATE orders SET status = ? WHERE id = ?').run(req.body.status, parseInt(req.params.id));
  res.json({ success: true });
});

router.post('/change-password', requireAdmin, (req, res) => {
  const { current, newPassword } = req.body;
  const user = req.db.prepare('SELECT * FROM admin_users WHERE id = ?').get(req.session.admin.id);
  if (!bcrypt.compareSync(current, user.password)) {
    return res.status(400).json({ error: 'Current password is incorrect' });
  }
  req.db.prepare('UPDATE admin_users SET password = ? WHERE id = ?').run(bcrypt.hashSync(newPassword, 10), user.id);
  res.json({ success: true });
});

module.exports = router;
