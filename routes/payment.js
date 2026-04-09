const express = require('express');
const router = express.Router();
const https = require('https');

function getSetting(db, key) {
  const row = db.prepare('SELECT value FROM settings WHERE key = ?').get(key);
  return row ? row.value : '';
}

// Get payment config (public - tells frontend which provider is active)
router.get('/config', (req, res) => {
  const provider = getSetting(req.db, 'payment_provider');
  const config = { provider };
  if (provider === 'stripe') {
    config.stripePublishableKey = getSetting(req.db, 'stripe_publishable_key');
  }
  res.json(config);
});

// Create Stripe payment intent
router.post('/stripe/create-intent', async (req, res) => {
  const secretKey = getSetting(req.db, 'stripe_secret_key');
  if (!secretKey) return res.status(400).json({ error: 'Stripe not configured' });

  try {
    const Stripe = require('stripe');
    const stripe = Stripe(secretKey);
    const { amount, orderId } = req.body;

    const paymentIntent = await stripe.paymentIntents.create({
      amount: Math.round(amount * 100), // cents
      currency: 'usd',
      metadata: { orderId: orderId || '' },
    });

    res.json({ clientSecret: paymentIntent.client_secret, paymentIntentId: paymentIntent.id });
  } catch(e) {
    res.status(500).json({ error: e.message });
  }
});

// Confirm Stripe payment (webhook or manual)
router.post('/stripe/confirm', async (req, res) => {
  const { paymentIntentId, orderId } = req.body;
  const secretKey = getSetting(req.db, 'stripe_secret_key');
  if (!secretKey) return res.status(400).json({ error: 'Stripe not configured' });

  try {
    const Stripe = require('stripe');
    const stripe = Stripe(secretKey);
    const intent = await stripe.paymentIntents.retrieve(paymentIntentId);

    if (intent.status === 'succeeded') {
      req.db.prepare("UPDATE orders SET payment_status = 'paid', payment_id = ?, payment_method = 'stripe' WHERE order_number = ?")
        .run(paymentIntentId, orderId);
      res.json({ success: true, status: 'paid' });
    } else {
      res.json({ success: false, status: intent.status });
    }
  } catch(e) {
    res.status(500).json({ error: e.message });
  }
});

// Authorize.net payment
router.post('/authorizenet/charge', (req, res) => {
  const apiLogin = getSetting(req.db, 'authorizenet_api_login');
  const transactionKey = getSetting(req.db, 'authorizenet_transaction_key');
  const sandbox = getSetting(req.db, 'authorizenet_sandbox') === '1';

  if (!apiLogin || !transactionKey) return res.status(400).json({ error: 'Authorize.net not configured' });

  const { amount, cardNumber, expDate, cvv, orderId, customerName, customerEmail } = req.body;

  const payload = JSON.stringify({
    createTransactionRequest: {
      merchantAuthentication: { name: apiLogin, transactionKey },
      transactionRequest: {
        transactionType: 'authCaptureTransaction',
        amount: amount.toFixed(2),
        payment: {
          creditCard: { cardNumber, expirationDate: expDate, cardCode: cvv }
        },
        order: { invoiceNumber: orderId },
        customer: { email: customerEmail },
        billTo: { firstName: customerName.split(' ')[0], lastName: customerName.split(' ').slice(1).join(' ') || customerName }
      }
    }
  });

  const hostname = sandbox ? 'apitest.authorize.net' : 'api.authorize.net';

  const request = https.request({
    hostname, path: '/xml/v1/request.api', method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(payload) }
  }, (response) => {
    let data = '';
    response.on('data', c => data += c);
    response.on('end', () => {
      try {
        // Remove BOM if present
        data = data.replace(/^\uFEFF/, '');
        const result = JSON.parse(data);
        const txResponse = result.transactionResponse;

        if (txResponse && (txResponse.responseCode === '1' || txResponse.responseCode === 1)) {
          req.db.prepare("UPDATE orders SET payment_status = 'paid', payment_id = ?, payment_method = 'authorizenet' WHERE order_number = ?")
            .run(txResponse.transId, orderId);
          res.json({ success: true, transactionId: txResponse.transId });
        } else {
          const errMsg = txResponse?.errors?.[0]?.errorText || result.messages?.message?.[0]?.text || 'Payment declined';
          res.status(400).json({ error: errMsg });
        }
      } catch(e) {
        res.status(500).json({ error: 'Failed to parse payment response' });
      }
    });
  });

  request.on('error', (e) => res.status(500).json({ error: e.message }));
  request.write(payload);
  request.end();
});

// Mark order as paid manually (admin)
router.post('/mark-paid/:orderId', (req, res) => {
  if (!req.session.admin) return res.status(401).json({ error: 'Unauthorized' });
  req.db.prepare("UPDATE orders SET payment_status = 'paid', payment_method = 'manual' WHERE id = ?").run(parseInt(req.params.orderId));
  res.json({ success: true });
});

module.exports = router;
