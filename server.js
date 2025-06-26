// 🌸 Kawaii Counter Server 🌸

const express = require('express');
const fs = require('fs');
const multer = require('multer');
const path = require('path');
const sharp = require('sharp');
const crypto = require('crypto');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(express.static('public'));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// File upload setup
const upload = multer({ dest: 'uploads/' });

// Path to counters data file
const COUNTERS_FILE = path.join(__dirname, 'counters.json');

// In-memory counter store
let counters = {};

// Load counters from file
function loadCounters() {
  if (fs.existsSync(COUNTERS_FILE)) {
    try {
      const data = fs.readFileSync(COUNTERS_FILE, 'utf8');
      counters = JSON.parse(data);
      console.log('✅ Counters loaded from file');
    } catch (err) {
      console.error('❌ Failed to load counters:', err);
      counters = {};
    }
  }
}

// Save counters to file
function saveCounters() {
  try {
    fs.writeFileSync(COUNTERS_FILE, JSON.stringify(counters, null, 2));
    console.log('💾 Counters saved to file');
  } catch (err) {
    console.error('❌ Failed to save counters:', err);
  }
}

// Generate a unique ID for each counter
function generateId() {
  return crypto.randomBytes(6).toString('hex');
}

// Initialize counters on startup
loadCounters();


// =======================
// 📦 API ROUTES
// =======================

// Create a new counter
app.post('/create', (req, res) => {
  const { site, startAt, options } = req.body;

  if (!site || !options) {
    return res.status(400).json({ error: 'Missing site or options' });
  }

  const id = generateId();
  counters[id] = {
    count: parseInt(startAt, 10) || 0,
    site,
    options,
    bg: null,
  };

  saveCounters();
  console.log(`🎉 Created new counter: ${id} (start at ${counters[id].count})`);
  res.json({ id });
});

// Upload a background image for a counter
app.post('/upload-bg', upload.single('bgImage'), async (req, res) => {
  const { counterId } = req.body;

  if (!counterId || !counters[counterId]) {
    return res.status(400).send('Invalid counter ID');
  }

  const destDir = path.join(__dirname, 'public', 'bg');
  if (!fs.existsSync(destDir)) fs.mkdirSync(destDir, { recursive: true });

  const dest = path.join(destDir, `${counterId}.png`);

  try {
    await sharp(req.file.path).resize(88, 31).toFile(dest);
    fs.unlinkSync(req.file.path);
    counters[counterId].bg = `/bg/${counterId}.png`;
    saveCounters();
    res.send('✅ Background uploaded');
  } catch (err) {
    console.error(err);
    res.status(500).send('❌ Failed to process image');
  }
});

// Serve and increment counter image
app.get('/counter.png', (req, res) => {
  const id = req.query.page;
  if (!id || !counters[id]) {
    return res.status(404).send('Counter not found');
  }
  counters[id].count++;
  saveCounters();
  generateImage(req.query, counters[id], res);
});

// Serve counter image without incrementing
app.get('/static-counter.png', (req, res) => {
  const id = req.query.page;
  if (!id || !counters[id]) {
    return res.status(404).send('Counter not found');
  }
  generateImage(req.query, counters[id], res);
});

// Preview a sample counter
app.get('/preview.png', (req, res) => {
  const dummyData = {
    count: 12345,
    options: {
      label: req.query.label || 'Visits',
      font: req.query.font || 'Arial',
      bg: req.query.bg || '#ffe4ec',
      fontColor: req.query.fontColor || '#000',
      border: req.query.border || 'solid',
      borderColor: req.query.borderColor || '#000',
      borderWidth: req.query.borderWidth || '2',
      layout: req.query.layout || 'default',
    },
  };
  generateImage(req.query, dummyData, res);
});

// Return all counter IDs
app.get('/all-counters', (req, res) => {
  const ids = Object.keys(counters);
  res.json(ids);
});


// =======================
// 🖼️ SVG IMAGE GENERATOR
// =======================

function generateImage(query, data, res) {
  const opts = data.options || {};

  const label = opts.label || query.label || 'Visits';
  const font = opts.font || query.font || 'Arial';
  const bg = opts.bg || query.bg || '#ffe4ec';
  const fontColor = opts.fontColor || query.fontColor || '#000';
  const border = opts.border || query.border || 'solid';
  const borderColor = opts.borderColor || query.borderColor || '#000';
  const borderWidth = opts.borderWidth || query.borderWidth || '2';
  const layout = opts.layout || query.layout || 'default';

  const dashArray = border === 'dotted' ? '4' : border === 'double' ? '1 1' : '0';
  const rx = border === 'rounded' ? 6 : 0;

  // Embed background image as base64
  let bgImageTag = '';
  if (data.bg) {
    const bgPath = path.join(__dirname, 'public', data.bg);
    try {
      const bgBuffer = fs.readFileSync(bgPath);
      const bgBase64 = bgBuffer.toString('base64');
      bgImageTag = `<image href="data:image/png;base64,${bgBase64}" width="88" height="31" />`;
    } catch (err) {
      console.error('Failed to embed background image:', err);
    }
  }

  // Layout-specific SVG content
  let svgContent = '';
  if (layout === 'number-only') {
    svgContent = `<text x="44" y="16" dominant-baseline="middle" text-anchor="middle" font-size="20" font-family="${font}" fill="${fontColor}" font-weight="bold">${data.count}</text>`;
  } else if (layout === 'side-by-side') {
    svgContent = `
      <text x="12" y="16" dominant-baseline="middle" text-anchor="start" font-size="10" font-family="${font}" fill="${fontColor}">${label}</text>
      <text x="76" y="16" dominant-baseline="middle" text-anchor="end" font-size="18" font-family="${font}" fill="${fontColor}" font-weight="bold">${data.count}</text>
    `;
  } else if (layout === 'vertical-label') {
    svgContent = `
      <g transform="translate(12, 15) rotate(-90)">
        <text x="0" y="0" dominant-baseline="middle" text-anchor="middle" font-size="10" font-family="${font}" fill="${fontColor}">${label}</text>
      </g>
      <text x="70" y="16" dominant-baseline="middle" text-anchor="end" font-size="20" font-family="${font}" fill="${fontColor}" font-weight="bold">${data.count}</text>
    `;
  } else {
    svgContent = `
      <text x="44" y="12" dominant-baseline="middle" text-anchor="middle" font-size="9" font-family="${font}" fill="${fontColor}">${label}</text>
      <text x="44" y="24" dominant-baseline="middle" text-anchor="middle" font-size="14" font-family="${font}" fill="${fontColor}" font-weight="bold">${data.count}</text>
    `;
  }

  // Final SVG output
  const svg = `
    <svg width="88" height="31" xmlns="http://www.w3.org/2000/svg">
      <rect width="88" height="31" rx="${rx}" fill="${bg}" stroke="${borderColor}" stroke-width="${borderWidth}" stroke-dasharray="${dashArray}" />
      ${bgImageTag}
      ${svgContent}
    </svg>
  `;

  res.setHeader('Content-Type', 'image/svg+xml');
  res.send(svg);
}

// Start the server
app.listen(PORT, () => {
  console.log(`🚀 Kawaii Counter server listening on port ${PORT}`);
});
