import { clsx } from 'clsx'

interface SpinnerProps {
  size?: 'sm' | 'md' | 'lg'
  className?: string
}

export default function Spinner({ size = 'md', className }: SpinnerProps) {
  const sz = size === 'sm' ? 'w-4 h-4' : size === 'lg' ? 'w-8 h-8' : 'w-6 h-6'
  return (
    <span
      className={clsx(
        sz,
        'inline-block rounded-full border-2 border-cyber-border border-t-cyber-cyan animate-spin',
        className,
      )}
    />
  )
}
