const { MsEdgeTTS, OUTPUT_FORMAT } = require('msedge-tts');
const fs = require('fs');
const path = require('path');

// Generates one mp3 per text that the app can narrate: question, explanation, meanwhile and reflection of every question.
// Output goes to public/audio/v2.
// Pass question ids to generate only those (e.g. `node scripts/generate-audio.js gr-006 gr-007`).
// Existing mp3 are skipped, so after editing a text delete its mp3 first. Each mp3 is about 90 KB.
// Edge TTS is free but rate-limited (HTTP 429) when a new connection is opened per file, so one connection is reused
// for all files; if it fails we reconnect and retry with a growing wait.
const QUESTIONS_DIR = path.join(__dirname, '../src/data/questions');
const OUTPUT_DIR = path.join(__dirname, '../public/audio/v2');
const VOICE = 'en-US-AndrewMultilingualNeural';
const PAUSE_BETWEEN_FILES_MS = 300;
const RETRY_WAITS_MS = [5000, 15000, 30000, 60000, 120000];
const MIN_VALID_BYTES = 2000;
const REQUEST_TIMEOUT_MS = 60000;

const onlyIds = process.argv.slice(2);

const questions = fs
  .readdirSync(QUESTIONS_DIR)
  .filter(file => file.endsWith('.json'))
  .flatMap(file => JSON.parse(fs.readFileSync(path.join(QUESTIONS_DIR, file), 'utf-8')))
  .filter(q => onlyIds.length === 0 || onlyIds.includes(q.id));

const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));

let tts = null;

async function connect() {
  tts = new MsEdgeTTS();
  await tts.setMetadata(VOICE, OUTPUT_FORMAT.AUDIO_24KHZ_48KBITRATE_MONO_MP3);
}

function disconnect() {
  try { tts?.close(); } catch { /* connection already closed */ }
  tts = null;
}

async function synthesize(text) {
  if (!tts) await connect();
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error('timeout waiting for audio')), REQUEST_TIMEOUT_MS);
    const { audioStream } = tts.toStream(text);
    const chunks = [];
    audioStream.on('data', chunk => chunks.push(chunk));
    audioStream.on('end', () => { clearTimeout(timer); resolve(Buffer.concat(chunks)); });
    audioStream.on('error', err => { clearTimeout(timer); reject(err); });
  });
}

async function generateAudio(text, outputPath) {
  for (let attempt = 0; ; attempt++) {
    try {
      const audio = await synthesize(text);
      if (audio.length < MIN_VALID_BYTES) throw new Error(`audio too small (${audio.length} bytes)`);
      // Write to a temp name first, so an interrupted run never leaves a broken mp3 that would be skipped next time.
      fs.writeFileSync(`${outputPath}.part`, audio);
      fs.renameSync(`${outputPath}.part`, outputPath);
      return;
    } catch (err) {
      if (attempt >= RETRY_WAITS_MS.length) throw err;
      disconnect();
      const wait = RETRY_WAITS_MS[attempt];
      console.log(`  ${err.message} - retrying in ${wait / 1000}s (${attempt + 1}/${RETRY_WAITS_MS.length})`);
      await sleep(wait);
    }
  }
}

async function main() {
  if (!fs.existsSync(OUTPUT_DIR)) {
    fs.mkdirSync(OUTPUT_DIR, { recursive: true });
  }

  const fields = [
    { key: 'question',     getter: q => q.question.en },
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
      await sleep(PAUSE_BETWEEN_FILES_MS);
    }
  }

  console.log(`\nDone. ${generated} files generated, ${skipped} skipped, ${errors} errors.`);
  console.log('Run `node scripts/build-audio-manifest.js` (or npm run dev / build) so the app picks up the new mp3.');
}

main().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
