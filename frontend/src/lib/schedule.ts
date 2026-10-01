import type { Video } from '../types.ts'

export const WEEKDAY_LABELS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'] as const

export const WEEKDAY_NAMES = [
  'Monday',
  'Tuesday',
  'Wednesday',
  'Thursday',
  'Friday',
  'Saturday',
  'Sunday',
] as const

export type ScheduleSummary = {
  cadenceLabel: string
  usualDay: string
  usualTime: string
  sampleSize: number
}

export function weekdayCounts(videos: Video[]): number[] {
  const counts = [0, 0, 0, 0, 0, 0, 0]
  for (const video of videos) {
    const date = parseDate(video.published_at)
    if (!date) {
      continue
    }
    counts[(date.getDay() + 6) % 7] += 1
  }
  return counts
}

export function summarizeSchedule(videos: Video[]): ScheduleSummary | null {
  const dates = videos
    .map((video) => parseDate(video.published_at))
    .filter((date): date is Date => date !== null)
    .sort((left, right) => right.getTime() - left.getTime())

  if (dates.length === 0) {
    return null
  }

  const dayCounts = weekdayCounts(videos)
  const hourCounts = Array.from({ length: 24 }, () => 0)
  for (const date of dates) {
    hourCounts[date.getHours()] += 1
  }

  return {
    cadenceLabel: dates.length >= 2 ? formatCadence(medianGapDays(dates)) : 'Need at least two uploads',
    usualDay: WEEKDAY_NAMES[indexOfMax(dayCounts)] ?? 'Monday',
    usualTime: formatHour(indexOfMax(hourCounts)),
    sampleSize: dates.length,
  }
}

function parseDate(iso: string | null): Date | null {
  if (!iso) {
    return null
  }
  const date = new Date(iso)
  return Number.isNaN(date.getTime()) ? null : date
}

function medianGapDays(dates: Date[]): number {
  const gaps: number[] = []
  for (let index = 0; index < dates.length - 1; index += 1) {
    gaps.push((dates[index].getTime() - dates[index + 1].getTime()) / 86_400_000)
  }
  gaps.sort((left, right) => left - right)
  return gaps[Math.floor(gaps.length / 2)] ?? 0
}

function formatCadence(medianDays: number): string {
  if (medianDays < 0.6) return 'Several times a day'
  if (medianDays < 1.4) return 'About once a day'
  if (medianDays < 2.5) return 'Every couple of days'
  if (medianDays < 5) return `About every ${medianDays.toFixed(1)} days`
  if (medianDays < 9) return 'About once a week'
  if (medianDays < 18) return 'About every two weeks'
  if (medianDays < 45) return 'About once a month'
  return `About every ${Math.round(medianDays)} days`
}

function formatHour(hour: number): string {
  const date = new Date()
  date.setHours(hour, 0, 0, 0)
  return new Intl.DateTimeFormat('en-US', { hour: 'numeric' }).format(date)
}

function indexOfMax(values: number[]): number {
  let bestIndex = 0
  for (let index = 1; index < values.length; index += 1) {
    if (values[index] > values[bestIndex]) {
      bestIndex = index
    }
  }
  return bestIndex
}
