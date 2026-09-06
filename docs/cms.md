# 內容管理（Sveltia CMS）

網站內容可在 `/admin` 以網頁介面編輯，不需要動程式碼。存檔後 CMS 直接 commit 進這個 repo，Vercel 隨即自動重新部署。

```
/admin 編輯  →  commit 進 main  →  Vercel 自動部署  →  上線
```

內容仍然存在 `lib/data/*.json`，也就是說**每一次修改都留在 git 歷史裡**，可以隨時查看差異或還原。

## 可編輯的內容

| 項目 | 檔案 |
| --- | --- |
| 產品 | `lib/data/products.json` |
| 期刊 | `lib/data/journal.json` |
| 案例故事 | `lib/data/projects.json` |
| 材質介紹 | `lib/data/materials.json` |
| 首頁圖庫 | `lib/data/stock-gallery.json` |

欄位定義在 `public/admin/config.yml`。

---

# 首次設定

三個步驟，都在瀏覽器完成。**順序不能顛倒**——OAuth 的回呼網址必須是最終的網站網址。

## 步驟一：確定網站網址

目前的正式網址是 **`https://maanliving.com`**，`public/admin/config.yml` 的 `base_url` 已指向它。

**日後若換網域，舊網址即刻失效**，且以下三處必須一起更新：

- `public/admin/config.yml` 的 `base_url`
- GitHub OAuth App 的 Authorization callback URL
- Vercel 的 `GITHUB_OAUTH_ALLOWED_HOSTS`

## 步驟二：建立 GitHub OAuth App

前往 GitHub → Settings → Developer settings → **OAuth Apps** → New OAuth App：

| 欄位 | 填入 |
| --- | --- |
| Application name | `MAAN CMS` |
| Homepage URL | `https://maanliving.com` |
| Authorization callback URL | `https://maanliving.com/api/auth/callback` |

建立後按 **Generate a new client secret**，把 Client ID 與 Secret 記下來（Secret 只會顯示一次）。

> 這是 **OAuth App**，不是 GitHub App，兩者在設定頁是不同的選單。

## 步驟三：設定 Vercel 環境變數

Vercel → Settings → Environment Variables，新增三筆，三個環境都勾選：

| 變數 | 值 |
| --- | --- |
| `GITHUB_OAUTH_CLIENT_ID` | OAuth App 的 Client ID |
| `GITHUB_OAUTH_CLIENT_SECRET` | OAuth App 的 Client Secret |
| `GITHUB_OAUTH_ALLOWED_HOSTS` | 網址但不含 `https://`，目前為 `maanliving.com` |

`GITHUB_OAUTH_ALLOWED_HOSTS` 限制哪些網站可以透過這個端點登入。少了它，任何人都能把自己的 CMS 指向這裡來借用你的 OAuth App。多個網址以逗號分隔。

**存檔後必須重新部署一次**（Deployments → 最新一筆 → ⋯ → Redeploy），環境變數是建置時注入的。

---

# 日常使用

開啟 <https://maanliving.com/admin>，以 GitHub 帳號登入。

- 左側選單切換內容類型，點開項目即可編輯
- 每個文字欄位都有「中文」與「English」兩格，**兩邊都要填**，否則該語言的頁面會顯示空白
- 存檔即 commit 進 `main`，約一到兩分鐘後上線

## 需要留意的欄位

**「內部識別碼」（id）與「網址代稱」（slug）不要隨意更改。**

- `id` 被「相關產品」參照，改了會讓關聯失效
- `slug` 決定網址，改了舊連結會失效，也會影響既有的搜尋結果

**圖片**分兩種：

- 標示「主圖」「圖庫」等的欄位有圖片上傳介面，上傳的檔案會進 `public/images/uploads/`
- 部分欄位（設計師肖像、期刊與案例封面、材質圖、首頁圖庫）目前存的是外部圖片網址，所以是純文字欄位。日後換成自有攝影素材時，可把 `config.yml` 中這些欄位的 `widget: string` 改成 `widget: image`

## 權限

能編輯的人 = 對這個 repo 有寫入權限的 GitHub 帳號。要新增編輯者，就把對方加為 repo 的 collaborator。

---

# 疑難排解

**登入視窗顯示「OAuth is not configured」**
環境變數沒設定，或設定後沒有重新部署。

**登入後顯示「This site is not allowed to authenticate here」**
`GITHUB_OAUTH_ALLOWED_HOSTS` 與實際網址不符。注意不要包含 `https://`，也不要有結尾斜線。

**登入視窗一直轉，或關閉後沒有反應**
GitHub OAuth App 的 Authorization callback URL 與實際網址不符。必須完全一致，包含 `/api/auth/callback` 這段路徑。

**改了網域或專案名稱之後全部失效**
三個地方要一起更新：`config.yml` 的 `base_url`、OAuth App 的 callback URL、`GITHUB_OAUTH_ALLOWED_HOSTS`。

---

# 給開發者

## 為什麼資料檔是 `{ "products": [...] }` 而不是裸陣列

CMS 的 file collection 要求檔案根層是具名欄位的物件，無法描述根層陣列。`lib/data.ts` 會取出對應的鍵。

## 為什麼認證端點自己寫

Sveltia 官方的認證中繼（`sveltia-cms-auth`）是 Cloudflare Workers 腳本。`app/api/auth/` 是同一套流程在 Vercel 上的實作，因此不需要為了登入再開一個 Cloudflare 帳號。流程與訊息格式（`authorization:github:success:{...}`）與官方版本相同。

## 修改欄位定義時

`config.yml` 中缺少定義的欄位，會在編輯者存檔時**從 JSON 中消失**。新增資料欄位時，務必同步加進 `config.yml`。

只出現在部分項目的欄位（例如 `variants.fabrics`、`isNew`）必須標記 `required: false`，否則 CMS 會把空值寫進所有項目。
