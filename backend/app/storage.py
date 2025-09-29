from __future__ import annotations

import json
from pathlib import Path
from typing import Dict, Iterable, Optional

from .schema import ProjectMetadata, ProjectSaveRequest


class ProjectStorage:
    """Very small JSON backed storage for Blockly projects."""

    def __init__(self, root: Path) -> None:
        self.root = root
        self.root.mkdir(parents=True, exist_ok=True)

    def _project_path(self, identifier: str) -> Path:
        return self.root / f"{identifier}.json"

    def save(self, payload: ProjectSaveRequest) -> ProjectMetadata:
        path = self._project_path(payload.identifier)
        data = payload.dict()
        path.write_text(json.dumps(data, ensure_ascii=False, indent=2), encoding="utf-8")
        return ProjectMetadata(
            identifier=payload.identifier,
            name=payload.name,
            description=payload.description,
        )

    def load(self, identifier: str) -> Optional[Dict[str, str]]:
        path = self._project_path(identifier)
        if not path.exists():
            return None
        return json.loads(path.read_text(encoding="utf-8"))

    def list_projects(self) -> Iterable[ProjectMetadata]:
        for file in sorted(self.root.glob("*.json")):
            data = json.loads(file.read_text(encoding="utf-8"))
            yield ProjectMetadata(
                identifier=data["identifier"],
                name=data["name"],
                description=data.get("description"),
            )
