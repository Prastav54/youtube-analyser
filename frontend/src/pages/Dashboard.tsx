import { useState } from 'react'
import { ChannelBench } from '../components/ChannelBench.tsx'
import { ChannelSearchForm } from '../components/ChannelSearchForm.tsx'
import { ChannelAnalyzer } from './ChannelAnalyzer.tsx'
import { getChannel, getErrorMessage, getVideos } from '../services/api.ts'
import {
  buildBenchEntry,
  canSaveCompetitor,
  loadBench,
  removeBenchEntry,
  saveBench,
  upsertBench,
  type BenchEntry,
  type BenchRole,
} from '../lib/bench.ts'
import type { Channel, Video } from '../types.ts'

export function Dashboard() {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [videosError, setVideosError] = useState<string | null>(null)
  const [channel, setChannel] = useState<Channel | null>(null)
  const [videos, setVideos] = useState<Video[] | null>(null)
  const [bench, setBench] = useState<BenchEntry[]>(() => loadBench())

  async function handleSearch(query: string) {
    setLoading(true)
    setError(null)
    setVideosError(null)

    try {
      const nextChannel = await getChannel(query)
      setChannel(nextChannel)
      try {
        const nextVideos = await getVideos(nextChannel.id)
        setVideos(nextVideos.videos)
      } catch (videoError) {
        setVideos(null)
        setVideosError(getErrorMessage(videoError))
      }
    } catch (channelError) {
      setChannel(null)
      setVideos(null)
      setError(getErrorMessage(channelError))
    } finally {
      setLoading(false)
    }
  }

  function updateBench(next: BenchEntry[]) {
    setBench(next)
    saveBench(next)
  }

  function handleSave(role: BenchRole) {
    if (!channel || !videos) {
      return
    }
    updateBench(upsertBench(bench, buildBenchEntry(channel, videos, role)))
  }

  const savedRole = bench.find((entry) => entry.id === channel?.id)?.role ?? null

  return (
    <main className="mx-auto flex w-full max-w-6xl flex-col gap-8 px-5 py-8">
      <div className="max-w-2xl">
        <h1 className="text-2xl font-medium tracking-tight text-ink">Channel analyzer</h1>
        <p className="mt-2 text-sm leading-6 text-muted">
          Look up a competitor, then compare format, timing, titles, and which recent videos outperformed the rest.
        </p>
      </div>

      <ChannelSearchForm loading={loading} onSearch={handleSearch} />
      <ChannelBench
        entries={bench}
        onOpen={(channelId) => void handleSearch(channelId)}
        onRemove={(channelId) => updateBench(removeBenchEntry(bench, channelId))}
      />

      {loading && !channel ? (
        <p className="text-sm text-muted">Fetching channel statistics…</p>
      ) : null}

      {error ? (
        <p role="alert" className="rounded-lg border border-accent/40 bg-accent/10 px-4 py-3 text-sm text-ink">
          {error}
        </p>
      ) : null}

      {channel ? (
        <ChannelAnalyzer
          channel={channel}
          videos={videos}
          videosError={videosError}
          savedRole={savedRole}
          canSaveCompetitor={canSaveCompetitor(bench, channel.id)}
          onSave={handleSave}
        />
      ) : null}
    </main>
  )
}
