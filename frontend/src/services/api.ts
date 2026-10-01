import axios from 'axios'
import type { Channel, VideoList } from '../types.ts'

const client = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:8000',
})

export async function getChannel(query: string): Promise<Channel> {
  const response = await client.get<Channel>('/api/youtube/channel', {
    params: { query },
  })
  return response.data
}

export async function getVideos(channelId: string, maxResults = 25): Promise<VideoList> {
  const response = await client.get<VideoList>('/api/youtube/videos', {
    params: { channel_id: channelId, max_results: maxResults },
  })
  return response.data
}

type ErrorBody = {
  detail?: unknown
}

export function getErrorMessage(error: unknown): string {
  if (axios.isAxiosError<ErrorBody>(error)) {
    const detail = error.response?.data?.detail
    if (typeof detail === 'string' && detail.trim()) {
      return detail
    }
    if (!error.response) {
      return 'Cannot reach the analysis API. Start the backend on port 8000.'
    }
  }
  return 'Something went wrong while loading this channel.'
}
