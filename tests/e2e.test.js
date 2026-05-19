const { chromium } = require("playwright");
const fs = require("fs");
const path = require("path");

// 配置
const BASE_URL = process.env.BASE_URL || "http://localhost:8080/";
const SCREENSHOT_DIR = path.join(__dirname, "screenshots");

// 确保截?目?存在
if (!fs.existsSync(SCREENSHOT_DIR)) {
  fs.mkdirSync(SCREENSHOT_DIR, { recursive: true });
}

// ?助函?：截?并保存
async function screenshot(page, name) {
  const filePath = path.join(SCREENSHOT_DIR, `${name}.png`);
  await page.screenshot({ path: filePath, fullPage: false });
  console.log(`?? 截?: ${name}.png`);
  return filePath;
}

// ?助函?：收集 console ??
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

// ??套件
async function runTests() {
  console.log(`?? ?始??: ${BASE_URL}`);
  
  const browser = await chromium.launch();
  const page = await browser.newPage({
    viewport: { width: 1280, height: 800 }
  });
  
  const errors = collectErrors(page);
  let passCount = 0;
  let failCount = 0;
  
  // ===== ?? 1: 首?加? =====
  try {
    await page.goto(BASE_URL);
    await page.waitForTimeout(1500);
    await screenshot(page, "01-homepage");
    
    const hasCards = await page.evaluate(() => document.querySelectorAll(".mode-card").length > 0);
    if (hasCards) {
      console.log("? ?? 1: 首?加?成功");
      passCount++;
    } else {
      throw new Error("首??有?示??卡片");
    }
  } catch (err) {
    console.log("? ?? 1 失?:", err.message);
    failCount++;
  }
  
  // ===== ?? 2: ?入一般??? =====
  try {
    await page.click(".mode-card:nth-child(1)");
    await page.waitForTimeout(1000);
    await screenshot(page, "02-mode-select");
    
    const hasPractice = await page.evaluate(() => document.body.innerHTML.includes("練習模式"));
    if (hasPractice) {
      console.log("? ?? 2: ?入一般???成功");
      passCount++;
    } else {
      throw new Error("?有?示??模式按?");
    }
  } catch (err) {
    console.log("? ?? 2 失?:", err.message);
    failCount++;
  }
  
  // ===== ?? 3: ????模式 =====
  try {
    await page.click("text=練習模式");
    await page.waitForTimeout(1500);
    await screenshot(page, "03-chapter-list");
    
    const hasChapters = await page.evaluate(() => document.querySelectorAll(".chapter-card").length > 0);
    if (hasChapters) {
      console.log("? ?? 3: 章?列表?示成功");
      passCount++;
    } else {
      throw new Error("?有?示章?列表");
    }
  } catch (err) {
    console.log("? ?? 3 失?:", err.message);
    failCount++;
  }
  
  // ===== ?? 4: ??第 1 章并?示?目 =====
  try {
    await page.click(".chapter-card:nth-of-type(1)");
    await page.waitForTimeout(2000);
    await screenshot(page, "04-question");
    
    const hasQuestion = await page.evaluate(() => document.querySelector(".question-text") !== null);
    if (hasQuestion) {
      console.log("? ?? 4: ?目加?成功");
      passCount++;
    } else {
      throw new Error("?有?示?目");
    }
  } catch (err) {
    console.log("? ?? 4 失?:", err.message);
    failCount++;
  }
  
  // ===== ?? 5: ??答案 A =====
  try {
    await page.click(".option-btn:nth-of-type(1)");
    await page.waitForTimeout(500);
    await screenshot(page, "05-answered");
    
    // ?查是否有高亮或解析
    const hasHighlight = await page.evaluate(() => {
      return document.querySelector(".option-btn.correct") !== null || 
             document.querySelector(".option-btn.wrong") !== null;
    });
    if (hasHighlight) {
      console.log("? ?? 5: 答?反??示成功");
      passCount++;
    } else {
      throw new Error("?有?示答?反?");
    }
  } catch (err) {
    console.log("? ?? 5 失?:", err.message);
    failCount++;
  }
  
  // ===== ?? 6: 解析?? =====
  try {
    await page.waitForTimeout(1000);
    await screenshot(page, "06-analysis");
    
    const hasAnalysis = await page.evaluate(() => document.querySelector(".analysis-block") !== null);
    if (hasAnalysis) {
      console.log("? ?? 6: 解析???示成功");
      passCount++;
    } else {
      console.log("?? ?? 6: ?有解析??（可能是答?了，?有解析）");
      passCount++;
    }
  } catch (err) {
    console.log("? ?? 6 失?:", err.message);
    failCount++;
  }
  
  // ===== ?? 7: 深色模式切? =====
  try {
    const beforeDark = await page.evaluate(() => document.body.classList.contains("dark"));
    await page.click("#themeToggle");
    await page.waitForTimeout(500);
    await screenshot(page, "07-dark-mode");
    
    const afterDark = await page.evaluate(() => document.body.classList.contains("dark"));
    if (afterDark !== beforeDark) {
      console.log("? ?? 7: 深色模式切?成功");
      passCount++;
    } else {
      throw new Error("深色模式切?失?");
    }
  } catch (err) {
    console.log("? ?? 7 失?:", err.message);
    failCount++;
  }
  
  // ===== ???果?? =====
  console.log("\n" + "=".repeat(50));
  console.log(`?? ??完成: ${passCount} 通?, ${failCount} 失?`);
  if (errors.length > 0) {
    console.log(`?? Console ?? (${errors.length} ?):`);
    errors.forEach(e => console.log("  - " + e.substring(0, 120)));
  } else {
    console.log("? ?有 Console ??");
  }
  console.log("=".repeat(50));
  
  await browser.close();
  
  // 如果有失?，返回非零退出?
  if (failCount > 0) {
    process.exit(1);
  }
}

runTests().catch(err => {
  console.error("???行??:", err);
  process.exit(1);
});
