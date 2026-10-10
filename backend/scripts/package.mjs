// Builds function.zip (package.json, dist/, prompts/) for `function deploy`.
// The archive must be a real zip: Git Bash's GNU tar writes a plain tar archive even when the name ends
// in .zip, and Scaleway's build step rejects it. Windows ships bsdtar, which writes zips with -a;
// elsewhere the zip tool does it.
import { execFileSync } from 'node:child_process';
import { rmSync } from 'node:fs';

const OUT = 'function.zip';
const ITEMS = ['package.json', 'dist', 'prompts'];

// zip would update an existing archive and keep entries that no longer exist.
rmSync(OUT, { force: true });
try {
  if (process.platform === 'win32') {
    execFileSync(`${process.env.SystemRoot}\\System32\\tar.exe`, ['-a', '-cf', OUT, ...ITEMS], { stdio: 'inherit' });
  } else {
    execFileSync('zip', ['-r', '-q', OUT, ...ITEMS], { stdio: 'inherit' });
  }
} catch (err) {
  console.error(err.code === 'ENOENT' ? 'The zip command was not found: install it (for example apt install zip, or brew install zip).' : err.message);
  process.exit(1);
}
console.log(`${OUT} ready`);
