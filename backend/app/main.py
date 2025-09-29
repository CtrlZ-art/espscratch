from __future__ import annotations

import asyncio
import os
from pathlib import Path
from typing import AsyncIterator

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from fastapi.staticfiles import StaticFiles
from sse_starlette.sse import EventSourceResponse

from .board_manager import Board, BoardAllocationError, BoardManager
from .flash_service import FlashService
from .job_manager import JobManager, JobStatus
from .schema import FlashRequest, FlashResponse, JobLog, ProjectSaveRequest
from .storage import ProjectStorage

app = FastAPI(title="Blockly ESP32 Studio")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

STATIC_DIR = Path(__file__).resolve().parent.parent / "../frontends/blockly"
PROJECT_DIR = Path(os.getenv("PROJECT_STORAGE", "./data/projects"))


job_manager = JobManager()
board_manager = BoardManager(
    boards=[
        Board(
            identifier="esp32_devkit_v1",
            name="ESP32 DevKit V1",
            fqbn="esp32:esp32:esp32",
            port="/dev/ttyUSB0",
            camera_url=os.getenv("CAMERA_STREAM", "http://localhost:8001/stream"),
        ),
        Board(
            identifier="esp32_s3",
            name="ESP32-S3",
            fqbn="esp32:esp32:esp32s3",
            port="/dev/ttyUSB1",
            camera_url=os.getenv("CAMERA_STREAM_S3", "http://localhost:8002/stream"),
        ),
    ]
)
project_storage = ProjectStorage(PROJECT_DIR)
flash_service = FlashService(job_manager)


async def stream_events(job_id: str) -> AsyncIterator[str]:
    async for event in job_manager.stream(job_id):
        if event.startswith("::status::"):
            yield f"event: status\ndata: {event.split('::', 2)[2]}\n\n"
        elif event.startswith("::board::"):
            yield f"event: board\ndata: {event.split('::', 2)[2]}\n\n"
        else:
            yield f"data: {event}\n\n"


@app.post("/api/flash", response_model=FlashResponse)
async def flash(request: FlashRequest) -> FlashResponse:
    job = await job_manager.create_job()

    try:
        board = await board_manager.acquire(request.board_id)
    except BoardAllocationError as exc:
        raise HTTPException(status_code=409, detail=str(exc)) from exc

    async def task() -> None:
        try:
            await flash_service.run(job.identifier, board, request.project_name, request.code)
        finally:
            board_manager.release(board)

    asyncio.create_task(task())
    return FlashResponse(job_id=job.identifier, board_id=board.identifier)


@app.get("/api/jobs/{job_id}", response_model=JobLog)
async def get_job(job_id: str) -> JobLog:
    job = job_manager.get_job(job_id)
    if job is None:
        raise HTTPException(status_code=404, detail="Job not found")
    return JobLog(
        job_id=job.identifier,
        status=job.status,
        logs=job.logs,
        board_id=job.board_id,
    )


@app.get("/api/stream/{job_id}")
async def stream(job_id: str) -> EventSourceResponse:
    if job_manager.get_job(job_id) is None:
        raise HTTPException(status_code=404, detail="Job not found")
    return EventSourceResponse(stream_events(job_id))


@app.get("/api/boards")
async def boards() -> JSONResponse:
    result = [
        {
            "identifier": board.identifier,
            "name": board.name,
            "fqbn": board.fqbn,
            "port": board.port,
            "cameraUrl": board.camera_url,
        }
        for board in board_manager.list_boards()
    ]
    return JSONResponse(result)


@app.post("/api/projects")
async def save_project(payload: ProjectSaveRequest) -> JSONResponse:
    metadata = project_storage.save(payload)
    return JSONResponse(metadata.dict())


@app.get("/api/projects")
async def list_projects() -> JSONResponse:
    return JSONResponse([m.dict() for m in project_storage.list_projects()])


@app.get("/api/projects/{identifier}")
async def load_project(identifier: str) -> JSONResponse:
    data = project_storage.load(identifier)
    if data is None:
        raise HTTPException(status_code=404, detail="Project not found")
    return JSONResponse(data)


if STATIC_DIR.exists():
    app.mount("/", StaticFiles(directory=str(STATIC_DIR), html=True), name="static")
