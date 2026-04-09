const express = require('express');
const router = express.Router();
const https = require('https');

function requireAdmin(req, res, next) {
  if (!req.session.admin) return res.status(401).json({ error: 'Unauthorized' });
  next();
}

function getSetting(db, key) {
  const row = db.prepare('SELECT value FROM settings WHERE key = ?').get(key);
  return row ? row.value : '';
}

function apiRequest(options, payload) {
  return new Promise((resolve, reject) => {
    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', c => data += c);
      res.on('end', () => {
        try { resolve({ status: res.statusCode, data: JSON.parse(data) }); }
        catch(e) { resolve({ status: res.statusCode, data }); }
      });
    });
    req.on('error', reject);
    if (payload) req.write(typeof payload === 'string' ? payload : JSON.stringify(payload));
    req.end();
  });
}

// Get shipping rates (EasyPost)
router.post('/rates', requireAdmin, async (req, res) => {
  const provider = getSetting(req.db, 'shipping_provider');

  if (provider === 'easypost') {
    return getEasyPostRates(req, res);
  } else if (provider === 'shipstation') {
    return getShipStationRates(req, res);
  }

  res.status(400).json({ error: 'No shipping provider configured' });
});

// Create label (EasyPost)
router.post('/label', requireAdmin, async (req, res) => {
  const provider = getSetting(req.db, 'shipping_provider');

  if (provider === 'easypost') {
    return createEasyPostLabel(req, res);
  } else if (provider === 'shipstation') {
    return createShipStationLabel(req, res);
  }

  res.status(400).json({ error: 'No shipping provider configured' });
});

// ========== EASYPOST ==========
async function getEasyPostRates(req, res) {
  const apiKey = getSetting(req.db, 'easypost_api_key');
  if (!apiKey) return res.status(400).json({ error: 'EasyPost API key not configured' });

  const { orderId } = req.body;
  const order = req.db.prepare('SELECT * FROM orders WHERE id = ?').get(parseInt(orderId));
  if (!order) return res.status(404).json({ error: 'Order not found' });

  const fromName = getSetting(req.db, 'ship_from_name');
  const fromStreet = getSetting(req.db, 'ship_from_street');
  const fromCity = getSetting(req.db, 'ship_from_city');
  const fromState = getSetting(req.db, 'ship_from_state');
  const fromZip = getSetting(req.db, 'ship_from_zip');
  const fromPhone = getSetting(req.db, 'ship_from_phone');

  const payload = {
    shipment: {
      from_address: { name: fromName, street1: fromStreet, city: fromCity, state: fromState, zip: fromZip, phone: fromPhone, country: 'US' },
      to_address: { name: order.customer_name, street1: order.shipping_address, city: order.shipping_city, state: order.shipping_state, zip: order.shipping_zip, phone: order.customer_phone || '', country: 'US' },
      parcel: { length: 12, width: 10, height: 8, weight: 32 } // default box, can customize
    }
  };

  try {
    const result = await apiRequest({
      hostname: 'api.easypost.com', path: '/v2/shipments', method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Basic ' + Buffer.from(apiKey + ':').toString('base64')
      }
    }, payload);

    if (result.status === 200 || result.status === 201) {
      const rates = result.data.rates.map(r => ({
        id: r.id, carrier: r.carrier, service: r.service,
        rate: parseFloat(r.rate), delivery_days: r.delivery_days,
        shipmentId: result.data.id
      })).sort((a, b) => a.rate - b.rate);
      res.json({ rates, shipmentId: result.data.id });
    } else {
      res.status(400).json({ error: result.data.error?.message || 'Failed to get rates' });
    }
  } catch(e) {
    res.status(500).json({ error: e.message });
  }
}

async function createEasyPostLabel(req, res) {
  const apiKey = getSetting(req.db, 'easypost_api_key');
  if (!apiKey) return res.status(400).json({ error: 'EasyPost API key not configured' });

  const { shipmentId, rateId, orderId } = req.body;

  try {
    const result = await apiRequest({
      hostname: 'api.easypost.com', path: `/v2/shipments/${shipmentId}/buy`, method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Basic ' + Buffer.from(apiKey + ':').toString('base64')
      }
    }, { rate: { id: rateId } });

    if (result.status === 200 || result.status === 201) {
      const shipment = result.data;
      const tracking = shipment.tracking_code;
      const labelUrl = shipment.postage_label?.label_url;
      const carrier = shipment.selected_rate?.carrier;
      const service = shipment.selected_rate?.service;
      const rate = parseFloat(shipment.selected_rate?.rate || 0);

      // Save to DB
      req.db.prepare('INSERT INTO shipments (order_id, carrier, service, tracking_number, label_url, rate_amount) VALUES (?, ?, ?, ?, ?, ?)')
        .run(parseInt(orderId), carrier, service, tracking, labelUrl, rate);
      req.db.prepare("UPDATE orders SET tracking_number = ?, label_url = ?, status = 'shipped' WHERE id = ?")
        .run(tracking, labelUrl, parseInt(orderId));

      // Send shipping email
      const order = req.db.prepare('SELECT * FROM orders WHERE id = ?').get(parseInt(orderId));
      if (order) {
        const emailRouter = require('./email');
        emailRouter.sendShippingEmail(req.db, order, tracking, carrier).catch(() => {});
      }

      res.json({ success: true, tracking, labelUrl, carrier, service });
    } else {
      res.status(400).json({ error: result.data.error?.message || 'Failed to create label' });
    }
  } catch(e) {
    res.status(500).json({ error: e.message });
  }
}

// ========== SHIPSTATION ==========
async function getShipStationRates(req, res) {
  const apiKey = getSetting(req.db, 'shipstation_api_key');
  const apiSecret = getSetting(req.db, 'shipstation_api_secret');
  if (!apiKey || !apiSecret) return res.status(400).json({ error: 'ShipStation not configured' });

  const { orderId } = req.body;
  const order = req.db.prepare('SELECT * FROM orders WHERE id = ?').get(parseInt(orderId));
  if (!order) return res.status(404).json({ error: 'Order not found' });

  const payload = {
    carrierCode: 'stamps_com', // default, user can change
    fromPostalCode: getSetting(req.db, 'ship_from_zip'),
    toPostalCode: order.shipping_zip,
    toCountry: 'US',
    weight: { value: 32, units: 'ounces' },
    dimensions: { length: 12, width: 10, height: 8, units: 'inches' }
  };

  try {
    const auth = Buffer.from(apiKey + ':' + apiSecret).toString('base64');
    const result = await apiRequest({
      hostname: 'ssapi.shipstation.com', path: '/shipments/getrates', method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': 'Basic ' + auth }
    }, payload);

    if (result.status === 200) {
      const rates = result.data.map(r => ({
        service: r.serviceName, carrier: r.carrierCode || 'stamps_com',
        rate: r.shipmentCost + (r.otherCost || 0), serviceCode: r.serviceCode
      })).sort((a, b) => a.rate - b.rate);
      res.json({ rates });
    } else {
      res.status(400).json({ error: 'Failed to get ShipStation rates' });
    }
  } catch(e) {
    res.status(500).json({ error: e.message });
  }
}

async function createShipStationLabel(req, res) {
  const apiKey = getSetting(req.db, 'shipstation_api_key');
  const apiSecret = getSetting(req.db, 'shipstation_api_secret');
  if (!apiKey || !apiSecret) return res.status(400).json({ error: 'ShipStation not configured' });

  const { orderId, serviceCode, carrierCode } = req.body;
  const order = req.db.prepare('SELECT * FROM orders WHERE id = ?').get(parseInt(orderId));
  if (!order) return res.status(404).json({ error: 'Order not found' });

  const payload = {
    carrierCode: carrierCode || 'stamps_com',
    serviceCode: serviceCode || 'usps_priority_mail',
    packageCode: 'package',
    confirmation: 'delivery',
    shipDate: new Date().toISOString().split('T')[0],
    weight: { value: 32, units: 'ounces' },
    dimensions: { length: 12, width: 10, height: 8, units: 'inches' },
    shipFrom: {
      name: getSetting(req.db, 'ship_from_name'),
      street1: getSetting(req.db, 'ship_from_street'),
      city: getSetting(req.db, 'ship_from_city'),
      state: getSetting(req.db, 'ship_from_state'),
      postalCode: getSetting(req.db, 'ship_from_zip'),
      phone: getSetting(req.db, 'ship_from_phone'),
      country: 'US'
    },
    shipTo: {
      name: order.customer_name,
      street1: order.shipping_address,
      city: order.shipping_city,
      state: order.shipping_state,
      postalCode: order.shipping_zip,
      phone: order.customer_phone || '',
      country: 'US'
    },
    testLabel: false
  };

  try {
    const auth = Buffer.from(apiKey + ':' + apiSecret).toString('base64');
    const result = await apiRequest({
      hostname: 'ssapi.shipstation.com', path: '/shipments/createlabel', method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': 'Basic ' + auth }
    }, payload);

    if (result.status === 200 && result.data.trackingNumber) {
      const tracking = result.data.trackingNumber;
      const labelUrl = result.data.labelData ? `data:application/pdf;base64,${result.data.labelData}` : '';
      const carrier = carrierCode || 'stamps_com';
      const cost = result.data.shipmentCost || 0;

      req.db.prepare('INSERT INTO shipments (order_id, carrier, service, tracking_number, label_url, rate_amount) VALUES (?, ?, ?, ?, ?, ?)')
        .run(parseInt(orderId), carrier, serviceCode, tracking, labelUrl, cost);
      req.db.prepare("UPDATE orders SET tracking_number = ?, status = 'shipped' WHERE id = ?")
        .run(tracking, parseInt(orderId));

      const emailRouter = require('./email');
      emailRouter.sendShippingEmail(req.db, order, tracking, carrier).catch(() => {});

      res.json({ success: true, tracking, labelUrl, carrier });
    } else {
      res.status(400).json({ error: result.data.ExceptionMessage || 'Failed to create label' });
    }
  } catch(e) {
    res.status(500).json({ error: e.message });
  }
}

// Manual tracking entry (no API needed)
router.post('/manual-tracking', requireAdmin, (req, res) => {
  const { orderId, trackingNumber, carrier } = req.body;
  req.db.prepare("UPDATE orders SET tracking_number = ?, status = 'shipped' WHERE id = ?")
    .run(trackingNumber, parseInt(orderId));

  // Send shipping email
  const order = req.db.prepare('SELECT * FROM orders WHERE id = ?').get(parseInt(orderId));
  if (order) {
    const emailRouter = require('./email');
    emailRouter.sendShippingEmail(req.db, order, trackingNumber, carrier || 'N/A').catch(() => {});
  }

  res.json({ success: true });
});

// Get shipment history for order
router.get('/order/:orderId', requireAdmin, (req, res) => {
  const shipments = req.db.prepare('SELECT * FROM shipments WHERE order_id = ? ORDER BY created_at DESC').all(parseInt(req.params.orderId));
  res.json(shipments);
});

module.exports = router;
