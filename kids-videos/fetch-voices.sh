#!/usr/bin/env bash
# Download the Arabic piper voices used by engine/build_audio.py into .models/
set -euo pipefail
cd "$(dirname "$0")"
mkdir -p .models
for m in vits-piper-ar_JO-kareem-medium vits-piper-ar_JO-SA_dii-high; do
  [ -d ".models/$m" ] && continue
  curl -sSL "https://github.com/k2-fsa/sherpa-onnx/releases/download/tts-models/$m.tar.bz2" | tar xj -C .models
done
echo "voices ready in .models/"
