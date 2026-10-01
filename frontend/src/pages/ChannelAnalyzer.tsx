import { ChannelOverviewCard } from '../components/ChannelOverviewCard.tsx'
import { UploadWeekdayChart } from '../components/UploadWeekdayChart.tsx'
import { VideoScheduleTable } from '../components/VideoScheduleTable.tsx'
import type { Channel, Video } from '../types.ts'

type ChannelAnalyzerProps = {
  channel: Channel
  videos: Video[] | null
  videosError: string | null
}

export function ChannelAnalyzer({ channel, videos, videosError }: ChannelAnalyzerProps) {
  return (
    <div className="flex flex-col gap-6">
      <ChannelOverviewCard channel={channel} />
      {videosError ? (
        <p role="alert" className="rounded-lg border border-accent/40 bg-accent/10 px-4 py-3 text-sm text-ink">
          {videosError}
        </p>
      ) : null}
      {videos ? (
        <>
          <UploadWeekdayChart videos={videos} />
          <VideoScheduleTable videos={videos} />
        </>
      ) : null}
    </div>
  )
}
