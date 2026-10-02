import type { StoredReport } from './reportHistory.ts'
import { formatDuration, formatHandle } from './format.ts'
import {
  SHORTS_MAX_SECONDS,
  formatSplit,
  median,
  outlierIds,
  packaging,
  viewTiming,
  viewsPerDay,
} from './insights.ts'
import { WEEKDAY_NAMES, summarizeSchedule } from './schedule.ts'
import { zipStore } from './zip.ts'

const encoder = new TextEncoder()

export function reportArchive(reports: StoredReport[]): Blob {
  return zipStore([
    { name: 'readme.txt', bytes: encoder.encode(readmeText()) },
    { name: 'channels.csv', bytes: csvBytes(channelRows(reports)) },
    { name: 'videos.csv', bytes: csvBytes(videoRows(reports)) },
    { name: 'hashtags.csv', bytes: csvBytes(hashtagRows(reports)) },
  ])
}

export function downloadReports(reports: StoredReport[], filename: string) {
  const archive = reportArchive(reports)
  const url = URL.createObjectURL(archive)
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  link.click()
  URL.revokeObjectURL(url)
}

export function reportFilename(scope: string): string {
  const day = new Date().toISOString().slice(0, 10)
  return `youtube-reports-${scope}-${day}.zip`
}

export function channelRows(reports: StoredReport[]): Array<Array<string | number | null>> {
  const header = [
    'channel_id',
    'channel_title',
    'handle',
    'country',
    'subscribers',
    'total_views',
    'video_count',
    'channel_started',
    'searched_at',
    'sample_size',
    'median_views',
    'median_views_per_day',
    'cadence',
    'most_common_upload_day',
    'most_common_upload_hour',
    'best_view_day',
    'best_view_day_median_views',
    'best_view_hour',
    'best_view_hour_median_views',
    'shorts_count',
    'shorts_median_views',
    'shorts_typical_duration',
    'long_form_count',
    'long_form_median_views',
    'long_form_typical_duration',
    'median_title_length',
    'question_titles',
    'titles_with_a_number',
  ]

  const rows = reports.map((report) => {
    const { channel, videos } = report
    const schedule = summarizeSchedule(videos)
    const timing = viewTiming(videos)
    const split = formatSplit(videos)
    const pack = packaging(videos)
    const daily = videos
      .map((video) => viewsPerDay(video.view_count, video.published_at))
      .filter((value): value is number => value !== null)

    return [
      channel.id,
      channel.title,
      formatHandle(channel.custom_url, channel.id),
      channel.country,
      channel.hidden_subscriber_count ? null : channel.subscriber_count,
      channel.view_count,
      channel.video_count,
      channel.published_at,
      report.searchedAt,
      videos.length,
      roundNumber(median(videos.map((video) => video.view_count))),
      roundNumber(median(daily)),
      schedule?.cadenceLabel ?? null,
      schedule?.usualDay ?? null,
      schedule?.usualTime ?? null,
      timing.day,
      roundNumber(timing.dayMedianViews),
      timing.hour,
      roundNumber(timing.hourMedianViews),
      split.shorts.count,
      roundNumber(split.shorts.medianViews),
      split.shorts.typicalDuration,
      split.longForm.count,
      roundNumber(split.longForm.medianViews),
      split.longForm.typicalDuration,
      pack.medianTitleLength === null ? null : Math.round(pack.medianTitleLength),
      pack.questionCount,
      pack.numberCount,
    ]
  })

  return [header, ...rows]
}

export function videoRows(reports: StoredReport[]): Array<Array<string | number | null>> {
  const header = [
    'channel_id',
    'channel_title',
    'handle',
    'video_id',
    'title',
    'url',
    'published_at',
    'local_date',
    'weekday',
    'hour_local',
    'views',
    'views_per_day',
    'likes',
    'comments',
    'duration_seconds',
    'duration',
    'format',
    'hashtags',
    'outlier',
  ]

  const rows: Array<Array<string | number | null>> = []
  for (const report of reports) {
    const outliers = outlierIds(report.videos)
    const handle = formatHandle(report.channel.custom_url, report.channel.id)
    for (const video of report.videos) {
      const when = localWhen(video.published_at)
      const daily = viewsPerDay(video.view_count, video.published_at)
      rows.push([
        report.channel.id,
        report.channel.title,
        handle,
        video.id,
        video.title,
        video.url,
        video.published_at,
        when.date,
        when.weekday,
        when.hour,
        video.view_count,
        roundNumber(daily),
        video.like_count,
        video.comment_count,
        video.duration_seconds,
        formatDuration(video.duration_seconds),
        videoFormat(video.duration_seconds),
        video.hashtags.map((tag) => `#${tag}`).join('|'),
        outliers.has(video.id) ? 'yes' : 'no',
      ])
    }
  }

  return [header, ...rows]
}

export function hashtagRows(reports: StoredReport[]): Array<Array<string | number | null>> {
  const header = ['channel_id', 'channel_title', 'handle', 'hashtag', 'videos', 'median_views']
  const rows: Array<Array<string | number | null>> = []

  for (const report of reports) {
    const handle = formatHandle(report.channel.custom_url, report.channel.id)
    const grouped = new Map<string, { tag: string; views: number[] }>()
    for (const video of report.videos) {
      const seen = new Set<string>()
      for (const tag of video.hashtags) {
        const key = tag.toLocaleLowerCase()
        if (seen.has(key)) {
          continue
        }
        seen.add(key)
        const current = grouped.get(key) ?? { tag, views: [] }
        current.views.push(video.view_count)
        grouped.set(key, current)
      }
    }

    const ranked = [...grouped.values()].sort(
      (left, right) => right.views.length - left.views.length || (median(right.views) ?? 0) - (median(left.views) ?? 0),
    )
    for (const entry of ranked) {
      rows.push([
        report.channel.id,
        report.channel.title,
        handle,
        `#${entry.tag}`,
        entry.views.length,
        roundNumber(median(entry.views)),
      ])
    }
  }

  return [header, ...rows]
}

function videoFormat(durationSeconds: number): string {
  if (durationSeconds <= 0) {
    return 'unknown'
  }
  return durationSeconds <= SHORTS_MAX_SECONDS ? 'short' : 'long'
}

function localWhen(iso: string | null): { date: string | null; weekday: string | null; hour: number | null } {
  if (!iso) {
    return { date: null, weekday: null, hour: null }
  }
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) {
    return { date: null, weekday: null, hour: null }
  }
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return {
    date: `${date.getFullYear()}-${month}-${day}`,
    weekday: WEEKDAY_NAMES[(date.getDay() + 6) % 7] ?? null,
    hour: date.getHours(),
  }
}

function roundNumber(value: number | null): number | null {
  if (value === null || !Number.isFinite(value)) {
    return null
  }
  return Math.round(value * 100) / 100
}

function csvBytes(rows: Array<Array<string | number | null>>): Uint8Array {
  const body = rows.map((row) => row.map(csvCell).join(',')).join('\r\n')
  return encoder.encode(`\uFEFF${body}\r\n`)
}

function csvCell(value: string | number | null): string {
  if (value === null) {
    return ''
  }
  if (typeof value === 'number') {
    return Number.isFinite(value) ? String(value) : ''
  }
  if (/[",\n\r]/.test(value)) {
    return `"${value.replaceAll('"', '""')}"`
  }
  return value
}

function readmeText(): string {
  return [
    'YouTube analyzer export',
    '',
    'channels.csv  One row per channel you looked up, with the summary numbers from that search.',
    'videos.csv    One row per recent video. Use this sheet for filters, pivots, and charts.',
    'hashtags.csv  One row per hashtag on each channel, with how many videos used it and their median views.',
    '',
    'Weekday and hour columns use the timezone of the browser that downloaded the file.',
    'views_per_day is views divided by the age of the video at download time.',
    'outlier is yes when a video has at least twice the channel sample median views.',
    'format is short for videos of 3 minutes or less, otherwise long.',
    'Files are UTF-8 CSV and open in Excel, Google Sheets, or Numbers.',
    '',
  ].join('\n')
}
