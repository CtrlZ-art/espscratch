from __future__ import annotations

import asyncio
import os
import shutil
import tempfile
from pathlib import Path
from typing import Optional

from .board_manager import Board
from .job_manager import JobManager, JobStatus

ARDUINO_CLI = os.getenv("ARDUINO_CLI", "arduino-cli")


class FlashService:
    """Responsible for compiling and flashing sketches using arduino-cli."""

    def __init__(self, job_manager: JobManager) -> None:
        self.job_manager = job_manager

    async def run(
        self,
        job_id: str,
        board: Board,
        sketch_name: str,
        code: str,
    ) -> None:
        workspace = Path(tempfile.mkdtemp(prefix=f"esp32_{job_id}_"))
        sketch_dir = workspace / sketch_name
        src_dir = sketch_dir / "src"
        src_dir.mkdir(parents=True, exist_ok=True)

        main_file = src_dir / "main.cpp"
        main_file.write_text(code, encoding="utf-8")

        await self.job_manager.set_board(job_id, board.identifier)
        await self.job_manager.set_status(job_id, JobStatus.RUNNING)
        await self.job_manager.append_log(job_id, "Preparing build workspace…")

        try:
            await self._execute(job_id, [
                ARDUINO_CLI,
                "compile",
                "--fqbn",
                board.fqbn,
                str(sketch_dir),
            ])

            await self._execute(job_id, [
                ARDUINO_CLI,
                "upload",
                "-p",
                board.port,
                "--fqbn",
                board.fqbn,
                str(sketch_dir),
            ])
        except Exception as exc:  # pragma: no cover - best effort logging
            await self.job_manager.append_log(job_id, f"Error: {exc}")
            await self.job_manager.set_status(job_id, JobStatus.ERROR)
        else:
            await self.job_manager.append_log(job_id, "Upload finished successfully.")
            await self.job_manager.set_status(job_id, JobStatus.SUCCESS)
        finally:
            shutil.rmtree(workspace, ignore_errors=True)

    async def _execute(self, job_id: str, command: list[str]) -> None:
        await self.job_manager.append_log(job_id, "$ " + " ".join(command))
        process = await asyncio.create_subprocess_exec(
            *command,
            stdout=asyncio.subprocess.PIPE,
            stderr=asyncio.subprocess.STDOUT,
        )

        assert process.stdout is not None
        async for line in process.stdout:  # type: ignore[assignment]
            await self.job_manager.append_log(job_id, line.decode().rstrip())

        return_code = await process.wait()
        if return_code != 0:
            raise RuntimeError(f"Command exited with {return_code}")
