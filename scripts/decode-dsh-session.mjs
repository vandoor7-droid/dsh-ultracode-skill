#!/usr/bin/env node
/**
 * Decode a DSH session log stored as a concatenated Zstandard frame container
 * (`session.v<N>.jsonl.zstd`) and print or grep its JSONL records.
 *
 * Why a dedicated decoder: the JSONL persistence backend appends one complete,
 * checksummed Zstandard frame per flushed batch (see the DSH source tree,
 * `packages/session/session-persistence-jsonl/src/zstd.ts` and
 * `zstd-public-decoder.ts`). A naive one-shot `zstdDecompressSync(file)` therefore
 * yields only the first frame's plaintext — typically the ~200-byte session header —
 * while the rest of the conversation looks empty.
 *
 * Frame boundaries are found by scanning for the Zstandard frame magic
 * (little-endian 0xFD2FB528) and decompressing each candidate range. The magic can
 * theoretically occur inside compressed payload; such a candidate fails validation
 * and is skipped, so the scan is self-healing for diagnostic use. For an
 * authoritative structural parse (torn-frame detection, exact ranges) use the
 * official scanner instead: `scanZstdFrames` + `PublicZstdFrameDecoder` from
 * `@deepseek-ai/dsh-session-persistence-jsonl`.
 *
 * Usage:
 *   node scripts/decode-dsh-session.mjs <session.v*.jsonl.zstd>                    # all records
 *   node scripts/decode-dsh-session.mjs <file> --match "workflows mode armed"      # grep, 300-char window
 *   node scripts/decode-dsh-session.mjs <file> --match "处理失败" --window 600
 *   node scripts/decode-dsh-session.mjs <file> --types                            # record type census
 *   node scripts/decode-dsh-session.mjs <file> --jsonl <out.jsonl>                # dump plaintext JSONL
 */
import { readFileSync, writeFileSync } from 'node:fs'
import { zstdDecompressSync } from 'node:zlib'

const MAGIC = [0x28, 0xb5, 0x2f, 0xfd]

/** @returns {number[]} byte offsets of every Zstandard frame magic occurrence */
function frameCandidates(buffer) {
  const offsets = []
  for (let i = 0; i + 4 <= buffer.length; i += 1) {
    if (buffer[i] === MAGIC[0] && buffer[i + 1] === MAGIC[1] && buffer[i + 2] === MAGIC[2] && buffer[i + 3] === MAGIC[3]) {
      offsets.push(i)
    }
  }
  return offsets
}

/** @returns {{ text: string, frames: number, candidates: number, skipped: number }} */
function decode(path) {
  const buffer = readFileSync(path)
  const offsets = frameCandidates(buffer)
  let text = ''
  let frames = 0
  let skipped = 0
  for (let i = 0; i < offsets.length; i += 1) {
    const start = offsets[i]
    const end = i + 1 < offsets.length ? offsets[i + 1] : buffer.length
    try {
      text += zstdDecompressSync(buffer.subarray(start, end)).toString('utf8')
      frames += 1
    } catch {
      skipped += 1
    }
  }
  return { text, frames, candidates: offsets.length, skipped }
}

function argValue(args, flag, fallback) {
  const index = args.indexOf(flag)
  return index >= 0 && args[index + 1] !== undefined ? args[index + 1] : fallback
}

const args = process.argv.slice(2)
const file = args.find((value) => !value.startsWith('--'))
if (file === undefined) {
  console.error('usage: node scripts/decode-dsh-session.mjs <session.v*.jsonl.zstd> [--match <text>] [--window <n>] [--types] [--jsonl <out>]')
  process.exit(2)
}

const { text, frames, candidates, skipped } = decode(file)
const lines = text.split('\n').filter((line) => line.length > 0)
console.error(`# decoded frames ${frames}/${candidates} (skipped ${skipped} magic false-positives), ${lines.length} JSONL records`)

const outPath = argValue(args, '--jsonl', undefined)
if (outPath !== undefined) {
  writeFileSync(outPath, text, 'utf8')
  console.error(`# wrote plaintext JSONL to ${outPath}`)
  process.exit(0)
}

if (args.includes('--types')) {
  const census = new Map()
  for (const line of lines) {
    let record
    try {
      record = JSON.parse(line)
    } catch {
      census.set('<unparsable>', (census.get('<unparsable>') ?? 0) + 1)
      continue
    }
    census.set(record.type ?? '<no type>', (census.get(record.type ?? '<no type>') ?? 0) + 1)
  }
  for (const [type, count] of [...census].sort((a, b) => b[1] - a[1])) console.log(`${count}\t${type}`)
  process.exit(0)
}

const match = argValue(args, '--match', undefined)
if (match === undefined) {
  process.stdout.write(text)
  process.exit(0)
}

const window = Number(argValue(args, '--window', '300'))
let shown = 0
for (let i = 0; i < lines.length; i += 1) {
  const at = lines[i].indexOf(match)
  if (at < 0) continue
  let type = '?'
  try {
    type = JSON.parse(lines[i]).type ?? '?'
  } catch {
    /* keep unknown */
  }
  const from = Math.max(0, at - Math.floor(window / 2))
  console.log(`--- L${i} [${type}] ${lines[i].slice(from, from + window)}`)
  shown += 1
}
console.log(`# matches: ${shown}`)
