"""Opt-in reviewer evaluation. Makes real OpenAI API calls and may incur charges.

Usage:
    python scripts/reviewer_eval.py --live
"""

from __future__ import annotations

import argparse
import asyncio


async def main() -> None:
    parser = argparse.ArgumentParser(description="Run billable reviewer evaluation.")
    parser.add_argument(
        "--live",
        action="store_true",
        help="Required flag to run live OpenAI calls.",
    )
    args = parser.parse_args()
    if not args.live:
        print("Reviewer evaluation is opt-in. Re-run with --live to consume API credits.")
        return

    print(
        "Reviewer evaluation harness placeholder. "
        "Decision: LEAVE DISABLED until manual eval is completed."
    )


if __name__ == "__main__":
    asyncio.run(main())
