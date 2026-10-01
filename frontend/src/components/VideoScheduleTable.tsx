import { useMemo, useState, type ReactNode } from 'react'
import type { Video } from '../types.ts'
import { formatCount, formatDuration, formatFullCount, formatUpload } from '../lib/format.ts'
import { WEEKDAY_NAMES, summarizeSchedule } from '../lib/schedule.ts'

type VideoScheduleTableProps = {
  videos: Video[]
}

type SortKey = 'newest' | 'oldest' | 'views-desc' | 'views-asc' | 'longest' | 'shortest'
type LengthFilter = 'all' | 'shorts' | 'long'
type WeekdayFilter = 'all' | '0' | '1' | '2' | '3' | '4' | '5' | '6'

const SHORTS_MAX_SECONDS = 180

export function VideoScheduleTable({ videos }: VideoScheduleTableProps) {
  const summary = summarizeSchedule(videos)
  const [sort, setSort] = useState<SortKey>('newest')
  const [length, setLength] = useState<LengthFilter>('all')
  const [weekday, setWeekday] = useState<WeekdayFilter>('all')

  const visible = useMemo(
    () => filterAndSort(videos, sort, length, weekday),
    [videos, sort, length, weekday],
  )

  const countLabel =
    visible.length === videos.length
      ? `${videos.length} recent upload${videos.length === 1 ? '' : 's'}`
      : `Showing ${visible.length} of ${videos.length}`

  return (
    <section className="rounded-xl border border-line bg-panel">
      <div className="border-b border-line px-5 py-5 sm:px-6">
        <h2 className="text-sm font-medium text-ink">Publishing schedule & frequency</h2>
        <p className="mt-1 text-xs leading-5 text-muted">
          Recent public uploads. Day and time are shown in your local timezone.
        </p>
        {summary ? (
          <dl className="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-3">
            <SummaryItem label="Cadence" value={summary.cadenceLabel} />
            <SummaryItem label="Most common day" value={summary.usualDay} />
            <SummaryItem label="Most common hour" value={summary.usualTime} />
          </dl>
        ) : null}

        <div className="mt-5 flex flex-col gap-2 sm:flex-row sm:flex-wrap">
          <FilterSelect
            label="Sort"
            value={sort}
            onChange={(value) => setSort(value as SortKey)}
          >
            <option value="newest">Newest</option>
            <option value="oldest">Oldest</option>
            <option value="views-desc">Most views</option>
            <option value="views-asc">Fewest views</option>
            <option value="longest">Longest</option>
            <option value="shortest">Shortest</option>
          </FilterSelect>
          <FilterSelect
            label="Length"
            value={length}
            onChange={(value) => setLength(value as LengthFilter)}
          >
            <option value="all">All lengths</option>
            <option value="shorts">Shorts (≤ 3 min)</option>
            <option value="long">Long-form</option>
          </FilterSelect>
          <FilterSelect
            label="Day"
            value={weekday}
            onChange={(value) => setWeekday(value as WeekdayFilter)}
          >
            <option value="all">All days</option>
            {WEEKDAY_NAMES.map((name, index) => (
              <option key={name} value={String(index)}>
                {name}
              </option>
            ))}
          </FilterSelect>
        </div>

        <p className="mt-4 text-[11px] tracking-wide text-muted uppercase">{countLabel}</p>
      </div>

      {videos.length === 0 ? (
        <p className="px-5 py-8 text-sm text-muted sm:px-6">No public uploads in this window.</p>
      ) : visible.length === 0 ? (
        <p className="px-5 py-8 text-sm text-muted sm:px-6">No uploads match these filters.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[960px] text-left text-sm">
            <thead>
              <tr className="border-b border-line text-[11px] tracking-[0.14em] text-muted uppercase">
                <th scope="col" className="px-5 py-3 font-medium sm:px-6">
                  Video
                </th>
                <th scope="col" className="px-4 py-3 font-medium">
                  Uploaded
                </th>
                <th scope="col" className="px-4 py-3 text-right font-medium">
                  Views
                </th>
                <th scope="col" className="px-4 py-3 text-right font-medium">
                  Duration
                </th>
                <th scope="col" className="px-5 py-3 font-medium sm:px-6">
                  Hashtags
                </th>
              </tr>
            </thead>
            <tbody>
              {visible.map((video) => {
                const uploaded = formatUpload(video.published_at)
                return (
                  <tr key={video.id} className="border-b border-line last:border-b-0">
                    <td className="px-5 py-3 sm:px-6">
                      <div className="flex items-center gap-3">
                        {video.thumbnail_url ? (
                          <img
                            src={video.thumbnail_url}
                            alt=""
                            className="h-12 w-20 shrink-0 rounded object-cover"
                          />
                        ) : (
                          <div className="h-12 w-20 shrink-0 rounded bg-white/5" />
                        )}
                        <a
                          href={video.url}
                          target="_blank"
                          rel="noreferrer"
                          className="line-clamp-2 font-medium text-ink hover:text-white"
                          title={video.title}
                        >
                          {video.title}
                        </a>
                      </div>
                    </td>
                    <td className="px-4 py-3 align-middle whitespace-nowrap">
                      {uploaded ? (
                        <div>
                          <p className="text-ink">
                            {uploaded.day} · {uploaded.time}
                          </p>
                          <p className="mt-0.5 text-xs text-muted">{uploaded.date}</p>
                        </div>
                      ) : (
                        <span className="text-muted">Unknown</span>
                      )}
                    </td>
                    <td
                      className="px-4 py-3 text-right font-mono text-ink tabular-nums"
                      title={formatFullCount(video.view_count)}
                    >
                      {formatCount(video.view_count)}
                    </td>
                    <td className="px-4 py-3 text-right font-mono text-ink tabular-nums">
                      {formatDuration(video.duration_seconds)}
                    </td>
                    <td className="px-5 py-3 align-middle sm:px-6">
                      {video.hashtags.length === 0 ? (
                        <span className="text-muted">—</span>
                      ) : (
                        <ul className="flex max-w-xs flex-wrap gap-1" title={video.hashtags.map((tag) => `#${tag}`).join(' ')}>
                          {video.hashtags.map((tag) => (
                            <li key={tag}>
                              <a
                                href={`https://www.youtube.com/hashtag/${encodeURIComponent(tag)}`}
                                target="_blank"
                                rel="noreferrer"
                                className="inline-block rounded bg-white/5 px-1.5 py-0.5 text-xs text-muted hover:text-ink"
                              >
                                #{tag}
                              </a>
                            </li>
                          ))}
                        </ul>
                      )}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
    </section>
  )
}

function filterAndSort(
  videos: Video[],
  sort: SortKey,
  length: LengthFilter,
  weekday: WeekdayFilter,
): Video[] {
  const filtered = videos.filter((video) => {
    if (length === 'shorts' && (video.duration_seconds <= 0 || video.duration_seconds > SHORTS_MAX_SECONDS)) {
      return false
    }
    if (length === 'long' && video.duration_seconds <= SHORTS_MAX_SECONDS) {
      return false
    }
    if (weekday !== 'all' && String(uploadWeekday(video.published_at)) !== weekday) {
      return false
    }
    return true
  })

  return filtered.sort((left, right) => {
    switch (sort) {
      case 'oldest':
        return publishedTime(left.published_at) - publishedTime(right.published_at)
      case 'views-desc':
        return right.view_count - left.view_count
      case 'views-asc':
        return left.view_count - right.view_count
      case 'longest':
        return right.duration_seconds - left.duration_seconds
      case 'shortest':
        return left.duration_seconds - right.duration_seconds
      default:
        return publishedTime(right.published_at) - publishedTime(left.published_at)
    }
  })
}

function publishedTime(iso: string | null): number {
  if (!iso) return 0
  const time = new Date(iso).getTime()
  return Number.isNaN(time) ? 0 : time
}

function uploadWeekday(iso: string | null): number | null {
  if (!iso) return null
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) return null
  return (date.getDay() + 6) % 7
}

function SummaryItem({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-[11px] tracking-[0.14em] text-muted uppercase">{label}</dt>
      <dd className="mt-1 text-sm text-ink">{value}</dd>
    </div>
  )
}

function FilterSelect({
  label,
  value,
  onChange,
  children,
}: {
  label: string
  value: string
  onChange: (value: string) => void
  children: ReactNode
}) {
  const id = `schedule-${label.toLowerCase()}`
  return (
    <div className="flex min-w-0 flex-1 flex-col gap-1 sm:max-w-52">
      <label htmlFor={id} className="text-[11px] tracking-[0.14em] text-muted uppercase">
        {label}
      </label>
      <select
        id={id}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="h-9 rounded-lg border border-line bg-canvas px-2 text-sm text-ink outline-none focus:border-accent"
      >
        {children}
      </select>
    </div>
  )
}
