// Reader for Diablo II 1.x string tables (.tbl).
//
// Layout (little endian):
//   header (21 bytes): u16 crc, u16 numElements, u32 hashTableSize, u8 version,
//                      u32 dataStartOffset, u32 maxTries, u32 fileSize
//   u16 elementIndex[numElements]   -> index into the hash table, in string-id order
//   hashNode[hashTableSize] (17 bytes): u8 used, u16 idx, u32 hash, u32 keyOffset, u32 strOffset, u16 strLen
// Keys and values are NUL-terminated strings at absolute file offsets.
// Vanilla tables are cp1252, but the BlackWolf tables are UTF-8 (even the 'ÿc'
// color prefix is stored as C3 BF), so try UTF-8 first and fall back to latin1.

export interface TblEntry {
  key: string;
  value: string;
}

const HEADER_SIZE = 21;
const NODE_SIZE = 17;

const utf8 = new TextDecoder("utf-8", { fatal: true });
const latin1 = new TextDecoder("latin1");

function cstr(buf: Uint8Array, offset: number): string {
  let end = offset;
  while (end < buf.length && buf[end] !== 0) end++;
  const bytes = buf.subarray(offset, end);
  try {
    return utf8.decode(bytes);
  } catch {
    return latin1.decode(bytes);
  }
}

/** Returns the entries in string-id order (entry i has file-local id i). */
export function readTbl(buf: Uint8Array): TblEntry[] {
  const view = new DataView(buf.buffer, buf.byteOffset, buf.byteLength);
  const numElements = view.getUint16(2, true);
  const hashTableSize = view.getUint32(4, true);
  const fileSize = view.getUint32(17, true);
  if (fileSize !== buf.length) {
    throw new Error(`tbl size mismatch: header says ${fileSize}, file has ${buf.length}`);
  }
  const nodesStart = HEADER_SIZE + numElements * 2;
  if (nodesStart + hashTableSize * NODE_SIZE > buf.length) {
    throw new Error("tbl hash table runs past end of file");
  }

  const entries: TblEntry[] = [];
  for (let i = 0; i < numElements; i++) {
    const nodeIdx = view.getUint16(HEADER_SIZE + i * 2, true);
    const node = nodesStart + nodeIdx * NODE_SIZE;
    const keyOffset = view.getUint32(node + 7, true);
    const strOffset = view.getUint32(node + 11, true);
    entries.push({ key: cstr(buf, keyOffset), value: cstr(buf, strOffset) });
  }
  return entries;
}
