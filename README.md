# CyberOps Dashboard

> A full-stack cybersecurity operations platform built with Next.js 15, TypeScript, and Tailwind CSS. 50 integrated tools across OSINT, recon, threat intelligence, web analysis, forensics, automation, and reporting — all behind Clerk authentication with per-route rate limiting.

![CyberOps Dashboard](13.04.2026_09.36.55_REC.png)

---

## What It Is

CyberOps is a self-hosted operations center for security professionals. Instead of jumping between a dozen browser tabs and CLI tools, every workflow lives in one place: from initial IP/domain triage through subdomain enumeration, threat intel correlation, web security analysis, hash forensics, and final report export — all in a consistent, keyboard-friendly interface.

Built entirely from scratch with zero heavy runtime dependencies. No chart libraries. No PDF libraries. No database. No ORM. Every complex behaviour (rate limiting, fuzzy hashing, hex interpretation, PDF generation) is implemented natively.

---

## Feature Overview

### OSINT & Intelligence
| Tool | What it does |
|---|---|
| IP Lookup | AbuseIPDB + ip-api.com enrichment, confidence score, geolocation, ISP, abuse history |
| Domain Analyzer | WHOIS, DNS records (A/AAAA/MX/TXT/NS/CAA), reputation check |
| URL Scanner | VirusTotal multi-engine scan, redirect chain tracing, screenshot metadata |
| Email OSINT | Breach database lookup, mail server health, MX/SPF/DKIM/DMARC validation |
| IOC Lookup | Unified IP / domain / URL / hash lookup across AbuseIPDB, VirusTotal, AlienVault OTX |

### Recon
| Tool | What it does |
|---|---|
| Subdomain Enumeration | Passive enumeration via crt.sh certificate transparency logs |
| Reverse IP | All domains on a shared IP via HackerTarget |
| BGP / ASN | Prefix, peer, and routing table data for any ASN |
| DNS Resolver | Live multi-record DNS resolution |
| Cert Transparency | Real-time CT log search via crt.sh |
| Username OSINT | Parallel availability check across 20+ platforms |
| Wayback Machine | Archive history and snapshot availability |
| Favicon Hash | MurmurHash3 fingerprinting for Shodan pivoting |
| Traceroute | MTR-style hop enumeration with per-hop IP enrichment |
| WHOIS History | Historical registration data |
| BGP Hijack Check | Route origin validation |
| Google Dorks | Pre-built dork templates for common recon patterns |
| Scope Manager | Per-engagement target list with in/out-of-scope tagging |

### Web Analysis
| Tool | What it does |
|---|---|
| HTTP Headers | Security header audit with pass/warn/fail grading |
| WAF Detector | Fingerprints WAF vendors from response headers and error pages |
| Tech Fingerprinter | Stack detection via response headers, HTML meta, script patterns |
| SSL Inspector | Certificate chain, cipher suite, expiry, and protocol audit |
| Port Scanner | Shodan-backed or live TCP connect scan |
| CORS Checker | Tests CORS policy with spoofed Origin headers |
| Robots.txt Parser | Fetches + parses robots.txt, follows Sitemap references |
| Open Redirect | Parallel parameter fuzzing for open redirect vulnerabilities |
| CSP Analyzer | Content-Security-Policy parser with directive-level risk grading |

### Threat Intelligence
| Tool | What it does |
|---|---|
| CVE Explorer | NIST NVD search with CVSS score display and CWE mapping |
| Hash Scanner | VirusTotal multi-engine hash lookup |
| Exploit Search | ExploitDB search by CVE or keyword |
| Default Credentials | CIRT.net default credential database lookup |
| Shodan Search | Full Shodan search with facets and host data |
| URLhaus Lookup | abuse.ch URLhaus malware URL and payload database |
| PhishTank Check | PhishTank phishing URL verification |
| ThreatFox IOC | abuse.ch ThreatFox IOC and malware family lookup |
| Ransomware Tracker | ransomware.live group and victim tracking |

### Email / PKI
| Tool | What it does |
|---|---|
| Email Security | Comprehensive SPF, DKIM, DMARC, MTA-STS, BIMI analysis |

### Analysis & Forensics
| Tool | What it does |
|---|---|
| Password Audit | Entropy scoring, character class analysis, breach check via HIBP k-anonymity |
| Hash Tools | MD5/SHA1/SHA256/SHA512 generation from text input |
| Fuzzy Hash (SSDEEP) | Context-triggered piecewise hash comparison with similarity scoring via Wagner-Fischer edit distance |
| JWT Analyzer | Header/payload decode, algorithm audit, expiry check |
| CVSS Calculator | CVSS v3.1 base score calculator with vector string output |

### Utilities
| Tool | What it does |
|---|---|
| Payload Generator | XSS, SQLi, SSTI, SSRF, XXE, path traversal, command injection payload sets |
| Encoder / Decoder | Base64, URL, HTML entity, hex, Unicode, JWT decode |
| Token Generator | Cryptographically random API keys, UUIDs, passwords, nonces |
| Hex / Binary | Multi-format converter (hex/bin/dec/oct/text) with full DataView integer interpretation (int8–int64, float32/64, BE/LE) |
| Regex Tester | Live regex engine with 35+ security presets across 6 categories (Network/IOC, Hashes, Attack Patterns, Log Analysis, Threat Intel, Secrets/DLP) |

### Automation
| Tool | What it does |
|---|---|
| Automation Scanner | Chain recon and analysis steps into sequential workflows. Built-in presets for Domain, IP, and Webapp targets. Fully custom workflow builder with step ordering, parallel step execution, per-step status/timing, and auto-generated finding summaries. Saves custom workflows to localStorage. |

### Reporting
| Tool | What it does |
|---|---|
| Report Builder | Structured pentest report with Finding, IOC, Text, and Raw section types. Exports to PDF (via browser print) and Markdown. Auto-saves draft to localStorage. |
| Investigation Notes | Per-target timestamped notes timeline. Types: Finding, IOC, Observation, Action. Severity tagging, tool references, full-text search, grouped date display, Markdown export. Reads in-scope targets from Scope Manager. |

---

## Technical Highlights

### Architecture
- **Next.js 15 App Router** — full use of the `app/` directory, server components where appropriate, `'use client'` for interactive tools
- **Edge Middleware** — Clerk auth guard + rate limiter runs at the Edge before any page or API route is reached
- **Zero database** — stateless by design; notes and report drafts persist in `localStorage`; user accounts managed by Clerk
- **TypeScript throughout** — strict mode, discriminated union types for all API response shapes, no `any` escapes

### Auth & Security
- **Clerk authentication** — email + password login and registration with built-in email verification, session management, and user administration via the Clerk dashboard
- **Edge-enforced auth** — every request passes through middleware before reaching any page or API; unauthenticated requests are redirected to `/sign-in`
- **Sliding-window rate limiter** — built from scratch using a `Map<string, number[]>` of timestamps; default 60 req/min, 20 req/min for routes that call paid external APIs; no Redis dependency required
- **XSS-safe** — React's default JSX escaping throughout; the one place that builds raw HTML (PDF export) does so in an isolated `window.open()` context, never in the dashboard DOM
- **No SSRF surface** — all outbound requests in API routes target fixed known URLs; no user-controlled fetch targets

### Algorithmic Implementations (from scratch)
- **Wagner-Fischer edit distance** — O(n) rolling `Uint16Array` implementation used to score SSDEEP fuzzy hash segment similarity
- **SSDEEP blocksize compatibility** — full implementation of the `equal / double / half` blocksize comparison rules per the spamsum spec
- **MurmurHash3** — implemented for favicon hash fingerprinting (Shodan pivoting)
- **DataView multi-interpretation** — hex/binary tool interprets any byte sequence as int8/uint8, int16/uint16, int32/uint32, float32 (BE + LE for all), int64/uint64/float64 using the Web API `DataView`
- **BigInt decimal representation** — large byte arrays converted to accurate decimal without floating-point loss via `BigInt` bit-shift accumulation
- **CVSS v3.1 scoring** — full base score formula implemented client-side

### Zero Dependency Policy (runtime)
The entire production dependency list:

```
next            15.5.15
react           19.0.0
react-dom       19.0.0
@clerk/nextjs   7.x       (auth)
lucide-react    0.363.0   (icons only)
clsx            2.1.0     (classname utility)
tailwind-merge  2.2.1     (Tailwind class deduplication)
```

No PDF library. No charting library. No form library. No state management library. No HTTP client. No utility belt (lodash/underscore). PDF export is `window.open()` + inline CSS + `window.print()`. Charts are CSS + inline styles.

---

## Stack

| Layer | Technology |
|---|---|
| Framework | Next.js 15 (App Router) |
| Language | TypeScript 5 (strict) |
| Styling | Tailwind CSS 3.4 + custom cyber design tokens |
| Icons | lucide-react |
| Auth | Clerk (email + password, email verification) |
| Rate Limiting | In-memory sliding window (Map-based) |
| Storage | localStorage (client) + Clerk (user accounts) |
| Deployment | Vercel |

---

## Security Design

```
Browser
  │
  ├─► GET /any-page
  │     └─► Edge Middleware
  │           ├─ Rate limit check (sliding window, per IP per route)
  │           ├─ Clerk session check
  │           └─ 429/redirect to /sign-in if either fails
  │
  ├─► /sign-in   — Clerk-managed email + password login
  └─► /sign-up   — Clerk-managed registration + email verification
```

API keys (VirusTotal, AbuseIPDB, Shodan, OTX, NVD) live exclusively in `process.env` — they are never exposed to the client bundle.

---

## Local Setup

```bash
git clone https://github.com/boclaes102-eng/Online-Cyber-dashboard
cd Online-Cyber-dashboard
npm install

cp .env.local.example .env.local
# Add your Clerk keys and any optional API keys

npm run dev
# → http://localhost:3000
```

---

## Deployment (Vercel)

1. Push to GitHub
2. Import repo at [vercel.com](https://vercel.com/new)
3. Add all `.env.local` variables under **Settings → Environment Variables**
4. Deploy — automatic on every push to `main`

To manage users (invite, revoke, reset passwords): use the [Clerk Dashboard](https://dashboard.clerk.com).

---

## Environment Variables

### Required (Clerk)

| Key | Where to get it |
|---|---|
| `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` | clerk.com → your app → API Keys |
| `CLERK_SECRET_KEY` | clerk.com → your app → API Keys |
| `NEXT_PUBLIC_CLERK_SIGN_IN_URL` | `/sign-in` |
| `NEXT_PUBLIC_CLERK_SIGN_UP_URL` | `/sign-up` |
| `NEXT_PUBLIC_CLERK_AFTER_SIGN_IN_URL` | `/` |
| `NEXT_PUBLIC_CLERK_AFTER_SIGN_UP_URL` | `/` |

### Optional (tool API keys)

Tools degrade gracefully without these — they fall back to free/public endpoints where possible.

| Key | Free Tier | Used By |
|---|---|---|
| `ABUSEIPDB_API_KEY` | 1,000 checks/day | IP Lookup, IOC Lookup |
| `VT_API_KEY` | 4 req/min | Hash Scanner, URL Scanner, IOC Lookup |
| `NVD_API_KEY` | 50 req/30s (vs 5) | CVE Explorer |
| `SHODAN_API_KEY` | Free account | Port Scanner, Shodan Search |
| `OTX_API_KEY` | Unlimited | IOC Lookup (threat intel enrichment) |
| `PHISHTANK_API_KEY` | Free account | PhishTank Check |
