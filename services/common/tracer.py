"""
Discovery Observability & Distributed Request Tracing Engine
Compliant with Requirement 10: Every request must have a trace containing:
request_id -> agent -> tool -> input -> result -> decision -> timestamp
"""

from datetime import datetime, timezone
import json
import logging
import os
from typing import Any, Dict, List, Optional
import uuid

logger = logging.getLogger("discovery.tracer")


class TraceStep:
    """Individual execution step within an agent pipeline."""

    def __init__(
        self,
        agent: str,
        tool: str,
        input_data: Any,
        result_summary: str,
        decision: str,
        status: str = "success",
        metadata: Optional[Dict[str, Any]] = None,
    ):
        self.step_id = str(uuid.uuid4())[:8]
        self.agent = agent
        self.tool = tool
        self.input_data = self._sanitize(input_data)
        self.result_summary = result_summary
        self.decision = decision
        self.status = status
        self.metadata = metadata or {}
        self.timestamp = datetime.now(timezone.utc).isoformat()

    def _sanitize(self, val: Any) -> Any:
        if isinstance(val, (dict, list, str, int, float, bool)) or val is None:
            if isinstance(val, str) and len(val) > 1000:
                return val[:1000] + "... [truncated]"
            return val
        return str(val)[:500]

    def to_dict(self) -> Dict[str, Any]:
        return {
            "step_id": self.step_id,
            "agent": self.agent,
            "tool": self.tool,
            "input": self.input_data,
            "result": self.result_summary,
            "decision": self.decision,
            "status": self.status,
            "metadata": self.metadata,
            "timestamp": self.timestamp,
        }


class ExecutionTracer:
    """Collects and persists multi-agent execution traces for an investigation request."""

    def __init__(self, request_id: Optional[str] = None, user_query: str = ""):
        self.request_id = request_id or str(uuid.uuid4())
        self.user_query = user_query
        self.start_time = datetime.now(timezone.utc)
        self.steps: List[TraceStep] = []
        self.provenance_records: List[Dict[str, Any]] = []

    def log_step(
        self,
        agent: str,
        tool: str,
        input_data: Any,
        result_summary: str,
        decision: str,
        status: str = "success",
        metadata: Optional[Dict[str, Any]] = None,
    ) -> TraceStep:
        step = TraceStep(
            agent=agent,
            tool=tool,
            input_data=input_data,
            result_summary=result_summary,
            decision=decision,
            status=status,
            metadata=metadata,
        )
        self.steps.append(step)
        logger.info(
            "[Trace %s] [%s -> %s] Decision: %s | Result: %s",
            self.request_id[:8],
            agent,
            tool,
            decision,
            result_summary[:120],
        )
        return step

    def add_provenance(self, claim: str, source_url: str, source_name: str, snippet: str, tier: int):
        self.provenance_records.append({
            "claim": claim,
            "source_url": source_url,
            "source_name": source_name,
            "snippet": snippet,
            "tier": tier,
            "recorded_at": datetime.now(timezone.utc).isoformat(),
        })

    def get_summary(self) -> Dict[str, Any]:
        end_time = datetime.now(timezone.utc)
        duration_ms = int((end_time - self.start_time).total_seconds() * 1000)
        return {
            "request_id": self.request_id,
            "user_query": self.user_query,
            "total_steps": len(self.steps),
            "duration_ms": duration_ms,
            "start_time": self.start_time.isoformat(),
            "end_time": end_time.isoformat(),
            "steps": [s.to_dict() for s in self.steps],
            "provenance_count": len(self.provenance_records),
            "provenance": self.provenance_records,
        }

    def persist(self):
        """Persist trace to PostgreSQL audit logs table."""
        try:
            from services.common.db import db
            summary = self.get_summary()
            conn = db._get_pg_connection()
            if conn:
                cur = conn.cursor()
                cur.execute("""
                    CREATE TABLE IF NOT EXISTS execution_traces (
                        request_id VARCHAR(64) PRIMARY KEY,
                        user_query TEXT,
                        total_steps INT,
                        duration_ms INT,
                        steps JSONB,
                        provenance JSONB,
                        created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
                    );
                """)
                cur.execute("""
                    INSERT INTO execution_traces (request_id, user_query, total_steps, duration_ms, steps, provenance, created_at)
                    VALUES (%s, %s, %s, %s, %s, %s, CURRENT_TIMESTAMP)
                    ON CONFLICT (request_id) DO UPDATE SET
                        total_steps = EXCLUDED.total_steps,
                        duration_ms = EXCLUDED.duration_ms,
                        steps = EXCLUDED.steps,
                        provenance = EXCLUDED.provenance;
                """, (
                    self.request_id,
                    self.user_query,
                    summary["total_steps"],
                    summary["duration_ms"],
                    json.dumps(summary["steps"]),
                    json.dumps(summary["provenance"]),
                ))
                conn.commit()
                cur.close()
                conn.close()
        except Exception as exc:
            logger.warning("Trace persistence notice: %s", exc)
