// Stage 2 of the data generator: build d2s constant data from the stage-1 .txt set.
//
//   node packages/bw-data/src/constants.ts <txt-dir> <out-dir>
//
// Writes constants.json (IConstantData plus BlackWolf extras) and constants_96.bundle.js,
// which defines `var constants_96 = { constants }` like the bundle d2s-editor ships.
// Needs packages/d2s built (npx tsc in packages/d2s).

import { mkdirSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import { createRequire } from "node:module";
import { join } from "node:path";

const require = createRequire(import.meta.url);
const d2s = require("../../d2s/lib/index.js");

const [txtDir, outDir] = process.argv.slice(2);
if (!txtDir || !outDir) {
  console.error("usage: constants.ts <txt-dir> <out-dir>");
  process.exit(1);
}

const buffers: Record<string, string> = {};
for (const f of readdirSync(txtDir).filter((f) => f.toLowerCase().endsWith(".txt"))) {
  // excel tables are cp1252/latin1; string tables were re-encoded to UTF-8 by stage 1
  const enc = /^(string|patchstring|expansionstring|basemod)\.txt$/i.test(f) ? "utf8" : "latin1";
  buffers[f] = readFileSync(join(txtDir, f), enc);
}

const constants = d2s.readConstantData(buffers);

// BlackWolf extras the editor needs (vanilla d2s-editor hardcodes these).
const inv = buffers[Object.keys(buffers).find((k) => k.toLowerCase() === "inventory.txt")!]
  .split(/\r?\n/)
  .map((l) => l.split("\t"));
const col = (name: string) => inv[0].indexOf(name);
const grid = (row: string) => {
  const r = inv.find((l) => l[0] === row);
  if (!r) throw new Error(`inventory.txt: no row ${row}`);
  return { w: +r[col("gridX")], h: +r[col("gridY")] };
};
// "*2" rows are the 800x600 layout, which is what the game uses in LoD.
constants.bw = {
  grids: {
    inventory: grid("Amazon2"),
    stash: grid("Big Bank Page2"),
    cube: grid("Transmogrify Box2"),
  },
};

mkdirSync(outDir, { recursive: true });
const json = JSON.stringify(constants);
writeFileSync(join(outDir, "constants.json"), json);
writeFileSync(join(outDir, "constants_96.bundle.js"), `var constants_96 = { constants: ${json} };\n`);

const count = (o: unknown) => (Array.isArray(o) ? o.filter(Boolean).length : Object.keys(o as object).length);
console.log(
  JSON.stringify(
    {
      classes: constants.classes.map((c: any) => `${c.n}:${c.sk.length}`),
      skills: count(constants.skills),
      magical_properties: count(constants.magical_properties),
      armor: count(constants.armor_items),
      weapons: count(constants.weapon_items),
      other: count(constants.other_items),
      uniques: count(constants.unq_items),
      sets: count(constants.set_items),
      runewords: count(constants.runewords),
      grids: constants.bw.grids,
      bytes: json.length,
    },
    null,
    2
  )
);
