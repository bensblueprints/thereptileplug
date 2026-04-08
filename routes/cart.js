const express = require('express');
const router = express.Router();
const { v4: uuidv4 } = require('uuid');

router.get('/', (req, res) => {
  const cart = req.session.cart || [];
  const enriched = cart.map(item => {
    const product = req.db.prepare('SELECT id, name, slug, price, image, stock FROM products WHERE id = ?').get(item.productId);
    return product ? { ...item, product } : null;
  }).filter(Boolean);
  req.session.cart = enriched.map(({ productId, quantity }) => ({ productId, quantity }));
  res.json(enriched);
});

router.post('/add', (req, res) => {
  const { productId, quantity = 1 } = req.body;
  const product = req.db.prepare('SELECT * FROM products WHERE id = ? AND active = 1').get(productId);
  if (!product) return res.status(404).json({ error: 'Product not found' });
  if (product.stock < 1) return res.status(400).json({ error: 'Out of stock' });

  const existing = req.session.cart.find(i => i.productId === productId);
  if (existing) {
    existing.quantity = Math.min(existing.quantity + quantity, product.stock);
  } else {
    req.session.cart.push({ productId, quantity: Math.min(quantity, product.stock) });
  }
  res.json({ success: true, cartCount: req.session.cart.reduce((a, b) => a + b.quantity, 0) });
});

router.put('/update', (req, res) => {
  const { productId, quantity } = req.body;
  const item = req.session.cart.find(i => i.productId === productId);
  if (!item) return res.status(404).json({ error: 'Not in cart' });
  if (quantity <= 0) {
    req.session.cart = req.session.cart.filter(i => i.productId !== productId);
  } else {
    const product = req.db.prepare('SELECT stock FROM products WHERE id = ?').get(productId);
    item.quantity = Math.min(quantity, product?.stock || 1);
  }
  res.json({ success: true, cartCount: req.session.cart.reduce((a, b) => a + b.quantity, 0) });
});

router.delete('/remove/:productId', (req, res) => {
  req.session.cart = req.session.cart.filter(i => i.productId !== parseInt(req.params.productId));
  res.json({ success: true, cartCount: req.session.cart.reduce((a, b) => a + b.quantity, 0) });
});

router.post('/checkout', (req, res) => {
  const { name, email, phone, address, city, state, zip } = req.body;
  if (!name || !email || !address || !city || !state || !zip) {
    return res.status(400).json({ error: 'All fields required' });
  }

  const cart = req.session.cart || [];
  if (cart.length === 0) return res.status(400).json({ error: 'Cart is empty' });

  const items = cart.map(item => {
    const product = req.db.prepare('SELECT * FROM products WHERE id = ?').get(item.productId);
    return product ? { id: product.id, name: product.name, price: product.price, quantity: item.quantity, image: product.image } : null;
  }).filter(Boolean);

  const subtotal = items.reduce((sum, i) => sum + (i.price * i.quantity), 0);
  const shipping = subtotal >= 100 ? 0 : 14.99;
  const total = subtotal + shipping;
  const orderNumber = 'RP-' + uuidv4().slice(0, 8).toUpperCase();

  req.db.prepare(`
    INSERT INTO orders (order_number, customer_name, customer_email, customer_phone, shipping_address, shipping_city, shipping_state, shipping_zip, items, subtotal, shipping_cost, total)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(orderNumber, name, email, phone || '', address, city, state, zip, JSON.stringify(items), subtotal, shipping, total);

  for (const item of cart) {
    req.db.prepare('UPDATE products SET stock = MAX(0, stock - ?) WHERE id = ?').run(item.quantity, item.productId);
  }

  req.session.cart = [];
  res.json({ success: true, orderNumber, total });
});

module.exports = router;
