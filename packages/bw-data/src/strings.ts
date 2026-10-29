// D2 string lookup across the language tables.
//
// Global string ids: string.tbl 0..9999, patchstring.tbl 10000..19999,
// expansionstring.tbl 20000+ (verified against charstats.bin StrAllSkills/StrSkillTab ids).
// Lookup by key follows the game's priority: patch > expansion > string.

import { readTbl, type TblEntry } from "./tbl.ts";

export const TBL_ID_BASE = { string: 0, patchstring: 10000, expansionstring: 20000 } as const;
export type TblName = keyof typeof TBL_ID_BASE;

export class StringTable {
  readonly tables: Record<TblName, TblEntry[]>;

  constructor(files: Record<TblName, Uint8Array>) {
    this.tables = {
      string: readTbl(files.string),
      patchstring: readTbl(files.patchstring),
      expansionstring: readTbl(files.expansionstring),
    };
  }

  private entry(id: number): TblEntry | undefined {
    if (id >= TBL_ID_BASE.expansionstring) return this.tables.expansionstring[id - TBL_ID_BASE.expansionstring];
    if (id >= TBL_ID_BASE.patchstring) return this.tables.patchstring[id - TBL_ID_BASE.patchstring];
    return this.tables.string[id];
  }

  keyOf(id: number): string | undefined {
    return this.entry(id)?.key;
  }

  valueOf(id: number): string | undefined {
    return this.entry(id)?.value;
  }
}

/**
 * Text form d2s's _readStrings parses: one "key\tvalue" per line, first key wins.
 * Newlines inside values are escaped as a literal "\n" so a value stays on one line.
 */
export function tblToText(entries: TblEntry[]): string {
  const esc = (s: string) => s.replace(/\r?\n/g, "\\n").replace(/\t/g, " ");
  return entries.map((e) => `${esc(e.key)}\t${esc(e.value)}`).join("\r\n") + "\r\n";
}
