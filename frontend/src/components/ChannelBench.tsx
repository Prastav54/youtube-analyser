import type { BenchEntry } from '../lib/bench.ts'
import { formatCount, formatFullCount, formatRate } from '../lib/format.ts'

type ChannelBenchProps = {
  entries: BenchEntry[]
  onOpen: (channelId: string) => void
  onRemove: (channelId: string) => void
}

export function ChannelBench({ entries, onOpen, onRemove }: ChannelBenchProps) {
  return (
    <section className="rounded-xl border border-line bg-panel">
      <div className="border-b border-line px-5 py-5 sm:px-6">
        <h2 className="text-sm font-medium text-ink">Your channel and competitors</h2>
        <p className="mt-1 text-xs leading-5 text-muted">
          Save your channel and up to three competitors from a lookup. Numbers are from the last time you saved that channel in this browser.
        </p>
      </div>
      {entries.length === 0 ? (
        <p className="px-5 py-8 text-sm text-muted sm:px-6">
          Look up a channel, then save it as yours or as a competitor.
        </p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[760px] text-left text-sm">
            <thead>
              <tr className="border-b border-line text-[11px] tracking-[0.14em] text-muted uppercase">
                <th scope="col" className="px-5 py-3 font-medium sm:px-6">Channel</th>
                <th scope="col" className="px-3 py-3 text-right font-medium">Subscribers</th>
                <th scope="col" className="px-3 py-3 text-right font-medium">Median views</th>
                <th scope="col" className="px-3 py-3 text-right font-medium">Views / day</th>
                <th scope="col" className="px-3 py-3 font-medium">Cadence</th>
                <th scope="col" className="px-3 py-3 font-medium">Shorts</th>
                <th scope="col" className="px-5 py-3 font-medium sm:px-6">Long-form</th>
              </tr>
            </thead>
            <tbody>
              {entries.map((entry) => (
                <tr key={entry.id} className="border-b border-line last:border-b-0">
                  <td className="px-5 py-3 sm:px-6">
                    <div className="flex items-center gap-3">
                      {entry.thumbnailUrl ? (
                        <img src={entry.thumbnailUrl} alt="" className="size-8 rounded-full object-cover" />
                      ) : (
                        <div className="size-8 rounded-full bg-white/5" />
                      )}
                      <div className="min-w-0">
                        <button
                          type="button"
                          onClick={() => onOpen(entry.id)}
                          className="block max-w-48 truncate text-left font-medium text-ink hover:text-white"
                        >
                          {entry.title}
                        </button>
                        <p className="text-[11px] tracking-wide text-muted uppercase">
                          {entry.role === 'mine' ? 'Your channel' : 'Competitor'}
                        </p>
                      </div>
                    </div>
                  </td>
                  <td className="px-3 py-3 text-right font-mono text-ink tabular-nums">
                    {entry.hiddenSubscribers || entry.subscriberCount === null ? 'Hidden' : formatCount(entry.subscriberCount)}
                  </td>
                  <td className="px-3 py-3 text-right font-mono text-ink tabular-nums" title={entry.medianViews === null ? undefined : formatFullCount(entry.medianViews)}>
                    {entry.medianViews === null ? '—' : formatCount(entry.medianViews)}
                  </td>
                  <td className="px-3 py-3 text-right font-mono text-ink tabular-nums">
                    {entry.medianViewsPerDay === null ? '—' : formatRate(entry.medianViewsPerDay)}
                  </td>
                  <td className="px-3 py-3 whitespace-nowrap text-ink">{entry.cadenceLabel}</td>
                  <td className="px-3 py-3 whitespace-nowrap text-ink">{formatMix(entry.shortsCount, entry.shortsMedianViews)}</td>
                  <td className="px-5 py-3 sm:px-6">
                    <div className="flex items-center justify-between gap-3">
                      <span className="whitespace-nowrap text-ink">{formatMix(entry.longCount, entry.longMedianViews)}</span>
                      <button
                        type="button"
                        onClick={() => onRemove(entry.id)}
                        className="text-xs text-muted hover:text-ink"
                      >
                        Remove
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  )
}

function formatMix(count: number, medianValue: number | null): string {
  if (count === 0) {
    return 'None'
  }
  if (medianValue === null) {
    return `${count}`
  }
  return `${count} · ${formatCount(medianValue)} med.`
}
