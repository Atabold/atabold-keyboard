// Prompt evaluation (SPEC section 11, milestone M0): runs eval/cases.jsonl against a deployed
// function with both profiles, signed with the development key of tools/.
//
//   node eval/run.mjs <base-url>
//
// Acceptance (SPEC 10, M0): valid JSON in 100% of cases, already-correct texts unchanged,
// median latency < 3 s on "fast" with the function already started.
import { readFileSync } from 'node:fs';
import { loadDevKey, signedPost } from '../tools/signing.mjs';

// The function allows RATE_PER_MINUTE=20: one request every 3 s, plus a margin.
const REQUEST_SPACING_MS = 3_100;

const baseUrl = process.argv[2];
if (!baseUrl) {
  console.log('usage: node eval/run.mjs <base-url>');
  process.exit(1);
}
const key = loadDevKey();
const cases = readFileSync(new URL('./cases.jsonl', import.meta.url), 'utf8')
  .split('\n')
  .filter((line) => line.trim())
  .map((line) => JSON.parse(line));

function check(testCase, response) {
  const { result, detected_lang, edits } = response;
  if (typeof result !== 'string' || typeof detected_lang !== 'string' || !Array.isArray(edits)) return 'invalid shape';
  const expect = testCase.expect;
  const problems = [];
  for (const s of expect.contains ?? []) if (!result.includes(s)) problems.push(`missing "${s}"`);
  for (const s of expect.not_contains ?? []) if (result.includes(s)) problems.push(`contains "${s}"`);
  if (expect.unchanged && (result !== testCase.text || edits.length > 0)) problems.push('text changed');
  if (expect.edits_empty && edits.length > 0) problems.push('edits not empty');
  if (expect.category && !edits.some((e) => e.category === expect.category)) problems.push(`no "${expect.category}" edit`);
  const note = expect.note;
  if (note && !(response.notes ?? []).some((n) => n.from === note.from && n.to === note.to)) problems.push(`no note "${note.from}" -> "${note.to}"`);
  return problems.join(', ');
}

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
const median = (values) => [...values].sort((a, b) => a - b)[Math.floor(values.length / 2)];

let started = Date.now();
const ping = await signedPost(baseUrl, '/v1/ping', '', key);
console.log(`ping ${ping.status} in ${Date.now() - started} ms (includes the cold start if the function was idle)\n`);

let failures = 0;
for (const profile of ['fast', 'accurate']) {
  const latencies = [];
  let validJson = 0;
  for (const testCase of cases) {
    await sleep(Math.max(0, REQUEST_SPACING_MS - (Date.now() - started)));
    started = Date.now();
    const body = JSON.stringify({ action: testCase.action, text: testCase.text, options: { ...testCase.options, profile } });
    let res, raw;
    try {
      res = await signedPost(baseUrl, '/v1/kb', body, key);
      raw = await res.text();
    } catch (err) {
      res = { status: 0 };
      raw = `network error ${err.cause?.code ?? err.message}`;
    }
    const latency = Date.now() - started;

    let problem;
    if (res.status !== 200) {
      problem = `HTTP ${res.status} ${raw}`;
    } else {
      const response = JSON.parse(raw);
      validJson++;
      latencies.push(latency);
      problem = check(testCase, response);
      if (problem) problem += `\n      result: ${response.result}`;
    }
    if (problem) failures++;
    console.log(`${problem ? 'FAIL' : 'ok  '} [${profile}] ${testCase.id} (${latency} ms)${problem ? `\n      ${problem}` : ''}`);
  }
  console.log(`\n[${profile}] valid JSON ${validJson}/${cases.length}, median latency ${median(latencies)} ms\n`);
}
console.log(failures ? `${failures} failing checks` : 'all checks passed');
process.exitCode = failures ? 1 : 0;
