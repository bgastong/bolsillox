#!/bin/sh
# Comprime el tutorial renderizado (out/tutorial.mp4) para la web: WebM y MP4 en
# 1920x1080, mas la imagen de portada. Se copian a ../public/video/.
set -e
cd "$(dirname "$0")"
IN=out/tutorial.mp4
OUT=../public/video
mkdir -p "$OUT"
ffmpeg -y -loglevel error -i "$IN" -c:v libvpx-vp9 -b:v 0 -crf 33 -row-mt 1 -deadline good -cpu-used 2 -an "$OUT/tutorial.webm"
ffmpeg -y -loglevel error -i "$IN" -c:v libx264 -crf 24 -preset slow -pix_fmt yuv420p -movflags +faststart -an "$OUT/tutorial.mp4"
ffmpeg -y -loglevel error -ss 0.9 -i "$IN" -frames:v 1 -vf scale=1280:-2 -q:v 82 "$OUT/tutorial-poster.webp"
ls -la "$OUT"
