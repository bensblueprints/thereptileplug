const initSqlJs = require('sql.js');
const fs = require('fs');
const path = require('path');
const bcrypt = require('bcryptjs');

const DB_PATH = path.join(__dirname, 'store.db');

let db = null;

// Wrapper to make sql.js work like better-sqlite3 API
class DBWrapper {
  constructor(sqlDb) {
    this.sqlDb = sqlDb;
  }

  save() {
    const data = this.sqlDb.export();
    fs.writeFileSync(DB_PATH, Buffer.from(data));
  }

  exec(sql) {
    this.sqlDb.run(sql);
    this.save();
  }

  prepare(sql) {
    const self = this;
    return {
      run: (...params) => {
        self.sqlDb.run(sql, params);
        self.save();
        const lastId = self.sqlDb.exec('SELECT last_insert_rowid() as id')[0]?.values[0][0];
        return { lastInsertRowid: lastId, changes: self.sqlDb.getRowsModified() };
      },
      get: (...params) => {
        const stmt = self.sqlDb.prepare(sql);
        stmt.bind(params);
        if (stmt.step()) {
          const cols = stmt.getColumnNames();
          const vals = stmt.get();
          stmt.free();
          const row = {};
          cols.forEach((c, i) => row[c] = vals[i]);
          return row;
        }
        stmt.free();
        return undefined;
      },
      all: (...params) => {
        const stmt = self.sqlDb.prepare(sql);
        stmt.bind(params);
        const rows = [];
        while (stmt.step()) {
          const cols = stmt.getColumnNames();
          const vals = stmt.get();
          const row = {};
          cols.forEach((c, i) => row[c] = vals[i]);
          rows.push(row);
        }
        stmt.free();
        return rows;
      }
    };
  }
}

async function initDB() {
  const SQL = await initSqlJs();

  if (fs.existsSync(DB_PATH)) {
    const fileBuffer = fs.readFileSync(DB_PATH);
    db = new DBWrapper(new SQL.Database(fileBuffer));
  } else {
    db = new DBWrapper(new SQL.Database());
  }

  db.exec(`
    CREATE TABLE IF NOT EXISTS admin_users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT UNIQUE NOT NULL,
      password TEXT NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
    CREATE TABLE IF NOT EXISTS categories (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      slug TEXT UNIQUE NOT NULL,
      description TEXT,
      image TEXT,
      sort_order INTEGER DEFAULT 0
    );
    CREATE TABLE IF NOT EXISTS products (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      slug TEXT UNIQUE NOT NULL,
      description TEXT,
      price REAL NOT NULL,
      compare_price REAL,
      category_id INTEGER,
      image TEXT,
      images TEXT DEFAULT '[]',
      stock INTEGER DEFAULT 0,
      featured INTEGER DEFAULT 0,
      active INTEGER DEFAULT 1,
      sex TEXT,
      age TEXT,
      morph TEXT,
      weight TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (category_id) REFERENCES categories(id)
    );
    CREATE TABLE IF NOT EXISTS orders (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      order_number TEXT UNIQUE NOT NULL,
      customer_name TEXT NOT NULL,
      customer_email TEXT NOT NULL,
      customer_phone TEXT,
      shipping_address TEXT,
      shipping_city TEXT,
      shipping_state TEXT,
      shipping_zip TEXT,
      items TEXT NOT NULL,
      subtotal REAL NOT NULL,
      shipping_cost REAL DEFAULT 0,
      total REAL NOT NULL,
      status TEXT DEFAULT 'pending',
      notes TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
    CREATE TABLE IF NOT EXISTS settings (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS subscribers (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      email TEXT UNIQUE NOT NULL,
      name TEXT,
      source TEXT DEFAULT 'website',
      subscribed INTEGER DEFAULT 1,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
    CREATE TABLE IF NOT EXISTS email_log (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      to_email TEXT NOT NULL,
      subject TEXT NOT NULL,
      status TEXT DEFAULT 'sent',
      order_id INTEGER,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
    CREATE TABLE IF NOT EXISTS shipments (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      order_id INTEGER NOT NULL,
      carrier TEXT,
      service TEXT,
      tracking_number TEXT,
      label_url TEXT,
      rate_amount REAL,
      status TEXT DEFAULT 'created',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (order_id) REFERENCES orders(id)
    );
  `);

  // Add payment columns to orders if not present
  try {
    db.exec("ALTER TABLE orders ADD COLUMN payment_status TEXT DEFAULT 'unpaid'");
  } catch(e) {}
  try {
    db.exec("ALTER TABLE orders ADD COLUMN payment_id TEXT");
  } catch(e) {}
  try {
    db.exec("ALTER TABLE orders ADD COLUMN payment_method TEXT");
  } catch(e) {}
  try {
    db.exec("ALTER TABLE orders ADD COLUMN tracking_number TEXT");
  } catch(e) {}
  try {
    db.exec("ALTER TABLE orders ADD COLUMN label_url TEXT");
  } catch(e) {}

  // Seed default settings
  const setSetting = (key, val) => {
    const exists = db.prepare('SELECT key FROM settings WHERE key = ?').get(key);
    if (!exists) db.prepare('INSERT INTO settings (key, value) VALUES (?, ?)').run(key, val);
  };
  setSetting('payment_provider', 'none');
  setSetting('stripe_publishable_key', '');
  setSetting('stripe_secret_key', '');
  setSetting('authorizenet_api_login', '');
  setSetting('authorizenet_transaction_key', '');
  setSetting('authorizenet_sandbox', '1');
  setSetting('smtp_host', '');
  setSetting('smtp_port', '587');
  setSetting('smtp_user', '');
  setSetting('smtp_pass', '');
  setSetting('smtp_from_email', '');
  setSetting('smtp_from_name', 'The Reptile Plug');
  setSetting('shipping_provider', 'none');
  setSetting('easypost_api_key', '');
  setSetting('shipstation_api_key', '');
  setSetting('shipstation_api_secret', '');
  setSetting('ship_from_name', 'The Reptile Plug');
  setSetting('ship_from_street', '');
  setSetting('ship_from_city', '');
  setSetting('ship_from_state', '');
  setSetting('ship_from_zip', '');
  setSetting('ship_from_phone', '');
  setSetting('store_name', 'The Reptile Plug');
  setSetting('store_url', 'https://buyreptilesonline.com');

  // Seed admin
  const adminExists = db.prepare('SELECT id FROM admin_users WHERE username = ?').get('admin');
  if (!adminExists) {
    const hash = bcrypt.hashSync('reptile123', 10);
    db.prepare('INSERT INTO admin_users (username, password) VALUES (?, ?)').run('admin', hash);
  }

  // Seed categories
  const catCount = db.prepare('SELECT COUNT(*) as c FROM categories').get().c;
  if (catCount === 0) {
    const cats = [
      ['New Restock', 'new-restock', 'Freshly restocked on the website', 0],
      ['Snakes', 'snakes', 'Ball Pythons, Boas, Colubrids & More', 1],
      ['Geckos', 'geckos', 'Crested, Leachianus, Tokay, Mourning, Day Geckos', 2],
      ['Isopods', 'isopods', 'Exotic & Common Isopod Species', 3],
      ['Feeders', 'feeders', 'Rats, Mice, Crickets, Quail, Worms, Roaches', 4],
      ['Supplies', 'supplies', "Everything you might need that isn't alive", 5],
    ];
    for (const [name, slug, desc, order] of cats) {
      db.prepare('INSERT INTO categories (name, slug, description, sort_order) VALUES (?, ?, ?, ?)').run(name, slug, desc, order);
    }
  }

  // Seed products
  const prodCount = db.prepare('SELECT COUNT(*) as c FROM products').get().c;
  if (prodCount === 0) {
    const products = [
      // Snakes (cat 2)
      ['Pastel Ball Python','pastel-ball-python','Beautiful pastel morph ball python. Bright yellows and clean pattern. Feeding on frozen/thawed rats weekly. Excellent temperament, perfect for beginners and experienced keepers alike.',149.99,199.99,2,3,1,'Male','Juvenile','Pastel','180g'],
      ['Banana Ball Python','banana-ball-python','Stunning banana morph with vibrant lavender and yellow coloring. Well-established feeder on frozen/thawed medium rats. Docile and easy to handle.',249.99,329.99,2,2,1,'Female','Sub-Adult','Banana','450g'],
      ['Piebald Ball Python','piebald-ball-python','High white piebald ball python with exceptional pattern. One of the most sought-after morphs. Currently feeding on small rats.',399.99,499.99,2,1,1,'Male','Juvenile','Piebald','220g'],
      ['Normal Ball Python','normal-ball-python','Classic wild-type ball python. Great starter snake with beautiful natural coloring. Feeding well on frozen/thawed.',69.99,null,2,8,0,'Male','Baby','Normal','90g'],
      ['Albino Ball Python','albino-ball-python','Bright amelanistic ball python with striking yellow and white pattern. Red eyes. Established feeder.',199.99,249.99,2,4,1,'Female','Juvenile','Albino','200g'],
      ['Colombian Red Tail Boa','colombian-red-tail-boa','Beautiful Colombian red tail boa with rich saddle markings. Growing fast and feeding aggressively on medium rats.',199.99,null,2,3,0,'Female','Juvenile','Normal','380g'],
      ['Enchi Ball Python','enchi-ball-python','Rich orange and brown enchi morph. Excellent breeding potential. Feeding on frozen/thawed weekly.',129.99,169.99,2,5,0,'Male','Juvenile','Enchi','170g'],
      ['GHI Mojave Ball Python','ghi-mojave-ball-python','Incredible GHI Mojave combo morph. Deep blacks and bright highlights. A true showstopper.',549.99,699.99,2,1,1,'Male','Sub-Adult','GHI Mojave','400g'],
      ['Clown Ball Python','clown-ball-python','Exceptional clown morph with reduced pattern and bold coloring. Highly sought after for breeding projects.',349.99,null,2,2,0,'Female','Juvenile','Clown','250g'],
      ['Mexican Black Kingsnake','mexican-black-kingsnake','Jet black Mexican black kingsnake. Sleek, beautiful, and easy to care for. Great temperament.',179.99,229.99,2,3,1,'Unsexed','Baby','Normal','45g'],
      // Geckos (cat 3)
      ['Flame Crested Gecko','flame-crested-gecko','Gorgeous flame crested gecko with bright red and orange dorsal stripe. Great structure and fired-up coloring.',89.99,119.99,3,6,1,'Unsexed','Juvenile','Flame','8g'],
      ['Harlequin Crested Gecko','harlequin-crested-gecko','High-contrast harlequin morph with extensive lateral patterning. Beautiful fired-up colors.',149.99,199.99,3,4,1,'Male','Sub-Adult','Harlequin','18g'],
      ['Dalmatian Crested Gecko','dalmatian-crested-gecko','Super dalmatian crested gecko loaded with spots. Incredible polka-dot pattern throughout the body.',199.99,null,3,3,0,'Female','Adult','Super Dalmatian','35g'],
      ['Leachianus Gecko','leachianus-gecko',"The world's largest gecko species! Impressive size with beautiful mottled pattern. Captive bred.",599.99,749.99,3,2,1,'Unsexed','Juvenile','GT','25g'],
      ['Tokay Gecko','tokay-gecko','Vibrant blue and orange tokay gecko. Bold personality and stunning coloring. Captive bred specimen.',49.99,null,3,8,0,'Unsexed','Juvenile','Normal','15g'],
      ['Giant Day Gecko','giant-day-gecko','Brilliant neon green Madagascar giant day gecko. Active display animal with incredible coloring.',79.99,99.99,3,5,0,'Male','Adult','Normal','30g'],
      ['Mourning Gecko','mourning-gecko','Parthenogenic mourning gecko. Perfect for bioactive setups. Sold in groups of 3.',29.99,null,3,20,0,'Female','Adult','Normal','2g'],
      ['Lilly White Crested Gecko','lilly-white-crested-gecko','Rare Lilly White crested gecko with bright white lateral markings. Highly sought after morph.',449.99,549.99,3,1,1,'Male','Sub-Adult','Lilly White','20g'],
      // Isopods (cat 4)
      ['Dairy Cow Isopods (10ct)','dairy-cow-isopods','Porcellio laevis "Dairy Cow" - Bold black and white pattern. Excellent clean-up crew and feeders. Fast reproducing.',24.99,null,4,15,1,null,null,'Dairy Cow',null],
      ['Powder Orange Isopods (10ct)','powder-orange-isopods','Porcellionides pruinosus "Powder Orange" - Bright orange coloring. Hardy and prolific. Perfect starter culture.',14.99,19.99,4,25,0,null,null,'Powder Orange',null],
      ['Rubber Ducky Isopods (5ct)','rubber-ducky-isopods','Cubaris sp. "Rubber Ducky" - The most popular designer isopod. Adorable yellow coloring with unique shape.',89.99,119.99,4,4,1,null,null,'Rubber Ducky',null],
      ['Zebra Isopods (10ct)','zebra-isopods','Armadillidium maculatum "Zebra" - Striking striped pattern. Ball up when disturbed. Hardy and interesting.',34.99,null,4,10,0,null,null,'Zebra',null],
      ['Magic Potion Isopods (5ct)','magic-potion-isopods','Armadillidium vulgare "Magic Potion" - Beautiful purple and blue coloring. A true gem for collectors.',49.99,59.99,4,6,1,null,null,'Magic Potion',null],
      ['Giant Canyon Isopods (5ct)','giant-canyon-isopods','Porcellio dilatatus - One of the larger isopod species. Great for bioactive setups with larger reptiles.',19.99,null,4,12,0,null,null,'Giant Canyon',null],
      ['Panda King Isopods (5ct)','panda-king-isopods','Cubaris sp. "Panda King" - Black and white pattern resembling a panda. Premium collector species.',74.99,99.99,4,3,0,null,null,'Panda King',null],
      // Feeders (cat 5)
      ['Frozen Pinky Mice (25pk)','frozen-pinky-mice-25','Premium frozen pinky mice. Flash frozen for maximum nutrition. Perfect for small snakes and lizards.',19.99,null,5,50,0,null,null,null,'2-3g each'],
      ['Frozen Fuzzy Mice (25pk)','frozen-fuzzy-mice-25','Frozen fuzzy mice. Ideal size for juvenile ball pythons and similar-sized snakes.',24.99,null,5,50,0,null,null,null,'5-7g each'],
      ['Frozen Small Rats (10pk)','frozen-small-rats-10','Frozen small rats. Great for sub-adult ball pythons and growing boas.',29.99,null,5,40,1,null,null,null,'40-60g each'],
      ['Frozen Medium Rats (10pk)','frozen-medium-rats-10','Frozen medium rats. Perfect for adult ball pythons and medium-sized constrictors.',34.99,null,5,40,0,null,null,null,'80-120g each'],
      ['Frozen Large Rats (10pk)','frozen-large-rats-10','Frozen large rats for adult boas and larger snake species.',44.99,null,5,30,0,null,null,null,'150-250g each'],
      ['Live Crickets (500ct)','live-crickets-500','Live banded crickets. Gut-loaded and ready to feed. Various sizes available.',19.99,24.99,5,100,0,null,null,null,null],
      ['Dubia Roaches (100ct)','dubia-roaches-100','Live dubia roaches - the ultimate feeder insect. High protein, low chitin. Mixed sizes.',24.99,null,5,60,1,null,null,null,null],
      ['Superworms (100ct)','superworms-100','Live superworms. Excellent treat feeder for reptiles, amphibians, and fish.',9.99,null,5,80,0,null,null,null,null],
      ['Frozen Quail (6pk)','frozen-quail-6','Whole frozen quail. Perfect for monitors, tegus, and large snakes. Nutritious whole prey item.',14.99,null,5,25,0,null,null,null,'100-150g each'],
      ['Hornworms (12ct)','hornworms-12','Live hornworms on food. High moisture content, great for hydration. Irresistible to most reptiles.',12.99,16.99,5,35,0,null,null,null,null],
      // Supplies (cat 6)
      ['Premium Coconut Substrate (24qt)','coconut-substrate-24qt','Eco-friendly coconut fiber substrate. Perfect humidity retention for tropical species. Naturally resists mold.',14.99,null,6,30,0,null,null,null,null],
      ['Digital Thermometer/Hygrometer','digital-thermo-hygrometer','Precision digital thermometer and hygrometer combo. Displays temp and humidity simultaneously. Includes probe.',12.99,16.99,6,20,1,null,null,null,null],
      ['Ceramic Heat Emitter 100W','ceramic-heat-emitter-100w','100W ceramic heat emitter. Provides heat without light - perfect for nighttime heating. Long lasting.',16.99,null,6,25,0,null,null,null,null],
      ['Reptile Water Bowl - Large','reptile-water-bowl-large','Natural rock-look water bowl. Non-tip design, easy to clean. Perfect size for soaking.',11.99,null,6,15,0,null,null,null,null],
      ['Cork Bark Flat - Large','cork-bark-flat-large','Natural cork bark flat. Excellent hide and climbing surface. Each piece is unique.',19.99,24.99,6,12,0,null,null,null,null],
      ['Reptile Thermostat','reptile-thermostat','Digital on/off thermostat for heat sources. Keeps your enclosure at the perfect temperature. LED display.',29.99,39.99,6,18,1,null,null,null,null],
      ['Spray Bottle - 32oz','spray-bottle-32oz','Fine mist spray bottle for maintaining humidity. Adjustable nozzle from mist to stream.',5.99,null,6,40,0,null,null,null,null],
      ['UVB Light 10.0 T5 HO','uvb-light-10-t5-ho','High output T5 UVB bulb. Essential for proper calcium metabolism. 22" length.',24.99,null,6,15,0,null,null,null,null],
      ['Calcium Powder with D3 (8oz)','calcium-powder-d3','Premium calcium supplement with vitamin D3. Essential for bone health. Ultra fine powder adheres well to feeders.',8.99,null,6,35,0,null,null,null,null],
      ['Crested Gecko Diet - Mango (8oz)','crested-gecko-diet-mango','Complete crested gecko meal replacement powder. Mango flavor. Just add water. All-in-one nutrition.',13.99,null,6,22,0,null,null,null,null],
    ];

    for (const p of products) {
      db.prepare(`INSERT INTO products (name, slug, description, price, compare_price, category_id, stock, featured, sex, age, morph, weight) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`).run(...p);
    }
  }

  return db;
}

// Export as a promise that resolves to the db wrapper
module.exports = initDB();
