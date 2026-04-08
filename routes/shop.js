const express = require('express');
const router = express.Router();

router.get('/categories', (req, res) => {
  res.json(req.db.prepare('SELECT * FROM categories ORDER BY sort_order').all());
});

router.get('/products', (req, res) => {
  const { category, search, sort, featured } = req.query;
  let query = 'SELECT p.*, c.name as category_name, c.slug as category_slug FROM products p LEFT JOIN categories c ON p.category_id = c.id WHERE p.active = 1';
  const params = [];

  if (category && category !== 'new-restock') {
    query += ' AND c.slug = ?';
    params.push(category);
  }

  if (search) {
    query += ' AND (p.name LIKE ? OR p.description LIKE ? OR p.morph LIKE ?)';
    const s = `%${search}%`;
    params.push(s, s, s);
  }

  if (featured === '1') {
    query += ' AND p.featured = 1';
  }

  switch (sort) {
    case 'price_asc': query += ' ORDER BY p.price ASC'; break;
    case 'price_desc': query += ' ORDER BY p.price DESC'; break;
    case 'name': query += ' ORDER BY p.name ASC'; break;
    default: query += ' ORDER BY p.created_at DESC';
  }

  res.json(req.db.prepare(query).all(...params));
});

router.get('/products/:slug', (req, res) => {
  const product = req.db.prepare(`
    SELECT p.*, c.name as category_name, c.slug as category_slug
    FROM products p LEFT JOIN categories c ON p.category_id = c.id
    WHERE p.slug = ? AND p.active = 1
  `).get(req.params.slug);
  if (!product) return res.status(404).json({ error: 'Product not found' });

  const related = req.db.prepare(`
    SELECT p.*, c.name as category_name, c.slug as category_slug FROM products p
    LEFT JOIN categories c ON p.category_id = c.id
    WHERE p.category_id = ? AND p.id != ? AND p.active = 1
    ORDER BY RANDOM() LIMIT 4
  `).all(product.category_id, product.id);

  res.json({ product, related });
});

module.exports = router;
