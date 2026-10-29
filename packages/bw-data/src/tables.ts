// Struct specs for the .bin tables the mod ships without a .txt, and their
// conversion back to the .txt columns that d2s's readConstantData expects.
// Offsets: D2MOO D2DataTbls.h / DataTbls/SkillsTbls.h / DataTbls/ItemsTbls.h (1.10 layout,
// which the BlackWolf 1.14 bins match byte-for-byte in record size).

import type { BinRecord, StructSpec } from "./bin.ts";
import type { StringTable } from "./strings.ts";

export const PlayerClassSpec: StructSpec = {
  name: "PlayerClass",
  size: 0x04,
  fields: [{ name: "code", offset: 0x00, type: "char", count: 4 }],
};

export const CharStatsSpec: StructSpec = {
  name: "CharStats",
  size: 0xc4,
  fields: [
    { name: "class", offset: 0x20, type: "char", count: 16 },
    { name: "str", offset: 0x30, type: "u8" },
    { name: "dex", offset: 0x31, type: "u8" },
    { name: "int", offset: 0x32, type: "u8" },
    { name: "vit", offset: 0x33, type: "u8" },
    { name: "stamina", offset: 0x34, type: "u8" },
    { name: "hpadd", offset: 0x35, type: "u8" },
    { name: "LifePerLevel", offset: 0x43, type: "u8" },
    { name: "StaminaPerLevel", offset: 0x44, type: "u8" },
    { name: "ManaPerLevel", offset: 0x45, type: "u8" },
    { name: "LifePerVitality", offset: 0x46, type: "u8" },
    { name: "StaminaPerVitality", offset: 0x47, type: "u8" },
    { name: "ManaPerMagic", offset: 0x48, type: "u8" },
    { name: "StatPerLevel", offset: 0x50, type: "u8" },
    { name: "StrAllSkills", offset: 0x52, type: "u16" },
    { name: "StrSkillTab", offset: 0x54, type: "u16", count: 3 },
    { name: "StrClassOnly", offset: 0x5a, type: "u16" },
    { name: "StartSkill", offset: 0xac, type: "u16" },
    { name: "BaseSkill", offset: 0xae, type: "i16", count: 10 },
  ],
};

export const SkillsSpec: StructSpec = {
  name: "Skills",
  size: 0x23c,
  fields: [
    { name: "Id", offset: 0x00, type: "i16" },
    { name: "charclass", offset: 0x0c, type: "i8" },
    { name: "skilldesc", offset: 0x194, type: "u16" },
  ],
};

export const SkillDescSpec: StructSpec = {
  name: "SkillDesc",
  size: 0x120,
  fields: [{ name: "id", offset: 0x00, type: "u16" }],
};

export const RareAffixSpec: StructSpec = {
  name: "RareAffix",
  size: 0x48,
  fields: [
    { name: "stringId", offset: 0x0c, type: "u16" },
    { name: "name", offset: 0x26, type: "char", count: 32 },
  ],
};

export type Tsv = { header: string[]; rows: (string | number)[][] };

export function toTsvText(tsv: Tsv): string {
  return [tsv.header, ...tsv.rows].map((r) => r.join("\t")).join("\r\n") + "\r\n";
}

export function playerClassTsv(classes: BinRecord[]): Tsv {
  return { header: ["Player Class", "Code"], rows: classes.map((c) => [c.code as string, c.code as string]) };
}

export function charStatsTsv(recs: BinRecord[], strings: StringTable): Tsv {
  const key = (id: number) => strings.keyOf(id) ?? "";
  return {
    header: [
      "class", "str", "dex", "int", "vit", "stamina", "hpadd",
      "LifePerLevel", "StaminaPerLevel", "ManaPerLevel", "LifePerVitality", "StaminaPerVitality", "ManaPerMagic",
      "StatPerLevel", "StrAllSkills", "StrSkillTab1", "StrSkillTab2", "StrSkillTab3", "StrClassOnly",
    ],
    rows: recs.map((r) => {
      const tabs = r.StrSkillTab as number[];
      return [
        r.class as string, r.str as number, r.dex as number, r.int as number, r.vit as number,
        r.stamina as number, r.hpadd as number,
        r.LifePerLevel as number, r.StaminaPerLevel as number, r.ManaPerLevel as number,
        r.LifePerVitality as number, r.StaminaPerVitality as number, r.ManaPerMagic as number,
        r.StatPerLevel as number,
        key(r.StrAllSkills as number), key(tabs[0]), key(tabs[1]), key(tabs[2]), key(r.StrClassOnly as number),
      ];
    }),
  };
}

/**
 * skilldescKeys[i] is the "skilldesc" column of skilldesc.txt row i
 * (skills.bin stores the row index, the txt stores the key).
 */
export function skillsTsv(recs: BinRecord[], classCodes: string[], skilldescKeys: string[]): Tsv {
  return {
    header: ["Id", "charclass", "skilldesc"],
    rows: recs.map((r) => {
      const cls = r.charclass as number;
      const desc = r.skilldesc as number;
      return [r.Id as number, cls >= 0 ? classCodes[cls] ?? "" : "", desc > 0 ? skilldescKeys[desc] ?? "" : ""];
    }),
  };
}

export function rareAffixTsv(recs: BinRecord[]): Tsv {
  return { header: ["name"], rows: recs.map((r) => [r.name as string]) };
}
