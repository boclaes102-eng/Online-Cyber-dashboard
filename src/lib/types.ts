// ── IP Intelligence ────────────────────────────────────────────────────────
export interface IpResult {
  ip:          string
  hostname?:   string
  city?:       string
  region?:     string
  country?:    string
  countryCode?:string
  lat?:        number
  lon?:        number
  timezone?:   string
  isp?:        string
  org?:        string
  as?:         string
  asname?:     string
  // enrichment (optional, keyed APIs)
  abuseScore?: number
  totalReports?:number
  lastReported?:string
  // derived
  isPrivate:   boolean
  riskLevel:   'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL'
  error?:      string
}

// ── Domain Analysis ────────────────────────────────────────────────────────
export interface DnsRecord {
  type:  string
  name:  string
  value: string
  ttl?:  number
}

export interface SslCert {
  subject:     string
  issuer:      string
  validFrom:   string
  validTo:     string
  daysLeft:    number
  isValid:     boolean
  san?:        string[]
}

export interface WhoisData {
  domain:       string
  registrar?:   string
  created?:     string
  updated?:     string
  expires?:     string
  nameservers?: string[]
  status?:      string[]
  registrant?:  string
}

export interface CertEntry {
  id:         number
  loggedAt:   string
  notBefore:  string
  notAfter:   string
  name:       string
  issuerName: string
}

export interface DomainResult {
  domain:       string
  dns:          DnsRecord[]
  whois?:       WhoisData
  ssl?:         SslCert
  certs:        CertEntry[]
  subdomains:   string[]
  error?:       string
}

// ── CVE ────────────────────────────────────────────────────────────────────
export interface CvssScore {
  version:      string
  baseScore:    number
  baseSeverity: string
  vectorString: string
}

export interface CveItem {
  id:           string
  published:    string
  lastModified: string
  vulnStatus:   string
  description:  string
  severity:     string
  cvss?:        CvssScore
  references:   string[]
  cwe?:         string[]
  affectedProducts: string[]
}

export interface CveSearchResult {
  totalResults: number
  items:        CveItem[]
  error?:       string
}

// ── Password ───────────────────────────────────────────────────────────────
export type StrengthLabel = 'VERY_WEAK' | 'WEAK' | 'FAIR' | 'STRONG' | 'VERY_STRONG'

export interface PatternMatch {
  label:    string
  span:     [number, number]
  severity: number
}

export interface PasswordResult {
  password:          string
  score:             number
  strength:          StrengthLabel
  shannonEntropy:    number
  searchSpaceBits:   number
  length:            number
  charClasses: {
    lowercase: boolean
    uppercase: boolean
    digits:    boolean
    symbols:   boolean
    extended:  boolean
    poolSize:  number
  }
  patternsFound:     PatternMatch[]
  policyViolations:  string[]
  recommendations:   string[]
  crackTime:         string
  // breach
  breachCount?:      number
  isBreached?:       boolean
  breachChecked:     boolean
}

// ── Hash / Malware ─────────────────────────────────────────────────────────
export type HashType = 'MD5' | 'SHA1' | 'SHA256' | 'SHA512' | 'UNKNOWN'

export interface VtResult {
  found:         boolean
  malicious:     number
  suspicious:    number
  harmless:      number
  undetected:    number
  total:         number
  threatLabel?:  string
  lastAnalysis?: string
  permalink?:    string
  error?:        string
}

export interface MbResult {
  found:         boolean
  fileName?:     string
  fileType?:     string
  fileSize?:     number
  firstSeen?:    string
  lastSeen?:     string
  tags?:         string[]
  signature?:    string
  error?:        string
}

export interface HashResult {
  hash:         string
  hashType:     HashType
  virustotal?:  VtResult
  malwarebazaar?: MbResult
  error?:       string
}

// ── DNS Resolver ───────────────────────────────────────────────────────────
export interface DnsResolveResult {
  query:   string
  type:    string
  records: DnsRecord[]
  error?:  string
}

// ── SSL Inspector ──────────────────────────────────────────────────────────
export interface SslInspectResult {
  host:          string
  port:          number
  valid:         boolean
  authorized:    boolean
  daysLeft:      number
  expiresAt:     string
  issuedAt:      string
  issuer:        string
  subject:       string
  san:           string[]
  protocol:      string
  cipher?:       string
  keyBits?:      number
  serialNumber?: string
  fingerprint256?: string
  error?:        string
}

// ── URL Scanner ────────────────────────────────────────────────────────────
export type UrlVerdict = 'SAFE' | 'MALICIOUS' | 'SUSPICIOUS' | 'UNKNOWN'

export interface UrlScanResult {
  url:      string
  domain:   string
  verdict:  UrlVerdict
  urlhaus?: {
    found:       boolean
    urlStatus?:  string
    threat?:     string
    tags?:       string[]
    urlsOnHost?: number
    reference?:  string
    error?:      string
  }
  virustotal?: VtResult
  error?:   string
}

// ── Email OSINT ────────────────────────────────────────────────────────────
export interface EmailOsintResult {
  email:          string
  valid:          boolean
  domain:         string
  disposable:     boolean
  mx:             DnsRecord[]
  spf?:           string
  dmarc?:         string
  gravatarExists: boolean
  domainBreaches?: { name: string; breachDate: string; dataClasses: string[] }[]
  breachChecked:  boolean
  error?:         string
}

// ── IOC Lookup ─────────────────────────────────────────────────────────────
export type IocType    = 'IP' | 'DOMAIN' | 'URL' | 'HASH' | 'UNKNOWN'
export type IocVerdict = 'MALICIOUS' | 'SUSPICIOUS' | 'CLEAN' | 'UNKNOWN'

export interface IocSource {
  name:     string
  found:    boolean
  verdict?: string
  details?: string
  url?:     string
}

export interface IocResult {
  ioc:     string
  type:    IocType
  verdict: IocVerdict
  score:   number
  sources: IocSource[]
  tags:    string[]
  error?:  string
}

// ── Port Scanner ───────────────────────────────────────────────────────────
export interface PortService {
  port:      number
  protocol:  string
  service?:  string
  product?:  string
  version?:  string
  cpe?:      string
}

export interface PortScanResult {
  ip:          string
  hostnames?:  string[]
  os?:         string
  org?:        string
  country?:    string
  ports:       number[]
  services:    PortService[]
  vulns?:      string[]
  lastUpdate?: string
  mode:        'shodan' | 'tcp'
  error?:      string
}
