// Measures a WebM/Matroska recording's duration from its block timecodes.
// Browser MediaRecorder output (Chrome, Edge, Android) is written live, so the header has no Duration
// and Segment/Cluster sizes are often "unknown"; the timeline must be read from the blocks themselves.
const SEGMENT = 0x18538067;
const CLUSTER = 0x1f43b675;
const INFO = 0x1549a966;
const BLOCK_GROUP = 0xa0;
const TIMECODE_SCALE = 0x2ad7b1;
const CLUSTER_TIMECODE = 0xe7;
const SIMPLE_BLOCK = 0xa3;
const BLOCK = 0xa1;
const MASTERS = new Set([SEGMENT, CLUSTER, INFO, BLOCK_GROUP]);

function readVint(b: Uint8Array, pos: number, keepMarker: boolean): { value: number; length: number; unknown: boolean } | null {
  const first = b[pos];
  if (first === undefined || first === 0) return null;
  let length = 1;
  while (length <= 8 && !(first & (0x80 >> (length - 1)))) length++;
  if (length > 8 || pos + length > b.length) return null;
  let value = keepMarker ? first : first & (0xff >> length);
  let allOnes = (first & (0xff >> length)) === 0xff >> length;
  for (let i = 1; i < length; i++) {
    value = value * 256 + b[pos + i];
    if (b[pos + i] !== 0xff) allOnes = false;
  }
  return { value, length, unknown: !keepMarker && allOnes };
}

const readUint = (b: Uint8Array, pos: number, size: number) => {
  let v = 0;
  for (let i = 0; i < size; i++) v = v * 256 + b[pos + i];
  return v;
};

/** Returns milliseconds, or undefined when no timed blocks can be found. */
export function webmDurationMs(b: Uint8Array): number | undefined {
  let scaleNs = 1_000_000;
  let clusterTime = 0;
  let maxTicks = -1;
  let pos = 0;
  let guard = 0;
  while (pos < b.length && guard++ < 2_000_000) {
    const id = readVint(b, pos, true);
    if (!id) break;
    const size = readVint(b, pos + id.length, false);
    if (!size) break;
    const data = pos + id.length + size.length;
    if (MASTERS.has(id.value)) {
      pos = data; // descend: children follow immediately, whether or not the size is known
      continue;
    }
    if (size.unknown || data + size.value > b.length) break;
    if (id.value === TIMECODE_SCALE && size.value <= 8) scaleNs = readUint(b, data, size.value) || scaleNs;
    else if (id.value === CLUSTER_TIMECODE && size.value <= 8) clusterTime = readUint(b, data, size.value);
    else if ((id.value === SIMPLE_BLOCK || id.value === BLOCK) && size.value >= 4) {
      const track = readVint(b, data, false);
      if (track) {
        const raw = (b[data + track.length] << 8) | b[data + track.length + 1];
        const relative = raw & 0x8000 ? raw - 0x10000 : raw;
        maxTicks = Math.max(maxTicks, clusterTime + relative);
      }
    }
    pos = data + size.value;
  }
  if (maxTicks < 0) return undefined;
  // Add one typical Opus frame so a single-block clip is not measured as zero length.
  return (maxTicks * scaleNs) / 1_000_000 + 20;
}
