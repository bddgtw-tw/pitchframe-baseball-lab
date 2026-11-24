# PitchFrame 科學方法與安全界線

PitchFrame 的定位是「讓家長、球員與教練對著同一段影片討論」的觀察工具，不是自動教練、醫療產品或實驗室生物力學系統。

## 產品採用的判讀原則

1. **先確認資料品質，再談動作。** 全身是否入鏡、相機是否固定、是否只有一球、關鍵事件格是否有骨架，都會先寫入分析包。
2. **事件可以人工覆核。** 前腳落地與出手的自動結果只是候選點；使用者可以逐格改正，輸出會保留人工或自動來源。
3. **只描述看得到的證據。** 介面呈現影格、時間、2D 關節投影與模型的相對趨勢，不把它們轉成好壞總分。
4. **同條件才比較。** 球員、手別、年齡層、視角、場地、身體狀況及拍攝設定不完整或不一致時，不宣稱進步或退步。
5. **一次只驗證一個線索。** AI 分析包要求先區分觀察、推論與待確認，再提出下一次如何重拍驗證；不直接開立加重量、最大強度或增加投球量的訓練。

這套流程與現代投球發展常見的「評估 → 提出假設 → 小幅介入 → 重測」思路相容，但 PitchFrame 不宣稱獲得 Driveline Baseball 或任何醫療／運動科學機構認證。

## 功能與證據的對應

| PitchFrame 功能 | 合理用途 | 不可推論 |
| --- | --- | --- |
| 前腳落地、出手候選點 | 快速定位並逐格人工確認投球階段 | 自動事件點一定正確 |
| 2D 肩、肘、髖、膝角度 | 在相同視角下回看片段與提出問題 | 真實 3D 關節角度、關節力矩 |
| 骨盆—上軀幹旋轉差趨勢 | 觀察模型在落地附近是否呈現相對變化 | 越大越好、球速、能量傳遞效率或受傷風險 |
| 落地到出手的相對時間 | 在相同拍攝條件下提供可重複的時間線索 | 單一理想秒數或適用所有年齡的標準 |
| 同一球員本機基準 | 幫助教練比較同條件下的前後影片 | 與職業球員或不同年齡球員排名 |
| AI 分析包 | 把背景、事件來源、可信度、限制與觀察證據交給外部 AI | AI 已看過未附上的影片、可取代現場教練 |

## 為什麼不把「動力鏈」做成分數

少棒投球能量研究使用多機位 3D 動作捕捉與測力板，並發現 9–13 歲球員之間存在很大的動作策略差異。單支手機影片沒有地面反作用力、關節力矩或可靠的 3D 角速度，因此 PitchFrame 只能幫助定位動作階段與回看相對趨勢，不能宣稱量到能量流。

骨盆與上軀幹的旋轉順序是完整動作的一部分，不是單一「髖肩分離越大越好」的目標。年齡、成熟度、經驗、投球強度、視角與個體策略都會影響觀察結果。

## AI 分析包 v2

`pitchframe-analysis-package-v2` 會輸出：

- 去識別化球員背景與身體狀況。
- 拍攝品質自我檢查與骨架覆蓋率。
- 影片影格率、可變影格率與事件時間。
- 前腳落地／出手是人工標記或自動估計。
- 單機位旋轉差訊號的單位與限制：`model-normalized-relative-signal`、`validatedPhysicalMeasurement: false`。
- 只有條件一致時才成立的比較結果。
- 要求 AI 區分【觀察】【推論】【待確認】的提示詞。

此格式刻意不包含姓名、球隊、原始檔名或原始影片，也不會自動把資料送往任何 AI 服務。

## 安全停止條件

若球員有疼痛、明顯疲勞、控制力突然下降或動作和平常明顯不同，應停止高強度投球並告知家長／教練；是否需要醫療評估應由合格專業人員決定。PitchFrame 不用來判斷能否繼續投球，也不預測受傷。

## 參考研究

- [Baseball Pitching Biomechanics in Relation to Injury Risk and Performance](https://pmc.ncbi.nlm.nih.gov/articles/PMC3445126/)
- [Lower Body Energy Generation, Absorption, and Transfer in Youth Baseball Pitchers](https://pmc.ncbi.nlm.nih.gov/articles/PMC9532595/)
- [Hip Flexibility and Pitching Biomechanics in Adolescent Baseball Pitchers](https://pmc.ncbi.nlm.nih.gov/articles/PMC9528701/)
- [The Clinician's Guide to Baseball Pitching Biomechanics](https://pmc.ncbi.nlm.nih.gov/articles/PMC9950989/)
- [Kinematic Parameters Predictive of Pitch Velocity: A Systematic Review](https://pmc.ncbi.nlm.nih.gov/articles/PMC10687953/)
- [Longitudinal Study of Pitching Kinematics in Youth Baseball Pitchers](https://pubmed.ncbi.nlm.nih.gov/28968146/)

研究能支持觀察框架，不代表能把群體研究結果直接套用到單一孩子。任何具體技術調整仍需由了解球員年齡、訓練史、疼痛與現場表現的合格教練判斷。
