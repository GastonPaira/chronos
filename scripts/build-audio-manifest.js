// Genera src/data/audio-manifest.json con la lista de mp3 que existen en public/audio.
// Corre solo antes de `npm run dev` y `npm run build` (scripts predev / prebuild).
// Así la app sabe qué textos tienen mp3 y cuáles usan la voz del navegador, sin pedir archivos que no existen.

const fs = require('fs');
const path = require('path');

const audioDir = path.join(__dirname, '../public/audio');
const outFile = path.join(__dirname, '../src/data/audio-manifest.json');

const ids = fs.existsSync(audioDir)
  ? fs.readdirSync(audioDir)
      .filter(name => name.endsWith('.mp3'))
      .map(name => name.slice(0, -'.mp3'.length))
      .sort()
  : [];

fs.writeFileSync(outFile, JSON.stringify(ids, null, 0) + '\n');
console.log(`audio-manifest: ${ids.length} mp3`);
