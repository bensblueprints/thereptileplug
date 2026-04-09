const https = require('https');
const http = require('http');
const fs = require('fs');
const path = require('path');

const UPLOAD_DIR = path.join(__dirname, 'uploads');
if (!fs.existsSync(UPLOAD_DIR)) fs.mkdirSync(UPLOAD_DIR, { recursive: true });

const images = [
  // Snakes
  [1, 'https://upload.wikimedia.org/wikipedia/commons/a/aa/Hatchling_Pastel_Ball_Python.jpg', 'pastel-ball-python.jpg'],
  [2, 'https://upload.wikimedia.org/wikipedia/commons/d/d2/Banana_python.png', 'banana-ball-python.png'],
  [3, 'https://upload.wikimedia.org/wikipedia/commons/c/cf/Piebald_%28Pied%29_Ball_Python.jpg', 'piebald-ball-python.jpg'],
  [4, 'https://upload.wikimedia.org/wikipedia/commons/4/4d/Ball_python_lucy.JPG', 'normal-ball-python.jpg'],
  [5, 'https://upload.wikimedia.org/wikipedia/commons/9/9c/Albino_ball_python.png', 'albino-ball-python.png'],
  [6, 'https://upload.wikimedia.org/wikipedia/commons/b/b1/Boa_constrictor_imperator.jpg', 'colombian-red-tail-boa.jpg'],
  [7, 'https://upload.wikimedia.org/wikipedia/commons/0/0c/Mochi_Ball_Python.JPG', 'enchi-ball-python.jpg'],
  [8, 'https://upload.wikimedia.org/wikipedia/commons/4/4e/JuvenileMojaveBallPython.png', 'ghi-mojave-ball-python.png'],
  [9, 'https://upload.wikimedia.org/wikipedia/commons/e/e3/Orange_Ghost_%28Hypomelanistic%29_Ball_Python.jpg', 'clown-ball-python.jpg'],
  [10, 'https://upload.wikimedia.org/wikipedia/commons/0/06/Adult-mexican-black-kingsnake.png', 'mexican-black-kingsnake.png'],
  // Geckos
  [11, 'https://upload.wikimedia.org/wikipedia/commons/a/a0/Gekkoninae_Rhacodactylus_ciliatus_orange.png', 'flame-crested-gecko.png'],
  [12, 'https://upload.wikimedia.org/wikipedia/commons/e/ed/Gekon_orz%C4%99siony%2C_Correlophus_ciliatus_Harlequin.jpg', 'harlequin-crested-gecko.jpg'],
  [13, 'https://upload.wikimedia.org/wikipedia/commons/a/a5/Rhacodactylus_ciliatus_%22dalmatien%22.jpg', 'dalmatian-crested-gecko.jpg'],
  [14, 'https://upload.wikimedia.org/wikipedia/commons/d/da/Rhacodactylus_leachianus_-_gecko_geant_de_nouvelle_caledonie_-Cedric_Loury_-_wiki12.JPG', 'leachianus-gecko.jpg'],
  [15, 'https://upload.wikimedia.org/wikipedia/commons/8/86/Gekko_gecko_192144834.jpg', 'tokay-gecko.jpg'],
  [16, 'https://upload.wikimedia.org/wikipedia/commons/8/8b/Madagascar_giant_day_gecko_%28Phelsuma_grandis%29_Nosy_Komba.jpg', 'giant-day-gecko.jpg'],
  [17, 'https://upload.wikimedia.org/wikipedia/commons/f/f2/Mourning_Gecko_2021.jpg', 'mourning-gecko.jpg'],
  [18, 'https://upload.wikimedia.org/wikipedia/commons/d/d9/Crested_gecko_-_1.jpg', 'lilly-white-crested-gecko.jpg'],
  // Isopods
  [19, 'https://upload.wikimedia.org/wikipedia/commons/4/4b/Porcellio_laevis_-_Bouxweerd20090527_897.jpg', 'dairy-cow-isopods.jpg'],
  [20, 'https://upload.wikimedia.org/wikipedia/commons/c/cc/Porcellionides_pruinosus_P1380341a.jpg', 'powder-orange-isopods.jpg'],
  [21, 'https://upload.wikimedia.org/wikipedia/commons/9/95/Cubaris_murina.png', 'rubber-ducky-isopods.png'],
  [22, 'https://upload.wikimedia.org/wikipedia/commons/0/04/Zebra_Isopod_%28Armadillidium_maculatum%29.png', 'zebra-isopods.png'],
  [23, 'https://upload.wikimedia.org/wikipedia/commons/2/2f/Armadillidium_vulgare_000.jpg', 'magic-potion-isopods.jpg'],
  [24, 'https://upload.wikimedia.org/wikipedia/commons/7/7c/Porcellio_dilatatus_4762119.jpg', 'giant-canyon-isopods.jpg'],
  [25, 'https://upload.wikimedia.org/wikipedia/commons/9/95/Cubaris_murina.png', 'panda-king-isopods.png'],
  // Feeders
  [26, 'https://upload.wikimedia.org/wikipedia/commons/4/4d/Pinky_mice.JPG', 'frozen-pinky-mice.jpg'],
  [27, 'https://upload.wikimedia.org/wikipedia/commons/2/2f/Fuzzy_and_pinky_mice.JPG', 'frozen-fuzzy-mice.jpg'],
  [28, 'https://upload.wikimedia.org/wikipedia/commons/1/1d/Albino_Rat.jpg', 'frozen-small-rats.jpg'],
  [29, 'https://upload.wikimedia.org/wikipedia/commons/b/b2/10_Male_Rats.jpg', 'frozen-medium-rats.jpg'],
  [30, 'https://upload.wikimedia.org/wikipedia/commons/b/b2/10_Male_Rats.jpg', 'frozen-large-rats.jpg'],
  [31, 'https://upload.wikimedia.org/wikipedia/commons/b/b1/Gryllus_bimaculatus_%28Mediterranean_field_cricket%29%2C_Skala_Kalloni%2C_Lesbos%2C_Greece.jpg', 'live-crickets.jpg'],
  [32, 'https://upload.wikimedia.org/wikipedia/commons/7/70/Blaptica_dubia_%28Serville%2C_1839%29.jpg', 'dubia-roaches.jpg'],
  [33, 'https://upload.wikimedia.org/wikipedia/commons/9/9a/Zophobas_morio_larva_-_top_%28aka%29.jpg', 'superworms.jpg'],
  [34, 'https://upload.wikimedia.org/wikipedia/commons/0/0f/Rain_Quail.JPG', 'frozen-quail.jpg'],
  [35, 'https://upload.wikimedia.org/wikipedia/commons/1/1c/Tomato_Hornworm_Larva_-_Relic38_-_Ontario_Canada.JPG', 'hornworms.jpg'],
  // Supplies
  [36, 'https://upload.wikimedia.org/wikipedia/commons/3/3a/Brick_of_coco_coir.JPG', 'coconut-substrate.jpg'],
  [37, 'https://upload.wikimedia.org/wikipedia/commons/0/07/Thermo-Hygrometer.JPG', 'thermo-hygrometer.jpg'],
  [38, 'https://upload.wikimedia.org/wikipedia/commons/0/07/Infrared_Heat_Lamp.jpg', 'ceramic-heat-emitter.jpg'],
  [39, 'https://upload.wikimedia.org/wikipedia/commons/1/10/Doggie_dish_%28152143213%29.jpg', 'reptile-water-bowl.jpg'],
  [40, 'https://upload.wikimedia.org/wikipedia/commons/0/08/Cork_oak_in_Israel_-_Bark_-2.JPG', 'cork-bark.jpg'],
  [41, 'https://upload.wikimedia.org/wikipedia/commons/d/dd/A_touch-screen_programmable_thermostat.jpg', 'reptile-thermostat.jpg'],
  [42, 'https://upload.wikimedia.org/wikipedia/commons/0/0b/Spray_bottles.jpg', 'spray-bottle.jpg'],
  [43, 'https://upload.wikimedia.org/wikipedia/commons/c/cd/Shining_fluorescent_lamp.JPG', 'uvb-light.jpg'],
  [44, 'https://upload.wikimedia.org/wikipedia/commons/2/2f/500_mg_calcium_supplements_with_vitamin_D.jpg', 'calcium-powder.jpg'],
  [45, 'https://upload.wikimedia.org/wikipedia/commons/d/d9/Crested_gecko_-_1.jpg', 'crested-gecko-diet.jpg'],
];

function download(url, dest) {
  return new Promise((resolve, reject) => {
    const file = fs.createWriteStream(dest);
    const proto = url.startsWith('https') ? https : http;
    proto.get(url, { headers: { 'User-Agent': 'Mozilla/5.0' } }, (res) => {
      if (res.statusCode === 301 || res.statusCode === 302) {
        file.close();
        fs.unlinkSync(dest);
        return download(res.headers.location, dest).then(resolve).catch(reject);
      }
      if (res.statusCode !== 200) {
        file.close();
        fs.unlinkSync(dest);
        return reject(new Error(`HTTP ${res.statusCode} for ${url}`));
      }
      res.pipe(file);
      file.on('finish', () => { file.close(); resolve(); });
    }).on('error', (err) => {
      file.close();
      if (fs.existsSync(dest)) fs.unlinkSync(dest);
      reject(err);
    });
  });
}

async function main() {
  const dbPromise = require('./db');
  const db = await dbPromise;

  let success = 0, failed = 0;

  for (const [id, url, filename] of images) {
    const dest = path.join(UPLOAD_DIR, filename);
    try {
      if (!fs.existsSync(dest)) {
        process.stdout.write(`Downloading ${filename}...`);
        await download(url, dest);
        const size = fs.statSync(dest).size;
        if (size < 1000) {
          fs.unlinkSync(dest);
          throw new Error('File too small, likely error page');
        }
        console.log(` OK (${(size/1024).toFixed(0)}KB)`);
      } else {
        console.log(`${filename} already exists, skipping`);
      }

      // Update DB
      const imgPath = '/uploads/' + filename;
      db.prepare('UPDATE products SET image = ? WHERE id = ?').run(imgPath, id);
      success++;
    } catch(e) {
      console.log(` FAILED: ${e.message}`);
      failed++;
    }
  }

  console.log(`\nDone! ${success} success, ${failed} failed`);
}

main().catch(console.error);
