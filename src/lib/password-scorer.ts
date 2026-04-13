/**
 * Password scoring engine — TypeScript port of the Python PAS scorer.
 * Implements Shannon entropy, search-space bits, pattern detection,
 * policy rules, and NIST SP 800-63B-aligned strength labels.
 */
import type { PatternMatch, PasswordResult, StrengthLabel } from './types'
import { crackTimeEstimate } from './utils'

// ── Character pool ─────────────────────────────────────────────────────────
interface CharPool {
  lowercase: boolean
  uppercase: boolean
  digits:    boolean
  symbols:   boolean
  extended:  boolean
  poolSize:  number
}

function getPool(password: string): CharPool {
  const lowercase = /[a-z]/.test(password)
  const uppercase = /[A-Z]/.test(password)
  const digits    = /[0-9]/.test(password)
  const symbols   = /[!"#$%&'()*+,\-./:;<=>?@[\\\]^_`{|}~]/.test(password)
  const extended  = [...password].some(c => c.charCodeAt(0) > 127)

  let poolSize = 0
  if (lowercase) poolSize += 26
  if (uppercase) poolSize += 26
  if (digits)    poolSize += 10
  if (symbols)   poolSize += 32
  if (extended)  poolSize += 64

  return { lowercase, uppercase, digits, symbols, extended, poolSize }
}

// ── Entropy ────────────────────────────────────────────────────────────────
function shannonEntropy(password: string): number {
  if (!password.length) return 0
  const freq: Record<string, number> = {}
  for (const c of password) freq[c] = (freq[c] || 0) + 1
  const n = password.length
  return -Object.values(freq).reduce((sum, count) => {
    const p = count / n
    return sum + p * Math.log2(p)
  }, 0)
}

function searchSpaceBits(password: string, pool: CharPool): number {
  const size = pool.poolSize || 1
  return Math.log2(size) * password.length
}

// ── Pattern detection ──────────────────────────────────────────────────────
const KEYBOARD_ROWS = [
  'qwertyuiop',
  'asdfghjkl',
  'zxcvbnm',
  '1234567890',
]

function detectKeyboardWalks(password: string): PatternMatch[] {
  const lower = password.toLowerCase()
  const found: PatternMatch[] = []
  for (const row of KEYBOARD_ROWS) {
    for (let start = 0; start <= row.length - 3; start++) {
      for (let length = 3; length <= row.length - start; length++) {
        const seq = row.slice(start, start + length)
        const idx = lower.indexOf(seq)
        if (idx !== -1) {
          found.push({
            label: `keyboard-walk(${seq})`,
            span: [idx, idx + length],
            severity: Math.min(0.3 + 0.1 * length, 0.8),
          })
        }
      }
    }
  }
  return found
}

function detectRepeats(password: string): PatternMatch[] {
  const matches: PatternMatch[] = []
  const re = /(.)\1{2,}/g
  let m: RegExpExecArray | null
  while ((m = re.exec(password)) !== null) {
    matches.push({
      label: `repeated-char(${m[1]}×${m[0].length})`,
      span: [m.index, m.index + m[0].length],
      severity: 0.4,
    })
  }
  return matches
}

function detectDates(password: string): PatternMatch[] {
  const re = /((19|20)\d{2}|0[1-9]\d{4}|1[0-2]\d{4}|\d{2}[\/\-]\d{2}[\/\-]\d{4}|\d{4}[\/\-]\d{2}[\/\-]\d{2})/g
  const matches: PatternMatch[] = []
  let m: RegExpExecArray | null
  while ((m = re.exec(password)) !== null) {
    matches.push({ label: `date(${m[0]})`, span: [m.index, m.index + m[0].length], severity: 0.35 })
  }
  return matches
}

function detectSequentialRuns(password: string): PatternMatch[] {
  const matches: PatternMatch[] = []
  for (let i = 0; i < password.length - 2; i++) {
    const trio = password.slice(i, i + 3)
    const allDigits = trio.split('').every(c => /\d/.test(c))
    const allAlpha  = trio.split('').every(c => /[a-zA-Z]/.test(c))
    if (allDigits &&
        parseInt(trio[1]) === parseInt(trio[0]) + 1 &&
        parseInt(trio[2]) === parseInt(trio[1]) + 1) {
      matches.push({ label: `sequential-digits(${trio})`, span: [i, i + 3], severity: 0.25 })
    } else if (allAlpha &&
        trio[1].toLowerCase().charCodeAt(0) === trio[0].toLowerCase().charCodeAt(0) + 1 &&
        trio[2].toLowerCase().charCodeAt(0) === trio[1].toLowerCase().charCodeAt(0) + 1) {
      matches.push({ label: `sequential-alpha(${trio})`, span: [i, i + 3], severity: 0.25 })
    }
  }
  return matches
}

const LEET: Record<string, string> = { '@':'a','4':'a','3':'e','1':'i','0':'o','$':'s','+':'t','!':'i','7':'t' }
function deLeet(s: string): string { return s.toLowerCase().split('').map(c => LEET[c] ?? c).join('') }

const COMMON_PASSWORDS = new Set([
  'password','password1','password123','123456','12345678','qwerty','abc123',
  'monkey','1234567','letmein','trustno1','dragon','master','sunshine','welcome',
  'shadow','superman','michael','football','iloveyou','admin','login','hello',
  'passw0rd','p@ssword','baseball','princess','starwars','cheese','secret',
  'pass','root','toor','test','guest','1q2w3e','qazwsx','zaq1xsw2','changeme','default',
])

function detectCommonPasswords(password: string): PatternMatch[] {
  const lower    = password.toLowerCase()
  const deLeeted = deLeet(lower)
  if (COMMON_PASSWORDS.has(lower))    return [{ label: 'common-password',          span: [0, password.length], severity: 0.95 }]
  if (deLeeted !== lower && COMMON_PASSWORDS.has(deLeeted))
                                       return [{ label: 'leet-disguised-common',    span: [0, password.length], severity: 0.80 }]
  return []
}

// Merge overlapping spans, keep highest severity
function mergeSpans(matches: PatternMatch[]): PatternMatch[] {
  if (!matches.length) return []
  const sorted = [...matches].sort((a, b) => a.span[0] - b.span[0] || b.severity - a.severity)
  const result: PatternMatch[] = [sorted[0]]
  for (const m of sorted.slice(1)) {
    if (m.span[0] < result[result.length - 1].span[1]) continue // overlapping — already have higher severity
    result.push(m)
  }
  return result
}

function detectAllPatterns(password: string): PatternMatch[] {
  return mergeSpans([
    ...detectKeyboardWalks(password),
    ...detectRepeats(password),
    ...detectDates(password),
    ...detectSequentialRuns(password),
    ...detectCommonPasswords(password),
  ])
}

// ── Score computation ──────────────────────────────────────────────────────
function computeScore(ssBits: number, patterns: PatternMatch[], pool: CharPool, length: number): number {
  let score = Math.min(Math.floor(ssBits * 1.2), 55)

  const numClasses = [pool.lowercase, pool.uppercase, pool.digits, pool.symbols, pool.extended]
    .filter(Boolean).length
  score += Math.min(numClasses * 6, 25)

  if (length >= 20)      score += 20
  else if (length >= 16) score += 14
  else if (length >= 12) score += 8
  else if (length >= 8)  score += 4

  for (const p of patterns) {
    score -= Math.floor(p.severity * 40)
  }
  return Math.max(0, Math.min(score, 100))
}

const THRESHOLDS: [number, StrengthLabel][] = [
  [0,  'VERY_WEAK'],
  [20, 'WEAK'],
  [40, 'FAIR'],
  [60, 'STRONG'],
  [80, 'VERY_STRONG'],
]

function labelFor(score: number): StrengthLabel {
  let label: StrengthLabel = 'VERY_WEAK'
  for (const [threshold, lbl] of THRESHOLDS) {
    if (score >= threshold) label = lbl
  }
  return label
}

// ── Policy ─────────────────────────────────────────────────────────────────
function checkPolicy(password: string, patterns: PatternMatch[]): string[] {
  const violations: string[] = []
  if (password.length < 8)
    violations.push(`Too short: ${password.length} chars (minimum 8)`)
  if (password.length > 128)
    violations.push(`Too long: ${password.length} chars (maximum 128)`)
  if (/(.)\1{3,}/.test(password))
    violations.push('Contains a long run of repeated characters')
  for (const p of patterns) {
    if (p.severity >= 0.9)
      violations.push(`Blocked pattern: ${p.label}`)
  }
  return violations
}

// ── Recommendations ────────────────────────────────────────────────────────
function buildRecommendations(result: Omit<PasswordResult, 'recommendations' | 'crackTime' | 'breachChecked'>): string[] {
  const recs: string[] = []
  if (result.length < 16)
    recs.push(`Increase length to ≥16 characters (each extra char multiplies the search space by ${result.charClasses.poolSize || 94}×).`)
  const classes = [result.charClasses.lowercase, result.charClasses.uppercase, result.charClasses.digits, result.charClasses.symbols].filter(Boolean).length
  if (classes < 3)
    recs.push('Mix lowercase, uppercase, digits, and special characters.')

  const labels = result.patternsFound.map(p => p.label)
  if (labels.some(l => l.includes('keyboard')))    recs.push('Avoid keyboard-walk sequences (qwerty, asdf, 1234, …).')
  if (labels.some(l => l.includes('date')))        recs.push('Do not embed birth years or calendar dates.')
  if (labels.some(l => l.includes('common')))      recs.push('This password (or its leet variant) is on known breach lists.')
  if (labels.some(l => l.includes('repeated')))    recs.push('Avoid long runs of identical characters (aaaa, 1111, …).')
  if (labels.some(l => l.includes('sequential')))  recs.push('Avoid sequential character runs (123, abc, xyz).')

  if (!recs.length)
    recs.push('Password looks strong. Consider a random passphrase for memorability — e.g. "correct-horse-battery-staple" style.')
  return recs
}

// ── Public API ─────────────────────────────────────────────────────────────
export function scorePassword(password: string): PasswordResult {
  const pool      = getPool(password)
  const shannon   = shannonEntropy(password)
  const ssBits    = searchSpaceBits(password, pool)
  const patterns  = detectAllPatterns(password)
  const raw       = computeScore(ssBits, patterns, pool, password.length)
  const strength  = labelFor(raw)
  const violations = checkPolicy(password, patterns)

  const base = {
    password,
    score: raw,
    strength,
    shannonEntropy: Math.round(shannon * 1000) / 1000,
    searchSpaceBits: Math.round(ssBits * 1000) / 1000,
    length: password.length,
    charClasses: pool,
    patternsFound: patterns,
    policyViolations: violations,
    recommendations: [] as string[],
    crackTime: crackTimeEstimate(ssBits),
    breachChecked: false,
  }
  base.recommendations = buildRecommendations(base)
  return base
}
