export function formatCount(value: number): string {
  return new Intl.NumberFormat('en', {
    notation: 'compact',
    maximumFractionDigits: 1,
  }).format(value)
}

export function formatFullCount(value: number): string {
  return new Intl.NumberFormat('en').format(value)
}

export function formatDuration(seconds: number): string {
  if (!Number.isFinite(seconds) || seconds <= 0) {
    return '—'
  }
  const hours = Math.floor(seconds / 3600)
  const minutes = Math.floor((seconds % 3600) / 60)
  const remainder = seconds % 60
  if (hours > 0) {
    return `${hours}:${String(minutes).padStart(2, '0')}:${String(remainder).padStart(2, '0')}`
  }
  return `${minutes}:${String(remainder).padStart(2, '0')}`
}

export function formatUpload(iso: string | null): { day: string; time: string; date: string } | null {
  if (!iso) {
    return null
  }
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) {
    return null
  }
  return {
    day: new Intl.DateTimeFormat('en-US', { weekday: 'long' }).format(date),
    time: new Intl.DateTimeFormat('en-US', { hour: 'numeric', minute: '2-digit' }).format(date),
    date: new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric', year: 'numeric' }).format(date),
  }
}

export function formatJoined(iso: string | null): string | null {
  if (!iso) {
    return null
  }
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) {
    return null
  }
  return new Intl.DateTimeFormat('en-US', { month: 'short', year: 'numeric' }).format(date)
}

export function formatCountry(code: string | null): string | null {
  if (!code) {
    return null
  }
  try {
    return new Intl.DisplayNames(['en'], { type: 'region' }).of(code) ?? code
  } catch {
    return code
  }
}

export function formatHandle(customUrl: string | null, channelId: string): string {
  if (!customUrl) {
    return channelId
  }
  return customUrl.startsWith('@') ? customUrl : `@${customUrl}`
}
