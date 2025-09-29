from __future__ import annotations

import asyncio
import enum
import time
import uuid
from dataclasses import dataclass, field
from typing import AsyncIterator, Dict, List, Optional


class JobStatus(str, enum.Enum):
    WAITING = "waiting"
    RUNNING = "running"
    SUCCESS = "success"
    ERROR = "error"


@dataclass
class Job:
    identifier: str
    status: JobStatus = JobStatus.WAITING
    created_at: float = field(default_factory=time.time)
    updated_at: float = field(default_factory=time.time)
    logs: List[str] = field(default_factory=list)
    board_id: Optional[str] = None


class JobManager:
    """Stores compile/flash jobs and exposes async iterators for SSE streaming."""

    def __init__(self) -> None:
        self._jobs: Dict[str, Job] = {}
        self._queues: Dict[str, "asyncio.Queue[str]"] = {}
        self._lock = asyncio.Lock()

    async def create_job(self) -> Job:
        identifier = uuid.uuid4().hex
        job = Job(identifier=identifier)
        async with self._lock:
            self._jobs[identifier] = job
            self._queues[identifier] = asyncio.Queue()
        return job

    def get_job(self, identifier: str) -> Optional[Job]:
        return self._jobs.get(identifier)

    async def append_log(self, identifier: str, message: str) -> None:
        job = self._jobs[identifier]
        job.logs.append(message)
        job.updated_at = time.time()
        await self._queues[identifier].put(message)

    async def set_status(self, identifier: str, status: JobStatus) -> None:
        job = self._jobs[identifier]
        job.status = status
        job.updated_at = time.time()
        await self._queues[identifier].put(f"::status::{status}")

    async def set_board(self, identifier: str, board_id: str) -> None:
        job = self._jobs[identifier]
        job.board_id = board_id
        job.updated_at = time.time()
        await self._queues[identifier].put(f"::board::{board_id}")

    async def stream(self, identifier: str) -> AsyncIterator[str]:
        queue = self._queues.get(identifier)
        if queue is None:
            raise KeyError(identifier)

        # Replay previous log lines first so that late subscribers still see them.
        job = self._jobs[identifier]
        for entry in job.logs:
            yield entry

        # Then stream new messages as they arrive.
        while True:
            try:
                message = await queue.get()
            except asyncio.CancelledError:  # pragma: no cover - defensive
                break
            yield message


__all__ = ["Job", "JobManager", "JobStatus"]
