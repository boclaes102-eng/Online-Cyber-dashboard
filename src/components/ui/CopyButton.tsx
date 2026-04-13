'use client'

import { useState } from 'react'
import { Copy, Check } from 'lucide-react'
import { clsx } from 'clsx'

interface CopyButtonProps {
  text: string
  className?: string
}

export default function CopyButton({ text, className }: CopyButtonProps) {
  const [copied, setCopied] = useState(false)

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(text)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      // fallback: do nothing
    }
  }

  return (
    <button
      onClick={copy}
      className={clsx(
        'flex items-center gap-1 px-2 py-1 rounded text-[10px] font-mono transition-all',
        copied
          ? 'text-cyber-green border border-cyber-green/30 bg-cyber-green/5'
          : 'text-cyber-muted border border-cyber-border hover:text-cyber-cyan hover:border-cyber-cyan/30',
        className,
      )}
      title="Copy to clipboard"
    >
      {copied ? <Check size={10} /> : <Copy size={10} />}
      {copied ? 'Copied' : 'Copy'}
    </button>
  )
}
