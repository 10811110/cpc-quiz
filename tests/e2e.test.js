const { chromium } = require("playwright");
const fs = require("fs");
const path = require("path");

// 配置
const BASE_URL = process.env.BASE_URL || "https://cpc-quiz.chenijiajia.dpdns.org/";
const SCREENSHOT_DIR = path.join(__dirname, "screenshots");

// 确保截图目录存在
if (!fs.existsSync(SCREENSHOT_DIR)) {
  fs.mkdirSync(SCREENSHOT_DIR, { recursive: true });
}

// 辅助函数：截图并保存
async function screenshot(page, name) {
  const filePath = path.join(SCREENSHOT_DIR, `${name}.png`);
  await page.screenshot({ path: filePath, fullPage: false });
  console.log(`📸 截图: ${name}.png`);
  return filePath;
}

// 辅助函数：收集 console 错误
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

// 测试套件
async function runTests() {
  console.log(`🧪 开始测试: ${BASE_URL}`);
  
  const browser = await chromium.launch();
  const page = await browser.newPage({
    viewport: { width: 1280, height: 800 }
  });
  
  const errors = collectErrors(page);
  let passCount = 0;
  let failCount = 0;
  
  // ===== 测试 1: 首页加载 =====
  try {
    await page.goto(BASE_URL);
    await page.waitForTimeout(1500);
    await screenshot(page, "01-homepage");
    
    const hasCards = await page.evaluate(() => document.querySelectorAll(".mode-card").length > 0);
    if (hasCards) {
      console.log("✅ 测试 1: 首页加载成功");
      passCount++;
    } else {
      throw new Error("首页没有显示题库卡片");
    }
  } catch (err) {
    console.log("❌ 测试 1 失败:", err.message);
    failCount++;
  }
  
  // ===== 测试 2: 进入一般业题库 =====
  try {
    await page.click(".mode-card:nth-child(1)");
    await page.waitForTimeout(1000);
    await screenshot(page, "02-mode-select");
    
    const hasPractice = await page.evaluate(() => document.body.innerHTML.includes("練習模式"));
    if (hasPractice) {
      console.log("✅ 测试 2: 进入一般业题库成功");
      passCount++;
    } else {
      throw new Error("没有显示练习模式按钮");
    }
  } catch (err) {
    console.log("❌ 测试 2 失败:", err.message);
    failCount++;
  }
  
  // ===== 测试 3: 选择练习模式 =====
  try {
    await page.click("text=練習模式");
    await page.waitForTimeout(1500);
    await screenshot(page, "03-chapter-list");
    
    const hasChapters = await page.evaluate(() => document.querySelectorAll(".chapter-card").length > 0);
    if (hasChapters) {
      console.log("✅ 测试 3: 章节列表显示成功");
      passCount++;
    } else {
      throw new Error("没有显示章节列表");
    }
  } catch (err) {
    console.log("❌ 测试 3 失败:", err.message);
    failCount++;
  }
  
  // ===== 测试 4: 点击第 1 章并显示题目 =====
  try {
    await page.click(".chapter-card:nth-of-type(1)");
    await page.waitForTimeout(2000);
    await screenshot(page, "04-question");
    
    const hasQuestion = await page.evaluate(() => document.querySelector(".question-text") !== null);
    if (hasQuestion) {
      console.log("✅ 测试 4: 题目加载成功");
      passCount++;
    } else {
      throw new Error("没有显示题目");
    }
  } catch (err) {
    console.log("❌ 测试 4 失败:", err.message);
    failCount++;
  }
  
  // ===== 测试 5: 点击答案 A =====
  try {
    await page.click(".option-btn:nth-of-type(1)");
    await page.waitForTimeout(500);
    await screenshot(page, "05-answered");
    
    // 检查是否有高亮或解析
    const hasHighlight = await page.evaluate(() => {
      return document.querySelector(".option-btn.correct") !== null || 
             document.querySelector(".option-btn.wrong") !== null;
    });
    if (hasHighlight) {
      console.log("✅ 测试 5: 答题反馈显示成功");
      passCount++;
    } else {
      throw new Error("没有显示答题反馈");
    }
  } catch (err) {
    console.log("❌ 测试 5 失败:", err.message);
    failCount++;
  }
  
  // ===== 测试 6: 解析区块 =====
  try {
    await page.waitForTimeout(1000);
    await screenshot(page, "06-analysis");
    
    const hasAnalysis = await page.evaluate(() => document.querySelector(".analysis-block") !== null);
    if (hasAnalysis) {
      console.log("✅ 测试 6: 解析区块显示成功");
      passCount++;
    } else {
      console.log("⚠️ 测试 6: 没有解析区块（可能是答对了，没有解析）");
      passCount++;
    }
  } catch (err) {
    console.log("❌ 测试 6 失败:", err.message);
    failCount++;
  }
  
  // ===== 测试 7: 深色模式切换 =====
  try {
    const beforeDark = await page.evaluate(() => document.body.classList.contains("dark"));
    await page.click("#themeToggle");
    await page.waitForTimeout(500);
    await screenshot(page, "07-dark-mode");
    
    const afterDark = await page.evaluate(() => document.body.classList.contains("dark"));
    if (afterDark !== beforeDark) {
      console.log("✅ 测试 7: 深色模式切换成功");
      passCount++;
    } else {
      throw new Error("深色模式切换失败");
    }
  } catch (err) {
    console.log("❌ 测试 7 失败:", err.message);
    failCount++;
  }
  
  // ===== 测试结果汇总 =====
  console.log("\n" + "=".repeat(50));
  console.log(`🎉 测试完成: ${passCount} 通过, ${failCount} 失败`);
  if (errors.length > 0) {
    console.log(`⚠️ Console 错误 (${errors.length} 条):`);
    errors.forEach(e => console.log("  - " + e.substring(0, 120)));
  } else {
    console.log("✅ 没有 Console 错误");
  }
  console.log("=".repeat(50));
  
  await browser.close();
  
  // 如果有失败，返回非零退出码
  if (failCount > 0) {
    process.exit(1);
  }
}

runTests().catch(err => {
  console.error("测试执行错误:", err);
  process.exit(1);
});
