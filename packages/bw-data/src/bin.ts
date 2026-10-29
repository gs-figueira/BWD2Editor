// Reader for Diablo II 1.10+ compiled data tables (.bin).
//
// A .bin is a u32 record count followed by fixed-size records, which are the
// in-memory D2xxxTxt structs. Struct layouts come from D2MOO
// (github.com/ThePhrozenKeep/D2MOO, source/D2Common/include/**/DataTbls*.h).

export type FieldType = "u8" | "i8" | "u16" | "i16" | "u32" | "i32" | "char";

export interface Field {
  name: string;
  offset: number;
  type: FieldType;
  /** array length, or byte length for "char" */
  count?: number;
}

export interface StructSpec {
  name: string;
  size: number;
  fields: Field[];
}

export type BinRecord = Record<string, number | string | number[]>;

const SIZES: Record<Exclude<FieldType, "char">, number> = { u8: 1, i8: 1, u16: 2, i16: 2, u32: 4, i32: 4 };
const decoder = new TextDecoder("latin1");

function readScalar(view: DataView, offset: number, type: Exclude<FieldType, "char">): number {
  switch (type) {
    case "u8": return view.getUint8(offset);
    case "i8": return view.getInt8(offset);
    case "u16": return view.getUint16(offset, true);
    case "i16": return view.getInt16(offset, true);
    case "u32": return view.getUint32(offset, true);
    case "i32": return view.getInt32(offset, true);
  }
}

export function readBin(buf: Uint8Array, spec: StructSpec): BinRecord[] {
  const view = new DataView(buf.buffer, buf.byteOffset, buf.byteLength);
  const count = view.getUint32(0, true);
  if (4 + count * spec.size !== buf.length) {
    throw new Error(
      `${spec.name}: expected ${count} records of ${spec.size} bytes (${4 + count * spec.size}), file has ${buf.length}`
    );
  }
  const records: BinRecord[] = [];
  for (let r = 0; r < count; r++) {
    const base = 4 + r * spec.size;
    const rec: BinRecord = {};
    for (const f of spec.fields) {
      const at = base + f.offset;
      if (f.type === "char") {
        const bytes = buf.subarray(at, at + (f.count ?? 1));
        const nul = bytes.indexOf(0);
        rec[f.name] = decoder.decode(nul < 0 ? bytes : bytes.subarray(0, nul));
      } else if (f.count) {
        const arr: number[] = [];
        for (let i = 0; i < f.count; i++) arr.push(readScalar(view, at + i * SIZES[f.type], f.type));
        rec[f.name] = arr;
      } else {
        rec[f.name] = readScalar(view, at, f.type);
      }
    }
    records.push(rec);
  }
  return records;
}
