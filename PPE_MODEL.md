# PPE model (v2.0)

The active model is configured in **`ppe-model.json`** (`active`). Default: **`edgeguard-ppe-yolo11n-v1`** — YOLO11n fine-tuned (25 epochs, 512 px) on the Ultralytics Construction-PPE dataset, committed at `models/edgeguard-ppe-yolo11n.onnx` (10.7 MB, sha256 `3931a089…ac0d`).

Validation (200 images, mAP50): helmet 0.76, gloves 0.76, Person 0.91, no_helmet 0.55, no_gloves 0.59. On the four bundled sample images it returns helmet/gloves/no-helmet/no-gloves correctly (these samples come from the same dataset, so this is a sanity check, not an independent test). For a stronger model, run `training/train_ppe.ipynb` on a GPU (YOLO11s, 120 epochs, plus your own webcam images) and add it as a new entry.

Why the change: SafetyVision v2 scored glove classes below 0.50 on every test image and returned nothing on close-up webcam frames (see PPE_COMPARISON.md). Construction-PPE has explicit glove/no-glove labels; adding your own webcam images in the notebook is the biggest accuracy lever.

Pipeline (unchanged): RGB letterbox 640×640, grey 114, 0–1 normalisation, ONNX Runtime Web WASM in a Web Worker; frames never leave the browser. Decoding is now generic for any YOLOv8/YOLO11 head (`[1, 4+classes, 8400]`), and model class names are mapped to EdgeGuard's canonical labels (`Hardhat`, `NO-Hardhat`, `Gloves`, `NO-Gloves`, `Person`), so the UI, API and Telegram rules are unchanged. Per-label thresholds live in `ppe-model.json` (gloves 0.35 / no-gloves 0.45 by default). A positive and its negative overlapping the same region are cross-suppressed, keeping only the higher score.

Warnings still need ≥3 consecutive negative samples across ≥2 s; absence of a box is never treated as missing PPE. This remains screening, not a certified safety system.

## Switching models
- Build with `PPE_MODEL=safetyvision-v2-640-56a71758` to use the old model (and set `active` to the same id so the runtime matches).
- Any YOLOv8/11 ONNX works: add an entry with `url`, `sha256`, `classes`, `map`, `thresholds`.
- Local file override: `.cache/<model-id>.onnx`.

Model licence: Ultralytics YOLO11 weights and training code are AGPL-3.0, consistent with this repository's licence.
