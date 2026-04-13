'use client'

import { useState, useMemo } from 'react'
import { Binary, Copy, Check } from 'lucide-react'
import TerminalCard from '@/components/ui/TerminalCard'
import { clsx } from 'clsx'

// ─── Types ────────────────────────────────────────────────────────────────────
type InputFmt = 'hex' | 'bin' | 'dec' | 'oct' | 'text'

interface ByteRow {
  offset: number
  value: number
  hex: string
  bin: string
  ascii: string
  isPrintable: boolean
}

interface InterpRow {
  type: string
  beValue: string
  leValue: string
  note?: string
}

interface Conversions {
  bytes: number[]
  hex: string          // space-separated uppercase bytes
  hexRaw: string       // contiguous lowercase
  binary: string       // space-separated 8-bit groups
  decimal: string      // unsigned big-endian integer string
  octal: string        // octal
  ascii: string        // printable chars, · for non-printable
  byteRows: ByteRow[]
  interp: InterpRow[]
  error?: string
}

// ─── Parse input → bytes ──────────────────────────────────────────────────────
function parseInput(raw: string, fmt: InputFmt): number[] | string {
  const input = raw.trim()
  if (!input) return []

  switch (fmt) {
    case 'hex': {
      const clean = input.replace(/^0x/i, '').replace(/[\s:]/g, '')
      if (!/^[0-9a-fA-F]+$/.test(clean)) return 'Invalid hex — use 0-9 and A-F only'
      const padded = clean.length % 2 ? '0' + clean : clean
      const bytes: number[] = []
      for (let i = 0; i < padded.length; i += 2) bytes.push(parseInt(padded.slice(i, i + 2), 16))
      return bytes
    }

    case 'bin': {
      const clean = input.replace(/^0b/i, '').replace(/\s+/g, '')
      if (!/^[01]+$/.test(clean)) return 'Invalid binary — use 0 and 1 only'
      const padded = clean.padStart(Math.ceil(clean.length / 8) * 8, '0')
      const bytes: number[] = []
      for (let i = 0; i < padded.length; i += 8) bytes.push(parseInt(padded.slice(i, i + 8), 2))
      return bytes
    }

    case 'dec': {
      if (!/^-?\d+$/.test(input)) return 'Invalid decimal integer'
      const n = Number(input)
      if (!Number.isFinite(n)) return 'Value out of range'
      if (n >= 0) {
        if (n <= 0xff)         return [n]
        if (n <= 0xffff)       return [n >> 8, n & 0xff]
        if (n <= 0xffffff)     return [(n >> 16) & 0xff, (n >> 8) & 0xff, n & 0xff]
        if (n <= 0xffffffff)   return [(n >>> 24), (n >>> 16) & 0xff, (n >>> 8) & 0xff, n & 0xff]
        return 'Value too large (max 0xFFFFFFFF for decimal input)'
      } else {
        // Negative → int32 two's complement (big-endian)
        if (n < -2147483648) return 'Value too small (min -2147483648 for signed input)'
        const view = new DataView(new ArrayBuffer(4))
        view.setInt32(0, n, false)
        return Array.from(new Uint8Array(view.buffer))
      }
    }

    case 'oct': {
      const clean = input.replace(/^0o/i, '')
      if (!/^[0-7]+$/.test(clean)) return 'Invalid octal — use 0-7 only'
      const n = parseInt(clean, 8)
      if (n <= 0xff)         return [n]
      if (n <= 0xffff)       return [n >> 8, n & 0xff]
      if (n <= 0xffffff)     return [(n >> 16) & 0xff, (n >> 8) & 0xff, n & 0xff]
      if (n <= 0xffffffff)   return [(n >>> 24), (n >>> 16) & 0xff, (n >>> 8) & 0xff, n & 0xff]
      return 'Octal value too large'
    }

    case 'text': {
      const encoded = new TextEncoder().encode(input)
      return Array.from(encoded)
    }
  }
}

// ─── Bytes → integer interpretations ──────────────────────────────────────────
function buildInterp(bytes: number[]): InterpRow[] {
  if (bytes.length === 0 || bytes.length > 8) return []
  const buf = new ArrayBuffer(8)
  const arr = new Uint8Array(buf)
  const view = new DataView(buf)
  arr.set(bytes)

  const rows: InterpRow[] = []
  const fmt = (n: number | bigint) => n.toString()

  if (bytes.length >= 1) {
    rows.push({ type: 'int8',   beValue: fmt(view.getInt8(0)),  leValue: fmt(view.getInt8(0)),  note: '8-bit' })
    rows.push({ type: 'uint8',  beValue: fmt(view.getUint8(0)), leValue: fmt(view.getUint8(0)), note: '8-bit' })
  }
  if (bytes.length >= 2) {
    rows.push({ type: 'int16',  beValue: fmt(view.getInt16(0, false)),  leValue: fmt(view.getInt16(0, true)),  note: '16-bit' })
    rows.push({ type: 'uint16', beValue: fmt(view.getUint16(0, false)), leValue: fmt(view.getUint16(0, true)), note: '16-bit' })
  }
  if (bytes.length >= 4) {
    rows.push({ type: 'int32',   beValue: fmt(view.getInt32(0, false)),   leValue: fmt(view.getInt32(0, true)),   note: '32-bit' })
    rows.push({ type: 'uint32',  beValue: fmt(view.getUint32(0, false)),  leValue: fmt(view.getUint32(0, true)),  note: '32-bit' })
    rows.push({
      type: 'float32',
      beValue: view.getFloat32(0, false).toPrecision(7),
      leValue: view.getFloat32(0, true).toPrecision(7),
      note: 'IEEE 754',
    })
  }
  if (bytes.length >= 8) {
    rows.push({ type: 'int64',   beValue: view.getBigInt64(0, false).toString(),  leValue: view.getBigInt64(0, true).toString(),  note: '64-bit' })
    rows.push({ type: 'uint64',  beValue: view.getBigUint64(0, false).toString(), leValue: view.getBigUint64(0, true).toString(), note: '64-bit' })
    rows.push({
      type: 'float64',
      beValue: view.getFloat64(0, false).toPrecision(15),
      leValue: view.getFloat64(0, true).toPrecision(15),
      note: 'IEEE 754',
    })
  }
  return rows
}

// ─── Compute all conversions ──────────────────────────────────────────────────
function convert(raw: string, fmt: InputFmt): Conversions {
  if (!raw.trim()) return { bytes: [], hex: '', hexRaw: '', binary: '', decimal: '', octal: '', ascii: '', byteRows: [], interp: [] }

  const result = parseInput(raw, fmt)
  if (typeof result === 'string') return { bytes: [], hex: '', hexRaw: '', binary: '', decimal: '', octal: '', ascii: '', byteRows: [], interp: [], error: result }

  const bytes = result
  if (bytes.length === 0) return { bytes: [], hex: '', hexRaw: '', binary: '', decimal: '', octal: '', ascii: '', byteRows: [], interp: [] }

  const hex    = bytes.map(b => b.toString(16).padStart(2, '0').toUpperCase()).join(' ')
  const hexRaw = bytes.map(b => b.toString(16).padStart(2, '0')).join('')
  const binary = bytes.map(b => b.toString(2).padStart(8, '0')).join(' ')
  const ascii  = bytes.map(b => b >= 0x20 && b <= 0x7e ? String.fromCharCode(b) : '·').join('')

  // Big-endian unsigned integer string (for display; BigInt for accuracy)
  let decimal = ''
  try {
    let val = BigInt(0)
    for (const b of bytes) val = (val << BigInt(8)) | BigInt(b)
    decimal = val.toString()
  } catch { decimal = '?' }

  let octal = ''
  try {
    const n = parseInt(hexRaw, 16)
    octal = isFinite(n) ? n.toString(8) : '?'
  } catch { octal = '?' }

  const byteRows: ByteRow[] = bytes.map((b, i) => ({
    offset: i,
    value: b,
    hex: b.toString(16).padStart(2, '0').toUpperCase(),
    bin: b.toString(2).padStart(8, '0'),
    ascii: b >= 0x20 && b <= 0x7e ? String.fromCharCode(b) : '·',
    isPrintable: b >= 0x20 && b <= 0x7e,
  }))

  const interp = buildInterp(bytes)

  return { bytes, hex, hexRaw, binary, decimal, octal, ascii, byteRows, interp }
}

// ─── Copy button ──────────────────────────────────────────────────────────────
function CopyBtn({ value }: { value: string }) {
  const [copied, setCopied] = useState(false)
  function doCopy() {
    navigator.clipboard.writeText(value).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 1500)
    })
  }
  return (
    <button onClick={doCopy} className="text-cyber-muted hover:text-cyber-cyan transition-colors">
      {copied ? <Check size={11} className="text-cyber-green" /> : <Copy size={11} />}
    </button>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────
const FORMATS: { id: InputFmt; label: string; placeholder: string }[] = [
  { id: 'hex',  label: 'HEX',    placeholder: 'DE AD BE EF  or  0xDEADBEEF' },
  { id: 'bin',  label: 'BIN',    placeholder: '11011110 10101101  or  0b11011110' },
  { id: 'dec',  label: 'DEC',    placeholder: '3735928559  or  -1' },
  { id: 'oct',  label: 'OCT',    placeholder: '0o37777777777  or  377' },
  { id: 'text', label: 'TEXT',   placeholder: 'Hello, World!' },
]

const EXAMPLES = [
  { label: '0xFF',         fmt: 'hex' as InputFmt, value: 'FF' },
  { label: '0xDEADBEEF',  fmt: 'hex' as InputFmt, value: 'DE AD BE EF' },
  { label: 'INT32_MAX',   fmt: 'dec' as InputFmt, value: '2147483647' },
  { label: '"Hello"',     fmt: 'text' as InputFmt, value: 'Hello' },
  { label: '0b10110100',  fmt: 'bin' as InputFmt, value: '10110100' },
]

export default function HexBinPage() {
  const [raw, setRaw]   = useState('')
  const [fmt, setFmt]   = useState<InputFmt>('hex')

  const cv = useMemo(() => convert(raw, fmt), [raw, fmt])

  const hasData  = cv.bytes.length > 0
  const hasError = !!cv.error

  function loadExample(ex: typeof EXAMPLES[number]) {
    setFmt(ex.fmt)
    setRaw(ex.value)
  }

  const repRows = hasData ? [
    { label: 'Hexadecimal',  value: cv.hex,     copy: cv.hexRaw   },
    { label: 'Binary',       value: cv.binary,  copy: cv.binary.replace(/\s/g, '') },
    { label: 'Decimal (BE)', value: cv.decimal, copy: cv.decimal  },
    { label: 'Octal',        value: cv.octal,   copy: cv.octal    },
    { label: 'ASCII / UTF-8',value: cv.ascii,   copy: cv.ascii    },
  ] : []

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start gap-4">
        <div className="w-10 h-10 rounded border border-cyber-cyan/30 flex items-center justify-center bg-cyber-cyan/5 flex-none">
          <Binary size={18} className="text-cyber-cyan" />
        </div>
        <div>
          <h1 className="font-mono text-lg font-semibold text-cyber-text-hi">Hex / Binary Converter</h1>
          <p className="font-mono text-xs text-cyber-muted mt-0.5">
            Convert between hexadecimal, binary, decimal, octal and text. Includes byte-level breakdown and integer type interpretations.
          </p>
        </div>
      </div>

      {/* Input */}
      <TerminalCard title="Input" label="CONVERTER" accent="cyan">
        {/* Format selector */}
        <div className="flex gap-1 mb-3">
          {FORMATS.map(f => (
            <button
              key={f.id}
              onClick={() => { setFmt(f.id); setRaw('') }}
              className={clsx(
                'font-mono text-[10px] px-2.5 py-1 rounded border transition-all',
                fmt === f.id
                  ? 'bg-cyber-cyan/10 border-cyber-cyan/30 text-cyber-cyan'
                  : 'border-cyber-border/60 text-cyber-muted hover:text-cyber-text hover:border-cyber-border',
              )}
            >
              {f.label}
            </button>
          ))}
        </div>

        <input
          value={raw}
          onChange={e => setRaw(e.target.value)}
          placeholder={FORMATS.find(f => f.id === fmt)?.placeholder}
          className="w-full bg-cyber-bg border border-cyber-border rounded px-3 py-2 font-mono text-sm text-cyber-text-hi placeholder:text-cyber-muted focus:outline-none focus:border-cyber-cyan/50"
        />

        {hasError && (
          <p className="font-mono text-[10px] text-cyber-red mt-1.5">{cv.error}</p>
        )}

        {/* Examples */}
        <div className="flex items-center gap-2 flex-wrap mt-3">
          <span className="font-mono text-[10px] text-cyber-muted">Examples:</span>
          {EXAMPLES.map(ex => (
            <button
              key={ex.label}
              onClick={() => loadExample(ex)}
              className="font-mono text-[10px] px-2 py-1 border border-cyber-border/60 text-cyber-muted hover:text-cyber-cyan hover:border-cyber-cyan/40 rounded transition-all"
            >
              {ex.label}
            </button>
          ))}
        </div>
      </TerminalCard>

      {/* Representations */}
      {hasData && (
        <div className="space-y-4 animate-slide-up">
          <TerminalCard title={`Representations  (${cv.bytes.length} byte${cv.bytes.length !== 1 ? 's' : ''})`} label="OUTPUT" accent="cyan">
            <div className="space-y-2">
              {repRows.map(({ label, value, copy }) => (
                <div key={label} className="flex items-start gap-3 py-1.5 border-b border-cyber-border/20 last:border-0">
                  <span className="font-mono text-[10px] text-cyber-muted uppercase tracking-widest w-28 flex-none pt-0.5">{label}</span>
                  <span className="font-mono text-xs text-cyber-text-hi break-all flex-1 leading-relaxed">{value || '—'}</span>
                  <CopyBtn value={copy} />
                </div>
              ))}
            </div>
          </TerminalCard>

          {/* Byte table */}
          {cv.byteRows.length > 1 && (
            <TerminalCard title="Byte Breakdown" label="TABLE" accent="none">
              <div className="overflow-x-auto">
                <table className="w-full font-mono text-xs min-w-[420px]">
                  <thead>
                    <tr className="border-b border-cyber-border/40">
                      {['Offset', 'Hex', 'Binary', 'Dec', 'ASCII'].map(h => (
                        <th key={h} className="text-left py-1.5 pr-4 text-[9px] text-cyber-muted uppercase tracking-widest font-normal">
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {cv.byteRows.map(row => (
                      <tr key={row.offset} className="border-b border-cyber-border/10 last:border-0 hover:bg-cyber-surface/30">
                        <td className="py-1 pr-4 text-cyber-muted text-[10px]">
                          {row.offset.toString(16).padStart(4, '0').toUpperCase()}
                        </td>
                        <td className="py-1 pr-4 text-cyber-cyan">{row.hex}</td>
                        <td className="py-1 pr-4 text-cyber-text-hi tracking-wider">{row.bin}</td>
                        <td className="py-1 pr-4 text-cyber-text">{row.value}</td>
                        <td className={clsx('py-1', row.isPrintable ? 'text-cyber-green' : 'text-cyber-border')}>
                          {row.ascii}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </TerminalCard>
          )}

          {/* Integer interpretations */}
          {cv.interp.length > 0 && (
            <TerminalCard title="Integer Interpretations" label="TYPES" accent="none">
              <div className="overflow-x-auto">
                <table className="w-full font-mono text-xs min-w-[380px]">
                  <thead>
                    <tr className="border-b border-cyber-border/40">
                      {['Type', 'Big Endian', 'Little Endian'].map(h => (
                        <th key={h} className="text-left py-1.5 pr-6 text-[9px] text-cyber-muted uppercase tracking-widest font-normal">
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {cv.interp.map(row => (
                      <tr key={row.type} className="border-b border-cyber-border/10 last:border-0 hover:bg-cyber-surface/30">
                        <td className="py-1 pr-6">
                          <span className="text-cyber-cyan">{row.type}</span>
                          {row.note && <span className="text-cyber-muted ml-1.5 text-[9px]">({row.note})</span>}
                        </td>
                        <td className="py-1 pr-6 text-cyber-text-hi">{row.beValue}</td>
                        <td className="py-1 text-cyber-text">{row.leValue}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <p className="font-mono text-[9px] text-cyber-muted mt-3">
                Interpretations use the first 1/2/4/8 bytes. Values padded with 0x00 if input is shorter than type width.
              </p>
            </TerminalCard>
          )}
        </div>
      )}
    </div>
  )
}
