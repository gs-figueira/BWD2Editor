import * as types from "./types";
import { BitReader } from "../binary/bitreader";
import { BitWriter } from "../binary/bitwriter";
import { classSkillIds } from "./skills";

// BlackWolf (BaseMod/custom DLL) saves add sections between the attributes ("gf") and
// skills ("if"), e.g. "XS\0\0IK\0\0". Their layout is not known yet, so the raw bytes are
// kept and written back unchanged. The "if" header is only accepted when the class skill
// bytes after it are followed by the item list ("JM"), so data containing "if" can't fool it.
export async function readModSections(char: types.ID2S, reader: BitReader, constants: types.IConstantData) {
  const start = reader.offset >>> 3;
  const length = reader.bits.length >>> 3;
  // BitReader stores one bit per element
  const byteAt = (i: number) => {
    let v = 0;
    for (let b = 0; b < 8; b++) v |= reader.bits[i * 8 + b] << b;
    return v;
  };
  const skillBytes = classSkillIds(char, constants).length;
  for (let p = start; p + 2 + skillBytes + 2 <= length; p++) {
    const isIf = byteAt(p) === 0x69 && byteAt(p + 1) === 0x66;
    const q = p + 2 + skillBytes;
    if (isIf && byteAt(q) === 0x4a && byteAt(q + 1) === 0x4d) {
      char.mod_sections = [];
      for (let i = start; i < p; i++) char.mod_sections.push(byteAt(i));
      reader.SeekByte(p);
      return;
    }
  }
  // Level 1 saves can lack "if"; leave the reader where it is and let readSkills decide.
  char.mod_sections = [];
}

export async function writeModSections(char: types.ID2S): Promise<Uint8Array> {
  const writer = new BitWriter();
  if (char.mod_sections && char.mod_sections.length) {
    writer.WriteArray(Uint8Array.from(char.mod_sections));
  }
  return writer.ToArray();
}

/** Two-char tags found in the raw mod sections, for display/debugging only. */
export function describeModSections(raw: number[]): { tag: string; offset: number }[] {
  const tags = [] as { tag: string; offset: number }[];
  for (let i = 0; i + 1 < raw.length; i++) {
    const a = raw[i], b = raw[i + 1];
    if (a >= 0x41 && a <= 0x5a && b >= 0x41 && b <= 0x5a) tags.push({ tag: String.fromCharCode(a, b), offset: i });
  }
  return tags;
}
