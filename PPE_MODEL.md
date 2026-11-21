# EdgeGuard camera demonstration

Use an industrial safety helmet and protective gloves, one person close to the camera, with head and both hands clearly visible. Ordinary caps are not supported. Keep the monitoring page visible. No predictions are fabricated when PPE cannot be assessed.

## Model
SafetyVision YOLOv8s v2, pinned to Hugging Face revision 56a71758b55f0e9f2b4b2d6b51a779a1f882da10, v2/best_640.onnx (~43 MB).
Source: https://huggingface.co/ayushgupta7777/safetyvision-yolov8
Upstream: https://github.com/ayushgupta07xx/SafetyVision
Model license: AGPL-3.0. New PPE integration code is provided under AGPL-3.0 (see LICENSE); existing third-party notices remain applicable. Source is available at https://github.com/Rishimax645/EdgeGuard .
ONNX Runtime Web 1.24.3 is MIT licensed. Model weights are downloaded directly by the browser, not committed to the repository.

RGB letterbox input [1,3,640,640], grey 114 padding, normalization 0–1. Output [1,17,8400]; class scores are used directly, class-wise NMS IoU 0.45. Relevant classes: Gloves, Hardhat, NO-Gloves, NO-Hardhat and Person. Score threshold 0.50.

Only explicit negative predictions can raise a warning. Absence of a positive prediction is NOT treated as proof of missing PPE. At least three consecutive processed samples spanning two seconds are required; gaps above ten seconds reset confirmation. This is scene-level screening, not person tracking. Keep one person in view. Hidden hands and distant objects may produce no assessment.

Frames remain on the browser device and run in a Web Worker using WASM. The model host sees the model-download request; it does not receive camera frames. Only negative labels, score, sample count, duration and model version are sent to the authenticated EdgeGuard API. Telegram receives text only.

## Notifications
Configure server TELEGRAM_BOT_TOKEN. In Settings create a Telegram connection link, open it and press Start, then Verify connection and Send test. Enable Send Telegram on new incidents and Save rules. A token alone does not link a recipient. Keep credentials out of GitHub.

Camera events appear in either sensor mode. Open or acknowledged incidents suppress repeats; after manual review/closure, at least 60 seconds from the previous event creation is required for a new record. Acknowledging is not proof the hazard has cleared. A disabled rule stops new events; existing records require review. API acceptance is not a Telegram delivery/read receipt.

## Validation and limitations
Build, TypeScript, rule-unit tests and local authenticated API smoke tests are provided. Live webcam accuracy and real Telegram delivery must be tested on the user's equipment. Prior evaluation on the user's screenshot returned no detections above 0.50: this is not a validated safety system. Training or a better camera view may be required. Never present the simulation button as a real camera detection. Browser model downloads require internet access and enough device memory. Closing or hiding the page stops/pauses camera evaluation; this is not unattended server monitoring.
