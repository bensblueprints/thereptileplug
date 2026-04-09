const express = require('express');
const router = express.Router();

function getSaleSetting(db) {
  const row = db.prepare('SELECT value FROM settings WHERE key = ?').get('sale_discount_percent');
  return row ? parseFloat(row.value) || 0 : 0;
}

function applySale(products, salePercent) {
  if (!salePercent || salePercent <= 0) return products;
  return products.map(p => {
    const salePrice = +(p.price * (1 - salePercent / 100)).toFixed(2);
    return { ...p, compare_price: p.price, price: salePrice, on_sale: true };
  });
}

router.get('/categories', (req, res) => {
  res.json(req.db.prepare('SELECT id, name, slug, description, image, sort_order FROM categories ORDER BY sort_order').all());
});

router.get('/categories/:slug', (req, res) => {
  const cat = req.db.prepare('SELECT * FROM categories WHERE slug = ?').get(req.params.slug);
  if (!cat) return res.status(404).json({ error: 'Category not found' });
  res.json(cat);
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

  let results = req.db.prepare(query).all(...params);
  const salePercent = getSaleSetting(req.db);
  results = applySale(results, salePercent);
  res.json(results);
});

router.get('/products/:slug', (req, res) => {
  const product = req.db.prepare(`
    SELECT p.*, c.name as category_name, c.slug as category_slug
    FROM products p LEFT JOIN categories c ON p.category_id = c.id
    WHERE p.slug = ? AND p.active = 1
  `).get(req.params.slug);
  if (!product) return res.status(404).json({ error: 'Product not found' });

  const salePercent = getSaleSetting(req.db);
  const [saleProduct] = applySale([product], salePercent);

  let related = req.db.prepare(`
    SELECT p.*, c.name as category_name, c.slug as category_slug FROM products p
    LEFT JOIN categories c ON p.category_id = c.id
    WHERE p.category_id = ? AND p.id != ? AND p.active = 1
    ORDER BY RANDOM() LIMIT 4
  `).all(product.category_id, product.id);
  related = applySale(related, salePercent);

  res.json({ product: saleProduct, related });
});

module.exports = router;
