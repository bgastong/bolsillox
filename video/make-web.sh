#!/bin/sh
# Arma el video de la pantalla del celular para la web a partir de la grabacion
# (public/app-recording.mp4, ver record-app.cjs): corta el segundo de carga entre
# Metas e Inversiones, lo acelera un poco y lo comprime en WebM y MP4 a 720 px
# de ancho, mas la imagen de portada. El celular y las frases son de la pagina
# (src/components/Landing/PhoneShowcase.jsx), no van en el video.
set -e
cd "$(dirname "$0")"
IN=public/app-recording.mp4
OUT=../public/video
RATE=1.1      # velocidad
A_END=20.62   # ultimo momento en Metas
B_START=21.8  # Inversiones ya cargada
B_END=27.6    # final
FILTER="[0:v]trim=0:$A_END,setpts=PTS-STARTPTS[a];[0:v]trim=$B_START:$B_END,setpts=PTS-STARTPTS[b];[a][b]concat=n=2:v=1[c];[c]setpts=PTS/$RATE,fps=30,scale=720:-2:flags=lanczos,format=yuv420p[v]"
mkdir -p "$OUT"
ffmpeg -y -loglevel error -i "$IN" -filter_complex "$FILTER" -map "[v]" -c:v libvpx-vp9 -b:v 0 -crf 34 -row-mt 1 -deadline good -cpu-used 2 -an "$OUT/bolsillox-app.webm"
ffmpeg -y -loglevel error -i "$IN" -filter_complex "$FILTER" -map "[v]" -c:v libx264 -crf 27 -preset slow -movflags +faststart -an "$OUT/bolsillox-app.mp4"
ffmpeg -y -loglevel error -i "$OUT/bolsillox-app.mp4" -frames:v 1 -q:v 85 "$OUT/bolsillox-app-poster.webp"
ls -la "$OUT"
