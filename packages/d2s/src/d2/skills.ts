import * as types from "./types";
import { BitReader } from "../binary/bitreader";
import { BitWriter } from "../binary/bitwriter";

export async function readSkills(char: types.ID2S, reader: BitReader, constants: types.IConstantData) {
  char.skills = [] as types.ISkill[];
  const ids = classSkillIds(char, constants);
  const header = reader.ReadString(2); //0x0000 [skills header = 0x69, 0x66 "if"]
  if (header !== "if") {
    // header is not present in first save after char is created
    if (char.header.level === 1) {
      return; // TODO: return starter skills based on class
    }

    throw new Error(`Skills header 'if' not found at position ${reader.offset - 2 * 8}`);
  }
  for (const id of ids) {
    char.skills.push({
      id: id,
      points: reader.ReadUInt8(),
      name: constants.skills[id]?.s,
    } as types.ISkill);
  }
}

export async function writeSkills(char: types.ID2S, constants: types.IConstantData): Promise<Uint8Array> {
  const writer = new BitWriter();
  writer.WriteString("if", 2); //0x0000 [skills header = 0x69, 0x66 "if"]
  const ids = classSkillIds(char, constants);
  if (char.skills.length !== ids.length) {
    throw new Error(`Expected ${ids.length} skills for ${char.header.class}, got ${char.skills.length}`);
  }
  //probably array length checking/sorting of skills by id...
  for (let i = 0; i < ids.length; i++) {
    writer.WriteUInt8(char.skills[i].points);
  }
  return writer.ToArray();
}

// Class skill ids from the constants (one save byte each), else the vanilla 30-id block.
export function classSkillIds(char: types.ID2S, constants: types.IConstantData): number[] {
  const clazz = constants.classes.find((c) => c.n === char.header.class);
  if (clazz && clazz.sk && clazz.sk.length) {
    return clazz.sk;
  }
  const offset = SkillOffset[<string>char.header.class];
  return Array.from({ length: 30 }, (_, i) => offset + i);
}

interface ISkillOffset {
  [key: string]: number;
}

const SkillOffset: ISkillOffset = {
  Amazon: 6,
  Sorceress: 36,
  Necromancer: 66,
  Paladin: 96,
  Barbarian: 126,
  Druid: 221,
  Assassin: 251,
};
