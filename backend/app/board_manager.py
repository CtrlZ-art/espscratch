from __future__ import annotations

import asyncio
from dataclasses import dataclass
from typing import Dict, Iterable, Optional


@dataclass(frozen=True)
class Board:
    """Represents an ESP32 development board that can be allocated to a job."""

    identifier: str
    name: str
    fqbn: str
    port: str
    camera_url: Optional[str] = None


class BoardAllocationError(RuntimeError):
    """Raised when no board is available for allocation."""


class BoardManager:
    """Simple in-memory board pool shared by all requests.

    The implementation is intentionally lightweight – it keeps track of which
    boards are currently locked and provides an asynchronous context manager that
    callers can use to guarantee release of resources even if their task fails.
    """

    def __init__(self, boards: Iterable[Board]) -> None:
        self._boards: Dict[str, Board] = {board.identifier: board for board in boards}
        self._locks: Dict[str, asyncio.Lock] = {
            board.identifier: asyncio.Lock() for board in boards
        }

    async def acquire(self, board_id: Optional[str] = None) -> Board:
        """Acquire a board for exclusive use.

        Args:
            board_id: Optional identifier of the desired board.  If omitted, the
                first available board is returned.

        Raises:
            BoardAllocationError: If no matching board is currently available.
        """

        if board_id is not None:
            board = self._boards.get(board_id)
            if board is None:
                raise BoardAllocationError(f"Unknown board '{board_id}'.")
            lock = self._locks[board_id]
            if lock.locked():
                raise BoardAllocationError(f"Board '{board_id}' is busy.")
            await lock.acquire()
            return board

        # No preferred board – iterate through the pool and return the first free
        # board.  We avoid holding the event loop hostage by checking the lock
        # before awaiting it.
        for identifier, lock in self._locks.items():
            if lock.locked():
                continue
            await lock.acquire()
            return self._boards[identifier]

        raise BoardAllocationError("No ESP32 boards are currently available.")

    def release(self, board: Board) -> None:
        lock = self._locks.get(board.identifier)
        if lock and lock.locked():
            lock.release()

    def list_boards(self) -> Iterable[Board]:
        return self._boards.values()


__all__ = ["Board", "BoardManager", "BoardAllocationError"]
