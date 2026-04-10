const express = require('express');
const session = require('express-session');
const path = require('path');
const dbPromise = require('./db');

const app = express();
const PORT = process.env.PORT || 3000;
const SITE_URL = 'https://buyreptilesonline.com';

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

app.use(session({
  secret: 'reptileplug-secret-key-2024',
  resave: false,
  saveUninitialized: false,
  cookie: { maxAge: 24 * 60 * 60 * 1000 }
}));

app.use((req, res, next) => {
  if (!req.session.cart) req.session.cart = [];
  next();
});

// Wait for db to be ready, then attach to req
app.use(async (req, res, next) => {
  req.db = await dbPromise;
  next();
});

// robots.txt
app.get('/robots.txt', (req, res) => {
  res.type('text/plain').send(`User-agent: *
Allow: /
Disallow: /admin
Disallow: /api/
Disallow: /cart
Disallow: /checkout
Disallow: /order/

Sitemap: ${SITE_URL}/sitemap.xml
`);
});

// Dynamic XML sitemap
app.get('/sitemap.xml', async (req, res) => {
  try {
    const db = await dbPromise;
    const today = new Date().toISOString().split('T')[0];

    const staticPages = [
      { loc: '/', priority: '1.0', changefreq: 'daily' },
      { loc: '/shop', priority: '0.9', changefreq: 'daily' },
      { loc: '/contact', priority: '0.5', changefreq: 'monthly' },
      { loc: '/blog', priority: '0.6', changefreq: 'weekly' },
      { loc: '/shipping-policy', priority: '0.3', changefreq: 'monthly' },
      { loc: '/live-arrival-guarantee', priority: '0.4', changefreq: 'monthly' },
      { loc: '/terms', priority: '0.2', changefreq: 'yearly' },
    ];

    const categories = db.prepare('SELECT slug FROM categories ORDER BY sort_order').all();
    const products = db.prepare('SELECT slug, created_at FROM products WHERE active = 1').all();

    let xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
`;

    for (const page of staticPages) {
      xml += `  <url>
    <loc>${SITE_URL}${page.loc}</loc>
    <lastmod>${today}</lastmod>
    <changefreq>${page.changefreq}</changefreq>
    <priority>${page.priority}</priority>
  </url>
`;
    }

    for (const cat of categories) {
      xml += `  <url>
    <loc>${SITE_URL}/shop?category=${cat.slug}</loc>
    <lastmod>${today}</lastmod>
    <changefreq>daily</changefreq>
    <priority>0.8</priority>
  </url>
`;
    }

    for (const product of products) {
      const lastmod = product.created_at ? product.created_at.split('T')[0].split(' ')[0] : today;
      xml += `  <url>
    <loc>${SITE_URL}/product/${product.slug}</loc>
    <lastmod>${lastmod}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.7</priority>
  </url>
`;
    }

    xml += `</urlset>`;
    res.header('Content-Type', 'application/xml').send(xml);
  } catch (err) {
    console.error('Sitemap error:', err);
    res.status(500).send('Error generating sitemap');
  }
});

// Routes
app.use('/api/admin', require('./routes/admin'));
app.use('/api/shop', require('./routes/shop'));
app.use('/api/cart', require('./routes/cart'));
app.use('/api/settings', require('./routes/settings'));
app.use('/api/payment', require('./routes/payment'));
app.use('/api/email', require('./routes/email'));
app.use('/api/subscribers', require('./routes/subscribers'));
app.use('/api/shipping', require('./routes/shipping'));

app.get('/admin*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'admin.html'));
});

app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

dbPromise.then(() => {
  app.listen(PORT, () => {
    console.log(`The Reptile Plug running on http://localhost:${PORT}`);
  });
});
