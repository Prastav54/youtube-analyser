"""FastAPI entrypoint.

Run from the backend directory:

    uvicorn app.main:app --reload --port 8000
"""

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.routers.youtube import router as youtube_router

app = FastAPI(
    title="YouTube Competitor Analyzer",
    description="Channel statistics and recent upload history via the YouTube Data API.",
    version="1.0.0",
)

# Local Vite dev server (5173) and preview (4173), plus any other localhost port.
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        "http://localhost:4173",
        "http://127.0.0.1:4173",
    ],
    allow_origin_regex=r"https?://(localhost|127\.0\.0\.1)(:\d+)?",
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(youtube_router)


@app.get("/health")
async def health() -> dict[str, str]:
    return {"status": "ok"}
