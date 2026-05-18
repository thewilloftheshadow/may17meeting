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
done

if ! command -v ffmpeg >/dev/null 2>&1; then
  echo "Missing ffmpeg. Install ffmpeg, then rerun: bun generate" >&2
  exit 1
fi

mkdir -p public out

cp "$AVATAR_RAW" public/avatar.png
cp "$CAPTIONS_RAW" public/craig-captions.srt
ffmpeg -y -hide_banner -loglevel error -i "$AUDIO_RAW" -c:a copy public/craig-audio.m4a

echo "Assets ready. Rendering CraigMeeting to out/may17meeting.mp4"
echo "Tip: pass Remotion flags after --, e.g. bun generate -- --frames=0-299"

bunx remotion render CraigMeeting out/may17meeting.mp4 --overwrite "$@"
