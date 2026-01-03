/**
 * TAR File Writer
 *
 * Minimal implementation of the POSIX.1-1988 (ustar) TAR format.
 * Creates uncompressed TAR archives that can be compressed with gzip.
 */

// ============================================================================
// Types
// ============================================================================

export interface TarEntry {
  /** Filename (max 100 chars) */
  name: string;
  /** File content */
  content: Uint8Array;
}

// ============================================================================
// Constants
// ============================================================================

const BLOCK_SIZE = 512;
const NAME_LENGTH = 100;
const HEADER_SIZE = 512;

// ============================================================================
// TAR Archive Creation
// ============================================================================

/**
 * Create a TAR archive from a list of files.
 * Returns uncompressed TAR data as Uint8Array.
 */
export function createTarArchive(entries: TarEntry[]): Uint8Array {
  const blocks: Uint8Array[] = [];

  for (const entry of entries) {
    // Create header block
    const header = createTarHeader(entry.name, entry.content.length);
    blocks.push(header);

    // Add content blocks (padded to 512-byte boundary)
    blocks.push(entry.content);

    // Pad to 512-byte boundary
    const padding = BLOCK_SIZE - (entry.content.length % BLOCK_SIZE);
    if (padding < BLOCK_SIZE) {
      blocks.push(new Uint8Array(padding));
    }
  }

  // Add two empty blocks to mark end of archive
  blocks.push(new Uint8Array(BLOCK_SIZE));
  blocks.push(new Uint8Array(BLOCK_SIZE));

  // Concatenate all blocks
  return concatenateArrays(blocks);
}

/**
 * Create a TAR header block for a file.
 */
function createTarHeader(name: string, size: number): Uint8Array {
  const header = new Uint8Array(HEADER_SIZE);
  const encoder = new TextEncoder();

  // File name (0-99)
  const nameBytes = encoder.encode(name.slice(0, NAME_LENGTH));
  header.set(nameBytes, 0);

  // File mode (100-107) - 0644 in octal
  writeOctal(header, 100, 0o644, 8);

  // Owner UID (108-115) - 0
  writeOctal(header, 108, 0, 8);

  // Owner GID (116-123) - 0
  writeOctal(header, 116, 0, 8);

  // File size (124-135) - 12 bytes octal
  writeOctal(header, 124, size, 12);

  // Modification time (136-147) - current time in seconds since epoch
  const mtime = Math.floor(Date.now() / 1000);
  writeOctal(header, 136, mtime, 12);

  // Checksum placeholder (148-155) - filled with spaces initially
  for (let i = 148; i < 156; i++) {
    header[i] = 0x20; // space
  }

  // Type flag (156) - '0' for regular file
  header[156] = 0x30; // '0'

  // Link name (157-256) - empty for regular files

  // USTAR magic (257-262) - "ustar\0"
  const magic = encoder.encode("ustar");
  header.set(magic, 257);
  header[262] = 0;

  // USTAR version (263-264) - "00"
  header[263] = 0x30;
  header[264] = 0x30;

  // Owner name (265-296) - empty
  // Group name (297-328) - empty
  // Device major (329-336) - empty
  // Device minor (337-344) - empty
  // Prefix (345-499) - empty

  // Calculate and write checksum
  let checksum = 0;
  for (let i = 0; i < HEADER_SIZE; i++) {
    checksum += header[i];
  }
  writeOctal(header, 148, checksum, 8);

  return header;
}

/**
 * Write an octal number to the header.
 */
function writeOctal(header: Uint8Array, offset: number, value: number, length: number): void {
  const octal = value.toString(8).padStart(length - 1, "0");
  const encoder = new TextEncoder();
  const bytes = encoder.encode(octal);
  header.set(bytes.slice(0, length - 1), offset);
  header[offset + length - 1] = 0; // null terminator
}

/**
 * Concatenate multiple Uint8Arrays into one.
 */
function concatenateArrays(arrays: Uint8Array[]): Uint8Array {
  const totalLength = arrays.reduce((sum, arr) => sum + arr.length, 0);
  const result = new Uint8Array(totalLength);

  let offset = 0;
  for (const arr of arrays) {
    result.set(arr, offset);
    offset += arr.length;
  }

  return result;
}

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Convert a string to Uint8Array.
 */
export function stringToUint8Array(str: string): Uint8Array {
  return new TextEncoder().encode(str);
}

/**
 * Convert a Blob to Uint8Array.
 */
export async function blobToUint8Array(blob: Blob): Promise<Uint8Array> {
  const buffer = await blob.arrayBuffer();
  return new Uint8Array(buffer);
}
