"""Channel metadata and recent-upload endpoints."""

from __future__ import annotations

from typing import Annotated

from fastapi import APIRouter, HTTPException, Query
from pydantic import BaseModel

from app.services.youtube_service import (
    YouTubeServiceError,
    get_channel_details,
    get_recent_videos,
)

router = APIRouter(prefix="/api/youtube", tags=["youtube"])


class ChannelResponse(BaseModel):
    id: str
    title: str
    description: str
    custom_url: str | None = None
    thumbnail_url: str | None = None
    country: str | None = None
    published_at: str | None = None
    subscriber_count: int | None = None
    hidden_subscriber_count: bool
    view_count: int
    video_count: int
    uploads_playlist_id: str | None = None


class VideoItem(BaseModel):
    id: str
    title: str
    url: str
    published_at: str | None = None
    duration: str
    duration_seconds: int
    view_count: int
    hashtags: list[str]
    thumbnail_url: str | None = None


class VideoListResponse(BaseModel):
    channel_id: str
    uploads_playlist_id: str
    videos: list[VideoItem]


def _http_error(exc: YouTubeServiceError) -> HTTPException:
    return HTTPException(status_code=exc.status_code, detail=exc.message)


@router.get("/channel", response_model=ChannelResponse)
async def read_channel(
    query: Annotated[
        str,
        Query(
            min_length=1,
            max_length=300,
            description="Channel ID, @handle, legacy username, channel name, or channel URL",
        ),
    ],
) -> ChannelResponse:
    """Channel details and core statistics."""

    try:
        payload = await get_channel_details(query)
    except YouTubeServiceError as exc:
        raise _http_error(exc) from exc
    return ChannelResponse.model_validate(payload)


@router.get("/videos", response_model=VideoListResponse)
async def read_videos(
    channel_id: Annotated[
        str,
        Query(min_length=1, max_length=64, description="YouTube channel ID"),
    ],
    max_results: Annotated[int, Query(ge=1, le=50)] = 25,
) -> VideoListResponse:
    """Recent uploads with publish time, watch link, and duration."""

    try:
        payload = await get_recent_videos(channel_id, max_results)
    except YouTubeServiceError as exc:
        raise _http_error(exc) from exc
    return VideoListResponse.model_validate(payload)
