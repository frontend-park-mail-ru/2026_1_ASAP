import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';

const app = express();
const PORT = process.env.PORT || 3000;
const HOST = process.env.HOST || '0.0.0.0';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const distPath = path.join(__dirname, '../dist');

const immutableAssetPattern = /^bundle\..+\.[a-f0-9]+\.((js)|(css))$/;

function setCacheHeaders(res, filePath) {
  const fileName = path.basename(filePath);

  if (fileName === 'service-worker.js' || fileName === 'index.html' || fileName === 'support.html' || fileName === 'manifest.json') {
    res.setHeader('Cache-Control', 'no-cache');
    return;
  }

  if (immutableAssetPattern.test(fileName)) {
    res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
    return;
  }

  res.setHeader('Cache-Control', 'public, max-age=86400');
}

app.use(express.static(distPath, { setHeaders: setCacheHeaders }));

app.get('*', (req, res) => {
  res.setHeader('Cache-Control', 'no-cache');
  res.sendFile(path.join(distPath, 'index.html'));
});

app.listen(PORT, HOST, () => {
  console.log(`Server running at http://${HOST}:${PORT}`);
});
