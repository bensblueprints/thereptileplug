// Downloads ONE image for the next product that needs one, then exits.
// Designed to be called by cron/launchd every 6 seconds.
// Uses Wikipedia article images (curated, high quality) with Commons fallback.

const dbPromise = require('./db');
const fs = require('fs');
const path = require('path');
const https = require('https');

const UPLOADS_DIR = path.join(__dirname, 'uploads');
const LOG_FILE = path.join(__dirname, 'image-cron.log');
const FAILED_FILE = path.join(__dirname, 'image-failed.json');

function log(msg) {
  const line = `[${new Date().toISOString()}] ${msg}\n`;
  fs.appendFileSync(LOG_FILE, line);
}

function fetchJSON(url) {
  return new Promise((resolve, reject) => {
    const req = https.get(url, {
      headers: { 'User-Agent': 'TheReptilePlug/1.0 (educational; contact@buyreptilesonline.com)' },
      timeout: 10000
    }, (res) => {
      if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        return fetchJSON(res.headers.location).then(resolve).catch(reject);
      }
      if (res.statusCode === 429) return reject(new Error('RATE_LIMITED'));
      let data = '';
      res.on('data', c => data += c);
      res.on('end', () => {
        try { resolve(JSON.parse(data)); }
        catch(e) { reject(new Error('Parse error')); }
      });
    });
    req.on('error', reject);
    req.on('timeout', () => { req.destroy(); reject(new Error('timeout')); });
  });
}

function downloadFile(url, dest) {
  return new Promise((resolve, reject) => {
    const req = https.get(url, {
      headers: { 'User-Agent': 'TheReptilePlug/1.0' },
      timeout: 15000
    }, (res) => {
      if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        return downloadFile(res.headers.location, dest).then(resolve).catch(reject);
      }
      if (res.statusCode !== 200) return reject(new Error(`HTTP ${res.statusCode}`));
      const stream = fs.createWriteStream(dest);
      res.pipe(stream);
      stream.on('finish', () => { stream.close(); resolve(true); });
      stream.on('error', reject);
    });
    req.on('error', reject);
    req.on('timeout', () => { req.destroy(); reject(new Error('timeout')); });
  });
}

// Strategy 1: Wikipedia article image (best quality, curated)
async function getWikipediaImage(query) {
  // Search for the article first
  const searchUrl = `https://en.wikipedia.org/w/api.php?action=query&list=search&srsearch=${encodeURIComponent(query)}&srlimit=3&format=json`;
  const searchResult = await fetchJSON(searchUrl);
  if (!searchResult.query?.search?.length) return null;

  // Try each search result
  for (const item of searchResult.query.search) {
    const title = item.title;
    // Get the main page image at 800px
    const imgUrl = `https://en.wikipedia.org/w/api.php?action=query&titles=${encodeURIComponent(title)}&prop=pageimages&piprop=original|thumbnail&pithumbsize=800&format=json`;
    const imgResult = await fetchJSON(imgUrl);
    const page = Object.values(imgResult.query.pages)[0];

    if (page?.thumbnail?.source) {
      const src = page.thumbnail.source;
      // Skip SVGs and non-photo files
      if (src.endsWith('.svg') || src.includes('Flag_of') || src.includes('Map_')) continue;
      return src;
    }
    if (page?.original?.source) {
      const src = page.original.source;
      if (src.endsWith('.svg') || src.includes('Flag_of') || src.includes('Map_')) continue;
      return src;
    }
  }
  return null;
}

// Strategy 2: Wikimedia Commons search (fallback)
async function getCommonsImage(query) {
  const searchUrl = `https://commons.wikimedia.org/w/api.php?action=query&list=search&srsearch=${encodeURIComponent(query)}&srnamespace=6&srlimit=5&format=json`;
  const result = await fetchJSON(searchUrl);
  if (!result.query?.search?.length) return null;

  for (const item of result.query.search) {
    const titleLower = item.title.toLowerCase();
    if (titleLower.includes('map') || titleLower.includes('distribution') || titleLower.includes('logo') || titleLower.includes('diagram') || titleLower.includes('range')) continue;

    const infoUrl = `https://commons.wikimedia.org/w/api.php?action=query&titles=${encodeURIComponent(item.title)}&prop=imageinfo&iiprop=url|mime|size&iiurlwidth=800&format=json`;
    const info = await fetchJSON(infoUrl);
    const page = Object.values(info.query.pages)[0];

    if (page.imageinfo?.[0]) {
      const img = page.imageinfo[0];
      if ((img.mime === 'image/jpeg' || img.mime === 'image/png') && img.size > 10000) {
        return img.thumburl || img.url;
      }
    }
  }
  return null;
}

// Build search queries from product name
function buildQueries(name) {
  const clean = name.replace(/\b(cb|Baby|Adult|Captive Bred|for Sale)\b/gi, '').replace(/\s+/g, ' ').trim();

  // Strip morph names to get base species
  const base = clean.replace(/\b(Albino|Leucistic|Melanoid|Piebald|Pastel|Fire|Ghost|Snow|Blizzard|Hypo|Super|Giant|Motley|Tessera|Sunkissed|Crimson|Blood Red|Lavender|Ultra|Enigma|Tangerine|Sunglow|Pinstripe|Mack|Blazing|Woma|Spinner|Spider|Yellow Bellied|Black Pastel|Banana|Orange|High White|Red|Citrus|Translucent|Leatherback|Zero|Witblits|Fantasy|Strawberry|Ornate|Cherry Head|Flame|Harlequin|Dalmatian|Lilly White|Normal)\b/gi, '').replace(/\s+/g, ' ').trim();

  // Remove count suffixes like (10ct), (25pk)
  const noCount = base.replace(/\(\d+\w*\)/g, '').trim();

  return [...new Set([clean, base, noCount, noCount + ' reptile', noCount + ' animal'].filter(q => q.length > 3))];
}

async function findImage(name) {
  const queries = buildQueries(name);

  for (const query of queries) {
    try {
      // Try Wikipedia first (better images)
      const wpUrl = await getWikipediaImage(query);
      if (wpUrl) return wpUrl;
    } catch(e) {
      if (e.message === 'RATE_LIMITED') throw e;
    }

    try {
      // Fall back to Commons
      const cmUrl = await getCommonsImage(query);
      if (cmUrl) return cmUrl;
    } catch(e) {
      if (e.message === 'RATE_LIMITED') throw e;
    }
  }
  return null;
}

function getFailedIds() {
  try { return JSON.parse(fs.readFileSync(FAILED_FILE, 'utf-8')); }
  catch(e) { return {}; }
}
function markFailed(id) {
  const failed = getFailedIds();
  failed[id] = (failed[id] || 0) + 1;
  fs.writeFileSync(FAILED_FILE, JSON.stringify(failed));
}

async function main() {
  const db = await dbPromise;
  const failed = getFailedIds();

  const products = db.prepare("SELECT id, name FROM products WHERE (image IS NULL OR image = '') ORDER BY id").all();
  const product = products.find(p => (failed[p.id] || 0) < 3);

  if (!product) {
    const remaining = products.length;
    if (remaining === 0) {
      log('ALL DONE - every product has an image');
    } else {
      log(`EXHAUSTED - ${remaining} products without images, all tried 3+ times`);
    }
    process.exit(0);
  }

  try {
    const imageUrl = await findImage(product.name);
    if (imageUrl) {
      const filename = `product_${product.id}.jpg`;
      const destPath = path.join(UPLOADS_DIR, filename);
      await downloadFile(imageUrl, destPath);
      const stats = fs.statSync(destPath);
      if (stats.size > 5000) {
        db.prepare('UPDATE products SET image = ? WHERE id = ?').run(`/uploads/${filename}`, product.id);
        log(`OK [${product.id}] ${product.name} (${Math.round(stats.size/1024)}KB)`);
      } else {
        fs.unlinkSync(destPath);
        markFailed(product.id);
        log(`TOO SMALL [${product.id}] ${product.name}`);
      }
    } else {
      markFailed(product.id);
      log(`NOT FOUND [${product.id}] ${product.name}`);
    }
  } catch(e) {
    if (e.message === 'RATE_LIMITED') {
      log(`RATE LIMITED - will retry [${product.id}] ${product.name}`);
    } else {
      markFailed(product.id);
      log(`ERROR [${product.id}] ${product.name}: ${e.message}`);
    }
  }
}

main().catch(e => { log(`FATAL: ${e.message}`); process.exit(1); });
