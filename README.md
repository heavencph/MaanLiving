> ## ⚠️ 產品與文案仍是複本
>
> 這個站是從 **萬角 MAAN GOK**（`heavencph/MannGok`）複製過來的。名字、顏色、
> 標誌、分頁圖示都已經換成漫家居，但**產品資料、照片與品牌故事還是舊品牌的**：
> `lib/data/*.json`、`public/images/`、`messages/{zh,en}.json` 裡的敘述只換了
> 名字，沒換內容，兩個站現在講著同一個故事、賣著同一批家具。上線前要換掉。
>
> 還沒做的：
>
> - [ ] 產品資料與照片（`lib/data/*.json`、`public/images/products/`）
> - [ ] 品牌故事與 SEO 描述（`messages/{zh,en}.json`）
> - [ ] `lib/brand.ts` 的 Instagram 連結仍指向前一個品牌的帳號
> - [ ] 探索頁的兩個 3D 模型（`public/models/`）
>
> 換品牌的完整步驟見 [`docs/rebrand.md`](docs/rebrand.md)。

# 漫家居 MAAN

當代高端家具品牌網站——以 Next.js App Router、TypeScript、Tailwind CSS 與 Framer Motion 打造，靈感取自 Jardan、Minotti、B&B Italia、Living Divani、Muuto 等國際高端家具品牌的質感，但為完全原創設計。

## 開發

```bash
npm run dev
```

開啟 [http://localhost:3000](http://localhost:3000) 查看網站。

```bash
npm run build   # 產出 production build（含所有靜態頁面）
npm run lint    # ESLint 檢查
```

## 部署

網站部署於 **Vercel**，透過 GitHub 整合自動建置——設定在 Vercel 後台，repo 內沒有、也不需要設定檔。

| 動作 | 結果 |
| --- | --- |
| push 到 `main` | 自動建置並發佈到正式環境 |
| 開 PR | 產生獨立的 preview 網址，合併前可先預覽 |

正式網址是 **<https://maanliving.com>**，自訂網域在 Vercel 的 Settings → Domains 設定。

Vercel 提供的 `<專案名稱>.vercel.app` 仍然可用，作為備援。**那個網址由 Vercel 後台的專案名稱決定，改名後會跟著變**，而不是由此處的 `package.json` 決定。

因此**不需要任何本機環境即可改版上線**：在雲端開發環境（如 Claude Code on the web）改好 → push 分支 → 開 PR 確認 preview → 合併進 `main` → 自動上線。整條流程都能從手機完成。

### 分支慣例

直接改 `main` 會立刻上線，所以請一律開分支、走 PR：

```bash
git checkout -b <branch-name>
# 改動、commit
git push -u origin <branch-name>
```

## 內容管理

網站內容可在 `/admin` 以網頁介面編輯（Sveltia CMS），存檔後直接 commit 進 repo 並自動部署，不需要動程式碼。內容仍存放於 `lib/data/*.json`，因此每次修改都留在 git 歷史中。

需要一個 GitHub OAuth App 與三個環境變數，設定步驟見 [`docs/cms.md`](docs/cms.md)。

## 詢問單

聯絡表單與電子報訂閱會經由 `app/api/contact/route.ts` 寫入 Google 試算表。需要設定 `GOOGLE_SHEETS_WEBHOOK_URL` 與 `GOOGLE_SHEETS_WEBHOOK_SECRET` 兩個環境變數（見 `.env.example`），**未設定時表單會顯示錯誤訊息而非成功畫面**。完整設定步驟見 [`docs/enquiries.md`](docs/enquiries.md)。

## npm 版本需求

本專案需要 **npm 11 以上**（已寫入 `package.json` 的 `engines`）。以 npm 10 執行 `npm ci` 會失敗：

```
npm error Missing: @swc/helpers@0.5.23 from lock file
```

這不是 lock 檔損壞，`npm install` 也修不好。原因是一個 peer 相依衝突，而兩個 npm 主版本的解法不同：

- `next@16` 將 `@swc/helpers` 釘在 `0.5.15`
- `next-intl` 底下的 `@swc/core` 的 peerDependency 要求 `>=0.5.17`

npm 11 以現有 lock 檔解得開；npm 10 則要求額外安裝 `@swc/helpers@0.5.23`，因而判定 lock 檔缺項。

**不要為了讓 npm 10 通過而用 npm 10 重新產生 lock 檔**——那會移除全部 `libc` 欄位（npm 11 用來依 glibc／musl 篩選 optional 相依），並讓 npm 11 使用者反過來出問題。

`npm --version` 若低於 11，執行 `npm install -g npm@11` 升級。

## 專案結構

```
app/                路由（App Router）：首頁、探索、產品、產品詳情、分類、關於我們、案例故事、期刊、聯繫我們
components/         可重用元件（layout / product / shared / motion / ui）
sections/           頁面專屬的組合區塊（首頁各段落、產品列表、聯絡表單…）
lib/                資料存取層與工具函式（lib/data.ts、lib/data/*.json）
types/              TypeScript 型別定義（Product、JournalPost、Project…）
```

## 特色功能

- **互動式顏色配置器**：於產品詳情頁選擇顏色／材質時，主圖以淡入淡出動畫即時切換，無需重新整理頁面（見 `components/product/colour-configurator.tsx` 與 `components/product/product-gallery.tsx`）。
- **產品資料層**：所有產品、期刊文章、案例故事皆為 `lib/data/*.json` 的假資料，型別定義於 `types/`，未來可直接替換為 CMS 資料來源。
- **動態頁面**：`/products/[slug]`、`/journal/[slug]`、`/projects/[slug]` 皆使用 `generateStaticParams` 於建置時預先產生靜態頁面。

## 圖片

全部圖片皆存放於 `public/images/`，由本站自行提供，**不依賴任何外部圖床**。除了效能與掌控權，這也讓網站在第三方圖床緩慢或無法連線的網路環境下仍可正常顯示。

`next.config.ts` 未設定 `images.remotePatterns`，因此外部網址的圖片不會被 `next/image` 接受——這是刻意的，用來防止外部圖床再被引入。若日後確有需要，再將該網域加入白名單。

透過 `/admin` 上傳的圖片會存進 `public/images/uploads/`。

### 透明圖片一律維持 PNG 來源

**帶透明度的圖片，來源檔不要改成 `.webp`。**

`next/image` 依請求的 `Accept` 標頭決定輸出格式。當客戶端不接受來源格式時會**退回 JPEG**，而 JPEG 沒有 alpha 通道——透明區域會被填成黑色。實測同一張圖：

| 來源檔 | `Accept` 不含 webp 時的輸出 | 角落像素 |
| --- | --- | --- |
| `frankie.webp` | `image/jpeg` | `[0,0,0,255]` ← 黑色方塊 |
| `frankie.png` | `image/png` | `[0,0,0,0]` ← 正常透明 |

PNG 是普遍可接受的格式，因此能安全降級；WebP 不是。在米白的 hero 背景上，這個差別就是一塊突兀的黑方塊。

要縮減透明 PNG 的體積，**維持 PNG 格式、改縮尺寸**即可。以 `frankie.png` 為例，1024×1024 縮到 768×768 讓檔案從 1396 KB 降到 316 KB，而 768px 仍涵蓋真實裝置會請求的最寬變體。改動後請驗證：`Accept` 不含 webp 時輸出仍為 `image/png`、四角 alpha 為 0，並將新舊圖合成到頁面背景色上比對差異。
