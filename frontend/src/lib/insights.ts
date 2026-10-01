import type { Video } from '../types.ts'
import { formatDuration } from './format.ts'
import { WEEKDAY_NAMES } from './schedule.ts'

export const SHORTS_MAX_SECONDS = 180
const MS_PER_DAY = 86_400_000
const MIN_AGE_DAYS = 1 / 24

export type FormatBucket = {
  count: number
  medianViews: number | null
  typicalDuration: string | null
}

export type FormatSplit = {
  shorts: FormatBucket
  longForm: FormatBucket
}

export type ViewTiming = {
  day: string | null
  dayMedianViews: number | null
  hour: string | null
  hourMedianViews: number | null
}

export type HashtagStat = {
  tag: string
  count: number
  medianViews: number
}

export type Packaging = {
  medianTitleLength: number | null
  questionCount: number
  numberCount: number
  titleCount: number
  hashtags: HashtagStat[]
}

export function viewsPerDay(viewCount: number, publishedAt: string | null, now = Date.now()): number | null {
  if (!publishedAt) {
    return null
  }
  const published = new Date(publishedAt).getTime()
  if (Number.isNaN(published)) {
    return null
  }
  const ageDays = Math.max((now - published) / MS_PER_DAY, MIN_AGE_DAYS)
  return viewCount / ageDays
}

export function median(values: number[]): number | null {
  if (values.length === 0) {
    return null
  }
  const sorted = [...values].sort((left, right) => left - right)
  const middle = Math.floor(sorted.length / 2)
  if (sorted.length % 2 === 0) {
    return ((sorted[middle - 1] ?? 0) + (sorted[middle] ?? 0)) / 2
  }
  return sorted[middle] ?? null
}

export function medianViews(videos: Video[]): number | null {
  return median(videos.map((video) => video.view_count))
}

export function outlierIds(videos: Video[]): Set<string> {
  const midpoint = medianViews(videos)
  if (midpoint === null || midpoint <= 0 || videos.length < 4) {
    return new Set()
  }
  const threshold = midpoint * 2
  return new Set(videos.filter((video) => video.view_count >= threshold).map((video) => video.id))
}

export function formatSplit(videos: Video[]): FormatSplit {
  const shorts = videos.filter((video) => video.duration_seconds > 0 && video.duration_seconds <= SHORTS_MAX_SECONDS)
  const longForm = videos.filter((video) => video.duration_seconds > SHORTS_MAX_SECONDS)
  return {
    shorts: bucket(shorts),
    longForm: bucket(longForm),
  }
}

export function viewTiming(videos: Video[]): ViewTiming {
  const byDay = new Map<number, number[]>()
  const byHour = new Map<number, number[]>()
  for (const video of videos) {
    if (!video.published_at) {
      continue
    }
    const date = new Date(video.published_at)
    if (Number.isNaN(date.getTime())) {
      continue
    }
    const day = (date.getDay() + 6) % 7
    pushGroup(byDay, day, video.view_count)
    pushGroup(byHour, date.getHours(), video.view_count)
  }
  const bestDay = bestGroup(byDay)
  const bestHour = bestGroup(byHour)
  return {
    day: bestDay === null ? null : (WEEKDAY_NAMES[bestDay] ?? null),
    dayMedianViews: bestDay === null ? null : median(byDay.get(bestDay) ?? []),
    hour: bestHour === null ? null : formatHourLabel(bestHour),
    hourMedianViews: bestHour === null ? null : median(byHour.get(bestHour) ?? []),
  }
}

export function packaging(videos: Video[]): Packaging {
  const titles = videos.map((video) => video.title.trim()).filter((title) => title.length > 0)
  const lengths = titles.map((title) => title.length)
  const tagViews = new Map<string, { tag: string; views: number[] }>()

  for (const video of videos) {
    const seen = new Set<string>()
    for (const tag of video.hashtags) {
      const key = tag.toLocaleLowerCase()
      if (seen.has(key)) {
        continue
      }
      seen.add(key)
      const current = tagViews.get(key) ?? { tag, views: [] }
      current.views.push(video.view_count)
      tagViews.set(key, current)
    }
  }

  const hashtags = [...tagViews.values()]
    .map((entry) => ({
      tag: entry.tag,
      count: entry.views.length,
      medianViews: median(entry.views) ?? 0,
    }))
    .sort((left, right) => right.count - left.count || right.medianViews - left.medianViews)
    .slice(0, 8)

  return {
    medianTitleLength: median(lengths),
    questionCount: titles.filter((title) => /[?？]/.test(title)).length,
    numberCount: titles.filter((title) => /\d/.test(title)).length,
    titleCount: titles.length,
    hashtags,
  }
}

function bucket(videos: Video[]): FormatBucket {
  const durations = videos.map((video) => video.duration_seconds).filter((seconds) => seconds > 0)
  const typical = median(durations)
  return {
    count: videos.length,
    medianViews: median(videos.map((video) => video.view_count)),
    typicalDuration: typical === null ? null : formatDuration(Math.round(typical)),
  }
}

function pushGroup(groups: Map<number, number[]>, key: number, views: number) {
  const current = groups.get(key) ?? []
  current.push(views)
  groups.set(key, current)
}

function bestGroup(groups: Map<number, number[]>): number | null {
  let bestKey: number | null = null
  let bestMedian = -1
  for (const [key, views] of groups) {
    if (views.length < 2) {
      continue
    }
    const midpoint = median(views) ?? 0
    if (midpoint > bestMedian) {
      bestMedian = midpoint
      bestKey = key
    }
  }
  return bestKey
}

function formatHourLabel(hour: number): string {
  const date = new Date()
  date.setHours(hour, 0, 0, 0)
  return new Intl.DateTimeFormat('en-US', { hour: 'numeric' }).format(date)
}
