# Location: full-falldetect/backend/launcher_args.py
"""Command-line flags used when main.py is started by start-falldetect.bat.

Usage in main.py:
    from launcher_args import parse_launcher_args
    LAUNCH_ARGS = parse_launcher_args()
"""
import argparse


def parse_launcher_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="FallDetect detection service")
    parser.add_argument(
        "--all",
        action="store_true",
        help="Monitor every camera in CAMERA_ID_MAP without asking on the console.",
    )
    # parse_known_args ignores any extra flags instead of crashing.
    args, _unknown = parser.parse_known_args()
    return args
