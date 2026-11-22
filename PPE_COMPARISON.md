# PPE model comparison and image-test panel

Compared SafetyVision v2 (current), Hexmon Vyra YOLOv8m revision 08895b33d95d2587423ebe4f7c1b9c41beebd642, and nduka1999 PPE YOLO11s revision 90f3e8915ef403dbbc77bb6ba713916321e2970f. Same RGB letterbox 640x640 input, 0–1 normalization and 0.50 score threshold. Actual ONNX WASM inference.

Ten public Ultralytics Construction-PPE validation images plus one user screenshot were evaluated. This is a small diagnostic set, not an independent benchmark or an accuracy estimate. Six public images were selected by class membership and filename; four by largest annotated equipment area. Dataset contains collected and generated images. Training overlap is unknown. User screenshot is NOT published.

Scores below are maximum raw class scores (not calibrated probabilities); they do not establish correct box placement.

| Image | Current helmet / no-helmet | Hexmon helmet / no-helmet | YOLO11 helmet / no-helmet |
|---|---|---|---|
| Helmet and gloves | 78% / 0% | 43% / 0% | 88% / 0% |
| Gloves at work | 73% / 7% | 43% / 0% | 84% / 0% |
| Bare head | 2% / 63% | 0% / 71% | 81% / 6% |
| Helmet and bare hands | 77% / 1% | 32% / 0% | 1% / 0% |
| User bare head and hands | 0% / 35% | 0% / 13% | 1% / 79% |

## Decision
Keep current live model for now; neither candidate meets the glove requirement. Hexmon underperformed on the user screenshot. YOLO11 detected no-helmet on the user but falsely predicted a helmet on the public bare-head example; it has no glove classes. Current and Hexmon glove scores on these public samples were below 0.50. Do not present unassessed gloves as compliant.

The website now includes four attributed public images and local JPEG/PNG/WebP selection. Each image runs through the same live model worker and cache, with actual boxes and scores. Expected visible equipment is displayed separately. No sample frame or image is sent to the backend; no sample incidents or Telegram messages are generated. Webcam must be separately tested before relying on demonstration results. Ordinary caps remain unsupported.
