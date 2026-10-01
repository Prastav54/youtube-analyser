import type { Video } from '../types.ts'
import { WEEKDAY_LABELS, weekdayCounts } from '../lib/schedule.ts'

type UploadWeekdayChartProps = {
  videos: Video[]
}

export function UploadWeekdayChart({ videos }: UploadWeekdayChartProps) {
  const counts = weekdayCounts(videos)
  const total = counts.reduce((sum, count) => sum + count, 0)
  if (total === 0) {
    return null
  }
  const peak = Math.max(...counts, 1)

  return (
    <section className="rounded-xl border border-line bg-panel p-5 sm:p-6">
      <h2 className="text-sm font-medium text-ink">Upload days</h2>
      <p className="mt-1 text-xs text-muted">How the recent uploads are spread across the week.</p>
      <div className="mt-5 flex items-end gap-2">
        {WEEKDAY_LABELS.map((label, index) => {
          const count = counts[index] ?? 0
          const height = count === 0 ? 2 : Math.max(8, Math.round((count / peak) * 100))
          return (
            <div key={label} className="flex min-w-0 flex-1 flex-col items-center gap-2">
              <span className="font-mono text-[11px] text-muted tabular-nums">{count}</span>
              <div className="flex h-28 w-full items-end">
                <div
                  className="w-full rounded-sm bg-accent/85"
                  style={{ height: `${height}%` }}
                  title={`${label}: ${count} upload${count === 1 ? '' : 's'}`}
                />
              </div>
              <span className="text-[11px] text-muted">{label}</span>
            </div>
          )
        })}
      </div>
    </section>
  )
}
