# 複製成第二個品牌

這份文件是把這個網站複製成另一個品牌時的完整清單：要先準備什麼、要改哪些檔案、
哪些地方改了會壞掉。版面、動畫、載入特效、滾動節奏都原封不動，換的是**名字、
顏色、產品**。

改動集中在少數幾個地方，其餘的都是換圖換文字。整份做完大約半天，其中大半時間
在拍照與整理產品資料。

---

## 一、先準備這六樣

| | 準備什麼 | 說明 |
|---|---|---|
| 1 | **新的 GitHub repo** | 兩個品牌各自一份程式碼，才能各自調整、各自部署。 |
| 2 | **新的 Vercel 專案** | 匯入新 repo 即可，設定沿用預設。 |
| 3 | **新網域** | 在 Vercel 的 Domains 綁上去。 |
| 4 | **新的 GitHub OAuth App** | `/admin` 後台登入用。Callback 要填新網域，見 `docs/cms.md`。 |
| 5 | **新的 Google 試算表 + Apps Script** | 詢問單與電子報的收件處，見 `docs/enquiries.md`。 |
| 6 | **五個環境變數** | 填在新的 Vercel 專案，見下表。 |

環境變數（`.env.example` 是同一份清單）：

```
GOOGLE_SHEETS_WEBHOOK_URL       ← 新的 Apps Script 網址
GOOGLE_SHEETS_WEBHOOK_SECRET    ← 自己訂一組，兩邊要一致
GITHUB_OAUTH_CLIENT_ID          ← 新的 OAuth App
GITHUB_OAUTH_CLIENT_SECRET      ← 新的 OAuth App
GITHUB_OAUTH_ALLOWED_HOSTS      ← 新網域，例如 newbrand.com,localhost:3000
NEXT_PUBLIC_SITE_URL            ← 接上自訂網域後填該網域，否則留空
```

**兩個品牌不要共用**任何一項。共用試算表會把兩邊的詢問單混在一起，共用 OAuth App
會讓 A 站的登入把人送回 B 站。

---

## 二、複製程式碼

```bash
git clone --depth 1 https://github.com/heavencph/MannGok newbrand
cd newbrand
rm -rf .git && git init && git add -A && git commit -m "Initial"
git remote add origin https://github.com/<你>/<新 repo>
git push -u origin main
```

`--depth 1` 是刻意的：新品牌不需要這個站的歷史，也不會想在 log 裡看到舊品牌的名字。

---

## 三、換名字

網站上所有「名字」分成兩種，各有一個地方改。

### 1. 當成設計的名字 → `lib/brand.ts`

導覽列、頁尾、手機選單、載入簾幕挖空的字、分享卡片、結構化資料，全部讀這個檔案。
一個檔案改完，這六處一起變：

```ts
export const brand = {
  slug: "maan",           // 檔名用，小寫無空格
  zh: "漫家居",            // 中文名
  latin: "MAAN",          // 英文名，句子裡的寫法
  wordmark: "MAAN",       // 標誌用的寫法（這個品牌兩者相同）
  wordmarkRuns: [ ... ],  // 見下
  social: { instagram: "..." },
};
```

`wordmarkRuns` 是把 `wordmark` 拆成幾段，標出哪幾個字母是**圓的**。首頁跑馬燈把字
拉高十六倍，這個倍率下「圓字母會刻意超出基線一點點，看起來才跟方字母一樣高」這件
平常看不見的排版慣例會變得很明顯，所以要把那點超出壓回去，下緣才是平的。填新名字
時把圓字母（O、G、C、Q、S 這類）標成 `round: true`，各段接起來要等於 `wordmark`。

### 2. 當成文案的名字 → `messages/zh.json`、`messages/en.json`

品牌故事、SEO 描述、頁尾版權那一行等等。這些是句子，會跟著新品牌整段重寫，直接
在這兩個檔案裡改。搜尋現有的中英品牌名可以找齊。

### 3. 另外兩處（不能自動跟著改）

- `package.json` 的 `"name"`
- `public/admin/config.yml` 的 `repo:`（新 repo）與 `base_url:`（新網域）
  ← YAML 讀不到 TypeScript，只能手動；漏改的話後台會 commit 到**舊品牌的 repo**。

---

## 四、換顏色

調色盤在 `app/[locale]/globals.css` 的 `:root`，十個 token：

```css
--warmwhite  --beige  --stone  --sand  --charcoal
--walnut  --matte-black  --olive  --terracotta  --bronze
```

底下的 `--background`、`--foreground`、`--border` 等等全部指向這十個，所以改這十
行就等於換掉整站的顏色。深色模式在同一個檔案的 `.dark` 區塊。

**有三個地方讀不到 CSS 變數，要一起手動改**（畫布與圖片產生器在瀏覽器的樣式系統
之外）：

| 檔案 | 目前的值 |
|---|---|
| `components/layout/preloader.tsx` 的 `THEME` | 深色簾幕 `#0f0d0c` / 字 `#fcfaf7`；淺色簾幕 `#fcfaf7` / 字 `#2a2724` |
| `app/[locale]/opengraph-image.tsx` | 分享卡片的底、字、分隔線 |
| `scripts/generate-brand-logos.mjs` 的 `INK` / `LIGHT` | 產生標誌檔用 |

改完搜尋一次 `#` 開頭的六碼色碼確認沒有漏（`components/explore/product-model.tsx`
的燈光顏色與 `colour-swatch.tsx` 的對比色不是品牌色，不用動）。

---

## 五、換字體（可選）

在 `app/[locale]/layout.tsx`，兩個 `next/font` 呼叫：拉丁用 Inter，中文用
Noto Sans TC。換掉的話要一併確認：

- 中文字體要選**繁體**那一版。簡繁把共用字畫得不一樣（`角` 就是一例），選錯會把
  品牌名畫錯。
- `sections/home/hero.tsx` 跑馬燈裡那幾個數字（`scale-y-[1.354]`、
  `-translate-y-[0.0135em]`、`mx-[0.39em]`）是**針對「這個品牌名」配「這兩套字」
  量出來的**——換字體要重量，換名字也要重量，換字體後要重量一次，量法寫在該檔案的註解裡。
- 字重清單要對得上實際用到的字重。中文字體每個字重都是一整組檔案，多載一個字重
  就是網站最大宗下載量再多四分之一。

字體與標誌的完整規格見 `docs/brand-typography.md`。

---

## 六、換產品

| 換什麼 | 在哪 | 大小參考 |
|---|---|---|
| 產品、材質、案例、日誌資料 | `lib/data/*.json` | 96KB |
| 產品照片 | `public/images/` | 15MB |
| 3D 模型（探索頁） | `public/models/` | 1.4MB |

資料也可以進 `/admin` 後台改，不必動程式碼，見 `docs/cms.md`。

分類（`sofa`、`chair` 這些）若有增減，`messages/*.json` 的 `categories` 要一起
改；分類頁 `/collections/[category]` 是照著資料自動產生的，不用另外加檔案。

---

## 七、重做標誌與 icon

`public/brand/` 裡的八個 SVG 與八個 PNG 是從網站自己的字**切**出來的，換名字或
換字體後要重跑：

分頁圖示（`app/icon.png`、`apple-icon.png`、`favicon.ico`）同樣有腳本。兩支都要
一個跑起來的網站才能讀到真正的字：

```bash
npm i --no-save playwright fontkit wawoff2 && npx playwright install chromium
npm run build && npx next start -p 3100 &
node scripts/generate-brand-logos.mjs    # public/brand 的八個標誌
node scripts/generate-brand-icons.mjs    # app/ 的三個分頁圖示
```

兩支都讀 `lib/brand.ts`，所以名字改好就不用再動腳本；標誌檔名會跟著
`brand.slug`，圖示取中文名的第一個字。舊的標誌檔要自己刪掉——檔名換了，舊檔不會
被覆蓋。

裝不了瀏覽器的機器（例如受限的容器）可以用 `CHROMIUM_PATH` 指向現成的 Chromium。

---

## 八、上線前檢查

- [ ] `npx tsc --noEmit` 與 `npx eslint` 都過
- [ ] `npm run build` 過
- [ ] 全站搜尋不到舊品牌：`grep -rn "漫家居\|MAAN\|maan" --include="*.ts*" --include="*.json" --include="*.yml" .`（換成舊品牌的名字來搜）
- [ ] 中英文首頁的載入動畫都看得到新名字
- [ ] 分享一個連結到通訊軟體，卡片是新品牌
- [ ] `/admin` 登入得進去，存檔 commit 進**新** repo
- [ ] 送一封詢問單，進到**新**的試算表
- [ ] `https://新網域/sitemap.xml` 與 `/robots.txt` 指向新網域
