import type { StoredReport } from '../lib/reportHistory.ts'
import { downloadReports, reportFilename } from '../lib/exportReports.ts'

type ReportDownloadProps = {
  reports: StoredReport[]
  current: StoredReport | null
}

export function ReportDownload({ reports, current }: ReportDownloadProps) {
  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-col gap-2 sm:flex-row">
        <button
          type="button"
          disabled={reports.length === 0}
          onClick={() => downloadReports(reports, reportFilename('all'))}
          className="h-9 rounded-lg border border-line px-3 text-xs text-ink hover:border-accent disabled:cursor-not-allowed disabled:opacity-45"
        >
          Download all reports{reports.length > 0 ? ` (${reports.length})` : ''}
        </button>
        <button
          type="button"
          disabled={current === null}
          onClick={() => {
            if (current) {
              downloadReports([current], reportFilename(fileSlug(current.channel.title)))
            }
          }}
          className="h-9 rounded-lg border border-line px-3 text-xs text-ink hover:border-accent disabled:cursor-not-allowed disabled:opacity-45"
        >
          Download this report
        </button>
      </div>
      <p className="text-xs leading-5 text-muted">
        Each lookup is kept in this browser. The download is a zip of CSV files for channels, videos, and hashtags, ready for Excel or Sheets.
      </p>
    </div>
  )
}

function fileSlug(title: string): string {
  const slug = title
    .toLocaleLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, '-')
    .replace(/^-|-$/g, '')
  return slug.slice(0, 40) || 'channel'
}
