import { ChannelOverviewCard } from '../components/ChannelOverviewCard.tsx'
import { GrowthInsights } from '../components/GrowthInsights.tsx'
import { UploadWeekdayChart } from '../components/UploadWeekdayChart.tsx'
import { VideoScheduleTable } from '../components/VideoScheduleTable.tsx'
import type { BenchRole } from '../lib/bench.ts'
import type { Channel, Video } from '../types.ts'

type ChannelAnalyzerProps = {
  channel: Channel
  videos: Video[] | null
  videosError: string | null
  savedRole: BenchRole | null
  canSaveCompetitor: boolean
  onSave: (role: BenchRole) => void
}

export function ChannelAnalyzer({
  channel,
  videos,
  videosError,
  savedRole,
  canSaveCompetitor,
  onSave,
}: ChannelAnalyzerProps) {
  const canSave = videos !== null

  return (
    <div className="flex flex-col gap-6">
      <ChannelOverviewCard channel={channel} />
      <div className="flex flex-col gap-2 sm:flex-row">
        <button
          type="button"
          disabled={!canSave}
          onClick={() => onSave('mine')}
          className="h-9 rounded-lg border border-line px-3 text-xs text-ink hover:border-accent disabled:cursor-not-allowed disabled:opacity-45"
        >
          {savedRole === 'mine' ? 'Update my channel' : 'Save as my channel'}
        </button>
        <button
          type="button"
          disabled={!canSave || !canSaveCompetitor}
          onClick={() => onSave('competitor')}
          className="h-9 rounded-lg border border-line px-3 text-xs text-ink hover:border-accent disabled:cursor-not-allowed disabled:opacity-45"
        >
          {savedRole === 'competitor' ? 'Update competitor' : canSaveCompetitor ? 'Save as competitor' : 'Competitor list is full'}
        </button>
      </div>
      {videosError ? (
        <p role="alert" className="rounded-lg border border-accent/40 bg-accent/10 px-4 py-3 text-sm text-ink">
          {videosError}
        </p>
      ) : null}
      {videos ? (
        <>
          <GrowthInsights videos={videos} />
          <UploadWeekdayChart videos={videos} />
          <VideoScheduleTable videos={videos} />
        </>
      ) : null}
    </div>
  )
}
