const express = require('express');
const session = require('express-session');
const path = require('path');
const dbPromise = require('./db');

const app = express();
const PORT = process.env.PORT || 3000;

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
