const express = require('express');
const router = express.Router();
const nodemailer = require('nodemailer');

function requireAdmin(req, res, next) {
  if (!req.session.admin) return res.status(401).json({ error: 'Unauthorized' });
  next();
}

function getSetting(db, key) {
  const row = db.prepare('SELECT value FROM settings WHERE key = ?').get(key);
  return row ? row.value : '';
}

function getTransporter(db) {
  const host = getSetting(db, 'smtp_host');
  const port = parseInt(getSetting(db, 'smtp_port')) || 587;
  const user = getSetting(db, 'smtp_user');
  const pass = getSetting(db, 'smtp_pass');

  if (!host || !user || !pass) return null;

  return nodemailer.createTransport({
    host, port,
    secure: port === 465,
    auth: { user, pass }
  });
}

// Send test email
router.post('/test', requireAdmin, async (req, res) => {
  const transporter = getTransporter(req.db);
  if (!transporter) return res.status(400).json({ error: 'SMTP not configured' });

  const fromEmail = getSetting(req.db, 'smtp_from_email');
  const fromName = getSetting(req.db, 'smtp_from_name');

  try {
    await transporter.sendMail({
      from: `"${fromName}" <${fromEmail}>`,
      to: req.body.to || fromEmail,
      subject: 'Test Email from The Reptile Plug',
      html: `<div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;background:#0a0a0a;color:#fff;padding:40px;border-radius:12px;">
        <h1 style="color:#e51c1c;margin:0 0 16px;">The Reptile Plug</h1>
        <p>This is a test email. Your SMTP configuration is working correctly!</p>
        <p style="color:#999;font-size:13px;margin-top:32px;">Sent from your store admin panel.</p>
      </div>`
    });
    res.json({ success: true });
  } catch(e) {
    res.status(500).json({ error: e.message });
  }
});

// Send order confirmation email
router.sendOrderEmail = async function(db, order) {
  const transporter = getTransporter(db);
  if (!transporter) return;

  const fromEmail = getSetting(db, 'smtp_from_email');
  const fromName = getSetting(db, 'smtp_from_name');
  const storeName = getSetting(db, 'store_name') || 'The Reptile Plug';
  const storeUrl = getSetting(db, 'store_url') || 'https://buyreptilesonline.com';

  const items = typeof order.items === 'string' ? JSON.parse(order.items) : order.items;

  const itemRows = items.map(i => `
    <tr>
      <td style="padding:12px;border-bottom:1px solid #222;">${i.name}</td>
      <td style="padding:12px;border-bottom:1px solid #222;text-align:center;">${i.quantity}</td>
      <td style="padding:12px;border-bottom:1px solid #222;text-align:right;">$${(i.price * i.quantity).toFixed(2)}</td>
    </tr>
  `).join('');

  const html = `
  <div style="font-family:'Helvetica Neue',Arial,sans-serif;max-width:600px;margin:0 auto;background:#0a0a0a;color:#ffffff;">
    <div style="background:#111;padding:32px;text-align:center;border-bottom:3px solid #e51c1c;">
      <h1 style="color:#e51c1c;margin:0;font-size:28px;">${storeName}</h1>
    </div>
    <div style="padding:32px;">
      <h2 style="color:#fff;margin:0 0 8px;">Order Confirmed!</h2>
      <p style="color:#999;margin:0 0 24px;">Thank you for your order, ${order.customer_name}!</p>

      <div style="background:#1a1a1a;border:1px solid #222;border-radius:8px;padding:20px;margin-bottom:24px;">
        <p style="margin:0 0 8px;"><strong style="color:#e51c1c;">Order #:</strong> ${order.order_number}</p>
        <p style="margin:0;"><strong style="color:#e51c1c;">Date:</strong> ${new Date(order.created_at || Date.now()).toLocaleDateString()}</p>
      </div>

      <table style="width:100%;border-collapse:collapse;margin-bottom:24px;">
        <thead>
          <tr style="border-bottom:2px solid #e51c1c;">
            <th style="padding:12px;text-align:left;color:#999;font-size:12px;text-transform:uppercase;">Item</th>
            <th style="padding:12px;text-align:center;color:#999;font-size:12px;text-transform:uppercase;">Qty</th>
            <th style="padding:12px;text-align:right;color:#999;font-size:12px;text-transform:uppercase;">Price</th>
          </tr>
        </thead>
        <tbody>${itemRows}</tbody>
        <tfoot>
          <tr><td colspan="2" style="padding:8px 12px;text-align:right;color:#999;">Subtotal</td><td style="padding:8px 12px;text-align:right;">$${order.subtotal.toFixed(2)}</td></tr>
          <tr><td colspan="2" style="padding:8px 12px;text-align:right;color:#999;">Shipping</td><td style="padding:8px 12px;text-align:right;">${order.shipping_cost === 0 ? 'FREE' : '$' + order.shipping_cost.toFixed(2)}</td></tr>
          <tr><td colspan="2" style="padding:12px;text-align:right;font-size:18px;"><strong>Total</strong></td><td style="padding:12px;text-align:right;font-size:18px;color:#e51c1c;"><strong>$${order.total.toFixed(2)}</strong></td></tr>
        </tfoot>
      </table>

      <div style="background:#1a1a1a;border:1px solid #222;border-radius:8px;padding:20px;margin-bottom:24px;">
        <h3 style="margin:0 0 8px;font-size:14px;color:#e51c1c;text-transform:uppercase;">Shipping To</h3>
        <p style="margin:0;color:#ccc;">${order.customer_name}<br>${order.shipping_address}<br>${order.shipping_city}, ${order.shipping_state} ${order.shipping_zip}</p>
      </div>

      <p style="color:#999;font-size:14px;">We'll send you tracking info once your order ships. All live animals ship with our <strong style="color:#fff;">Live Arrival Guarantee</strong>.</p>

      <div style="text-align:center;margin-top:32px;">
        <a href="${storeUrl}" style="display:inline-block;background:#e51c1c;color:#fff;padding:14px 32px;border-radius:50px;text-decoration:none;font-weight:bold;">Visit Our Store</a>
      </div>
    </div>
    <div style="background:#111;padding:20px;text-align:center;color:#666;font-size:12px;border-top:1px solid #222;">
      <p style="margin:0;">&copy; ${new Date().getFullYear()} ${storeName}. All rights reserved.</p>
      <p style="margin:4px 0 0;">562-248-6940 | info@thereptileplug.com</p>
    </div>
  </div>`;

  try {
    await transporter.sendMail({
      from: `"${fromName}" <${fromEmail}>`,
      to: order.customer_email,
      subject: `Order Confirmed - ${order.order_number} | ${storeName}`,
      html
    });
    db.prepare('INSERT INTO email_log (to_email, subject, status, order_id) VALUES (?, ?, ?, ?)').run(
      order.customer_email, `Order Confirmed - ${order.order_number}`, 'sent', order.id || null
    );
  } catch(e) {
    db.prepare('INSERT INTO email_log (to_email, subject, status, order_id) VALUES (?, ?, ?, ?)').run(
      order.customer_email, `Order Confirmed - ${order.order_number}`, 'failed: ' + e.message, order.id || null
    );
  }
};

// Send shipping notification
router.sendShippingEmail = async function(db, order, trackingNumber, carrier) {
  const transporter = getTransporter(db);
  if (!transporter) return;

  const fromEmail = getSetting(db, 'smtp_from_email');
  const fromName = getSetting(db, 'smtp_from_name');
  const storeName = getSetting(db, 'store_name') || 'The Reptile Plug';

  const html = `
  <div style="font-family:'Helvetica Neue',Arial,sans-serif;max-width:600px;margin:0 auto;background:#0a0a0a;color:#ffffff;">
    <div style="background:#111;padding:32px;text-align:center;border-bottom:3px solid #e51c1c;">
      <h1 style="color:#e51c1c;margin:0;font-size:28px;">${storeName}</h1>
    </div>
    <div style="padding:32px;">
      <h2 style="color:#fff;margin:0 0 8px;">Your Order Has Shipped!</h2>
      <p style="color:#999;margin:0 0 24px;">Great news, ${order.customer_name}! Your order is on its way.</p>
      <div style="background:#1a1a1a;border:1px solid #222;border-radius:8px;padding:20px;margin-bottom:24px;">
        <p style="margin:0 0 8px;"><strong style="color:#e51c1c;">Order #:</strong> ${order.order_number}</p>
        <p style="margin:0 0 8px;"><strong style="color:#e51c1c;">Carrier:</strong> ${carrier || 'N/A'}</p>
        <p style="margin:0;"><strong style="color:#e51c1c;">Tracking #:</strong> ${trackingNumber}</p>
      </div>
      <p style="color:#999;font-size:14px;">Remember: All live animals ship with our <strong style="color:#fff;">Live Arrival Guarantee</strong>. Please be available to receive your package.</p>
    </div>
    <div style="background:#111;padding:20px;text-align:center;color:#666;font-size:12px;border-top:1px solid #222;">
      <p style="margin:0;">&copy; ${new Date().getFullYear()} ${storeName}</p>
    </div>
  </div>`;

  try {
    await transporter.sendMail({
      from: `"${fromName}" <${fromEmail}>`,
      to: order.customer_email,
      subject: `Your Order Has Shipped - ${order.order_number} | ${storeName}`,
      html
    });
    db.prepare('INSERT INTO email_log (to_email, subject, status, order_id) VALUES (?, ?, ?, ?)').run(
      order.customer_email, `Shipped - ${order.order_number}`, 'sent', order.id
    );
  } catch(e) {}
};

// Send bulk email to subscribers
router.post('/broadcast', requireAdmin, async (req, res) => {
  const transporter = getTransporter(req.db);
  if (!transporter) return res.status(400).json({ error: 'SMTP not configured' });

  const { subject, html } = req.body;
  if (!subject || !html) return res.status(400).json({ error: 'Subject and body required' });

  const fromEmail = getSetting(req.db, 'smtp_from_email');
  const fromName = getSetting(req.db, 'smtp_from_name');
  const storeName = getSetting(req.db, 'store_name') || 'The Reptile Plug';

  const subscribers = req.db.prepare('SELECT email FROM subscribers WHERE subscribed = 1').all();
  let sent = 0, failed = 0;

  const wrappedHtml = `
  <div style="font-family:'Helvetica Neue',Arial,sans-serif;max-width:600px;margin:0 auto;background:#0a0a0a;color:#ffffff;">
    <div style="background:#111;padding:32px;text-align:center;border-bottom:3px solid #e51c1c;">
      <h1 style="color:#e51c1c;margin:0;font-size:28px;">${storeName}</h1>
    </div>
    <div style="padding:32px;">${html}</div>
    <div style="background:#111;padding:20px;text-align:center;color:#666;font-size:12px;border-top:1px solid #222;">
      <p style="margin:0;">&copy; ${new Date().getFullYear()} ${storeName}</p>
    </div>
  </div>`;

  for (const sub of subscribers) {
    try {
      await transporter.sendMail({
        from: `"${fromName}" <${fromEmail}>`,
        to: sub.email,
        subject,
        html: wrappedHtml
      });
      sent++;
    } catch(e) { failed++; }
  }

  res.json({ success: true, sent, failed, total: subscribers.length });
});

// Email log
router.get('/log', requireAdmin, (req, res) => {
  res.json(req.db.prepare('SELECT * FROM email_log ORDER BY created_at DESC LIMIT 100').all());
});

module.exports = router;
