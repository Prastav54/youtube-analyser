import type { Channel } from '../types.ts'
import { formatCount, formatCountry, formatFullCount, formatHandle, formatJoined } from '../lib/format.ts'

type ChannelOverviewCardProps = {
  channel: Channel
}

export function ChannelOverviewCard({ channel }: ChannelOverviewCardProps) {
  const handle = formatHandle(channel.custom_url, channel.id)
  const country = formatCountry(channel.country)
  const joined = formatJoined(channel.published_at)
  const meta = [country, joined ? `Joined ${joined}` : null].filter(Boolean).join(' · ')
  const subscriberValue =
    channel.hidden_subscriber_count || channel.subscriber_count === null
      ? 'Hidden'
      : formatCount(channel.subscriber_count)
  const subscriberTitle =
    channel.hidden_subscriber_count || channel.subscriber_count === null
      ? 'Subscriber count is hidden'
      : formatFullCount(channel.subscriber_count)

  return (
    <section className="rounded-xl border border-line bg-panel p-5 sm:p-6">
      <div className="flex items-center gap-4">
        {channel.thumbnail_url ? (
          <img
            src={channel.thumbnail_url}
            alt=""
            className="size-16 shrink-0 rounded-full object-cover"
          />
        ) : (
          <div className="size-16 shrink-0 rounded-full bg-white/5" />
        )}
        <div className="min-w-0">
          <h2 className="truncate text-xl font-medium tracking-tight text-ink">
            <a
              href={`https://www.youtube.com/channel/${channel.id}`}
              target="_blank"
              rel="noreferrer"
              className="hover:text-white"
            >
              {channel.title}
            </a>
          </h2>
          <p className="mt-1 truncate font-mono text-xs text-muted">{handle}</p>
          {meta ? <p className="mt-1 text-xs text-muted">{meta}</p> : null}
        </div>
      </div>

      {channel.description ? (
        <p className="mt-4 line-clamp-2 text-sm leading-6 text-muted">{channel.description}</p>
      ) : null}

      <dl className="mt-6 grid grid-cols-1 gap-4 border-t border-line pt-5 sm:grid-cols-3">
        <Stat label="Subscribers" value={subscriberValue} title={subscriberTitle} />
        <Stat
          label="Total views"
          value={formatCount(channel.view_count)}
          title={formatFullCount(channel.view_count)}
        />
        <Stat
          label="Videos"
          value={formatCount(channel.video_count)}
          title={formatFullCount(channel.video_count)}
        />
      </dl>
    </section>
  )
}

function Stat({ label, value, title }: { label: string; value: string; title: string }) {
  return (
    <div>
      <dt className="text-[11px] tracking-[0.14em] text-muted uppercase">{label}</dt>
      <dd className="mt-1 font-mono text-2xl tracking-tight text-ink tabular-nums" title={title}>
        {value}
      </dd>
    </div>
  )
}
