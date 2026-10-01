import type { Channel, Video } from '../types.ts'
import { formatHandle } from './format.ts'
import { formatSplit, median, viewsPerDay } from './insights.ts'
import { summarizeSchedule } from './schedule.ts'

const STORAGE_KEY = 'yt-analyser-bench'
const COMPETITOR_LIMIT = 3

export type BenchRole = 'mine' | 'competitor'

export type BenchEntry = {
  role: BenchRole
  id: string
  title: string
  handle: string
  thumbnailUrl: string | null
  subscriberCount: number | null
  hiddenSubscribers: boolean
  medianViews: number | null
  medianViewsPerDay: number | null
  cadenceLabel: string
  shortsCount: number
  longCount: number
  shortsMedianViews: number | null
  longMedianViews: number | null
  savedAt: string
}

export function loadBench(): BenchEntry[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) {
      return []
    }
    const parsed: unknown = JSON.parse(raw)
    if (!Array.isArray(parsed)) {
      return []
    }
    return parsed.filter(isBenchEntry)
  } catch {
    return []
  }
}

export function saveBench(entries: BenchEntry[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(entries))
}

export function canSaveCompetitor(entries: BenchEntry[], channelId: string): boolean {
  if (entries.some((entry) => entry.id === channelId && entry.role === 'competitor')) {
    return true
  }
  return entries.filter((entry) => entry.role === 'competitor').length < COMPETITOR_LIMIT
}

export function upsertBench(entries: BenchEntry[], next: BenchEntry): BenchEntry[] {
  const others = entries.filter((entry) => entry.id !== next.id)
  if (next.role === 'mine') {
    return [next, ...others.filter((entry) => entry.role !== 'mine')]
  }
  const mine = others.filter((entry) => entry.role === 'mine')
  const competitors = [next, ...others.filter((entry) => entry.role === 'competitor')].slice(0, COMPETITOR_LIMIT)
  return [...mine, ...competitors]
}

export function removeBenchEntry(entries: BenchEntry[], channelId: string): BenchEntry[] {
  return entries.filter((entry) => entry.id !== channelId)
}

export function buildBenchEntry(channel: Channel, videos: Video[], role: BenchRole): BenchEntry {
  const split = formatSplit(videos)
  const schedule = summarizeSchedule(videos)
  const daily = videos
    .map((video) => viewsPerDay(video.view_count, video.published_at))
    .filter((value): value is number => value !== null)

  return {
    role,
    id: channel.id,
    title: channel.title,
    handle: formatHandle(channel.custom_url, channel.id),
    thumbnailUrl: channel.thumbnail_url,
    subscriberCount: channel.subscriber_count,
    hiddenSubscribers: channel.hidden_subscriber_count,
    medianViews: median(videos.map((video) => video.view_count)),
    medianViewsPerDay: median(daily),
    cadenceLabel: schedule?.cadenceLabel ?? 'No recent uploads',
    shortsCount: split.shorts.count,
    longCount: split.longForm.count,
    shortsMedianViews: split.shorts.medianViews,
    longMedianViews: split.longForm.medianViews,
    savedAt: new Date().toISOString(),
  }
}

function isBenchEntry(value: unknown): value is BenchEntry {
  if (!value || typeof value !== 'object') {
    return false
  }
  const entry = value as Partial<BenchEntry>
  return (
    (entry.role === 'mine' || entry.role === 'competitor') &&
    typeof entry.id === 'string' &&
    typeof entry.title === 'string' &&
    typeof entry.handle === 'string' &&
    typeof entry.cadenceLabel === 'string' &&
    typeof entry.shortsCount === 'number' &&
    typeof entry.longCount === 'number'
  )
}
