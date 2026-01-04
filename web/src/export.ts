/**
 * Session Export Module
 *
 * Bundles session data (code, invariants, events, audio) into a .tar.gz file.
 * Uses native CompressionStream API for gzip compression.
 */

import type { StoredSession } from "./types";
import type { Event } from "../../core/src/index";
import { blobToUint8Array, createTarArchive, stringToUint8Array, type TarEntry } from "./tar";
import { getAudioBlob, getAudioMimeType } from "./storage";
import { getFileExtension } from "./audio";

// ============================================================================
// Types
// ============================================================================

export interface ExportMetadata {
  /** Export format version */
  version: number;
  /** Export timestamp */
  exportedAt: string;
  /** Session ID */
  sessionId: string;
  /** Problem info */
  problem: {
    id: string;
    title: string;
    description: string;
  };
  /** Preset used */
  preset: string;
  /** Session timestamps */
  timing: {
    createdAt: string;
    completedAt: string | null;
  };
  /** Whether audio was recorded */
  audioRecorded: boolean;
  /** Audio format if recorded */
  audioFormat: string | null;
  /** Event count */
  eventCount: number;
}

export interface SessionExportData {
  metadata: ExportMetadata;
  events: Event[];
  reflection: ReflectionData | null;
}

interface ReflectionData {
  clearApproach: string;
  prolongedStall: string;
  recoveredFromStall: string;
  timePressure: string;
  wouldChangeApproach: string;
}

// ============================================================================
// Export Functions
// ============================================================================

/**
 * Export a session as a .tar.gz file and trigger download.
 */
export async function exportSession(session: StoredSession): Promise<void> {
  // Build the archive entries
  const entries = await buildExportEntries(session);

  // Create TAR archive
  const tarData = createTarArchive(entries);

  // Compress with gzip
  const gzipData = await compressGzip(tarData);

  // Generate filename
  const filename = generateFilename(session);

  // Trigger download
  downloadBlob(new Blob([gzipData as BlobPart], { type: "application/gzip" }), filename);
}

/**
 * Build the list of files to include in the export.
 */
async function buildExportEntries(session: StoredSession): Promise<TarEntry[]> {
  const entries: TarEntry[] = [];

  // Extract code and invariants from session state
  const { code, invariants } = extractSessionData(session.events);

  // 1. code.txt
  entries.push({
    name: "code.txt",
    content: stringToUint8Array(code || ""),
  });

  // 2. invariants.txt
  entries.push({
    name: "invariants.txt",
    content: stringToUint8Array(invariants || ""),
  });

  // 3. session.json (metadata + events + reflection)
  const audioBlob = await getAudioBlob(session.id);
  const audioMimeType = await getAudioMimeType(session.id);

  const exportData = buildExportData(session, audioBlob !== null, audioMimeType);
  entries.push({
    name: "session.json",
    content: stringToUint8Array(JSON.stringify(exportData, null, 2)),
  });

  // 4. audio file (if recorded)
  if (audioBlob && audioMimeType) {
    const audioExtension = getFileExtension(audioMimeType);
    const audioData = await blobToUint8Array(audioBlob);
    entries.push({
      name: `audio.${audioExtension}`,
      content: audioData,
    });
  }

  return entries;
}

/**
 * Extract code and invariants from session events.
 */
function extractSessionData(events: Event[]): { code: string; invariants: string } {
  let code = "";
  let invariants = "";

  for (const event of events) {
    if (event.type === "coding.code_changed" && event.data && "code" in event.data) {
      code = (event.data as { code: string }).code;
    }
    if (event.type === "prep.invariants_changed" && event.data && "invariants" in event.data) {
      invariants = (event.data as { invariants: string }).invariants;
    }
  }

  return { code, invariants };
}

/**
 * Build the session.json export data structure.
 */
function buildExportData(
  session: StoredSession,
  hasAudio: boolean,
  audioMimeType: string | null,
): SessionExportData {
  // Find reflection responses
  const reflectionEvent = session.events.find((e) => e.type === "reflection.submitted");
  let reflection: ReflectionData | null = null;

  if (reflectionEvent && reflectionEvent.data && "responses" in reflectionEvent.data) {
    const responses = (reflectionEvent.data as { responses: ReflectionData }).responses;
    reflection = {
      clearApproach: responses.clearApproach,
      prolongedStall: responses.prolongedStall,
      recoveredFromStall: responses.recoveredFromStall,
      timePressure: responses.timePressure,
      wouldChangeApproach: responses.wouldChangeApproach,
    };
  }

  // Find completion timestamp
  const completedEvent = session.events.find((e) => e.type === "session.completed");
  const completedAt = completedEvent ? new Date(completedEvent.timestamp).toISOString() : null;

  const metadata: ExportMetadata = {
    version: 1,
    exportedAt: new Date().toISOString(),
    sessionId: session.id,
    problem: {
      id: session.problem.id,
      title: session.problem.title,
      description: session.problem.description,
    },
    preset: session.preset,
    timing: {
      createdAt: new Date(session.createdAt).toISOString(),
      completedAt,
    },
    audioRecorded: hasAudio,
    audioFormat: hasAudio && audioMimeType ? getFileExtension(audioMimeType) : null,
    eventCount: session.events.length,
  };

  return {
    metadata,
    events: session.events,
    reflection,
  };
}

/**
 * Generate export filename.
 * Format: {problem-slug}-{date}.tar.gz
 */
function generateFilename(session: StoredSession): string {
  // Slugify problem title
  const slug = session.problem.title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 50);

  // Format date as YYYY-MM-DD
  const date = new Date().toISOString().slice(0, 10);

  return `${slug}-${date}.tar.gz`;
}

// ============================================================================
// Compression
// ============================================================================

/**
 * Compress data using gzip via CompressionStream API.
 */
async function compressGzip(data: Uint8Array): Promise<Uint8Array> {
  // Check if CompressionStream is available
  if (typeof CompressionStream === "undefined") {
    // Fallback: return uncompressed TAR (change extension handling if needed)
    console.warn("CompressionStream not available, returning uncompressed TAR");
    return data;
  }

  const stream = new CompressionStream("gzip");
  const writer = stream.writable.getWriter();
  const reader = stream.readable.getReader();

  // Write data
  writer.write(data as BufferSource);
  writer.close();

  // Read compressed chunks
  const chunks: Uint8Array[] = [];
  let totalLength = 0;

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    chunks.push(value);
    totalLength += value.length;
  }

  // Concatenate chunks
  const result = new Uint8Array(totalLength);
  let offset = 0;
  for (const chunk of chunks) {
    result.set(chunk, offset);
    offset += chunk.length;
  }

  return result;
}

// ============================================================================
// Download
// ============================================================================

/**
 * Trigger a file download in the browser.
 */
function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.style.display = "none";

  document.body.appendChild(link);
  link.click();

  // Cleanup
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/**
 * Check if export is supported (CompressionStream available).
 */
export function isExportSupported(): boolean {
  return typeof CompressionStream !== "undefined";
}
