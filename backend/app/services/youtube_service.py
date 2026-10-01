"""YouTube Data API v3 calls for channel stats and upload history."""

from __future__ import annotations

import logging
import re
import unicodedata
from typing import Any
from urllib.parse import unquote, urlparse

import httpx

from app.config import settings

logger = logging.getLogger(__name__)

YOUTUBE_API_BASE = "https://www.googleapis.com/youtube/v3"
_CHANNEL_ID = re.compile(r"^UC[\w-]{22}$")
_DURATION = re.compile(
    r"P(?:(?P<days>\d+)D)?(?:T(?:(?P<hours>\d+)H)?(?:(?P<minutes>\d+)M)?(?:(?P<seconds>\d+)S)?)?"
)
_YOUTUBE_HOSTS = {"youtube.com", "www.youtube.com", "m.youtube.com"}
_NON_CHANNEL_PATHS = {"watch", "shorts", "playlist", "feed", "results", "embed", "live"}
_QUOTA_REASONS = {"quotaExceeded", "dailyLimitExceeded", "rateLimitExceeded"}


class YouTubeServiceError(Exception):
    """A YouTube API or configuration failure safe to show to API clients."""

    def __init__(self, status_code: int, message: str, reason: str | None = None) -> None:
        super().__init__(message)
        self.status_code = status_code
        self.message = message
        self.reason = reason


class ChannelNotFoundError(YouTubeServiceError):
    def __init__(self, query: str) -> None:
        shown = query if len(query) <= 120 else f"{query[:117]}..."
        super().__init__(404, f"No YouTube channel found for '{shown}'.", "channelNotFound")


def normalize_query(raw: str) -> str:
    """Turn a handle, channel ID, or channel URL into a lookup string."""

    query = raw.strip()
    if not query:
        return ""

    candidate = query if "://" in query else f"https://{query}"
    parsed = urlparse(candidate)
    host = (parsed.hostname or "").lower()

    if host == "youtu.be":
        raise YouTubeServiceError(
            400,
            "That link points to a video. Use a channel URL, @handle, or channel ID.",
        )

    if host not in _YOUTUBE_HOSTS:
        return query

    parts = [unquote(part) for part in parsed.path.split("/") if part]
    if not parts:
        raise YouTubeServiceError(400, "That YouTube link has no channel in it.")

    if parts[0] in _NON_CHANNEL_PATHS:
        raise YouTubeServiceError(
            400,
            "That link is not a channel. Use a channel URL, @handle, or channel ID.",
        )

    if parts[0] in {"channel", "c", "user"} and len(parts) > 1:
        return parts[1]
    return parts[0]


async def get_channel_details(query: str) -> dict[str, Any]:
    """Resolve a channel by ID, handle, username, or name and return core stats.

    ID, handle, and legacy username lookups use channels.list (1 quota unit).
    A plain name falls back to search.list (100 quota units), then channels.list
    for statistics.
    """

    normalized = normalize_query(query)
    if not normalized:
        raise YouTubeServiceError(400, "Enter a channel ID, handle, or URL.")

    _require_api_key()

    async with httpx.AsyncClient(timeout=20.0) as client:
        if _CHANNEL_ID.fullmatch(normalized):
            item = await _lookup_channel(client, {"id": normalized})
            if item is None:
                raise ChannelNotFoundError(normalized)
            return _map_channel(item)

        handle = normalized[1:] if normalized.startswith("@") else normalized
        if handle and " " not in handle and "/" not in handle:
            item = await _lookup_channel(client, {"forHandle": handle})
            if item is None:
                item = await _lookup_channel(client, {"forUsername": handle})
            if item is not None:
                return _map_channel(item)

        search = await _youtube_get(
            client,
            "search",
            {
                "part": "snippet",
                "type": "channel",
                "q": normalized,
                "maxResults": 1,
            },
        )
        matches = search.get("items") or []
        if not matches:
            raise ChannelNotFoundError(normalized)

        first = matches[0]
        channel_id = (first.get("id") or {}).get("channelId") or (first.get("snippet") or {}).get(
            "channelId"
        )
        if not isinstance(channel_id, str) or not channel_id:
            raise ChannelNotFoundError(normalized)

        item = await _lookup_channel(client, {"id": channel_id})
        if item is None:
            raise ChannelNotFoundError(normalized)
        return _map_channel(item)


async def get_recent_videos(channel_id: str, max_results: int = 25) -> dict[str, Any]:
    """Return recent uploads with publish time, watch URL, and duration.

    The channel's uploads playlist comes from channels.list contentDetails.
    playlistItems.list supplies video IDs, and videos.list supplies
    snippet.publishedAt, contentDetails.duration, and statistics.viewCount.
    Hashtags are taken from the title and description.
    """

    channel_id = channel_id.strip()
    if not channel_id:
        raise YouTubeServiceError(400, "A channel ID is required.")

    bounded = min(max(max_results, 1), 50)
    _require_api_key()

    async with httpx.AsyncClient(timeout=20.0) as client:
        channel = await _lookup_channel(client, {"id": channel_id})
        if channel is None:
            raise ChannelNotFoundError(channel_id)

        uploads_id = (
            (channel.get("contentDetails") or {}).get("relatedPlaylists") or {}
        ).get("uploads")
        if not isinstance(uploads_id, str) or not uploads_id:
            raise YouTubeServiceError(404, "This channel has no public uploads playlist.")

        playlist = await _youtube_get(
            client,
            "playlistItems",
            {
                "part": "contentDetails",
                "playlistId": uploads_id,
                "maxResults": bounded,
            },
        )
        video_ids: list[str] = []
        for item in playlist.get("items") or []:
            video_id = (item.get("contentDetails") or {}).get("videoId")
            if isinstance(video_id, str) and video_id:
                video_ids.append(video_id)

        videos: list[dict[str, Any]] = []
        if video_ids:
            details = await _youtube_get(
                client,
                "videos",
                {
                    "part": "snippet,contentDetails,statistics",
                    "id": ",".join(video_ids),
                },
            )
            by_id = {
                item["id"]: item
                for item in details.get("items") or []
                if isinstance(item.get("id"), str)
            }
            videos = [_map_video(by_id[video_id]) for video_id in video_ids if video_id in by_id]

        return {
            "channel_id": channel.get("id", channel_id),
            "uploads_playlist_id": uploads_id,
            "videos": videos,
        }


def _require_api_key() -> None:
    if not settings.youtube_api_key.strip():
        raise YouTubeServiceError(
            500,
            "YOUTUBE_API_KEY is not configured. Copy backend/.env.example to backend/.env and add your key.",
            "missingApiKey",
        )


async def _lookup_channel(
    client: httpx.AsyncClient,
    params: dict[str, str | int],
) -> dict[str, Any] | None:
    """Call channels.list. A bad handle is treated as a miss; auth and quota errors are not."""

    try:
        payload = await _youtube_get(
            client,
            "channels",
            {"part": "snippet,statistics,contentDetails", **params},
        )
    except YouTubeServiceError as exc:
        if exc.status_code == 400:
            return None
        raise

    items = payload.get("items") or []
    if not items:
        return None
    first = items[0]
    if not isinstance(first, dict):
        return None
    return first


async def _youtube_get(
    client: httpx.AsyncClient,
    resource: str,
    params: dict[str, str | int],
) -> dict[str, Any]:
    query = {key: value for key, value in params.items() if value is not None}
    query["key"] = settings.youtube_api_key

    try:
        response = await client.get(
            f"{YOUTUBE_API_BASE}/{resource}",
            params=query,
            headers={"Accept": "application/json"},
        )
    except httpx.HTTPError:
        # Do not chain the httpx error: its text includes the request URL and API key.
        raise YouTubeServiceError(502, "Could not reach the YouTube Data API.") from None

    if response.status_code >= 400:
        _raise_for_status(response)

    try:
        payload = response.json()
    except ValueError:
        raise YouTubeServiceError(502, "YouTube returned a response that was not JSON.") from None

    if not isinstance(payload, dict):
        raise YouTubeServiceError(502, "YouTube returned an unexpected response.")
    return payload


def _raise_for_status(response: httpx.Response) -> None:
    message = "YouTube API request failed."
    reason: str | None = None

    try:
        payload = response.json()
    except ValueError:
        payload = None

    if isinstance(payload, dict):
        error = payload.get("error")
        if isinstance(error, dict):
            api_message = error.get("message")
            if isinstance(api_message, str) and api_message.strip():
                message = api_message.strip()
            errors = error.get("errors")
            if isinstance(errors, list) and errors and isinstance(errors[0], dict):
                raw_reason = errors[0].get("reason")
                if isinstance(raw_reason, str):
                    reason = raw_reason

    logger.warning(
        "YouTube API error status=%s reason=%s",
        response.status_code,
        reason or "unknown",
    )

    if reason == "keyInvalid" or "API key not valid" in message:
        raise YouTubeServiceError(
            401,
            "The YouTube API key is invalid. Check YOUTUBE_API_KEY in backend/.env.",
            reason or "keyInvalid",
        )
    if reason in _QUOTA_REASONS:
        raise YouTubeServiceError(
            429,
            "YouTube API quota is exhausted. Requests will fail until the daily quota resets.",
            reason,
        )
    if reason == "accessNotConfigured":
        raise YouTubeServiceError(
            403,
            "YouTube Data API v3 is not enabled for this Google Cloud project.",
            reason,
        )
    if response.status_code == 400:
        raise YouTubeServiceError(400, "YouTube rejected that channel lookup.", reason)
    if response.status_code == 403:
        raise YouTubeServiceError(403, "YouTube refused this request.", reason)
    if response.status_code == 404:
        raise YouTubeServiceError(404, "YouTube could not find that resource.", reason)
    raise YouTubeServiceError(502, "YouTube API request failed.", reason)


def _map_channel(item: dict[str, Any]) -> dict[str, Any]:
    snippet = item.get("snippet") or {}
    statistics = item.get("statistics") or {}
    thumbnails = snippet.get("thumbnails") or {}
    thumbnail = (
        thumbnails.get("high") or thumbnails.get("medium") or thumbnails.get("default") or {}
    )
    hidden = bool(statistics.get("hiddenSubscriberCount"))
    uploads = ((item.get("contentDetails") or {}).get("relatedPlaylists") or {}).get("uploads")

    return {
        "id": item.get("id") or "",
        "title": snippet.get("title") or "",
        "description": snippet.get("description") or "",
        "custom_url": snippet.get("customUrl"),
        "thumbnail_url": thumbnail.get("url") if isinstance(thumbnail, dict) else None,
        "country": snippet.get("country"),
        "published_at": snippet.get("publishedAt"),
        "subscriber_count": None if hidden else _as_int(statistics.get("subscriberCount")),
        "hidden_subscriber_count": hidden,
        "view_count": _as_int(statistics.get("viewCount")),
        "video_count": _as_int(statistics.get("videoCount")),
        "uploads_playlist_id": uploads if isinstance(uploads, str) else None,
    }


def _map_video(item: dict[str, Any]) -> dict[str, Any]:
    snippet = item.get("snippet") or {}
    statistics = item.get("statistics") or {}
    video_id = item.get("id") or ""
    duration = (item.get("contentDetails") or {}).get("duration") or ""
    thumbnails = snippet.get("thumbnails") or {}
    thumbnail = thumbnails.get("medium") or thumbnails.get("default") or {}

    return {
        "id": video_id,
        "title": snippet.get("title") or "",
        "url": f"https://www.youtube.com/watch?v={video_id}",
        "published_at": snippet.get("publishedAt"),
        "duration": duration if isinstance(duration, str) else "",
        "duration_seconds": _duration_seconds(duration if isinstance(duration, str) else ""),
        "view_count": _as_int(statistics.get("viewCount")),
        "hashtags": _extract_hashtags(snippet.get("title"), snippet.get("description")),
        "thumbnail_url": thumbnail.get("url") if isinstance(thumbnail, dict) else None,
    }


def _extract_hashtags(*texts: object) -> list[str]:
    """Collect #hashtags from titles and descriptions, including non-Latin scripts."""

    found: list[str] = []
    seen: set[str] = set()
    for text in texts:
        if not isinstance(text, str):
            continue
        for tag in _iter_hashtags(text):
            key = tag.casefold()
            if key in seen:
                continue
            seen.add(key)
            found.append(tag)
    return found


def _iter_hashtags(text: str) -> list[str]:
    tags: list[str] = []
    length = len(text)
    index = 0
    while index < length:
        if text[index] != "#":
            index += 1
            continue
        previous = text[index - 1] if index > 0 else ""
        if previous.isalnum() or previous in {"_", "/"}:
            index += 1
            continue
        end = index + 1
        while end < length and _is_hashtag_char(text[end]):
            end += 1
        tag = text[index + 1 : end]
        if tag:
            tags.append(tag)
        index = max(end, index + 1)
    return tags


def _is_hashtag_char(char: str) -> bool:
    return char.isalnum() or char == "_" or unicodedata.category(char).startswith("M")


def _duration_seconds(value: str) -> int:
    match = _DURATION.fullmatch(value)
    if match is None:
        return 0
    days = int(match.group("days") or 0)
    hours = int(match.group("hours") or 0)
    minutes = int(match.group("minutes") or 0)
    seconds = int(match.group("seconds") or 0)
    return days * 86400 + hours * 3600 + minutes * 60 + seconds


def _as_int(value: object) -> int:
    if isinstance(value, bool) or value is None:
        return 0
    if isinstance(value, int):
        return value
    if isinstance(value, str) and value.isdigit():
        return int(value)
    return 0
