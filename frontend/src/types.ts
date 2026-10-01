export type Channel = {
  id: string
  title: string
  description: string
  custom_url: string | null
  thumbnail_url: string | null
  country: string | null
  published_at: string | null
  subscriber_count: number | null
  hidden_subscriber_count: boolean
  view_count: number
  video_count: number
  uploads_playlist_id: string | null
}

export type Video = {
  id: string
  title: string
  url: string
  published_at: string | null
  duration: string
  duration_seconds: number
  view_count: number
  like_count: number | null
  comment_count: number | null
  hashtags: string[]
  thumbnail_url: string | null
}

export type VideoList = {
  channel_id: string
  uploads_playlist_id: string
  videos: Video[]
}
