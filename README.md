# CyberOps Dashboard

> A full-stack cybersecurity operations platform built with Next.js 15, TypeScript, and Tailwind CSS. 50+ integrated tools across OSINT, recon, threat intelligence, web analysis, forensics, automation, asset monitoring, and reporting — with per-route rate limiting.

![CyberOps Dashboard](13.04.2026_09.36.55_REC.png)

---

## What It Is

CyberOps is a self-hosted operations center for security professionals. Instead of jumping between a dozen browser tabs and CLI tools, every workflow lives in one place: from initial IP/domain triage through subdomain enumeration, threat intel correlation, web security analysis, hash forensics, and final report export — all in a consistent, keyboard-friendly interface.

The dashboard is paired with a dedicated **[Threat Intel Platform](https://github.com/boclaes102-eng/threat-intel-platform)** backend — a separate service that runs continuous asset monitoring, CVE feed ingestion, and IOC scanning in the background. The dashboard proxies requests to it transparently.

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

### Asset Monitor
Powered by the [Threat Intel Platform](https://github.com/boclaes102-eng/threat-intel-platform) backend. Requests are proxied server-side — no CORS, no client-side API key exposure.

| Page | What it does |
|---|---|
| Assets | Register IPs, domains, CIDRs, and URLs for continuous monitoring. Add/remove assets, view last-scanned timestamps and tags. |
| Alerts | Real-time security alerts generated by background scans. Filter by severity (critical/high/medium/low/info), mark individual or all alerts as read. |
| Vulnerabilities | CVEs matched against your monitored assets by the backend's NVD feed sync. Expandable rows with description, affected products, references, and remediation status. |

### Reporting
| Tool | What it does |
|---|---|
| Report Builder | Structured pentest report with Finding, IOC, Text, and Raw section types. Exports to PDF (via browser print) and Markdown. Auto-saves draft to localStorage. |
| Investigation Notes | Per-target timestamped notes timeline. Types: Finding, IOC, Observation, Action. Severity tagging, tool references, full-text search, grouped date display, Markdown export. Reads in-scope targets from Scope Manager. |

---

## Architecture

```
┌─────────────────────────────────────────┐
│          Browser (Vercel CDN)           │
│         Next.js 15 App Router           │
│       Edge rate limiter (no auth)       │
│                                         │
│  /tools/monitor/* pages                 │
│       │                                 │
│       ▼                                 │
│  /api/monitor/[...path]  (proxy route)  │
│  Adds X-API-Key header server-side      │
└────────────────┬────────────────────────┘
                 │ HTTPS
                 ▼
┌─────────────────────────────────────────┐
│     Threat Intel Platform (Railway)     │
│                                         │
│  Fastify API  ←──── PostgreSQL 16       │
│       │              (Drizzle ORM)      │
│       │                                 │
│  BullMQ Workers  ←── Redis 7            │
│  ├─ CVE feed sync  (every 6h)           │
│  ├─ IOC scan       (every 1h)           │
│  └─ Asset scan     (on-demand)          │
│                                         │
│  Prometheus /metrics · Grafana          │
└─────────────────────────────────────────┘
```

The dashboard never exposes the backend API key to the browser. The Next.js proxy route injects `X-API-Key` from a server-side environment variable before forwarding the request.

---

## Technical Highlights

### Dashboard (this repo)
- **Next.js 15 App Router** — full use of the `app/` directory, server components where appropriate, `'use client'` for interactive tools
- **Edge Middleware** — sliding-window rate limiter runs at the Edge before any API route is reached; no auth gate
- **TypeScript throughout** — strict mode, discriminated union types for all API response shapes, no `any` escapes
- **Zero runtime dependencies** — no chart libraries, no form libraries, no HTTP clients, no utility belts

### Asset Monitor Backend ([threat-intel-platform](https://github.com/boclaes102-eng/threat-intel-platform))
- **Fastify + TypeScript** — REST API with OpenAPI/Swagger docs at `/docs`
- **Drizzle ORM + PostgreSQL 16** — typed schema, SQL migrations, 9 tables
- **BullMQ + Redis 7** — background job queues with recurring schedules and on-demand triggers
- **Docker multi-stage build** — `api` and `worker` as separate build targets in one Dockerfile
- **GitHub Actions CI** — lint, security audit, migrate, unit + integration tests, Codecov coverage upload
- **Prometheus + Grafana** — 8-panel pre-built observability dashboard

### Security
- **Sliding-window rate limiter** — built from scratch using `Map<string, number[]>` of timestamps; 60 req/min default, 20 req/min for paid external API routes
- **Server-side proxy** — backend API key never reaches the client bundle; injected at the Edge
- **XSS-safe** — React's default JSX escaping throughout; PDF export uses an isolated `window.open()` context
- **No SSRF surface** — all outbound requests in API routes target fixed known URLs

### Algorithmic Implementations (from scratch)
- **Wagner-Fischer edit distance** — O(n) rolling `Uint16Array` implementation for SSDEEP fuzzy hash segment similarity
- **SSDEEP blocksize compatibility** — full `equal / double / half` blocksize comparison per the spamsum spec
- **MurmurHash3** — favicon hash fingerprinting for Shodan pivoting
- **DataView multi-interpretation** — hex/binary tool interprets byte sequences as int8–int64, float32/64 (BE + LE) via the Web API `DataView`
- **BigInt decimal representation** — large byte arrays converted to accurate decimal without floating-point loss
- **CVSS v3.1 scoring** — full base score formula implemented client-side

---

## Stack

### Dashboard
| Layer | Technology |
|---|---|
| Framework | Next.js 15 (App Router) |
| Language | TypeScript 5 (strict) |
| Styling | Tailwind CSS 3.4 + custom cyber design tokens |
| Icons | lucide-react |
| Rate Limiting | In-memory sliding window (Map-based) |
| Storage | localStorage (client) |
| Deployment | Vercel |

### Threat Intel Platform
| Layer | Technology |
|---|---|
| Runtime | Node.js 20 + Fastify |
| Language | TypeScript 5 (strict) |
| ORM | Drizzle ORM |
| Database | PostgreSQL 16 |
| Queue | BullMQ |
| Cache / Queue broker | Redis 7 |
| Containers | Docker (multi-stage) |
| CI/CD | GitHub Actions |
| Observability | Prometheus + Grafana |
| Deployment | Railway (API + Worker as separate services) |

---

## Local Setup

```bash
git clone https://github.com/boclaes102-eng/Online-Cyber-dashboard
cd Online-Cyber-dashboard
npm install

cp .env.local.example .env.local
# Add any optional API keys

npm run dev
# → http://localhost:3000
```

To run the Asset Monitor locally, see the [threat-intel-platform README](https://github.com/boclaes102-eng/threat-intel-platform).

---

## Deployment (Vercel)

1. Push to GitHub
2. Import repo at [vercel.com](https://vercel.com/new)
3. Add `.env.local` variables under **Settings → Environment Variables**
4. Deploy — automatic on every push to `main`

---

## Environment Variables

### Asset Monitor (Threat Intel Platform)

| Key | Value |
|---|---|
| `THREAT_INTEL_API_URL` | Your Railway (or Render) deployment URL |
| `THREAT_INTEL_API_KEY` | API key generated via the platform's `/api/v1/auth/api-keys` endpoint |

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
