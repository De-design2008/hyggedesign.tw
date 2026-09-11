# 悠+設計 HYGGE DESIGN 官方網站

原本放在 Weebly 的網站（www.hyggedesign.tw），因 Weebly 退出台灣市場而重新製作。
純靜態網站，放在 GitHub Pages 上，零主機費用。

## 資料夾結構

| 位置 | 內容 |
|---|---|
| `index.html` 等 | 網站頁面（由後台自動產生，**不要手動編輯**） |
| `works/` | 各裝修案例的頁面（自動產生） |
| `assets/` | 樣式、圖片、影片 |
| `admin/` | 本機管理後台（伺服器、編輯介面、內容資料） |
| `admin/data/*.json` | 網站的實際內容（文字、照片清單） |
| `weebly-backup/` | 原 Weebly 網站的完整備份（留著以防萬一） |
| `啟動網站後台.bat` | 雙擊開啟管理後台 |

## 日常使用（更新網站內容）

1. 雙擊「**啟動網站後台.bat**」，瀏覽器會自動開啟後台。
2. 在「案例作品」分頁新增案例、上傳完工照。
3. 按「**儲存並更新網站**」→ 按「**預覽網站**」確認。
4. 沒問題就按「**發布上線**」，幾分鐘後正式網站就會更新。

電腦需要安裝：[Node.js](https://nodejs.org/)（後台用）和 [Git](https://git-scm.com/)（發布用）。

## 第一次上線（搬到新電腦後）

1. 把整個資料夾複製到新電腦（隨身碟或壓縮檔皆可，`.git` 隱藏資料夾要一起帶）。
2. 在 GitHub 建一個新 repo（例如 `hyggedesign.tw`，Public）。
3. 在資料夾裡開終端機執行：

   ```
   git remote add origin https://github.com/<帳號>/<repo名稱>.git
   git push -u origin main
   ```

4. 到 repo 的 **Settings → Pages**，Source 選 `main` branch（root），儲存。
5. 等 Pages 部署完成後，到 **Settings → Pages → Custom domain** 填 `www.hyggedesign.tw`
   （repo 裡已備好 CNAME 檔，這步通常會自動帶入），並勾選 Enforce HTTPS。
6. 到網域的 DNS 設定（原本在哪買 hyggedesign.tw 就去哪改）：
   - `www` 加一筆 **CNAME** 記錄 → `<帳號>.github.io`
   - 根網域 `hyggedesign.tw` 加四筆 **A** 記錄 →
     `185.199.108.153`、`185.199.109.153`、`185.199.110.153`、`185.199.111.153`
7. DNS 生效後（最慢一天），網站就在 www.hyggedesign.tw 上線了。
   之後後台的「發布上線」按鈕就會自動把更新推上去。

## 給工程師／AI 的備註

- 內容改 `admin/data/*.json`，跑 `node admin/build.mjs` 重新產生頁面；別直接改產生出來的 HTML，會被下次重建洗掉。
- 前台樣式在 `assets/style.css`，後台介面在 `admin/ui.html`，頁面模板在 `admin/build.mjs`。
- 後台伺服器 `admin/server.mjs` 跑在 127.0.0.1:5567，只聽本機，無對外風險。
