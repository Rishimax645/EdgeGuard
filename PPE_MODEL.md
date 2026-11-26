# PPE model (v2.0)

The active model is configured in **`ppe-model.json`** (`active`). Default: **`edgeguard-ppe-yolo11s-v1`** — YOLO11s fine-tuned on the Ultralytics Construction-PPE dataset (classes include `helmet`, `no_helmet`, `gloves`, `no_gloves`, `Person`), trained with `training/train_ppe.ipynb` and published as a GitHub release asset (`ppe-model-v1/edgeguard-ppe-yolo11s.onnx`).

Why the change: SafetyVision v2 scored glove classes below 0.50 on every test image and returned nothing on close-up webcam frames (see PPE_COMPARISON.md). Construction-PPE has explicit glove/no-glove labels; adding your own webcam images in the notebook is the biggest accuracy lever.

Pipeline (unchanged): RGB letterbox 640×640, grey 114, 0–1 normalisation, ONNX Runtime Web WASM in a Web Worker; frames never leave the browser. Decoding is now generic for any YOLOv8/YOLO11 head (`[1, 4+classes, 8400]`), and model class names are mapped to EdgeGuard's canonical labels (`Hardhat`, `NO-Hardhat`, `Gloves`, `NO-Gloves`, `Person`), so the UI, API and Telegram rules are unchanged. Per-label thresholds live in `ppe-model.json` (gloves 0.35 / no-gloves 0.45 by default). A positive and its negative overlapping the same region are cross-suppressed, keeping only the higher score.

Warnings still need ≥3 consecutive negative samples across ≥2 s; absence of a box is never treated as missing PPE. This remains screening, not a certified safety system.

## Switching models
- Build with `PPE_MODEL=safetyvision-v2-640-56a71758` to use the old model (and set `active` to the same id so the runtime matches).
- Any YOLOv8/11 ONNX works: add an entry with `url`, `sha256`, `classes`, `map`, `thresholds`.
- Local file override: `.cache/<model-id>.onnx`.

Model licence: Ultralytics YOLO11 weights and training code are AGPL-3.0, consistent with this repository's licence.
