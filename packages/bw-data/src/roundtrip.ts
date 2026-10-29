// Regression check: read each save with the mod constants, write it back, and require
// identical bytes. Also prints a short summary so parsing mistakes are visible.
//
//   node packages/bw-data/src/roundtrip.ts <constants.json> <save.d2s>...

import { readFileSync } from "node:fs";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const d2s = require("../../d2s/lib/index.js");

const [constantsPath, ...saves] = process.argv.slice(2);
if (!constantsPath || !saves.length) {
  console.error("usage: roundtrip.ts <constants.json> <save.d2s>...");
  process.exit(1);
}
const constants = JSON.parse(readFileSync(constantsPath, "utf8"));
d2s.setConstantData(96, constants);

let failed = 0;
for (const path of saves) {
  const original = new Uint8Array(readFileSync(path));
  try {
    const char = await d2s.read(original, constants);
    const written: Uint8Array = await d2s.write(char, constants);
    const firstDiff = original.findIndex((b, i) => written[i] !== b);
    const same = written.length === original.length && firstDiff < 0;
    const spent = char.skills.filter((s: any) => s.points).map((s: any) => `${s.name ?? s.id}=${s.points}`);
    console.log(
      `${same ? "OK  " : "DIFF"} ${path}\n` +
        `     ${char.header.name} ${char.header.class} lvl ${char.header.level}, ` +
        `items ${char.items.length} merc ${char.merc_items?.length ?? 0}, ` +
        `mod_sections ${JSON.stringify(char.mod_sections)}, extra_attributes ${JSON.stringify(char.extra_attributes ?? [])}\n` +
        `     skills ${spent.join(", ")}`
    );
    if (!same) {
      failed++;
      console.log(`     size ${original.length} -> ${written.length}, first diff at 0x${firstDiff.toString(16)}`);
    }
  } catch (e) {
    failed++;
    console.log(`FAIL ${path}: ${(e as Error).stack}`);
  }
}
process.exit(failed ? 1 : 0);
