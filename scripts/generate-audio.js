const { MsEdgeTTS, OUTPUT_FORMAT } = require('msedge-tts');
const fs = require('fs');
const path = require('path');

// Generates one mp3 per text that the app can narrate: explanation, meanwhile and reflection of every question.
// Output goes to public/audio/v2.
// Pass question ids to generate only those (e.g. `node scripts/generate-audio.js gr-006 gr-007`).
// Existing mp3 are skipped, so after editing a text delete its mp3 first. Each mp3 is about 125 KB.
const QUESTIONS_DIR = path.join(__dirname, '../src/data/questions');
const onlyIds = process.argv.slice(2);

const questions = fs
  .readdirSync(QUESTIONS_DIR)
  .filter(file => file.endsWith('.json'))
  .flatMap(file => JSON.parse(fs.readFileSync(path.join(QUESTIONS_DIR, file), 'utf-8')))
  .filter(q => onlyIds.length === 0 || onlyIds.includes(q.id));

const OUTPUT_DIR = path.join(__dirname, '../public/audio/v2');

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
