import type { Channel, Video } from '../types.ts'

const STORAGE_KEY = 'yt-analyser-reports'
const REPORT_LIMIT = 20

export type StoredReport = {
  channel: Channel
  videos: Video[]
  searchedAt: string
}

export function loadReports(): StoredReport[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) {
      return []
    }
    const parsed: unknown = JSON.parse(raw)
    if (!Array.isArray(parsed)) {
      return []
    }
    return parsed.filter(isStoredReport).slice(0, REPORT_LIMIT)
  } catch {
    return []
  }
}

export function saveReports(reports: StoredReport[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(reports))
}

export function rememberReport(reports: StoredReport[], report: StoredReport): StoredReport[] {
  const rest = reports.filter((item) => item.channel.id !== report.channel.id)
  return [report, ...rest].slice(0, REPORT_LIMIT)
}

function isStoredReport(value: unknown): value is StoredReport {
  if (!value || typeof value !== 'object') {
    return false
  }
  const report = value as Partial<StoredReport>
  return (
    typeof report.searchedAt === 'string' &&
    !!report.channel &&
    typeof report.channel.id === 'string' &&
    typeof report.channel.title === 'string' &&
    Array.isArray(report.videos)
  )
}
