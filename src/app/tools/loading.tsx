import ToolSkeleton from '@/components/ui/ToolSkeleton'

/**
 * Next.js 14 loading segment — automatically shown while a tool page
 * loads. Replaces the blank-screen flash on slow API calls.
 */
export default function ToolsLoading() {
  return (
    <div className="p-6">
      <ToolSkeleton />
    </div>
  )
}
