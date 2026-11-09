"""XEROVA AI DEVFORCE — Structured Logging Infrastructure.

Provides JSON-structured log formatting with ISO timestamps and contextual metadata.
"""

import datetime
import json
import logging
import sys
from typing import Any
from app.core.config import settings


class StructuredJsonFormatter(logging.Formatter):
    """Custom logging formatter that outputs logs as single-line JSON records."""

    def format(self, record: logging.LogRecord) -> str:
        log_payload: dict[str, Any] = {
            "timestamp": datetime.datetime.now(datetime.timezone.utc).isoformat(),
            "level": record.levelname,
            "logger": record.name,
            "message": record.getMessage(),
            "module": record.module,
            "line": record.lineno,
            "process_id": record.process,
        }

        # Include contextual extras if present
        if hasattr(record, "request_id"):
            log_payload["request_id"] = getattr(record, "request_id")
        if hasattr(record, "extra_data"):
            log_payload["data"] = getattr(record, "extra_data")

        if record.exc_info:
            log_payload["exception"] = self.formatException(record.exc_info)

        return json.dumps(log_payload, default=str)


def setup_logging() -> logging.Logger:
    """Configures the root application logger according to settings."""
    logger = logging.getLogger("devforce")
    logger.setLevel(getattr(logging, settings.LOG_LEVEL.upper(), logging.INFO))

    # Avoid duplicate handlers if reloaded
    if not logger.handlers:
        handler = logging.StreamHandler(sys.stdout)
        if settings.LOG_FORMAT == "json":
            handler.setFormatter(StructuredJsonFormatter())
        else:
            handler.setFormatter(
                logging.Formatter(
                    "[%(asctime)s] [%(levelname)s] [%(name)s]: %(message)s"
                )
            )
        logger.addHandler(handler)

    # Silence overly verbose external loggers
    logging.getLogger("uvicorn.access").setLevel(logging.WARNING)
    logging.getLogger("sqlalchemy.engine").setLevel(
        logging.INFO if settings.DEBUG else logging.WARNING
    )

    return logger


logger = setup_logging()

