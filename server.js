// BACKEND CODE (Node.js with Express + Canvas)

const express = require('express');
const fs = require('fs');
const path = require('path');
const { createCanvas } = require('canvas');

const app = express();
const PORT = 3000;
const DATA_FILE = path.join(__dirname, 'visits.json');
const WIDTH = 88;
const HEIGHT = 31;

app.use(express.json());
app.use(express.static('public'));

// Load or initialize visit data
let visitData = {};
if (fs.existsSync(DATA_FILE)) {
  visitData = JSON.parse(fs.readFileSync(DATA_FILE));
}

// Count visits (API endpoint used by frontend JS — optional)
app.post('/api/visit', (req, res) => {
  const page = req.body.page || 'default';
  visitData[page] = (visitData[page] || 0) + 1;
  fs.writeFileSync(DATA_FILE, JSON.stringify(visitData, null, 2));
  res.json({ visits: visitData[page] });
});

// Serve counter image (badge-style)
app.get('/counter.png', (req, res) => {
  const page = req.query.page || 'default';
  visitData[page] = (visitData[page] || 0) + 1;
  fs.writeFileSync(DATA_FILE, JSON.stringify(visitData, null, 2));

  const canvas = createCanvas(WIDTH, HEIGHT);
  const ctx = canvas.getContext('2d');

  // Background
  ctx.fillStyle = '#222';
  ctx.fillRect(0, 0, WIDTH, HEIGHT);

  // Border
  ctx.strokeStyle = '#555';
  ctx.strokeRect(0, 0, WIDTH, HEIGHT);

  // Text
  ctx.fillStyle = '#fff';
  ctx.font = 'bold 12px sans-serif';
  const text = `Visits: ${visitData[page]}`;
  ctx.fillText(text, 4, 20); // adjust Y for alignment

  res.setHeader('Content-Type', 'image/png');
  canvas.pngStream().pipe(res);
});

app.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
});
