export default function Loading() {
  return (
    <div className="fixed inset-0 bg-[#03060a] z-50 flex items-center justify-center">
      <div className="flex flex-col items-center gap-3">
        <div className="w-5 h-5 rounded border border-[#00f5d4]/40 relative overflow-hidden">
          <div
            className="absolute left-0 right-0 h-[1px] bg-[#00f5d4]/60"
            style={{ animation: 'scanline 0.8s linear infinite' }}
          />
        </div>
        <span className="font-mono text-[8px] text-[#4a6080] tracking-[0.3em] uppercase">
          Loading
        </span>
      </div>
    </div>
  )
}
