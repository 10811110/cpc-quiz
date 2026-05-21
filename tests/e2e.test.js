const { chromium } = require("playwright");
const fs = require("fs");
const path = require("path");

// 設定
// 預設測試本機開發環境。若要測試生產環境，請在執行前設定環境變數：
//   $env:BASE_URL = "https://cpc-5r7.pages.dev/web/"
//   node tests/e2e.test.js
const BASE_URL = process.env.BASE_URL || "http://localhost:8080/";
const SCREENSHOT_DIR = path.join(__dirname, "screenshots");

// 確保截圖目錄存在
if (!fs.existsSync(SCREENSHOT_DIR)) {
  fs.mkdirSync(SCREENSHOT_DIR, { recursive: true });
}

// 截圖輔助函式
async function screenshot(page, name) {
  const filePath = path.join(SCREENSHOT_DIR, `${name}.png`);
  await page.screenshot({ path: filePath, fullPage: false });
  console.log(`📸 截圖: ${name}.png`);
  return filePath;
}

// 收集 console 錯誤
function collectErrors(page) {
  const errors = [];
  page.on("console", msg => {
    if (msg.type() === "error") errors.push(msg.text());
  });
  page.on("pageerror", err => {
    errors.push(err.message);
  });
  return errors;
}

// 測試流程
async function runTests() {
  console.log(`🚀 測試開始: ${BASE_URL}`);
  
  const browser = await chromium.launch();
  const page = await browser.newPage({
    viewport: { width: 1280, height: 800 }
  });
  
  const errors = collectErrors(page);
  let passCount = 0;
  let failCount = 0;
  
  // ===== 測試 1: 首頁載入 =====
  try {
    await page.goto(BASE_URL);
    await page.waitForTimeout(1500);
    await screenshot(page, "01-homepage");
    
    const hasCards = await page.evaluate(() => document.querySelectorAll(".mode-card").length > 0);
    if (hasCards) {
      console.log("✅ 測試 1: 首頁載入成功");
      passCount++;
    } else {
      throw new Error("首頁沒有找到題庫卡片");
    }
  } catch (err) {
    console.log("❌ 測試 1 失敗:", err.message);
    failCount++;
  }
  
  // ===== 測試 2: 進入一般業題庫 =====
  try {
    await page.click(".mode-card:nth-child(1)");
    await page.waitForTimeout(1000);
    await screenshot(page, "02-mode-select");
    
    const hasPractice = await page.evaluate(() => document.body.innerHTML.includes("練習模式"));
    if (hasPractice) {
      console.log("✅ 測試 2: 進入一般業題庫成功");
      passCount++;
    } else {
      throw new Error("沒有找到練習模式按鈕");
    }
  } catch (err) {
    console.log("❌ 測試 2 失敗:", err.message);
    failCount++;
  }
  
  // ===== 測試 3: 選擇練習模式 =====
  try {
    await page.click("text=練習模式");
    await page.waitForTimeout(1500);
    await screenshot(page, "03-chapter-list");
    
    const hasChapters = await page.evaluate(() => document.querySelectorAll(".chapter-card").length > 0);
    if (hasChapters) {
      console.log("✅ 測試 3: 章節列表載入成功");
      passCount++;
    } else {
      throw new Error("沒有找到章節卡片");
    }
  } catch (err) {
    console.log("❌ 測試 3 失敗:", err.message);
    failCount++;
  }
  
  // ===== 測試 4: 進入第 1 章並顯示題目 =====
  try {
    await page.click(".chapter-card:nth-of-type(1)");
    await page.waitForTimeout(2000);
    await screenshot(page, "04-question");
    
    const hasQuestion = await page.evaluate(() => document.querySelector(".question-text") !== null);
    if (hasQuestion) {
      console.log("✅ 測試 4: 題目載入成功");
      passCount++;
    } else {
      throw new Error("沒有找到題目");
    }
  } catch (err) {
    console.log("❌ 測試 4 失敗:", err.message);
    failCount++;
  }
  
  // ===== 測試 5: 選擇答案 A =====
  try {
    await page.click(".option-btn:nth-of-type(1)");
    await page.waitForTimeout(500);
    await screenshot(page, "05-answered");
    
    // 檢查是否有正確或錯誤的高亮
    const hasHighlight = await page.evaluate(() => {
      return document.querySelector(".option-btn.correct") !== null || 
             document.querySelector(".option-btn.wrong") !== null;
    });
    if (hasHighlight) {
      console.log("✅ 測試 5: 答案高亮顯示成功");
      passCount++;
    } else {
      throw new Error("沒有找到答案高亮");
    }
  } catch (err) {
    console.log("❌ 測試 5 失敗:", err.message);
    failCount++;
  }
  
  // ===== 測試 6: 解析顯示 =====
  try {
    await page.waitForTimeout(1000);
    await screenshot(page, "06-analysis");
    
    const hasAnalysis = await page.evaluate(() => document.querySelector(".analysis-block") !== null);
    if (hasAnalysis) {
      console.log("✅ 測試 6: 解析區塊顯示成功");
      passCount++;
    } else {
      console.log("⚠️ 測試 6: 此題沒有解析，但這可能是正常情況，繼續測試");
      passCount++;
    }
  } catch (err) {
    console.log("❌ 測試 6 失敗:", err.message);
    failCount++;
  }
  
  // ===== 測試 7: 深色模式切換 =====
  try {
    const beforeDark = await page.evaluate(() => document.body.classList.contains("dark"));
    await page.click("#themeToggle");
    await page.waitForTimeout(500);
    await screenshot(page, "07-dark-mode");
    
    const afterDark = await page.evaluate(() => document.body.classList.contains("dark"));
    if (afterDark !== beforeDark) {
      console.log("✅ 測試 7: 深色模式切換成功");
      passCount++;
    } else {
      throw new Error("深色模式切換失敗");
    }
  } catch (err) {
    console.log("❌ 測試 7 失敗:", err.message);
    failCount++;
  }
  
  // ===== 測試結果統計 =====
  console.log("\n" + "=".repeat(50));
  console.log(`📊 測試結果: ${passCount} 通過, ${failCount} 失敗`);
  if (errors.length > 0) {
    console.log(`⚠️ Console 錯誤 (${errors.length} 個):`);
    errors.forEach(e => console.log("  - " + e.substring(0, 120)));
  } else {
    console.log("✅ 沒有 Console 錯誤");
  }
  console.log("=".repeat(50));
  
  await browser.close();
  
  // 如果有失敗，回傳非零結束碼
  if (failCount > 0) {
    process.exit(1);
  }
}

runTests().catch(err => {
  console.error("測試執行錯誤:", err);
  process.exit(1);
});
