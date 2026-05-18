#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

AUDIO_RAW="raw/craig-earSbv6BSTL9-rwYIgsCs1kp1ufHHaMm8KYiphzIh5G.aac/1-4shadowed.aac"
CAPTIONS_RAW="raw/craig-earSbv6BSTL9-mswKB5umuAnBfsL1mYZFgF2cT1TU_1.srt"
AVATAR_RAW="raw/1-4shadowed.png"

for file in "$AUDIO_RAW" "$CAPTIONS_RAW" "$AVATAR_RAW"; do
  if [[ ! -f "$file" ]]; then
    echo "Missing required raw asset: $file" >&2
    exit 1
  fi

  if head -n 1 "$file" | grep -q "git-lfs.github.com/spec"; then
    echo "Raw asset is a Git LFS pointer, not the actual file: $file" >&2
    echo "Install Git LFS, then run: git lfs pull" >&2
    exit 1
  fi
done

FFMPEG_BIN="$(command -v ffmpeg || true)"
if [[ -z "$FFMPEG_BIN" ]]; then
  FFMPEG_BIN="$(node -e 'process.stdout.write(require("ffmpeg-static") || "")')"
fi

if [[ -z "$FFMPEG_BIN" || ! -x "$FFMPEG_BIN" ]]; then
  echo "Missing ffmpeg. Run bun install, then rerun: bun generate" >&2
  exit 1
fi

mkdir -p public out

cp "$AVATAR_RAW" public/avatar.png
cp "$CAPTIONS_RAW" public/craig-captions.srt
"$FFMPEG_BIN" -y -hide_banner -loglevel error -i "$AUDIO_RAW" -c:a copy public/craig-audio.m4a

echo "Assets ready. Rendering CraigMeeting to out/may17meeting.mp4"
echo "Tip: pass Remotion flags after --, e.g. bun generate -- --frames=0-299"

bunx remotion render CraigMeeting out/may17meeting.mp4 --overwrite "$@"
