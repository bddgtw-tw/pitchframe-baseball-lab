# 投球逐格｜PitchFrame

[▶ 直接試用 PitchFrame](https://bddgtw-tw.github.io/pitchframe-baseball-lab/)

A separate public preview for a browser-based baseball motion observer.
Repository/project slug: `pitchframe-baseball-lab`.

## 使用方式

以網站 HTTPS 網址開啟，選擇或拍攝自己的影片。首次使用需要從本站載入約 24 MB 的模型與程式，請等待載入結果。影片保留原比例完整顯示，骨架與標註以透明圖層疊加。

- 影片由瀏覽器直接讀取並在本機分析，應用程式不會上傳影片。
- 這個公開套件不包含使用者影片、照片、截圖、帳號資料或 API 金鑰。
- 網站主機仍可收到一般網頁／模型檔案請求及連線資訊；「本機分析」不代表網站請求完全匿名。
- 此版保留原有 30 秒分析上限，未偵測到人物時不會捏造骨架。
- 可逐格操作、畫註記、匯出圖片及瀏覽器支援格式的影片。
- 這是實驗預覽，不是醫療診斷或精準動作量測工具。姿態辨識仍需使用者核對。
- 需要近期 Chrome／Edge 等支援 WebGL 與 WebAssembly 的瀏覽器。模型載入失敗會顯示錯誤及重試按鈕。

## Static hosting

All runtime assets are bundled at the project root, referenced with relative paths. No CDN script or model fetch is required. Serve the files over HTTP/HTTPS; `file://` is not supported. `.nojekyll` keeps the distribution as plain static files. This package does not include an upload endpoint, analytics integration, Windows launcher or demo video.

No deployment is performed by this package preparation.

## Third-party components

- MediaPipe Pose **0.5.1675469404**, from the published `@mediapipe/pose` npm package. License: `pose-LICENSE-Apache-2.0.txt`.
- Tailwind CSS browser runtime **3.4.17**. License: `tailwind-LICENSE.txt`.

Vendor files are retained unmodified. Model and browser compatibility are not guaranteed by a successful static test.
