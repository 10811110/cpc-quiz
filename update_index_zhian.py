import json

# 讀取 index.html
with open('/home/ben900415/cpc-quiz/index.html', 'r', encoding='utf-8') as f:
    content = f.read()

# 1. 更新 SOURCE_NAMES - 技術士改為 5 章
old_source_names = 'var SOURCE_NAMES = {"luo":"一般業題庫 · 725 題","jia":"甲業題庫 · 1011 題","zhian":"技術士題庫 · 100 題"};'
new_source_names = 'var SOURCE_NAMES = {"luo":"一般業題庫 · 725 題","jia":"甲業題庫 · 1011 題","zhian":"技術士題庫 · 100 題 (5 章)"};'
content = content.replace(old_source_names, new_source_names)

# 2. 修改 selectMode 函式 - 技術士改為動態載入
old_zhian_select = '''  } else if (CURRENT_SOURCE === 'zhian') {
    // 技術士題庫：從內嵌數據載入
    var d3 = document.getElementById('quizData3');
    window.ZHIAN_DATA = JSON.parse(d3.textContent); // 使用獨立變數儲存技術士數據
    proceedMode();'''

new_zhian_select = '''  } else if (CURRENT_SOURCE === 'zhian') {
    // 技術士題庫：動態載入 chapters.json
    fetch('chapters.json')
      .then(r => r.json())
      .then(chapters => {
        var zhianChapters = chapters.filter(c => c.file.startsWith('chapter_zhian_'));
        var data = {};
        zhianChapters.forEach(c => {
          data[c.id] = { id: c.id, chapter: c.chapter, total_questions: c.total_questions, file: c.file, note: c.note };
        });
        window.ZHIAN_DATA = data;
        proceedMode();
      });
    return;'''

content = content.replace(old_zhian_select, new_zhian_select)

# 3. 修改 proceedMode 練習/小考模式 - 技術士改為動態載入章節
old_zhian_practice = '''  } else if (src === 'zhian') {
      // 技術士題庫：只有一章，直接從內嵌數據載入
      // 先移除舊的解析區塊
      var oldAnalysis = document.querySelector('.analysis-block');
      if (oldAnalysis) oldAnalysis.remove();
      
      var zhianData = window.ZHIAN_DATA['1'];
      var qs = zhianData.questions;
      qs.forEach(function(q) { q._ch = '1'; });
      STATE.questions = qs;'''

new_zhian_practice = '''  } else if (src === 'zhian') {
      // 技術士題庫：動態載入指定章節
      // 先移除舊的解析區塊
      var oldAnalysis = document.querySelector('.analysis-block');
      if (oldAnalysis) oldAnalysis.remove();
      
      var zhianData = window.ZHIAN_DATA[chId];
      fetch(zhianData.file)
        .then(r => r.json())
        .then(data => {
          var qs = data.questions;
          qs.forEach(function(q) { q._ch = chId; });
          STATE.questions = qs;'''

content = content.replace(old_zhian_practice, new_zhian_practice)

# 4. 修改 proceedMode 大考模式 - 技術士改為動態載入所有章節
old_zhian_exam = '''    // 技術士題庫：直接從內嵌數據讀取題目
    if (src === 'zhian') {
      // 先移除舊的解析區塊
      var oldAnalysis = document.querySelector('.analysis-block');
      if (oldAnalysis) oldAnalysis.remove();
      
      var zhianData = window.ZHIAN_DATA['1'];
      var qs = zhianData.questions;
      qs.forEach(function(q) { q._ch = '1'; });
      shuffleArray(qs);
      STATE.questions = qs.slice(0, 80);'''

new_zhian_exam = '''    // 技術士題庫：動態載入所有章節題目
    if (src === 'zhian') {
      // 先移除舊的解析區塊
      var oldAnalysis = document.querySelector('.analysis-block');
      if (oldAnalysis) oldAnalysis.remove();
      
      // 載入所有 5 章題目
      var promises = [];
      for (var id in window.ZHIAN_DATA) {
        var chapterData = window.ZHIAN_DATA[id];
        promises.push(
          fetch(chapterData.file)
            .then(r => r.json())
            .then(data => {
              var qs = data.questions;
              qs.forEach(function(q) { q._ch = id; });
              return qs;
            })
        );
      }
      Promise.all(promises).then(function(results) {
        var allQuestions = [];
        results.forEach(function(qs) { allQuestions = allQuestions.concat(qs); });
        shuffleArray(allQuestions);
        STATE.questions = allQuestions.slice(0, 80);'''

content = content.replace(old_zhian_exam, new_zhian_exam)

# 5. 刪除 quizData3 textarea (從第 810 行開始)
import re
textarea_pattern = r'\n<textarea id="quizData3" style="display:none">\{.*?\}</textarea>'
content = re.sub(textarea_pattern, '', content, flags=re.DOTALL)

# 寫回文件
with open('/home/ben900415/cpc-quiz/index.html', 'w', encoding='utf-8') as f:
    f.write(content)

print('✅ index.html 已更新完成')
print('   - SOURCE_NAMES 已更新')
print('   - selectMode 函式已更新 (技術士動態載入)')
print('   - proceedMode 練習/小考模式已更新')
print('   - proceedMode 大考模式已更新')
print('   - quizData3 textarea 已刪除')
