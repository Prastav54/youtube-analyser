import type { Video } from '../types.ts'
import { formatCount, formatFullCount } from '../lib/format.ts'
import { formatSplit, medianViews, packaging, viewTiming } from '../lib/insights.ts'

type GrowthInsightsProps = {
  videos: Video[]
}

export function GrowthInsights({ videos }: GrowthInsightsProps) {
  if (videos.length === 0) {
    return null
  }

  const split = formatSplit(videos)
  const timing = viewTiming(videos)
  const pack = packaging(videos)
  const midpoint = medianViews(videos)

  return (
    <section className="rounded-xl border border-line bg-panel p-5 sm:p-6">
      <h2 className="text-sm font-medium text-ink">What is working</h2>
      <p className="mt-1 text-xs leading-5 text-muted">
        Based on {videos.length} recent public uploads.
        {midpoint !== null ? ` Median views are ${formatCount(midpoint)}.` : ''} A video at twice that median is marked as an outlier in the table.
      </p>

      <div className="mt-5 grid gap-6 lg:grid-cols-3">
        <div>
          <h3 className="text-[11px] tracking-[0.14em] text-muted uppercase">Format</h3>
          <dl className="mt-3 flex flex-col gap-3">
            <FormatStat label="Shorts" count={split.shorts.count} medianValue={split.shorts.medianViews} duration={split.shorts.typicalDuration} />
            <FormatStat label="Long-form" count={split.longForm.count} medianValue={split.longForm.medianViews} duration={split.longForm.typicalDuration} />
          </dl>
        </div>
        <div>
          <h3 className="text-[11px] tracking-[0.14em] text-muted uppercase">Timing by views</h3>
          <dl className="mt-3 flex flex-col gap-3">
            <TimingStat label="Best day" name={timing.day} medianValue={timing.dayMedianViews} empty="Need at least two uploads on the same day." />
            <TimingStat label="Best hour" name={timing.hour} medianValue={timing.hourMedianViews} empty="Need at least two uploads in the same hour." />
          </dl>
        </div>
        <div>
          <h3 className="text-[11px] tracking-[0.14em] text-muted uppercase">Titles</h3>
          <dl className="mt-3 flex flex-col gap-3">
            <div>
              <dt className="text-xs text-muted">Typical length</dt>
              <dd className="mt-1 text-sm text-ink">
                {pack.medianTitleLength === null ? '—' : `${Math.round(pack.medianTitleLength)} characters`}
              </dd>
            </div>
            <div>
              <dt className="text-xs text-muted">Questions</dt>
              <dd className="mt-1 text-sm text-ink">{pack.questionCount} of {pack.titleCount}</dd>
            </div>
            <div>
              <dt className="text-xs text-muted">Include a number</dt>
              <dd className="mt-1 text-sm text-ink">{pack.numberCount} of {pack.titleCount}</dd>
            </div>
          </dl>
        </div>
      </div>

      {pack.hashtags.length > 0 ? (
        <div className="mt-6 border-t border-line pt-5">
          <h3 className="text-[11px] tracking-[0.14em] text-muted uppercase">Hashtags on stronger videos</h3>
          <div className="mt-3 overflow-x-auto">
            <table className="w-full min-w-[420px] text-left text-sm">
              <thead>
                <tr className="text-[11px] tracking-[0.14em] text-muted uppercase">
                  <th scope="col" className="py-2 pr-4 font-medium">Hashtag</th>
                  <th scope="col" className="py-2 pr-4 text-right font-medium">Videos</th>
                  <th scope="col" className="py-2 text-right font-medium">Median views</th>
                </tr>
              </thead>
              <tbody>
                {pack.hashtags.map((tag) => (
                  <tr key={tag.tag} className="border-t border-line">
                    <td className="py-2 pr-4">
                      <a
                        href={`https://www.youtube.com/hashtag/${encodeURIComponent(tag.tag)}`}
                        target="_blank"
                        rel="noreferrer"
                        className="text-ink hover:text-white"
                      >
                        #{tag.tag}
                      </a>
                    </td>
                    <td className="py-2 pr-4 text-right font-mono text-ink tabular-nums">{tag.count}</td>
                    <td className="py-2 text-right font-mono text-ink tabular-nums" title={formatFullCount(tag.medianViews)}>
                      {formatCount(tag.medianViews)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : null}
    </section>
  )
}

function FormatStat({
  label,
  count,
  medianValue,
  duration,
}: {
  label: string
  count: number
  medianValue: number | null
  duration: string | null
}) {
  return (
    <div>
      <dt className="text-xs text-muted">{label}</dt>
      <dd className="mt-1 text-sm text-ink">
        {count === 0 ? 'None in this sample' : `${count} videos`}
        {medianValue !== null ? ` · median ${formatCount(medianValue)} views` : ''}
        {duration ? ` · typical ${duration}` : ''}
      </dd>
    </div>
  )
}

function TimingStat({
  label,
  name,
  medianValue,
  empty,
}: {
  label: string
  name: string | null
  medianValue: number | null
  empty: string
}) {
  return (
    <div>
      <dt className="text-xs text-muted">{label}</dt>
      <dd className="mt-1 text-sm text-ink">
        {name === null || medianValue === null ? empty : `${name} · median ${formatCount(medianValue)} views`}
      </dd>
    </div>
  )
}
