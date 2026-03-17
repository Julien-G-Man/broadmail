"""ARQ worker entrypoint that is resilient on Python 3.14+ loop behavior."""

import asyncio

from arq.worker import run_worker

from app.sending.worker import WorkerSettings


if __name__ == "__main__":
    # ARQ currently expects a current event loop in the main thread.
    asyncio.set_event_loop(asyncio.new_event_loop())
    run_worker(WorkerSettings)
