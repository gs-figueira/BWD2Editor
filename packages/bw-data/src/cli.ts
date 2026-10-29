// Stage 1 of the data generator: turn the files extracted from the mod's MPQs
// into the plain .txt set that d2s's readConstantData consumes.
//
//   node packages/bw-data/src/cli.ts <extracted-mpq-root> <out-dir> [--lang eng]
//
// <extracted-mpq-root> holds data/global/excel and data/local/LNG/<lang> (see tools/extract_mpq.py).

import { copyFileSync, existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { readBin, type StructSpec } from "./bin.ts";
import { StringTable, TBL_ID_BASE, tblToText, type TblName } from "./strings.ts";
import { readTbl } from "./tbl.ts";
import {
  CharStatsSpec, PlayerClassSpec, RareAffixSpec, SkillDescSpec, SkillsSpec,
  charStatsTsv, playerClassTsv, rareAffixTsv, skillsTsv, toTsvText,
} from "./tables.ts";

const args = process.argv.slice(2);
const langIdx = args.indexOf("--lang");
const lang = langIdx >= 0 ? args.splice(langIdx, 2)[1] : "eng";
const [root, outDir] = args;
if (!root || !outDir) {
  console.error("usage: cli.ts <extracted-mpq-root> <out-dir> [--lang eng]");
  process.exit(1);
}

const excelDir = join(root, "data/global/excel");
const lngDir = join(root, "data/local/LNG", lang);
mkdirSync(outDir, { recursive: true });

// Case-insensitive file lookup: MPQ names mix "Armor.txt" / "armor.bin".
const excelFiles = readdirSync(excelDir);
const findExcel = (name: string) => excelFiles.find((f) => f.toLowerCase() === name.toLowerCase());
const loadExcel = (name: string) => {
  const f = findExcel(name);
  if (!f) throw new Error(`missing ${name} in ${excelDir}`);
  return readFileSync(join(excelDir, f));
};
const bin = (name: string, spec: StructSpec) => readBin(loadExcel(`${name}.bin`), spec);

const report: Record<string, unknown> = { source: root, lang, copied: [] as string[], decoded: [] as string[] };
const warnings: string[] = [];

// 1. Tables the mod ships as .txt go through unchanged.
for (const f of excelFiles.filter((f) => f.toLowerCase().endsWith(".txt"))) {
  copyFileSync(join(excelDir, f), join(outDir, f));
  (report.copied as string[]).push(f);
}

// 2. String tables -> "key\tvalue" text files.
const lngFiles = readdirSync(lngDir);
const tblFile = (n: string) => lngFiles.find((f) => f.toLowerCase() === `${n.toLowerCase()}.tbl`);
const tblBuffers = {} as Record<TblName, Uint8Array>;
for (const name of Object.keys(TBL_ID_BASE) as TblName[]) {
  const f = tblFile(name);
  if (!f) throw new Error(`missing ${name}.tbl in ${lngDir}`);
  tblBuffers[name] = readFileSync(join(lngDir, f));
}
const strings = new StringTable(tblBuffers);
for (const name of Object.keys(TBL_ID_BASE) as TblName[]) {
  writeFileSync(join(outDir, `${name}.txt`), tblToText(strings.tables[name]));
}
// Extra mod tables (e.g. BaseMod.tbl) have no global id range; export them for key lookup only.
const extraTbls = lngFiles.filter(
  (f) => f.toLowerCase().endsWith(".tbl") && !(Object.keys(TBL_ID_BASE) as string[]).includes(f.slice(0, -4).toLowerCase())
);
for (const f of extraTbls) {
  writeFileSync(join(outDir, `${f.slice(0, -4)}.txt`), tblToText(readTbl(readFileSync(join(lngDir, f)))));
}
report.strings = {
  ...Object.fromEntries((Object.keys(TBL_ID_BASE) as TblName[]).map((n) => [n, strings.tables[n].length])),
  extra: extraTbls,
};

// 3. Tables that only exist as .bin are decompiled into the columns d2s reads.
const emit = (txtName: string, text: string) => {
  if (findExcel(txtName)) {
    warnings.push(`${txtName} exists as .txt; .bin decode skipped`);
    return;
  }
  writeFileSync(join(outDir, txtName), text);
  (report.decoded as string[]).push(txtName);
};

const classes = bin("PlayerClass", PlayerClassSpec);
const classCodes = classes.map((c) => (c.code as string).trim());
emit("PlayerClass.txt", toTsvText(playerClassTsv(classes)));

const charStats = bin("CharStats", CharStatsSpec);
if (charStats.length !== classes.length) {
  warnings.push(`CharStats has ${charStats.length} classes but PlayerClass has ${classes.length}`);
}
emit("CharStats.txt", toTsvText(charStatsTsv(charStats, strings)));

// skills.bin references skilldesc rows by index; map them to skilldesc.txt keys.
const skillDescTxt = loadExcel("skilldesc.txt").toString("latin1").split(/\r?\n/).map((l) => l.split("\t"));
const descCol = skillDescTxt[0].indexOf("skilldesc");
const skilldescKeys = skillDescTxt.slice(1).filter((r) => r.length > 1).map((r) => r[descCol]);
const skillDescBin = bin("skilldesc", SkillDescSpec);
const descMismatch = skillDescBin.findIndex((r, i) => r.id !== i);
if (skillDescBin.length !== skilldescKeys.length || descMismatch >= 0) {
  warnings.push(
    `skilldesc.bin/txt disagree: ${skillDescBin.length} vs ${skilldescKeys.length} rows, first id mismatch at ${descMismatch}`
  );
}
const skills = bin("skills", SkillsSpec);
const idMismatch = skills.findIndex((s, i) => s.Id !== i);
if (idMismatch >= 0) warnings.push(`skills.bin: record ${idMismatch} has Id ${skills[idMismatch].Id}`);
emit("skills.txt", toTsvText(skillsTsv(skills, classCodes, skilldescKeys)));

// The "if" section of the save has one byte per class skill, in ascending skill id
// (vanilla: 30 contiguous ids; BlackWolf: 31, not contiguous — verified on PracticeSorc.d2s).
report.classSkills = classCodes.map((code, ci) => {
  const ids = skills.filter((s) => s.charclass === ci).map((s) => s.Id as number).sort((a, b) => a - b);
  return { code, class: charStats[ci]?.class, count: ids.length, ids };
});

emit("RarePrefix.txt", toTsvText(rareAffixTsv(bin("RarePrefix", RareAffixSpec))));
emit("RareSuffix.txt", toTsvText(rareAffixTsv(bin("RareSuffix", RareAffixSpec))));

report.warnings = warnings;
writeFileSync(join(outDir, "bw-data.report.json"), JSON.stringify(report, null, 2) + "\n");
console.log(JSON.stringify({ ...report, copied: (report.copied as string[]).length }, null, 2));
if (!existsSync(join(outDir, "skills.txt"))) process.exit(2);
