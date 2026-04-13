import { clsx } from 'clsx'

/** A single shimmer bar. Width is a Tailwind class like "w-1/2" or "w-full". */
function Bar({ width = 'w-full', h = 'h-3', className }: { width?: string; h?: string; className?: string }) {
  return (
    <div
      className={clsx(
        'rounded bg-cyber-border/40 animate-pulse',
        width, h, className,
      )}
    />
  )
}

/** Generic cyber-themed loading skeleton used while a tool page segment loads. */
export default function ToolSkeleton() {
  return (
    <div className="max-w-3xl space-y-6 animate-fade-in">
      {/* Page title */}
      <div className="space-y-2">
        <Bar width="w-48" h="h-5" />
        <Bar width="w-80" h="h-3" />
      </div>

      {/* Input area */}
      <div className="flex gap-3">
        <div className="flex-1 h-10 rounded bg-cyber-border/30 animate-pulse" />
        <div className="w-28 h-10 rounded bg-cyber-cyan/10 animate-pulse" />
      </div>

      {/* Result card skeleton */}
      <div className="bg-cyber-surface border border-cyber-border rounded-lg overflow-hidden">
        {/* Card header */}
        <div className="px-4 py-2.5 border-b border-cyber-border flex items-center gap-3">
          <span className="w-2 h-2 rounded-full bg-cyber-border/60 animate-pulse" />
          <span className="w-2 h-2 rounded-full bg-cyber-border/60 animate-pulse" />
          <span className="w-2 h-2 rounded-full bg-cyber-border/60 animate-pulse" />
          <Bar width="w-32" h="h-2.5" className="ml-2" />
        </div>

        {/* Card rows */}
        <div className="p-4 space-y-3">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="flex gap-4">
              <Bar width="w-20" h="h-3" />
              <Bar width={i % 3 === 0 ? 'w-48' : i % 3 === 1 ? 'w-64' : 'w-40'} h="h-3" />
            </div>
          ))}
        </div>
      </div>

      {/* Second card skeleton */}
      <div className="bg-cyber-surface border border-cyber-border rounded-lg overflow-hidden">
        <div className="px-4 py-2.5 border-b border-cyber-border">
          <Bar width="w-24" h="h-2.5" />
        </div>
        <div className="p-4 space-y-2.5">
          {[...Array(4)].map((_, i) => (
            <Bar key={i} width={i % 2 === 0 ? 'w-full' : 'w-3/4'} h="h-3" />
          ))}
        </div>
      </div>
    </div>
  )
}
