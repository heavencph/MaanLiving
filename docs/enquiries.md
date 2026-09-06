# 詢問單與電子報：接到 Google 試算表

聯絡表單（`/contact`）與電子報訂閱（首頁下方）都會 POST 到 `app/api/contact/route.ts`，由它轉發給一個 Google Apps Script 網頁應用程式，寫進試算表。

```
瀏覽器表單  →  /api/contact （Vercel）  →  Apps Script  →  Google 試算表
```

選 Apps Script 而不是 Google Sheets API 的原因：不需要服務帳戶、不需要金鑰檔、不必安裝額外套件，整個設定都能在瀏覽器裡完成。

## 一、建立試算表與腳本

1. 開一份新的 Google 試算表，命名為「萬角 詢問單」。分頁會由腳本自動建立，不必手動加。
2. 選單 **擴充功能 → Apps Script**，把預設內容全部刪掉，貼上下面的程式碼。
3. 把 `SECRET` 換成一段你自己的隨機字串（越長越好），**稍後 Vercel 那邊要填一模一樣的值**。

```javascript
const SECRET = '換成你自己的隨機字串';

function doPost(e) {
  const data = JSON.parse(e.postData.contents);

  // 丟出例外而不是回傳錯誤 JSON —— Apps Script 對成功執行一律回 200，
  // 只有拋出例外才會讓 /api/contact 那端看到失敗
  if (data.secret !== SECRET) {
    throw new Error('forbidden');
  }

  const tabName = data.type === 'newsletter' ? '電子報訂閱' : '詢問單';
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sheet = ss.getSheetByName(tabName);

  if (!sheet) {
    sheet = ss.insertSheet(tabName);
  }
  if (sheet.getLastRow() === 0) {
    sheet.appendRow(['送出時間', '語系', '姓名', '電話', 'Email', '諮詢項目', '訊息']);
    sheet.setFrozenRows(1);
  }

  sheet.appendRow([
    data.submittedAt || new Date().toISOString(),
    data.locale || '',
    data.name || '',
    data.phone || '',
    data.email || '',
    data.topic || '',
    data.message || '',
  ]);

  return ContentService
    .createTextOutput(JSON.stringify({ ok: true }))
    .setMimeType(ContentService.MimeType.JSON);
}
```

## 二、部署腳本

點右上角 **部署 → 新增部署作業**，選擇「網頁應用程式」，然後：

| 欄位 | 必須設定為 |
| --- | --- |
| 執行身分 | **我**（你自己的帳號） |
| 具有存取權的使用者 | **任何人** |

> **「具有存取權的使用者」一定要選「任何人」。** 若選成「任何擁有 Google 帳戶的使用者」，Apps Script 會對 Vercel 的請求回傳一個 Google 登入頁面，而且 HTTP 狀態碼仍是 200。`route.ts` 會檢查回應內容、把這種情況判為失敗（訪客會看到錯誤訊息而不是假的成功畫面），但表單依然無法運作。

部署完成後複製那串「網頁應用程式網址」，格式類似 `https://script.google.com/macros/s/AKfy.../exec`。

## 三、在 Vercel 設定環境變數

Vercel 專案 → **Settings → Environment Variables**，新增兩筆，三個環境（Production / Preview / Development）都要勾：

| 變數名稱 | 值 |
| --- | --- |
| `GOOGLE_SHEETS_WEBHOOK_URL` | 上一步複製的網頁應用程式網址 |
| `GOOGLE_SHEETS_WEBHOOK_SECRET` | 與腳本裡 `SECRET` 完全相同的字串 |

環境變數只在建置時注入，**存檔後要重新部署一次才會生效**。

## 四、本機開發

在專案根目錄建立 `.env.local`（已被 `.gitignore` 排除，不會進版控）：

```bash
GOOGLE_SHEETS_WEBHOOK_URL=https://script.google.com/macros/s/AKfy.../exec
GOOGLE_SHEETS_WEBHOOK_SECRET=與腳本裡相同的字串
```

## 修改欄位時

表單欄位若有增減，三個地方要一起改，否則資料會對不上：

1. `app/api/contact/route.ts` —— `LIMITS` 與 `submission` 物件
2. `sections/contact/contact-form.tsx` —— 欄位的 `name` 屬性與送出的 payload
3. Apps Script —— 標題列與 `appendRow` 的順序

## 行為說明

- **兩個環境變數若未設定**，API 回傳 503 並在伺服器記錄錯誤。訪客會看到錯誤訊息，**不會**看到假的成功畫面。
- **試算表寫入失敗時**，API 回傳 502，並把整筆內容寫進 Vercel 的 Runtime Logs——詢問單仍可從記錄中救回。
- **蜜罐欄位**：表單裡有一個對人類隱藏的 `company` 欄位。機器人填了它就會得到成功回應，但資料不會寫進試算表。
- **驗證**：Email 格式必檢查；聯絡表單另外要求姓名與訊息。過長的內容會被截斷（訊息上限 5000 字）。
