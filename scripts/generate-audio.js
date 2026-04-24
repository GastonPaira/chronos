const { MsEdgeTTS, OUTPUT_FORMAT } = require('msedge-tts');
const fs = require('fs');
const path = require('path');

const questionFiles = [
  'ancient-egypt.json',
  'ancient-greece.json',
  'roman-empire.json',
  'byzantine-empire.json',
  'crusades-chivalry.json',
  'vikings.json',
];

const questions = questionFiles.flatMap(file => {
  const filePath = path.join(__dirname, '../src/data/questions', file);
  return JSON.parse(fs.readFileSync(filePath, 'utf-8'));
});

const OUTPUT_DIR = path.join(__dirname, '../public/audio');

async function generateAudio(text, outputPath) {
  const tts = new MsEdgeTTS();
  await tts.setMetadata('en-US-AriaNeural', OUTPUT_FORMAT.AUDIO_24KHZ_48KBITRATE_MONO_MP3);

  await new Promise((resolve, reject) => {
    const { audioStream } = tts.toStream(text);
    const chunks = [];
    audioStream.on('data', chunk => chunks.push(chunk));
    audioStream.on('end', () => {
      fs.writeFileSync(outputPath, Buffer.concat(chunks));
      resolve();
    });
    audioStream.on('error', reject);
  });
}

async function main() {
  if (!fs.existsSync(OUTPUT_DIR)) {
    fs.mkdirSync(OUTPUT_DIR, { recursive: true });
  }

  const fields = [
    { key: 'question',     getter: q => q.question.en },
    { key: 'option0',      getter: q => q.options[0].en },
    { key: 'option1',      getter: q => q.options[1].en },
    { key: 'explanation',  getter: q => q.explanation.en },
    { key: 'meanwhile',    getter: q => q.meanwhile.en },
    { key: 'reflection',   getter: q => q.reflection.en },
  ];

  const totalFiles = questions.length * fields.length;
  let generated = 0;
  let skipped = 0;
  let errors = 0;
  let current = 0;

  for (const question of questions) {
    for (const field of fields) {
      current++;
      const filename = `${question.id}_${field.key}_en.mp3`;
      const outputPath = path.join(OUTPUT_DIR, filename);

      if (fs.existsSync(outputPath)) {
        console.log(`[${current}/${totalFiles}] Skipping ${filename} (already exists)`);
        skipped++;
        continue;
      }

      console.log(`[${current}/${totalFiles}] Generating ${filename}...`);
      try {
        const text = field.getter(question);
        await generateAudio(text, outputPath);
        generated++;
      } catch (err) {
        console.error(`  ERROR generating ${filename}: ${err.message}`);
        errors++;
      }
    }
  }

  console.log(`\nDone. ${generated} files generated, ${skipped} skipped, ${errors} errors.`);
}

main().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
