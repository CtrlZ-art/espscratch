from __future__ import annotations

from typing import List, Optional

from pydantic import BaseModel, Field


class FlashRequest(BaseModel):
    code: str = Field(..., description="Arduino C++ source produced by Blockly")
    board_id: Optional[str] = Field(
        default=None, description="Optional identifier for the desired board"
    )
    project_name: Optional[str] = Field(
        default="blockly_esp32", description="Name for the generated sketch"
    )


class FlashResponse(BaseModel):
    job_id: str
    board_id: Optional[str]


class JobLog(BaseModel):
    job_id: str
    status: str
    logs: List[str]
    board_id: Optional[str]


class ProjectMetadata(BaseModel):
    identifier: str
    name: str
    description: Optional[str] = None


class ProjectSaveRequest(BaseModel):
    identifier: str
    name: str
    blocks_xml: str
    code: str
    description: Optional[str] = None


__all__ = [
    "FlashRequest",
    "FlashResponse",
    "JobLog",
    "ProjectMetadata",
    "ProjectSaveRequest",
]
