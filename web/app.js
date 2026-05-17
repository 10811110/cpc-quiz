// Storage versioning
const STORAGE_VERSION = 2;

function loadStorage(key, defaultValue) {
  var raw = localStorage.getItem(key);
  if (!raw) return defaultValue;
  try {
    var wrapper = JSON.parse(raw);
    if (wrapper && wrapper.__v === STORAGE_VERSION) return wrapper.d;
    return wrapper;
  } catch (e) {
    return defaultValue;
  }
}

function saveStorage(key, value) {
  localStorage.setItem(key, JSON.stringify({__v: STORAGE_VERSION, d: value}));
}

function loadTheme() {
  var raw = localStorage.getItem('theme');
  if (!raw) return null;
  try {
    var wrapper = JSON.parse(raw);
    if (wrapper && wrapper.__v === STORAGE_VERSION) return wrapper.d;
    return raw;
  } catch (e) {
    return raw;
  }
}

function saveTheme(value) {
  localStorage.setItem('theme', JSON.stringify({__v: STORAGE_VERSION, d: value}));
}

var CHAPTERS = null;

var CURRENT_SOURCE = null;

var EXAM_HISTORY = loadStorage('examHistory', {});

var MISTAKE_BOOK = loadStorage('mistakeBook', {});

var SETTINGS = loadStorage('settings', {"autoNext":false,"autoBackup":false,"autoBackupInterval":30});

var PROGRESS = loadStorage('progress', {});

function saveMistakeBook() { saveStorage('mistakeBook', MISTAKE_BOOK); }

function saveExamHistory() { saveStorage('examHistory', EXAM_HISTORY); }

function saveSettings() { saveStorage('settings', SETTINGS); }

function saveProgress() {

  saveStorage('progress', PROGRESS);

  // 記錄修改時間，用於多裝置同步比對

  var now = new Date();

  var timeStr = now.toLocaleString('zh-TW');

  localStorage.setItem('progressModified', timeStr);

  console.log('💾 進度已保存 (' + timeStr + ')');

}

var SOURCE_NAMES = {"luo":"一般業題庫 · " + APP_CONFIG.TOTAL_QUESTIONS.luo + " 題","jia":"甲業題庫 · " + APP_CONFIG.TOTAL_QUESTIONS.jia + " 題","zhian":"技術士題庫 · " + APP_CONFIG.TOTAL_QUESTIONS.zhian + " 題 (5 章)","organic":"有機溶劑題庫 · " + APP_CONFIG.TOTAL_QUESTIONS.organic + " 題 (7 章)"};

var STATE = {screen:'home',mode:null,chId:null,questions:[],current:0,answers:[],done:false};

  CURRENT_SOURCE = null;

var NAMES = ["", "第一章 企業經營風險與安全衛生", "第二章 職業安全衛生相關法規", "第三章 職業安全衛生概論", "第四章 職業安全衛生管理系統", "第五章 風險評估", "第六章 承攬管理", "第七章 採購及變更管理", "第八章 緊急應變管理", "第九章 墜落危害預防管理實務", "第十章 機械安全管理實務", "第十一章 火災爆炸危害預防管理實務", "第十二章 感電危害預防管理實務", "第十三章 倒塌崩塌危害預防管理實務", "第十四章 化學性危害預防管理實務", "第十五章 物理性危害預防管理實務", "第十六章 職場健康管理實務", "第十七章 職業災害調查處理與統計"];



function escHtml(s) {

  if (!s) return '';

  return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');

}





function selectSource(src) {

  CURRENT_SOURCE = src;

  document.querySelector('.banner p').textContent = SOURCE_NAMES[src];

  // 重新載入正確的題庫數據

  if (src === 'luo') {

    // 一般業：使用外部 chapters.json

    loadChaptersData().then(function(data) {

      window.LUO_DATA = data;

      CHAPTERS = data;

      goScreen('mode-select');

    });

    return;

  } else if (src === 'jia') {

    fetch('../data/raw/jia_data.json')

      .then(r => r.json())

      .then(function(data) {

        window.JIA_DATA = data;
        for (var k in data) {
          if (data[k].questions) {
            normalizeQuestions(data[k].questions);
          }
        }

        CHAPTERS = data;

        goScreen('mode-select');

      })

      .catch(function(err) {

        console.error('載入甲業題庫失敗:', err);

        alert('載入甲業題庫失敗，請檢查網路連線');

      });

    return;

  } else if (src === 'zhian') {

    // 技術士題庫：動態載入章節索引

    fetch('../data/raw/chapter_zhian_index.json')

      .then(r => r.json())

      .then(function(data) {

        // 轉換為物件格式 {"1": {...}, "2": {...}}

        var obj = {};

        data.forEach(function(ch) { obj[String(ch.id)] = ch; });

        window.ZHIAN_DATA = obj;

        CHAPTERS = obj;

        goScreen('mode-select');

      })

      .catch(function(err) {

        console.error('載入技術士題庫失敗:', err);

        alert('載入技術士題庫失敗，請刷新頁面重試');

      });

    return;

  } else if (src === 'organic') {

    fetch('../data/raw/organic_data.json')

      .then(r => r.json())

      .then(function(data) {

        window.ORGANIC_DATA = data;
        for (var k in data) {
          if (data[k].questions) {
            normalizeQuestions(data[k].questions);
          }
        }

        CHAPTERS = data;

        goScreen('mode-select');

      })

      .catch(function(err) {

        console.error('載入有機題庫失敗:', err);

        alert('載入有機題庫失敗，請檢查網路連線');

      });

    return;

  } else {

    goScreen('mode-select');

  }

}



// 載入外部 JSON 數據

function loadChaptersData() {

  return fetch('../data/raw/chapters.json')

    .then(r => r.json())

    .then(list => {

      // 轉換為物件格式 {"1": {...}, "2": {...}}

      var obj = {};

      list.forEach(ch => { obj[String(ch.id)] = ch; });

      return obj;

    });

}



function normalizeAnswer(q) {
  var map = {"1":"A","2":"B","3":"C","4":"D"};
  if (q.answer === "1" || q.answer === "2" || q.answer === "3" || q.answer === "4") {
    q.answer = map[q.answer];
  }
  return q;
}

function normalizeQuestions(questions) {
  if (!questions) return [];
  questions.forEach(function(q) { normalizeAnswer(q); });
  return questions;
}

function loadChapterQuestions(filename) {
function loadChapterQuestions(filename) {
  return fetch(filename).then(r => r.json()).then(function(d) {
    return normalizeQuestions(d.questions || []);
  });
}



function init() {

  try {

    // 初始化題庫物件

    CHAPTERS = {};

    window.LUO_DATA = null;  // 保存一般業數據（用於學習進度顯示）

    window.JIA_DATA = null;  // 保存甲業數據

    window.ZHIAN_DATA = null;  // 保存技術士數據

    window.ORGANIC_DATA = null;  // 保存有機溶劑數據


    // 一般業題庫：載入外部 chapters.json

    loadChaptersData().then(function(data) {

      window.LUO_DATA = data;

      // 預設使用一般業數據

      if (!CURRENT_SOURCE) {

        CHAPTERS = data;

      }

    }).catch(function(err) {

      console.error('Failed to load chapters.json:', err);

    });

    

    // 載入主題設定

    var isDark = loadTheme() === 'dark';

    if (isDark) {

      document.body.classList.add('dark');

    }

    updateMistakeCount();

    renderHome();

  } catch(e) {

    document.getElementById('home').innerHTML='<p style="text-align:center;padding:40px;color:red">錯誤：'+e.message+'</p>';

  }

}



function toggleTheme() {

  document.body.classList.toggle('dark');

  var isDark = document.body.classList.contains('dark');

  saveTheme(isDark ? 'dark' : 'light');

  // 更新設定視窗中的開關狀態

  document.getElementById('themeToggle').checked = isDark;

  updateThemeToggleStyle(isDark);

}



function updateThemeToggleStyle(isOn) {

  document.getElementById('themeSwitch').style.background = isOn ? '#27ae60' : '#ccc';

  document.getElementById('themeDot').style.transform = isOn ? 'translateX(24px)' : 'translateX(0)';

}



function toggleSettings() {

  var modal = document.getElementById('settings-modal');

  var isOpen = modal.style.display === 'flex';

  modal.style.display = isOpen ? 'none' : 'flex';

  if (!isOpen) {

    // 開啟時更新開關狀態

    var isDark = document.body.classList.contains('dark');

    document.getElementById('themeToggle').checked = isDark;

    updateThemeToggleStyle(isDark);

    document.getElementById('autoNextToggle').checked = SETTINGS.autoNext;

    updateToggleStyle(SETTINGS.autoNext);

    document.getElementById('autoBackupToggle').checked = SETTINGS.autoBackup || false;

    updateAutoBackupToggleStyle(SETTINGS.autoBackup || false);

    

    // 更新間隔時間選擇器

    var intervalRow = document.getElementById('autoBackupIntervalRow');

    var intervalSelect = document.getElementById('autoBackupInterval');

    if (intervalRow && intervalSelect) {

      intervalRow.style.display = (SETTINGS.autoBackup || false) ? 'block' : 'none';

      intervalSelect.value = String(SETTINGS.autoBackupInterval || 30);

    }

  }

}



function updateToggleStyle(isOn) {

  document.getElementById('autoNextSwitch').style.background = isOn ? '#27ae60' : '#ccc';

  document.getElementById('autoNextDot').style.transform = isOn ? 'translateX(24px)' : 'translateX(0)';

}



function updateAutoBackupToggleStyle(isOn) {

  document.getElementById('autoBackupSwitch').style.background = isOn ? '#27ae60' : '#ccc';

  document.getElementById('autoBackupDot').style.transform = isOn ? 'translateX(24px)' : 'translateX(0)';

}



// 自動備份功能

var autoBackupInterval = null;



function toggleAutoBackup() {

  SETTINGS.autoBackup = !SETTINGS.autoBackup;

  saveSettings();

  updateAutoBackupToggleStyle(SETTINGS.autoBackup);

  

  // 顯示/隱藏間隔時間選擇器

  var intervalRow = document.getElementById('autoBackupIntervalRow');

  if (intervalRow) {

    intervalRow.style.display = SETTINGS.autoBackup ? 'block' : 'none';

  }

  

  if (SETTINGS.autoBackup) {

    startAutoBackup();

  } else {

    stopAutoBackup();

    alert('☁️ 自動備份已關閉');

  }

}



function startAutoBackup() {

  // 停止現有定時器

  stopAutoBackup();

  

  var intervalMinutes = SETTINGS.autoBackupInterval || 30;

  var intervalMs = intervalMinutes * 60 * 1000;

  

  // 啟動新定時器

  autoBackupInterval = setInterval(function() {

    if (googleToken) {

      console.log('🔄 自動備份中...（每 ' + intervalMinutes + ' 分鐘）');

      backupToDrive(true); // true = 自動備份，失敗時不彈出 alert

    }

  }, intervalMs);

  

  // 立即執行一次備份（如果已登入）

  if (googleToken) {

    backupToDrive(true);

  }

  

  var timeText = intervalMinutes >= 60 

    ? '每 ' + (intervalMinutes / 60) + ' 小時' 

    : '每 ' + intervalMinutes + ' 分鐘';

  

  alert('☁️ 自動備份已開啟！\n' + timeText + '自動備份進度到 Google Drive');

}



function stopAutoBackup() {

  if (autoBackupInterval) {

    clearInterval(autoBackupInterval);

    autoBackupInterval = null;

  }

}



function changeBackupInterval() {

  var select = document.getElementById('autoBackupInterval');

  SETTINGS.autoBackupInterval = parseInt(select.value, 10);

  saveSettings();

  

  // 如果自動備份已開啟，重新啟動定時器

  if (SETTINGS.autoBackup) {

    startAutoBackup();

  }

  

  var minutes = SETTINGS.autoBackupInterval;

  var timeText = minutes >= 60 

    ? '每 ' + (minutes / 60) + ' 小時' 

    : '每 ' + minutes + ' 分鐘';

  

  console.log('⏱️ 備份間隔已變更：' + timeText);

}



// 進度追蹤功能

function updateProgress(src, chId, totalQuestions, answeredCount) {

  if (!PROGRESS[src]) PROGRESS[src] = {};

  if (!PROGRESS[src][chId]) PROGRESS[src][chId] = { answered: 0, total: totalQuestions };

  PROGRESS[src][chId].answered = Math.max(PROGRESS[src][chId].answered, answeredCount);

  PROGRESS[src][chId].total = totalQuestions;

  saveProgress();

}



function showProgress() {

  // 關閉設定視窗

  document.getElementById('settings-modal').style.display = 'none';

  

  // 重新讀取 localStorage 中的登入狀態（確保最新）

  googleToken = localStorage.getItem('googleToken');

  googleUser = JSON.parse(localStorage.getItem('googleUser') || 'null');

  

  // 初始化 Google UI

  updateGoogleUI();

  

  var html = '';

  var totalAnswered = 0;

  var totalQuestions = 0;

  

  // 一般業進度

  if (window.LUO_DATA) {

    var luoTotalAnswered = 0;

    var luoTotalQuestions = 0;

    html += '<div style="margin-bottom:24px">';

    html += '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:12px">';

    html += '<h4 style="margin:0;color:#2c3e50">📘 一般業題庫</h4>';

    html += '<button id="luo-toggle-btn" onclick="toggleProgressSection(\'luo\')" style="padding:6px 12px;background:#3498db;color:white;border:none;border-radius:6px;font-size:0.8rem;font-weight:600;cursor:pointer">展開</button>';

    html += '</div>';

    html += '<div id="luo-details" style="display:none">';

    var keys = Object.keys(window.LUO_DATA).sort(function(a,b){return parseInt(a)-parseInt(b);});

    keys.forEach(function(k) {

      var ch = window.LUO_DATA[k];

      var prog = PROGRESS['luo'] && PROGRESS['luo'][k] ? PROGRESS['luo'][k] : { answered: 0, total: ch.total_questions };

      var percent = prog.total > 0 ? Math.round(prog.answered / prog.total * 100) : 0;

      luoTotalAnswered += prog.answered;

      luoTotalQuestions += prog.total;

      html += '<div style="margin-bottom:12px">';

      html += '<div style="display:flex;justify-content:space-between;margin-bottom:4px;font-size:0.9rem">';

      html += '<span>'+escHtml(ch.chapter)+'</span>';

      html += '<span>'+prog.answered+'/'+prog.total+' ('+percent+'%)</span>';

      html += '</div>';

      html += '<div style="background:#ecf0f1;border-radius:10px;height:10px;overflow:hidden">';

      html += '<div style="background:linear-gradient(90deg,#3498db,#2ecc71);width:'+percent+'%;height:100%;transition:width 0.3s"></div>';

      html += '</div>';

      html += '</div>';

    });

    html += '</div>';

    var luoOverallPercent = luoTotalQuestions > 0 ? Math.round(luoTotalAnswered / luoTotalQuestions * 100) : 0;

    html += '<div style="background:#f8f9fa;padding:12px;border-radius:10px;margin-top:12px">';

    html += '<div style="display:flex;justify-content:space-between;font-weight:600;color:#2c3e50">';

    html += '<span>📘 總進度</span>';

    html += '<span>'+luoTotalAnswered+'/'+luoTotalQuestions+' ('+luoOverallPercent+'%)</span>';

    html += '</div>';

    html += '<div style="background:#ecf0f1;border-radius:10px;height:12px;overflow:hidden;margin-top:8px">';

    html += '<div style="background:linear-gradient(90deg,#3498db,#2ecc71);width:'+luoOverallPercent+'%;height:100%;transition:width 0.3s"></div>';

    html += '</div>';

    html += '</div>';

    html += '</div>';

  }

  

  // 甲業進度

  var jiaTotalAnswered = 0;

  var jiaTotalQuestions = 0;

  html += '<div style="margin-bottom:24px">';

  html += '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:12px">';

  html += '<h4 style="margin:0;color:#2c3e50">📗 甲業題庫</h4>';

  html += '<button id="jia-toggle-btn" onclick="toggleProgressSection(\'jia\')" style="padding:6px 12px;background:#f39c12;color:white;border:none;border-radius:6px;font-size:0.8rem;font-weight:600;cursor:pointer">展開</button>';

  html += '</div>';

  html += '<div id="jia-details" style="display:none">';

  if (window.JIA_DATA) {

    var jiaKeys = Object.keys(window.JIA_DATA).sort(function(a,b){return parseInt(a)-parseInt(b);});

    jiaKeys.forEach(function(k) {

      var ch = window.JIA_DATA[k];

      var prog = PROGRESS['jia'] && PROGRESS['jia'][k] ? PROGRESS['jia'][k] : { answered: 0, total: ch.total_questions || 0 };

      var percent = prog.total > 0 ? Math.round(prog.answered / prog.total * 100) : 0;

      jiaTotalAnswered += prog.answered;

      jiaTotalQuestions += prog.total;

      html += '<div style="margin-bottom:12px">';

      html += '<div style="display:flex;justify-content:space-between;margin-bottom:4px;font-size:0.9rem">';

      html += '<span>'+escHtml(ch.chapter)+'</span>';

      html += '<span>'+prog.answered+'/'+prog.total+' ('+percent+'%)</span>';

      html += '</div>';

      html += '<div style="background:#ecf0f1;border-radius:10px;height:10px;overflow:hidden">';

      html += '<div style="background:linear-gradient(90deg,#f39c12,#e74c3c);width:'+percent+'%;height:100%;transition:width 0.3s"></div>';

      html += '</div>';

      html += '</div>';

    });

  }

  html += '</div>';

  var jiaOverallPercent = jiaTotalQuestions > 0 ? Math.round(jiaTotalAnswered / jiaTotalQuestions * 100) : 0;

  html += '<div style="background:#f8f9fa;padding:12px;border-radius:10px;margin-top:12px">';

  html += '<div style="display:flex;justify-content:space-between;font-weight:600;color:#2c3e50">';

  html += '<span>📗 總進度</span>';

  html += '<span>'+jiaTotalAnswered+'/'+jiaTotalQuestions+' ('+jiaOverallPercent+'%)</span>';

  html += '</div>';

  html += '<div style="background:#ecf0f1;border-radius:10px;height:12px;overflow:hidden;margin-top:8px">';

  html += '<div style="background:linear-gradient(90deg,#f39c12,#e74c3c);width:'+jiaOverallPercent+'%;height:100%;transition:width 0.3s"></div>';

  html += '</div>';

  html += '</div>';

  html += '</div>';

  

  // 技術士進度

  var zhianTotalAnswered = 0;

  var zhianTotalQuestions = 0;

  html += '<div style="margin-bottom:24px">';

  html += '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:12px">';

  html += '<h4 style="margin:0;color:#2c3e50">📙 技術士題庫</h4>';

  html += '<button id="zhian-toggle-btn" onclick="toggleProgressSection(\'zhian\')" style="padding:6px 12px;background:#9b59b6;color:white;border:none;border-radius:6px;font-size:0.8rem;font-weight:600;cursor:pointer">展開</button>';

  html += '</div>';

  html += '<div id="zhian-details" style="display:none">';

  if (window.ZHIAN_DATA) {

    var zhianKeys = Object.keys(window.ZHIAN_DATA).sort(function(a,b){return parseInt(a)-parseInt(b);});

    zhianKeys.forEach(function(k) {

      var ch = window.ZHIAN_DATA[k];

      var prog = PROGRESS['zhian'] && PROGRESS['zhian'][k] ? PROGRESS['zhian'][k] : { answered: 0, total: ch.total_questions || 0 };

      var percent = prog.total > 0 ? Math.round(prog.answered / prog.total * 100) : 0;

      zhianTotalAnswered += prog.answered;

      zhianTotalQuestions += prog.total;

      html += '<div style="margin-bottom:12px">';

      html += '<div style="display:flex;justify-content:space-between;margin-bottom:4px;font-size:0.9rem">';

      html += '<span>'+escHtml(ch.chapter)+'</span>';

      html += '<span>'+prog.answered+'/'+prog.total+' ('+percent+'%)</span>';

      html += '</div>';

      html += '<div style="background:#ecf0f1;border-radius:10px;height:10px;overflow:hidden">';

      html += '<div style="background:linear-gradient(90deg,#9b59b6,#8e44ad);width:'+percent+'%;height:100%;transition:width 0.3s"></div>';

      html += '</div>';

      html += '</div>';

    });

  }

  html += '</div>';

  var zhianOverallPercent = zhianTotalQuestions > 0 ? Math.round(zhianTotalAnswered / zhianTotalQuestions * 100) : 0;

  html += '<div style="background:#f8f9fa;padding:12px;border-radius:10px;margin-top:12px">';

  html += '<div style="display:flex;justify-content:space-between;font-weight:600;color:#2c3e50">';

  html += '<span>📙 總進度</span>';

  html += '<span>'+zhianTotalAnswered+'/'+zhianTotalQuestions+' ('+zhianOverallPercent+'%)</span>';

  html += '</div>';

  html += '<div style="background:#ecf0f1;border-radius:10px;height:12px;overflow:hidden;margin-top:8px">';

  html += '<div style="background:linear-gradient(90deg,#9b59b6,#8e44ad);width:'+zhianOverallPercent+'%;height:100%;transition:width 0.3s"></div>';

  html += '</div>';

  html += '</div>';

  html += '</div>';

  



  // 有機溶劑進度

  var organicTotalAnswered = 0;

  var organicTotalQuestions = 0;

  html += '<div style="margin-bottom:24px">';

  html += '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:12px">';

  html += '<h4 style="margin:0;color:#2c3e50">🧪 有機溶劑題庫</h4>';

  html += '<button id="organic-toggle-btn" onclick="toggleProgressSection(\'organic\')" style="padding:6px 12px;background:#1abc9c;color:white;border:none;border-radius:6px;font-size:0.8rem;font-weight:600;cursor:pointer">展開</button>';

  html += '</div>';

  html += '<div id="organic-details" style="display:none">';

  if (window.ORGANIC_DATA) {

    var organicKeys = Object.keys(window.ORGANIC_DATA).sort(function(a,b){return parseInt(a)-parseInt(b);});

    organicKeys.forEach(function(k) {

      var ch = window.ORGANIC_DATA[k];

      var prog = PROGRESS['organic'] && PROGRESS['organic'][k] ? PROGRESS['organic'][k] : { answered: 0, total: ch.total_questions || 0 };

      var percent = prog.total > 0 ? Math.round(prog.answered / prog.total * 100) : 0;

      organicTotalAnswered += prog.answered;

      organicTotalQuestions += prog.total;

      html += '<div style="margin-bottom:12px">';

      html += '<div style="display:flex;justify-content:space-between;margin-bottom:4px;font-size:0.9rem">';

      html += '<span>'+escHtml(ch.chapter)+'</span>';

      html += '<span>'+prog.answered+'/'+prog.total+' ('+percent+'%)</span>';

      html += '</div>';

      html += '<div style="background:#ecf0f1;border-radius:10px;height:10px;overflow:hidden">';

      html += '<div style="background:linear-gradient(90deg,#1abc9c,#16a085);width:'+percent+'%;height:100%;transition:width 0.3s"></div>';

      html += '</div>';

      html += '</div>';

    });

  }

  html += '</div>';

  var organicOverallPercent = organicTotalQuestions > 0 ? Math.round(organicTotalAnswered / organicTotalQuestions * 100) : 0;

  html += '<div style="background:#f8f9fa;padding:12px;border-radius:10px;margin-top:12px">';

  html += '<div style="display:flex;justify-content:space-between;font-weight:600;color:#2c3e50">';

  html += '<span>🧪 總進度</span>';

  html += '<span>'+organicTotalAnswered+'/'+organicTotalQuestions+' ('+organicOverallPercent+'%)</span>';

  html += '</div>';

  html += '<div style="background:#ecf0f1;border-radius:10px;height:12px;overflow:hidden;margin-top:8px">';

  html += '<div style="background:linear-gradient(90deg,#1abc9c,#16a085);width:'+organicOverallPercent+'%;height:100%;transition:width 0.3s"></div>';

  html += '</div>';

  html += '</div>';

  html += '</div>';

  

  document.getElementById('progress-content').innerHTML = html;

    document.getElementById('progress-content').innerHTML = html;

  document.getElementById('progress-modal').style.display = 'flex';

}



function renderChapterList() {

  var html = '';

  var src = CURRENT_SOURCE;

  var data = null;

  var sourceName = '';



  // 根據題庫來源取得對應資料

  if (src === 'luo') {

    data = CHAPTERS;

    sourceName = '📘 一般業題庫';

  } else if (src === 'jia') {

    data = window.JIA_DATA;

    sourceName = '📗 甲業題庫';

  } else if (src === 'zhian') {

    data = window.ZHIAN_DATA;

    sourceName = '📙 技術士題庫';

  } else if (src === 'organic') {

    data = window.ORGANIC_DATA;

    sourceName = '🧪 有機溶劑題庫';

  }



  // 若資料未載入，顯示錯誤

  if (!data) {

    html = '<p style="text-align:center;padding:40px;color:red">載入失敗：找不到 ' + sourceName + ' 的資料</p>';

    document.getElementById('chapter-list').innerHTML = html;

    return;

  }



  // 取得所有章節 ID 並排序

  var keys = Object.keys(data);



  // 特殊處理：甲業為 A1~A20，需按數字部分排序

  if (src === 'jia') {

    keys.sort(function(a, b) {

      var aNum = parseInt(a.replace('A', ''));

      var bNum = parseInt(b.replace('A', ''));

      return aNum - bNum;

    });

  } else {

    // 其他題庫：依 id 數值排序

    keys.sort(function(a, b) {

      return parseInt(a) - parseInt(b);

    });

  }



  // 產生每張章節卡片

  keys.forEach(function(id) {

    var ch = data[id];

    var prog = PROGRESS[src] && PROGRESS[src][id] ? PROGRESS[src][id] : { answered: 0, total: ch.total_questions };

    var isDone = prog.answered >= prog.total && prog.total > 0;

    var percent = prog.total > 0 ? Math.round(prog.answered / prog.total * 100) : 0;



    // 章節標題顯示處理

    var chNumDisplay = '';

    if (src === 'jia') {

      // 甲業：顯示 A1, A2, ...

      chNumDisplay = id;

    } else if (src === 'zhian') {

      // 技術士：顯示 數字編號

      chNumDisplay = id;

    } else {

      // 一般業、有機溶劑：顯示數字編號

      chNumDisplay = id;

    }



    html += '<div class="chapter-card' + (isDone ? ' completed' : '') +

              '" onclick="selectChannel(\'' + id + '\')">' +

            '<div class="ch-card-num">' + chNumDisplay +

              (isDone ? '<span class="completed-badge"> ✅</span>' : '') +

            '</div>' +

            '<div class="ch-card-title">' + escHtml(ch.chapter) + '</div>' +

            '<div class="ch-card-q">' + ch.total_questions + ' 題' +

              (isDone ? '<br>已完成' : '') +

            '</div>' +

          '</div>';

  });



  // 若無章節資料

  if (keys.length === 0) {

    html = '<p style="text-align:center;padding:40px;color:#7f8c8d">此題庫目前無章節資料</p>';

  }



  // 更新章節列表容器

  document.getElementById('chapter-list').innerHTML = html;



  // 切換畫面

  goScreen('chapter-select');



  // 更新橫幅文字

  document.querySelector('.banner p').textContent = sourceName;

}



function toggleProgressSection(source) {

  var details = document.getElementById(source + '-details');

  var btn = document.getElementById(source + '-toggle-btn');

  if (details && btn) {

    if (details.style.display === 'none') {

      details.style.display = 'block';

      btn.textContent = '收合';

    } else {

      details.style.display = 'none';

      btn.textContent = '展開';

    }

  }

}





function closeProgress() {

  document.getElementById('progress-modal').style.display = 'none';

}



function resetProgress() {

  if (confirm('確定要重置所有學習進度嗎？此操作無法復原！')) {

    PROGRESS = {};

    saveProgress();

    alert('進度已重置！');

    closeProgress();

  }

}



// 進度匯出功能

function exportProgress() {

  var data = JSON.stringify(PROGRESS, null, 2);

  var blob = new Blob([data], { type: 'application/json' });

  var url = URL.createObjectURL(blob);

  var a = document.createElement('a');

  a.href = url;

  a.download = 'cpc-quiz-progress-' + new Date().toISOString().slice(0, 10) + '.json';

  document.body.appendChild(a);

  a.click();

  document.body.removeChild(a);

  URL.revokeObjectURL(url);

}



// 進度匯入功能
// 驗證進度資料格式
function validateProgress(data) {
  if (!data || typeof data !== "object") return false;
  var validSources = {luo: true, jia: true, zhian: true, organic: true};
  for (var src in data) {
    if (!validSources[src]) return false;
    var chapters = data[src];
    if (!chapters || typeof chapters !== "object") return false;
    for (var chId in chapters) {
      var prog = chapters[chId];
      if (!prog || typeof prog !== "object") return false;
      if (typeof prog.answered !== "number" || typeof prog.total !== "number") return false;
      if (prog.answered < 0 || prog.total < 0) return false;
    }
  }
  return true;
}


function importProgress() {

  var input = document.createElement('input');

  input.type = 'file';

  input.accept = '.json';

  input.onchange = function(e) {

    var file = e.target.files[0];

    if (!file) return;

    var reader = new FileReader();

    reader.onload = function(e) {

      try {

        var data = JSON.parse(e.target.result);

        if (!validateProgress(data)) { alert("進度資料格式無效，請確認檔案內容正確"); return; }

          PROGRESS = data;

          saveProgress();

          alert('進度匯入成功！');

          showProgress(); // 重新顯示進度

        }

      } catch (err) {

        alert('檔案格式錯誤，請確認是有效的進度備份檔');

      }

    };

    reader.readAsText(file);

  };

  input.click();

}



// 生成分享連結

function shareProgress() {

  var compressed = btoa(encodeURIComponent(JSON.stringify(PROGRESS)));

  var url = window.location.origin + window.location.pathname + '#progress=' + compressed;

  // 複製到剪貼簿

  navigator.clipboard.writeText(url).then(function() {

    alert('分享連結已複製到剪貼簿！\n貼到另一台裝置的瀏覽器即可匯入進度');

  }).catch(function() {

    prompt('請複製以下連結：', url);

  });

}



// 從 URL 匯入進度

function importProgressFromURL() {

  var hash = window.location.hash;

  if (hash && hash.indexOf('#progress=') === 0) {

    try {

      var compressed = hash.slice(10);

      var json = decodeURIComponent(atob(compressed));

      var data = JSON.parse(json);

        if (!validateProgress(data)) { alert("進度資料格式無效，請確認連結內容正確"); return; }

        PROGRESS = data;

        saveProgress();

        window.location.hash = ''; // 清除 hash

        alert('進度匯入成功！');

      }

    } catch (err) {

      console.error('URL 進度解析失敗:', err);

    }

  }

}



// Google Drive 備份功能（OAuth 2.0 PKCE 流程）

var GOOGLE_CLIENT_ID = '426710031721-ivj74khe2f46a8t59189356sjahljh9v.apps.googleusercontent.com';

var GOOGLE_REDIRECT_URI = window.location.origin + window.location.pathname; // 使用當前頁面

// Workers 代理 URL

var OAUTH_PROXY_URL = APP_CONFIG.OAUTH_PROXY_URL;

var DRIVE_FOLDER_NAME = 'CPC 題庫練習';

var BACKUP_FILENAME = APP_CONFIG.BACKUP_FILENAME;



// 調試：輸出設定

console.log('🔐 Google OAuth 設定:', {

  client_id: GOOGLE_CLIENT_ID,

  redirect_uri: GOOGLE_REDIRECT_URI,

  current_url: window.location.href

});



// Google Token 相關（包含 Refresh Token）

var googleToken = localStorage.getItem('googleToken');

var googleRefreshToken = localStorage.getItem('googleRefreshToken');

var googleUser = JSON.parse(localStorage.getItem('googleUser') || 'null');

var googleTokenExpiry = localStorage.getItem('googleTokenExpiry');



// 生成 PKCE 所需的 code verifier

function generateCodeVerifier() {

  var array = new Uint8Array(32);

  window.crypto.getRandomValues(array);

  return btoa(String.fromCharCode.apply(null, array))

    .replace(/\+/g, '-')

    .replace(/\//g, '_')

    .replace(/=/g, '');

}



// 從 code verifier 生成 code challenge (SHA256 + Base64URL)

async function generateCodeChallenge(verifier) {

  var encoder = new TextEncoder();

  var data = encoder.encode(verifier);

  var digest = await window.crypto.subtle.digest('SHA-256', data);

  return btoa(String.fromCharCode.apply(null, new Uint8Array(digest)))

    .replace(/\+/g, '-')

    .replace(/\//g, '_')

    .replace(/=+$/, '');

}



// 檢查 token 是否過期

function isTokenExpired() {

  if (!googleTokenExpiry) return true;

  var expiry = new Date(googleTokenExpiry);

  return new Date() >= new Date(expiry.getTime() - 5 * 60 * 1000);

}



// 檢查 token 是否即將過期（10 分鐘內）

function isTokenExpiringSoon() {

  if (!googleTokenExpiry) return true;

  var expiry = new Date(googleTokenExpiry);

  return new Date() >= new Date(expiry.getTime() - 10 * 60 * 1000);

}



// 處理 OAuth 回調（從 URL 中取得 authorization code）

function handleAuthCallback() {

  var urlParams = new URLSearchParams(window.location.search);

  var code = urlParams.get('code');

  var error = urlParams.get('error');

  

  if (error) {

    console.error('OAuth 錯誤:', error);

    alert('登入失敗：' + error);

    window.history.replaceState({}, '', window.location.pathname);

    return;

  }

  

  if (code) {

    // 取得 storage 中的 code verifier

    var codeVerifier = sessionStorage.getItem('codeVerifier');

    if (!codeVerifier) {

      console.error('找不到 code verifier');

      alert('登入失敗：請重新嘗試');

      window.history.replaceState({}, '', window.location.pathname);

      return;

    }

    

    // 用 code 交換 token

    exchangeCodeForToken(code, codeVerifier);

    

    // 清除 URL 中的參數

    window.history.replaceState({}, '', window.location.pathname);

  }

}



// 用 authorization code 交換 token（包含 refresh token）- 透過 Workers 代理

function exchangeCodeForToken(code, codeVerifier) {

  console.log('🔄 正在交換 token...');

  console.log('📝 Code:', code.substring(0, 20) + '...');

  console.log('📝 Code Verifier:', codeVerifier.substring(0, 20) + '...');

  console.log('📝 Redirect URI:', GOOGLE_REDIRECT_URI);

  console.log('🔗 代理 URL:', OAUTH_PROXY_URL);

  

  fetch(OAUTH_PROXY_URL + '/token', {

    method: 'POST',

    headers: {

      'Content-Type': 'application/x-www-form-urlencoded'

    },

    body: new URLSearchParams({

      client_id: GOOGLE_CLIENT_ID,

      code: code,

      code_verifier: codeVerifier,

      grant_type: 'authorization_code',

      redirect_uri: GOOGLE_REDIRECT_URI

      // client_secret 由 Workers 代理處理，不在此處發送

    })

  })

  .then(function(r) {

    console.log('📥 Token 回應狀態:', r.status);

    return r.json();

  })

  .then(function(data) {

    console.log('📦 Token 回應內容:', data);

    

    if (data.error) {

      console.error('❌ Token 交換失敗:', data.error);

      console.error('📝 錯誤詳情:', data.error_description);

      alert('登入失敗：' + data.error + '\n\n' + data.error_description + '\n\n請確認：\n1. Google Cloud Console 中的 Redirect URI 是否正確\n2. Redirect URI 必須完全一致（包含結尾斜線）');

      return;

    }

    

    // 儲存 token

    googleToken = data.access_token;

    googleRefreshToken = data.refresh_token || googleRefreshToken; // 可能不會每次都回傳

    console.log('✅ Access Token:', data.access_token ? '取得成功' : '失敗');

    console.log('✅ Refresh Token:', data.refresh_token ? '取得成功' : '未取得（可能已授權過）');

    

    var expiresIn = data.expires_in || 3600;

    var expiryTime = new Date();

    expiryTime.setSeconds(expiryTime.getSeconds() + expiresIn);

    googleTokenExpiry = expiryTime.toISOString();

    

    console.log('⏰ Token 過期時間:', googleTokenExpiry);

    

    // 取得用戶資訊

    return fetchUserInfo(googleToken);

  })

  .then(function() {

    // 儲存到 localStorage

    localStorage.setItem('googleToken', googleToken);

    localStorage.setItem('googleRefreshToken', googleRefreshToken);

    localStorage.setItem('googleTokenExpiry', googleTokenExpiry);

    localStorage.setItem('googleUser', JSON.stringify(googleUser));

    

    console.log('✅ 登入成功！用戶:', googleUser.email);

    

    alert('Google 帳號綁定成功！\n' + googleUser.email);

    updateGoogleUI();

    backupToDrive();

  })

  .catch(function(err) {

    console.error('❌ Token 交換失敗:', err);

    alert('登入失敗：' + err.message);

  });

}



// 用 refresh token 更新 access token - 透過 Workers 代理

function refreshAccessToken() {

  if (!googleRefreshToken) {

    console.warn('沒有 refresh token，需要重新登入');

    return Promise.reject(new Error('需要重新登入'));

  }

  

  console.log('🔄 正在刷新 access token...');

  

  return fetch(OAUTH_PROXY_URL + '/refresh', {

    method: 'POST',

    headers: {

      'Content-Type': 'application/x-www-form-urlencoded'

    },

    body: new URLSearchParams({

      client_id: GOOGLE_CLIENT_ID,

      refresh_token: googleRefreshToken,

      grant_type: 'refresh_token'

      // client_secret 由 Workers 代理處理

    })

  })

  .then(function(r) { return r.json(); })

  .then(function(data) {

    if (data.error) {

      console.error('Token 刷新失敗:', data.error);

      // refresh token 也過期了，需要重新登入

      localStorage.removeItem('googleToken');

      localStorage.removeItem('googleRefreshToken');

      localStorage.removeItem('googleTokenExpiry');

      localStorage.removeItem('googleUser');

      googleToken = null;

      googleRefreshToken = null;

      googleUser = null;

      googleTokenExpiry = null;

      throw new Error('登入已過期，請重新登入');

    }

    

    // 更新 token

    googleToken = data.access_token;

    var expiresIn = data.expires_in || 3600;

    var expiryTime = new Date();

    expiryTime.setSeconds(expiryTime.getSeconds() + expiresIn);

    googleTokenExpiry = expiryTime.toISOString();

    

    // 儲存新 token

    localStorage.setItem('googleToken', googleToken);

    localStorage.setItem('googleTokenExpiry', googleTokenExpiry);

    

    console.log('✅ Token 刷新成功');

    return googleToken;

  });

}



// 頁面載入時檢查是否有儲存的登入狀態

window.addEventListener('DOMContentLoaded', function() {

  handleAuthCallback(); // 處理 OAuth 回調

  

  if (googleUser && googleToken && !isTokenExpired()) {

    console.log('✅ 已登入用戶:', googleUser.email);

    // 如果 token 即將過期，自動刷新

    if (isTokenExpiringSoon()) {

      console.log('⏰ Token 即將過期，自動刷新...');

      refreshAccessToken().then(function() {

        console.log('✅ Token 刷新完成');

      }).catch(function(err) {

        console.warn('Token 刷新失敗:', err.message);

      });

    }

    // 如果 token 即將過期，設置定時器提示

    if (isTokenExpiringSoon()) {

      scheduleTokenExpiryWarning();

    }

  } else if (googleUser && googleToken && isTokenExpired()) {

    console.log('⚠️ Token 已過期，嘗試刷新...');

    // 嘗試用 refresh token 刷新

    refreshAccessToken().then(function() {

      console.log('✅ Token 刷新成功');

    }).catch(function(err) {

      console.warn('Token 刷新失敗，需要重新登入:', err.message);

      // 清除過期的 token

      localStorage.removeItem('googleToken');

      localStorage.removeItem('googleRefreshToken');

      localStorage.removeItem('googleTokenExpiry');

      localStorage.removeItem('googleUser');

      googleToken = null;

      googleRefreshToken = null;

      googleUser = null;

      googleTokenExpiry = null;

    });

  }

});



// 安排 Token 過期警告

function scheduleTokenExpiryWarning() {

  if (!googleTokenExpiry) return;

  

  var expiry = new Date(googleTokenExpiry);

  var now = new Date();

  var timeUntilExpiry = expiry.getTime() - now.getTime();

  

  // 在過期前 5 分鐘提示

  var warningTime = Math.max(0, timeUntilExpiry - 5 * 60 * 1000);

  

  setTimeout(function() {

    if (googleToken && document.getElementById('progress-modal') && document.getElementById('progress-modal').style.display === 'none') {

      // 只在用戶沒有開啟進度視窗時提示

      console.log('⏰ Token 即將過期，提示用戶重新登入');

      var statusEl = document.getElementById('google-status');

      if (statusEl) {

        statusEl.innerHTML = '<span style="color:#e74c3c">⚠️ 登入即將過期，請重新登入</span>';

      }

    }

  }, warningTime);

}



// Google 登入（PKCE 流程）

async function signInWithGoogle() {

  console.log('🔐 開始 OAuth PKCE 流程...');

  

  // 生成 PKCE 參數

  var codeVerifier = generateCodeVerifier();

  var codeChallenge = await generateCodeChallenge(codeVerifier);

  

  console.log('🔑 Code Verifier:', codeVerifier.substring(0, 20) + '...');

  console.log('🔑 Code Challenge:', codeChallenge);

  

  // 儲存 code verifier 到 sessionStorage（回調時需要）

  sessionStorage.setItem('codeVerifier', codeVerifier);

  console.log('💾 Code verifier 已儲存到 sessionStorage');

  

  // 建立授權 URL

  var params = {

    client_id: GOOGLE_CLIENT_ID,

    redirect_uri: GOOGLE_REDIRECT_URI,

    response_type: 'code',

    scope: 'https://www.googleapis.com/auth/drive.file https://www.googleapis.com/auth/userinfo.email https://www.googleapis.com/auth/userinfo.profile',

    access_type: 'offline',

    prompt: 'consent',

    code_challenge: codeChallenge,

    code_challenge_method: 'S256'

  };

  

  console.log('📋 OAuth 參數:', params);

  

  var authUrl = 'https://accounts.google.com/o/oauth2/v2/auth?' + new URLSearchParams(params);

  

  console.log('🔗 授權 URL:', authUrl.substring(0, 200) + '...');

  

  // 跳轉到 Google 授權頁面

  window.location.href = authUrl;

}



function fetchUserInfo(accessToken) {

  return fetch('https://www.googleapis.com/oauth2/v3/userinfo', {

    headers: { 'Authorization': 'Bearer ' + accessToken }

  })

  .then(function(r) { 

    if (!r.ok) {

      throw new Error('無法取得用戶資訊');

    }

    return r.json(); 

  })

  .then(function(userInfo) {

    googleUser = {

      name: userInfo.name || 'User',

      email: userInfo.email || '',

      picture: userInfo.picture || 'https://ui-avatars.com/api/?name=' + encodeURIComponent(userInfo.name || 'User') + '&background=4285f4&color=fff&size=32',

      token: accessToken

    };

    googleToken = accessToken;

    // 保存 token 過期時間（OAuth2 token 通常 1 小時過期）

    var expiryTime = new Date();

    expiryTime.setHours(expiryTime.getHours() + 1);

    googleTokenExpiry = expiryTime.toISOString();

    

    localStorage.setItem('googleUser', JSON.stringify(googleUser));

    localStorage.setItem('googleToken', accessToken);

    localStorage.setItem('googleTokenExpiry', googleTokenExpiry);

    

    console.log('✅ 用戶資訊:', googleUser);

    updateGoogleUI();

    

    return googleUser; // 返回用戶資訊給 Promise 鏈

  })

  .catch(function(err) {

    console.error('取得使用者資訊失敗:', err);

    throw err; // 重新拋出錯誤讓上層處理

  });

}



// Google 登出

function signOutFromGoogle() {

  // 清除 localStorage

  localStorage.removeItem('googleToken');

  localStorage.removeItem('googleRefreshToken');

  localStorage.removeItem('googleUser');

  localStorage.removeItem('googleTokenExpiry');

  

  // 清除全域變數

  googleToken = null;

  googleRefreshToken = null;

  googleUser = null;

  googleTokenExpiry = null;

  

  // 更新 UI

  updateGoogleUI();

  

  // 清除 google-status 顯示

  var statusEl = document.getElementById('google-status');

  if (statusEl) statusEl.textContent = '';

  

  alert('已登出 Google 帳號');

}



// 更新 Google UI 狀態

function updateGoogleUI() {

  // 每次都從 localStorage 讀取最新狀態

  googleToken = localStorage.getItem('googleToken');

  googleUser = JSON.parse(localStorage.getItem('googleUser') || 'null');

  

  var container = document.getElementById('google-auth-container');

  if (!container) return;

  

  if (googleUser) {

    var avatarUrl = googleUser.picture || 'https://ui-avatars.com/api/?name=' + encodeURIComponent(googleUser.name || 'User') + '&background=4285f4&color=fff&size=32';

    container.innerHTML = '<div style="display:flex;align-items:center;gap:10px;padding:12px;background:#f8f9fa;border-radius:10px">' +

      '<img src="'+avatarUrl+'" style="width:32px;height:32px;border-radius:50%;object-fit:cover" alt="Google" onerror="this.src=\'https://ui-avatars.com/api/?name=' + encodeURIComponent(googleUser.name || 'U') + '&background=4285f4&color=fff&size=32\'">' +

      '<div style="flex:1;min-width:0"><div style="font-size:0.85rem;font-weight:600;color:#2c3e50;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">'+escHtml(googleUser.name)+'</div>' +

      '<div style="font-size:0.75rem;color:#7f8c8d;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">'+escHtml(googleUser.email)+'</div></div>' +

      '<button onclick="signOutFromGoogle()" style="padding:6px 12px;background:#e74c3c;color:white;border:none;border-radius:6px;font-size:0.8rem;cursor:pointer;white-space:nowrap">登出</button>' +

      '</div>' +

      '<div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-top:10px">' +

      '<button onclick="backupToDrive()" style="padding:10px;background:#3498db;color:white;border:none;border-radius:8px;font-size:0.85rem;font-weight:600;cursor:pointer">☁️ 立即備份</button>' +

      '<button onclick="restoreFromDrive()" style="padding:10px;background:#2ecc71;color:white;border:none;border-radius:8px;font-size:0.85rem;font-weight:600;cursor:pointer">☁️ 恢復進度</button>' +

      '</div>' +

      '<div id="google-status" style="margin-top:10px;font-size:0.75rem;color:#7f8c8d;text-align:center"></div>';

  } else {

    container.innerHTML = '<button onclick="signInWithGoogle()" style="width:100%;padding:12px;background:#4285f4;color:white;border:none;border-radius:10px;font-size:0.9rem;font-weight:600;cursor:pointer;display:flex;align-items:center;justify-content:center;gap:8px">' +

      '<svg width="20" height="20" viewBox="0 0 20 20"><path fill="#fff" d="M10 20a10 10 0 1 0 0-20 10 10 0 0 0 0 20zm.85-17.22v7.3h4.93l-.44 2.85h-4.5v4.64h-2.6v-4.64H3.5v-2.85h4.73V5.21L10.85 2.78z"/></svg>' +

      '用 Google 帳號備份</button>' +

      '<div style="margin-top:10px;font-size:0.75rem;color:#7f8c8d;text-align:center">備份將儲存至您的 Google Drive</div>';

  }

}



// 備份到 Google Drive（使用 PKCE，支援自動刷新 token）

function backupToDrive(isAutoBackup) {

  if (!googleToken) {

    if (isAutoBackup) {

      console.warn('☁️ 自動備份跳過：未登入 Google');

      return;

    }

    alert('請先綁定 Google 帳號');

    signInWithGoogle();

    return;

  }

  

  // 檢查 token 是否過期，如果過期則自動刷新

  if (isTokenExpired()) {

    console.log('⏰ Token 已過期，自動刷新...');

    

    if (isAutoBackup) {

      var statusEl = document.getElementById('google-status');

      if (statusEl) statusEl.textContent = '🔄 刷新 token...';

    }

    

    // 刷新 token 後再備份

    refreshAccessToken()

      .then(function() {

        console.log('✅ Token 刷新成功，繼續備份...');

        executeBackup(isAutoBackup);

      })

      .catch(function(err) {

        console.warn('Token 刷新失敗:', err.message);

        if (!isAutoBackup) {

          alert('登入已過期，請重新登入');

          signInWithGoogle();

        } else {

          var statusEl = document.getElementById('google-status');

          if (statusEl) {

            statusEl.innerHTML = '<span style="color:#e74c3c">⚠️ 請重新登入</span>';

          }

        }

      });

    return;

  }

  

  // Token 有效，直接執行備份

  executeBackup(isAutoBackup);

}



// 執行實際的備份操作（使用 fetch 直接呼叫 Drive API，不需要 gapi）

function executeBackup(isAutoBackup) {

  var statusEl = document.getElementById('google-status');

  if (statusEl) statusEl.textContent = '⏳ 備份中...';

  

  // 獲取本地進度最後修改時間

  var localModified = localStorage.getItem('progressModified') || localStorage.getItem('lastBackup');

  var localModifiedTime = localModified ? new Date(localModified) : new Date(0);

  

  // 尋找或建立備份資料夾

  fetch('https://www.googleapis.com/drive/v3/files?q=' + encodeURIComponent("mimeType='application/vnd.google-apps.folder' and name='" + DRIVE_FOLDER_NAME + "' and trashed=false") + '&spaces=drive', {

    headers: { 'Authorization': 'Bearer ' + googleToken }

  })

  .then(function(r) { return r.json(); })

  .then(function(data) {

    var folderId;

    if (data.files && data.files.length > 0) {

      folderId = data.files[0].id;

      return Promise.resolve(folderId);

    } else {

      // 建立資料夾

      return fetch('https://www.googleapis.com/drive/v3/files', {

        method: 'POST',

        headers: {

          'Authorization': 'Bearer ' + googleToken,

          'Content-Type': 'application/json'

        },

        body: JSON.stringify({

          name: DRIVE_FOLDER_NAME,

          mimeType: 'application/vnd.google-apps.folder'

        })

      }).then(function(r) { return r.json(); })

      .then(function(res) { return res.id; });

    }

  })

  .then(function(folderId) {

    // 尋找現有備份檔案

    return fetch('https://www.googleapis.com/drive/v3/files?q=' + encodeURIComponent("name='" + BACKUP_FILENAME + "' and '" + folderId + "' in parents and trashed=false") + '&spaces=drive', {

      headers: { 'Authorization': 'Bearer ' + googleToken }

    })

    .then(function(r) { return r.json(); })

    .then(function(res) {

      return { folderId: folderId, existingFile: res.files && res.files[0] };

    });

  })

  .then(function(params) {

    if (params.existingFile) {

      // 比較時間戳

      var cloudModifiedTime = new Date(params.existingFile.modifiedTime);

      

      console.log('🕐 時間戳比較:', {

        '本地': localModifiedTime.toLocaleString(),

        '雲端': cloudModifiedTime.toLocaleString(),

        '雲端較新': cloudModifiedTime > localModifiedTime

      });

      

      // 如果雲端版本較新，提示用戶

      if (cloudModifiedTime > localModifiedTime) {

        // 偵測全新裝置（本地從未有進度，但雲端有備份）→ 自動恢復雲端版本，避免空白覆蓋

        var hasLocalProgress = localStorage.getItem('progress') && localStorage.getItem('progress') !== '{}';

        var hasLocalModified = localStorage.getItem('progressModified') || localStorage.getItem('lastBackup');

        var isFreshDevice = params.existingFile && !hasLocalProgress && !hasLocalModified;

        

        if (isFreshDevice) {

          console.log('📱 偵測到全新裝置且雲端有備份，自動從雲端恢復...');

          if (statusEl) statusEl.textContent = '📱 全新裝置，自動恢復雲端進度...';

          downloadBackup(params.existingFile.id, statusEl);

          return Promise.resolve();

        }

        

        var cloudTimeStr = cloudModifiedTime.toLocaleString('zh-TW');

        var localTimeStr = localModifiedTime.toLocaleString('zh-TW');

        

        var msg = '⚠️ 偵測到雲端備份較新！\n\n' +

                  '📁 雲端版本：' + cloudTimeStr + '\n' +

                  '💾 本地版本：' + localTimeStr + '\n\n' +

                  '選擇「確定」繼續備份（用本地進度覆蓋雲端）\n' +

                  '選擇「取消」下載雲端版本（用雲端進度覆蓋本地）';

        

        if (confirm(msg)) {

          // 用戶選擇繼續備份

          console.log('📤 用戶選擇：繼續備份（覆蓋雲端）');

          return uploadBackup(params.folderId, params.existingFile.id, isAutoBackup, statusEl);

        } else {

          // 用戶選擇下載雲端版本

          console.log('📥 用戶選擇：下載雲端版本');

          downloadBackup(params.existingFile.id, statusEl);

          return Promise.resolve();

        }

      } else {

        // 本地版本較新或相同，直接備份

        console.log('✅ 本地版本較新，繼續備份');

        return uploadBackup(params.folderId, params.existingFile.id, isAutoBackup, statusEl);

      }

    } else {

      // 沒有現有檔案，直接建立

      console.log('📝 建立新的備份檔案');

      return uploadBackup(params.folderId, null, isAutoBackup, statusEl);

    }

  })

  .catch(function(err) {

    console.error('備份失敗:', err);

    if (statusEl) statusEl.textContent = '❌ 備份失敗';

    

    var userMsg = err.message;

    if (userMsg.indexOf('insufficientFilePermissions') >= 0) {

      userMsg = '權限不足，請重新登入並授權 Drive 權限';

    } else if (userMsg.indexOf('storageQuotaExceeded') >= 0) {

      userMsg = 'Google Drive 空間已滿';

    }

    

    if (!isAutoBackup) {

      alert('備份失敗：' + userMsg);

    }

  });

}



// 上傳備份到 Google Drive

function uploadBackup(folderId, fileId, isAutoBackup, statusEl) {

  var url = fileId 

    ? 'https://www.googleapis.com/upload/drive/v3/files/' + fileId + '?uploadType=multipart'

    : 'https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart';

  

  var method = fileId ? 'PATCH' : 'POST';

  

  // 封裝要備份的資料：進度 + 錯題本 + 考試紀錄

  var backupData = {

    progress: PROGRESS,

    mistakeBook: MISTAKE_BOOK,

    examHistory: EXAM_HISTORY,

    version: 2

  };

  

  return fetch(url, {

    method: method,

    headers: {

      'Authorization': 'Bearer ' + googleToken,

      'Content-Type': 'multipart/related; boundary=-------314159265358979323846'

    },

    body: createMultipartBody(backupData, BACKUP_FILENAME, fileId ? null : folderId)

  })

  .then(function(response) {

    if (response.ok) {

      var now = new Date();

      var timeStr = now.toLocaleString('zh-TW');

      if (statusEl) statusEl.textContent = '最後備份：' + timeStr;

      localStorage.setItem('lastBackup', timeStr);

      localStorage.setItem('progressModified', timeStr);

      if (!isAutoBackup) {

        alert('備份成功！\n檔案已儲存至 Google Drive / ' + DRIVE_FOLDER_NAME + '/' + BACKUP_FILENAME);

      } else {

        console.log('自動備份成功 (' + timeStr + ')');

      }

    } else {

      return response.json().then(function(errData) {

        var errMsg = errData.error ? errData.error.message : '備份失敗';

        throw new Error(errMsg);

      }).catch(function() {

        throw new Error('備份失敗 (HTTP ' + response.status + ')');

      });

    }

  });

}



// 從 Google Drive 下載備份（自動處理舊版 multipart 格式）

function downloadBackup(fileId, statusEl) {

  return fetch('https://www.googleapis.com/drive/v3/files/' + fileId + '?alt=media', {

    headers: { 'Authorization': 'Bearer ' + googleToken }

  })

  .then(function(r) {

    if (!r.ok) {

      throw new Error('下載失敗 (HTTP ' + r.status + ')');

    }

    return r.text();

  })

  .then(function(rawText) {

    var jsonText = rawText;

    // 舊版沒設 Content-Type，Google Drive 把整個 multipart body 存進去

    // 如果開頭是 '--'，嘗試提取第二個 JSON 部分

    if (rawText.trim().indexOf('--') === 0) {

      var parts = rawText.split(/\r?\n--/);

      for (var i = 0; i < parts.length; i++) {

        if (parts[i].indexOf('Content-Type: application/json') >= 0) {

          var lines = parts[i].split(/\r?\n/);

          for (var j = 0; j < lines.length; j++) {

            var line = lines[j].trim();

            if (line && line.indexOf('Content-Type') !== 0 && line.indexOf('Content-Length') !== 0 && line.indexOf('Content-Length') !== 0 && line.indexOf('--') !== 0) {

              if (line.charAt(0) === '{' || line.charAt(0) === '[') {

                jsonText = line;

                break;

              }

            }

          }

          break;

        }

      }

      console.log('⚠️ 偵測到舊格式備份，自動提取 JSON');

    }

    var data = JSON.parse(jsonText);

    // 判斷新舊格式：v2 包裝了 progress + mistakeBook + examHistory

    var restored = [];

    if (data.version === 2 || (data.progress !== undefined && typeof data.progress === 'object')) {

      PROGRESS = data.progress || {};

      saveProgress();

      restored.push('進度');

      if (data.mistakeBook) {

        MISTAKE_BOOK = data.mistakeBook;

        saveMistakeBook();

        restored.push('錯題本');

      }

      if (data.examHistory) {

        EXAM_HISTORY = data.examHistory;

        saveExamHistory();

        restored.push('考試紀錄');

      }

    } else {

      // 舊格式：data 本身就是 PROGRESS

      PROGRESS = data;

      saveProgress();

      restored.push('進度');

    }

    var now = new Date();

    var timeStr = now.toLocaleString('zh-TW');

    if (statusEl) statusEl.textContent = '✅ 最後恢復：' + timeStr;

    localStorage.setItem('progressModified', timeStr);

    alert('已從雲端還原以下資料：\n' + restored.join('、') + '\n\n時間：' + timeStr);

    showProgress();

  })

  .catch(function(err) {

    console.error('下載失敗:', err);

    if (statusEl) statusEl.textContent = '❌ 下載失敗';

    alert('下載失敗：' + err.message);

  });

}



// 建立 multipart body for Drive API upload

function createMultipartBody(data, filename, folderId) {

  var boundary = '-------314159265358979323846';

  var delimiter = '\r\n--' + boundary + '\r\n';

  var close_delim = '\r\n--' + boundary + '--';

  

  var metadata = folderId 

    ? { name: filename, parents: [folderId] }

    : { name: filename };

  

  var body = delimiter + 'Content-Type: application/json\r\n\r\n' +

             JSON.stringify(metadata) +

             delimiter + 'Content-Type: application/json\r\n\r\n' +

             JSON.stringify(data) +

             close_delim;

  

  return body;

}



// 從 Google Drive 恢復（使用 fetch 直接呼叫 API）

function restoreFromDrive() {

  if (!googleToken) {

    alert('請先綁定 Google 帳號');

    signInWithGoogle();

    return;

  }

  

  // 尋找備份資料夾和檔案

  var statusEl = document.getElementById('google-status');

  if (statusEl) statusEl.textContent = '⏳ 恢復中...';

  

  fetch('https://www.googleapis.com/drive/v3/files?q=' + encodeURIComponent("mimeType='application/vnd.google-apps.folder' and name='" + DRIVE_FOLDER_NAME + "' and trashed=false") + '&spaces=drive', {

    headers: { 'Authorization': 'Bearer ' + googleToken }

  })

  .then(function(r) { return r.json(); })

  .then(function(data) {

    if (!data.files || data.files.length === 0) {

      throw new Error('找不到備份資料夾');

    }

    var folderId = data.files[0].id;

    

    // 尋找備份檔案

    return fetch('https://www.googleapis.com/drive/v3/files?q=' + encodeURIComponent("name='" + BACKUP_FILENAME + "' and '" + folderId + "' in parents and trashed=false") + '&spaces=drive', {

      headers: { 'Authorization': 'Bearer ' + googleToken }

    })

    .then(function(r) { return r.json(); })

    .then(function(res) {

      if (!res.files || res.files.length === 0) {

        throw new Error('找不到備份檔案');

      }

      return res.files[0];

    });

  })

  .then(function(file) {

    // 顯示檔案資訊讓用戶確認

    var cloudModifiedTime = new Date(file.modifiedTime);

    var cloudTimeStr = cloudModifiedTime.toLocaleString('zh-TW');

    

    var msg = '📥 從 Google Drive 還原進度\n\n' +

              '📁 檔案：' + file.name + '\n' +

              '🕐 雲端版本：' + cloudTimeStr + '\n\n' +

              '注意：這將覆蓋本地的所有進度！\n\n' +

              '確定要繼續嗎？';

    

    if (confirm(msg)) {

      // 下載並還原

      return downloadBackup(file.id, statusEl);

    } else {

      if (statusEl) statusEl.textContent = '⏸️ 已取消還原';

      return Promise.resolve();

    }

  })

  .catch(function(err) {

    console.error('恢復失敗:', err);

    if (statusEl) statusEl.textContent = '❌ 恢復失敗';

    alert('恢復失敗：' + err.message);

  });

}



function toggleAutoNext() {

  SETTINGS.autoNext = !SETTINGS.autoNext;

  saveSettings();

  updateToggleStyle(SETTINGS.autoNext);

}



function goScreen(id) {

  document.querySelectorAll('.screen').forEach(function(s) { s.classList.remove('active'); });

  document.getElementById(id).classList.add('active');

}



function renderHome() {

  goScreen('home');

}



// 頁面載入時檢查 URL 進度並恢復自動備份

window.addEventListener('DOMContentLoaded', function() {

  importProgressFromURL();

  

  // 恢復自動備份定時器（如果已開啟且已登入）

  if (SETTINGS.autoBackup) {

    var token = localStorage.getItem('googleToken');

    if (token) {

      googleToken = token;

      googleUser = JSON.parse(localStorage.getItem('googleUser') || 'null');

      googleTokenExpiry = localStorage.getItem('googleTokenExpiry');

      

      // 啟動自動備份定時器（使用儲存的間隔時間）

      var intervalMinutes = SETTINGS.autoBackupInterval || 30;

      autoBackupInterval = setInterval(function() {

        if (googleToken) {

          console.log('🔄 自動備份中...（每 ' + intervalMinutes + ' 分鐘）');

          backupToDrive(true); // true = 自動備份

        }

      }, intervalMinutes * 60 * 1000);

      

      var timeText = intervalMinutes >= 60 

        ? '每 ' + (intervalMinutes / 60) + ' 小時' 

        : '每 ' + intervalMinutes + ' 分鐘';

      

      console.log('☁️ 自動備份已恢復（' + timeText + '）');

    }

  }

});



function selectMode(mode) {

  STATE.mode = mode;

  // 更新 banner 文字

  document.querySelector('.banner p').textContent = SOURCE_NAMES[CURRENT_SOURCE];

  // 如果還沒載入指定題庫，先 fetch 再繼續

  if (CURRENT_SOURCE === 'jia') {

    proceedMode();


  } else if (CURRENT_SOURCE === 'zhian') {

    // 技術士題庫：使用已載入的 window.ZHIAN_DATA

    if (window.ZHIAN_DATA && Object.keys(window.ZHIAN_DATA).length > 0) {

      proceedMode();

    } else {

      // 如果還沒載入，從索引檔案載入

      fetch('../data/raw/chapter_zhian_index.json')

        .then(r => r.json())

        .then(data => {

          var obj = {};

          data.forEach(function(ch) { obj[String(ch.id)] = ch; });

          window.ZHIAN_DATA = obj;

          proceedMode();

        })

        .catch(err => {

          console.error('Failed to load zhian chapters:', err);

          alert('載入技術士題庫失敗，請刷新頁面重試');

        });

      return;

    }

  } else {

    proceedMode();

  }

}



function proceedMode() {

  if (STATE.mode === 'exam') {

    // 大考模式：從全部題目抽 80 題

    var src = CURRENT_SOURCE;

    

    // 技術士題庫：動態載入所有章節題目

    if (src === 'zhian') {

      // 先移除舊的解析區塊

      var oldAnalysis = document.querySelector('.analysis-block');

      if (oldAnalysis) oldAnalysis.remove();

      

      // 載入所有 5 章題目

      var promises = [];

      for (var id in window.ZHIAN_DATA) {

        var chapterData = window.ZHIAN_DATA[id];

        promises.push(

          fetch('../data/raw/' + chapterData.file)

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

        var doneKeys = EXAM_HISTORY[src] || [];

        var doneSet = {};

        doneKeys.forEach(function(k){ doneSet[k] = true; });

        var totalPool = 100;

        var remaining = doneKeys.length >= totalPool

          ? [] : allQuestions.filter(function(q){ return !doneSet[q._ch+'_'+q.id]; });

        if (remaining.length < 80) {

          EXAM_HISTORY[src] = [];

          doneSet = {};

          remaining = allQuestions;

        }

        allQuestions = remaining.slice(0, 80);

        STATE.questions = allQuestions;

        STATE.current = 0;

        STATE.answers = [];

        STATE.done = false;

        STATE.chId = null;

        document.getElementById('nav-row').style.display = 'flex';

        document.getElementById('result-area').style.display = 'none';

        goScreen('quiz-screen');

        renderQuestion();

      });

      return;

    }

    

    // 一般業和甲業

    var files = src === 'luo' 

      ? CHAPTERS // 一般業用 chapters.json

      : window.JIA_DATA; // 甲業用內嵌

    

   // 載入所有題目

   var loadPromises = [];

   for (let k in files) {

     var ch = files[k];

     if (ch.file) {

       loadPromises.push (

          loadChapterQuestions('../data/raw/' + ch.file).then(function(qs) {

           qs.forEach(function(q) { q._ch = k; });

           return qs;

         })

       );

     }

   }



    Promise.all(loadPromises).then(function(results) {



      var all = [];

      results.forEach(function(qs) { all = all.concat(qs); });

      shuffleArray(all);

      var doneKeys = EXAM_HISTORY[src] || [];

      var doneSet = {};

      doneKeys.forEach(function(k){ doneSet[k] = true; });

      var totalPool = APP_CONFIG.TOTAL_QUESTIONS[src] || 0;

      var remaining = doneKeys.length >= totalPool

        ? [] : all.filter(function(q){ return !doneSet[q._ch+'_'+q.id]; });

      if (remaining.length < 80) {

        EXAM_HISTORY[src] = [];

        doneSet = {};

        remaining = all;

      }

      var qs = remaining.slice(0, 80);

      STATE.questions = qs;

      STATE.current = 0;

      STATE.answers = [];

      STATE.done = false;

      STATE.chId = null;

      document.getElementById('nav-row').style.display = 'flex';

      document.getElementById('result-area').style.display = 'none';

      goScreen('quiz-screen');

      renderQuestion();

    });

    return;

  }

  // 小考/練習模式：渲染章節選擇

  var src = CURRENT_SOURCE;

  var html = '';

  if (src === 'luo') {

    // 一般業：動態讀取所有章节

    var keys = Object.keys(CHAPTERS).sort(function(a,b){return parseInt(a)-parseInt(b);});

    keys.forEach(function(k) {

      var ch = CHAPTERS[k];

      var prog = PROGRESS['luo'] && PROGRESS['luo'][k] ? PROGRESS['luo'][k] : { answered: 0, total: ch.total_questions };

      var isDone = prog.answered >= prog.total && prog.total > 0;

      html += '<div class="chapter-card'+(isDone?' completed':'')+'" onclick="selectChapter(\''+k+'\')">' +

        '<div class="ch-card-num">第 '+k+' 章'+(isDone?'<span class="completed-badge"> ✅</span>':'')+'</div>' +

        '<div class="ch-card-title">'+escHtml(ch.chapter)+'</div>' +

        '<div class="ch-card-q">'+ch.total_questions+' 題'+(ch.note?' · '+escHtml(ch.note):'')+(isDone?' · 已完成':'')+'</div>'+

        '</div>';

    });

  } else if (src === 'zhian') {

    // 技術士題庫：5 章，動態載入章節選擇

    var keys = Object.keys(window.ZHIAN_DATA).sort(function(a,b){return parseInt(a)-parseInt(b);});

    keys.forEach(function(k) {

      var ch = window.ZHIAN_DATA[k];

      var prog = PROGRESS['zhian'] && PROGRESS['zhian'][k] ? PROGRESS['zhian'][k] : { answered: 0, total: ch.total_questions };

      var isDone = prog.answered >= prog.total && prog.total > 0;

      html += '<div class="chapter-card'+(isDone?' completed':'')+'" onclick="selectChapter(\''+k+'\')">' +

        '<div class="ch-card-num">第 '+k+' 章'+(isDone?'<span class="completed-badge"> ✅</span>':'')+'</div>' +

        '<div class="ch-card-title">'+escHtml(ch.chapter)+'</div>' +

        '<div class="ch-card-q">'+ch.total_questions+' 題'+(isDone?' · 已完成':'')+'</div>'+

        '</div>';

    });

  } else if (src === 'organic') {

    // 有機溶劤題庫：7 章

    var keys = Object.keys(window.ORGANIC_DATA).sort(function(a,b){return parseInt(a)-parseInt(b);});

    keys.forEach(function(k) {

      var ch = window.ORGANIC_DATA[k];

      var prog = PROGRESS['organic'] && PROGRESS['organic'][k] ? PROGRESS['organic'][k] : { answered: 0, total: ch.total_questions };

      var isDone = prog.answered >= prog.total && prog.total > 0;

      html += '<div class="chapter-card'+(isDone?' completed':'')+'" onclick="selectChapter(\''+k+'\')">' +

        '<div class="ch-card-num">'+escHtml(ch.chapter)+(isDone?'<span class="completed-badge"> ✅</span>':'')+'</div>' +

        '<div class="ch-card-title">'+ch.total_questions+' 題</div>' +

        '<div class="ch-card-q">'+(isDone?'已完成':'')+'</div>' +

        '</div>';

    });

  } else {

    // 甲業 20 章

    var data = window.JIA_DATA;

    if (!data) {

      console.error('JIA_DATA not loaded');

      return;

    }

    var keys = Object.keys(data).sort(function(a, b) {

      // 甲業章節鍵為 A1-A20，按數字部分排序

      var aNum = parseInt(a.replace('A',''));

      var bNum = parseInt(b.replace('A',''));

      return aNum - bNum;

    });

    keys.forEach(function(k) {

      var ch = data[k];

      var prog = PROGRESS['jia'] && PROGRESS['jia'][k] ? PROGRESS['jia'][k] : { answered: 0, total: ch.total_questions || 0 };

      var isDone = prog.answered >= prog.total && prog.total > 0;

      html += '<div class="chapter-card'+(isDone?' completed':'')+'" onclick="selectChapter(\''+k+'\')">' +

        '<div class="ch-card-num">'+escHtml(ch.chapter)+(isDone?'<span class="completed-badge"> ✅</span>':'')+'</div>' +

        '<div class="ch-card-title">'+ch.total_questions+' 題</div>' +

        '<div class="ch-card-q">'+(isDone?'已完成':'')+'</div>' +

        '</div>';

    });

  }

  document.getElementById('chapter-list').innerHTML = html;

  goScreen('chapter-select');

}







function selectChapter(id) {
  STATE.chId = id;
  var src = CURRENT_SOURCE;
  var chData = src === 'luo' ? CHAPTERS[String(id)] :
               (src === 'zhian' ? window.ZHIAN_DATA[String(id)] :
               (src === 'organic' ? window.ORGANIC_DATA[String(id)] :
               window.JIA_DATA[String(id)]));
  var oldAnalysis = document.querySelector('.analysis-block');
  if (oldAnalysis) oldAnalysis.remove();
  function startQuestions(qs) {
    if (STATE.mode === 'quiz') { shuffleArray(qs); }
    STATE.questions = qs;
    STATE.current = 0;
    STATE.answers = [];
    STATE.done = false;
    document.getElementById('nav-row').style.display = 'flex';
    document.getElementById('result-area').style.display = 'none';
    goScreen('quiz-screen');
    renderQuestion();
  }
  if (src === 'jia' && window.JIA_DATA[String(id)] && window.JIA_DATA[String(id)].questions) {
    startQuestions(window.JIA_DATA[String(id)].questions);
  } else if (src === 'organic' && window.ORGANIC_DATA[String(id)] && window.ORGANIC_DATA[String(id)].questions) {
    startQuestions(window.ORGANIC_DATA[String(id)].questions);
  } else if (src === 'zhian') {
    loadChapterQuestions('../data/raw/' + chData.file).then(function(qs) {
      qs.forEach(function(q) { q._ch = id; });
      startQuestions(qs);
    });
  } else {
    loadChapterQuestions('../data/raw/' + chData.file).then(function(qs) {
      startQuestions(qs);
    });
  }
}


function renderQuestion() {

  // 先移除舊的解析區塊

  var oldAnalysis = document.querySelector('.analysis-block');

  if (oldAnalysis) oldAnalysis.remove();

  

  var q = STATE.questions[STATE.current];

  var total = STATE.questions.length;

  document.getElementById('progress-fill').style.width = ((STATE.current+1)/total*100)+'%';

  document.getElementById('question-counter').textContent = (STATE.current+1)+' / '+total;



  var opts = ['A','B','C','D'];



  var html = '<div class="question-text">'+escHtml(q.question)+'</div>';

  

  // 錯題本模式顯示錯誤次數

  if (q._mistake) {

    html += '<div style="margin-bottom:12px;padding:8px;background:#fef5e7;border-radius:8px;font-size:.85rem;color:#d35400;display:inline-block">⚠️ 已答錯 '+q._wrongCount+' 次</div>';

  }

  

  var answered = STATE.answers[STATE.current];

  var showAnswer = (STATE.mode === 'practice' || STATE.mode === 'mistake') && answered !== undefined;

  
  var correctAnswer = q.answer;
  

  opts.forEach(function(o) {

    var isSelected = answered === o;

    var optClass = '';

    if (showAnswer) {

      if (correctAnswer === o) optClass = ' correct';

      else if (isSelected) optClass = ' wrong';

    } else {

      if (isSelected) optClass = ' selected';

    }

    html += '<button class="option-btn'+optClass+'" onclick="selectOption(\''+o+'\')">' +

      '<strong>'+o+'. </strong>'+escHtml(q.options[o])+'</button>';

  });



  document.getElementById('question-area').innerHTML = html;

  document.getElementById('btnPrev').style.visibility = STATE.current > 0 ? 'visible' : 'hidden';

  document.getElementById('btnNext').textContent = STATE.current < total-1 ? '下一題 →' : '查看結果';

}



function selectOption(opt) {

  var q = STATE.questions[STATE.current];

  STATE.answers[STATE.current] = opt;

  

  // 答案比對：一般業答案是字母（A/B/C/D），甲業答案是數字（1/2/3/4）

  var isCorrect = false;

  if (q.answer === 'A' || q.answer === 'B' || q.answer === 'C' || q.answer === 'D') {

    // 一般業：直接比對字母

    isCorrect = (opt === q.answer);

  }

  // 記錄答錯的題目到錯題本

  if (!isCorrect) {

    var key = (q._ch || STATE.chId) + '_' + q.id;

    var src = CURRENT_SOURCE;

    if (!MISTAKE_BOOK[src]) MISTAKE_BOOK[src] = {};

    if (!MISTAKE_BOOK[src][key]) {

      MISTAKE_BOOK[src][key] = {

        ch: q._ch || STATE.chId,

        id: q.id,

        question: q.question,

        options: q.options,

        answer: q.answer,

        note: q.note || '',

        wrongCount: 0,

        lastWrong: new Date().toISOString()

      };

    }

    MISTAKE_BOOK[src][key].wrongCount++;

    MISTAKE_BOOK[src][key].lastWrong = new Date().toISOString();

    saveMistakeBook();

  }

  

  if (STATE.mode === 'practice') {

    renderQuestion();

    // 詳細解析區塊（答對答錯都顯示）

    if (q.note || q.analysis || q.law || q.tip) {

      // 先移除舊的解析區塊（如果有）

      var oldAnalysis = document.querySelector('.analysis-block');

      if (oldAnalysis) oldAnalysis.remove();

      

      var analysisDiv = document.createElement('div');

      analysisDiv.className = 'analysis-block';

      analysisDiv.style.cssText = 'margin-top:14px;padding:14px;background:#fef9e7;border-radius:8px;font-size:.9rem;border-left:4px solid #f1c40f';

      var html = '';

      if (q.analysis) {

        html += '<div style="margin-bottom:8px"><strong>📖 解析：</strong>'+q.analysis+'</div>';

      }

      if (q.law) {

        html += '<div style="margin-bottom:8px;color:#2980b9"><strong>⚖️ 法規出處：</strong>'+escHtml(q.law)+'</div>';

      }

      if (q.tip) {

        html += '<div style="color:#27ae60"><strong>💡 答題技巧：</strong>'+escHtml(q.tip)+'</div>';

      }

      if (!q.analysis && !q.law && !q.tip && q.note) {

        html += '<div>📝 '+escHtml(q.note)+'</div>';

      }

      analysisDiv.innerHTML = html;

      document.querySelector('.quiz-card').appendChild(analysisDiv);

    }

    // 自動跳題設定（預設關閉）

    if (SETTINGS.autoNext && STATE.current < STATE.questions.length - 1) {

      setTimeout(function() { nextQ(); }, 1500);

    }

  } else {

    // 小考/大考：只 highlight 選項，不跳題，可回頭修改

    renderQuestion();

  }

}



function nextQ() {

  // 小考/大考：未作答的題目不得跳過

  if (STATE.mode !== 'practice' && STATE.answers[STATE.current] === undefined) {

    alert('請先選一個答案');

    return;

  }

  if (STATE.current < STATE.questions.length - 1) {

    STATE.current++;

    // 移除舊的解析區塊

    var oldAnalysis = document.querySelector('.analysis-block');

    if (oldAnalysis) oldAnalysis.remove();

    renderQuestion();

  } else {

    showResult();

  }

}



function prevQ() {

  if (STATE.current > 0) {

    STATE.current--;

    // 移除舊的解析區塊

    var oldAnalysis = document.querySelector('.analysis-block');

    if (oldAnalysis) oldAnalysis.remove();

    renderQuestion();

  }

}



function showResult() {

  var total = STATE.questions.length;

  var correct = 0;

  STATE.questions.forEach(function(q, i) {

    if (STATE.answers[i] === q.answer) correct++;

  });

  var pct = Math.round(correct/total*100);

  goScreen('quiz-screen');

  document.getElementById('nav-row').style.display = 'none';

  document.getElementById('question-area').innerHTML = '';

  

  // 錯題本模式：移除已答對的題目

  var removeBtn = '';

  if (STATE.mode === 'mistake') {

    var wrongCount = total - correct;

    removeBtn = '<button class="nav-btn secondary" id="removeMasteredBtn" style="width:100%;margin-top:10px;background:#f39c12;color:white">移除 '+correct+' 題已掌握的題目</button>';

  }

  

  var res = '<div class="result-box"><div class="result-title">作答完成！</div>' +

    '<div class="mode-badge '+(STATE.mode==='practice'?'practice':STATE.mode==='quiz'?'quiz':STATE.mode==='mistake'?'mistake':'exam')+'">'+(STATE.mode==='practice'?'📖 練習':STATE.mode==='quiz'?'📝 小考':STATE.mode==='mistake'?'📕 錯題本':'🏆 大考')+'</div>' +

    '<div class="result-score">'+pct+'%</div>' +

    '<div class="result-detail">答對 '+correct+' / '+total+' 題</div>' +

    (pct >= APP_CONFIG.PASSING_SCORE_EXCELLENT ? '\u003cdiv style="color:#27ae60;font-weight:600;margin-bottom:12px;"\u003e🎉 表現優秀！\u003c/div\u003e' : pct >= APP_CONFIG.PASSING_SCORE_GOOD ? '\u003cdiv style="color:#f39c12;font-weight:600;margin-bottom:12px;"\u003e👍 繼續加油\u003c/div\u003e' : '\u003cdiv style="color:#e74c3c;font-weight:600;margin-bottom:12px;"\u003e💪 需要再加強\u003c/div\u003e') +

    '<button class="nav-btn primary" onclick="goHome()" style="width:100%;margin-top:8px">返回首頁</button>'+

    '<button class="nav-btn secondary" id="retakeBtn" style="width:100%;margin-top:10px">再考一次</button>'+

    removeBtn +

    '</div>' +

    renderWrongReview();

  document.getElementById('result-area').style.display = 'block';

  document.getElementById('result-area').innerHTML = res;

  

  // 錯題本模式：移除已掌握的題目

  if (STATE.mode === 'mistake') {

    var removeBtn = document.getElementById('removeMasteredBtn');

    if (removeBtn) {

      removeBtn.onclick = function() {

        var src = CURRENT_SOURCE;

        var removed = 0;

        STATE.questions.forEach(function(q, i) {

          if (STATE.answers[i] === q.answer) {

            var key = q._ch + '_' + q.id;

            if (MISTAKE_BOOK[src] && MISTAKE_BOOK[src][key]) {

              delete MISTAKE_BOOK[src][key];

              removed++;

            }

          }

        });

        // 清理空的題庫

        if (MISTAKE_BOOK[src] && Object.keys(MISTAKE_BOOK[src]).length === 0) {

          delete MISTAKE_BOOK[src];

        }

        saveMistakeBook();

        alert('已移除 '+removed+' 題已掌握的題目！');

        goHome();

      };

    }

  }

  

  // Record answered question IDs for exam mode

  if (STATE.mode === 'exam') {

    var src = CURRENT_SOURCE;

    if (!EXAM_HISTORY[src]) EXAM_HISTORY[src] = [];

    STATE.questions.forEach(function(q){

      var key = q._ch+'_'+q.id;

      if (EXAM_HISTORY[src].indexOf(key) < 0) EXAM_HISTORY[src].push(key);

    });

    saveExamHistory();

    var done = EXAM_HISTORY[src].length;

    var total = APP_CONFIG.TOTAL_QUESTIONS[src] || 0;

    var retakeBtn = document.getElementById('retakeBtn');

    if (retakeBtn) {

      retakeBtn.textContent = '再考一次 ('+done+'/'+total+' 已做過)';

      retakeBtn.onclick = function() {

        STATE.mode = 'exam';

        proceedMode();

      };

    }

  }

  

  // 更新進度追蹤

  var src = CURRENT_SOURCE;

  var chId = STATE.chId;

  if (src && chId) {

    updateProgress(src, chId, STATE.questions.length, STATE.answers.filter(function(a){return a!==undefined;}).length);

  }

  // For non-exam modes: override retake to re-run same chapter

  var normRetake = document.querySelector('#result-area .secondary');

  if (normRetake && normRetake.id !== 'removeMasteredBtn') normRetake.onclick = function() { 

    if (STATE.mode === 'mistake') {

      startMistakePractice(CURRENT_SOURCE);

    } else {

      selectChapter(STATE.chId); 

    }

  };

  document.getElementById('progress-fill').style.width = '100%';

}



function renderWrongReview() {

  var total = STATE.questions.length;

  var wrong = [];

  for (var i = 0; i < total; i++) {

    var q = STATE.questions[i];

    var answered = STATE.answers[i];

    var isCorrect = (answered === q.answer);

    if (!isCorrect) {

      wrong.push({q:q, answered:answered, idx:i});

    }

  }

  if (wrong.length === 0) return '';

  var html = '<div class="result-box" style="margin-top:16px;text-align:left">' +

    '<div class="result-title" style="text-align:center;margin-bottom:12px">📕 錯題詳解 ('+wrong.length+'/'+total+')</div>';

  wrong.forEach(function(item, widx) {

    var q = item.q;

    var opts = ['A','B','C','D'];
    var correctLetter = q.answer;
    var correctText = escHtml(opts.indexOf(correctLetter) >= 0 ? q.options[correctLetter] : 'N/A');

    var userLetter = item.answered || '未作答';

    var userText = '';

    if (item.answered && opts.indexOf(item.answered) >= 0) userText = '（' + escHtml(q.options[item.answered]) + '）';

    html += '<div style="margin-bottom:16px;padding:14px;background:#fdf2f1;border-radius:8px;border-left:4px solid #e74c3c" class="wrong-item">' +

      '<div style="font-weight:700;color:#2c3e50;margin-bottom:8px;">❌ '+(widx+1)+'. '+escHtml(q.question)+'</div>' +

      '<div style="font-size:.9rem;margin-bottom:6px">👤 你的答案：<span style="color:#e74c3c;font-weight:600">'+userLetter+'</span>'+userText+'</div>' +

      '<div style="font-size:.9rem;margin-bottom:8px">✅ 正確答案：<span style="color:#27ae60;font-weight:600">'+correctLetter+'</span>（'+correctText+'）</div>' +

      (q.analysis ? '<div style="font-size:.9rem;margin-bottom:6px;padding:8px;background:#fff;border-radius:6px"><strong>📖 解析：</strong>'+escHtml(q.analysis)+'</div>' : '') +

      (q.law ? '<div style="font-size:.85rem;color:#2980b9;margin-bottom:6px"><strong>⚖️ 法規出處：</strong>'+escHtml(q.law)+'</div>' : '') +

      (q.tip ? '<div style="font-size:.85rem;color:#27ae60"><strong>💡 技巧：</strong>'+escHtml(q.tip)+'</div>' : '') +

      '</div>';

  });

  html += '</div>';

  return html;

}



function shuffleArray(arr) {

  for (var i = arr.length - 1; i > 0; i--) {

    var j = Math.floor(Math.random() * (i + 1));

    var tmp = arr[i]; arr[i] = arr[j]; arr[j] = tmp;

  }

}



function goHome() {

  STATE = {screen:'home',mode:null,chId:null,questions:[],current:0,answers:[],done:false};

  CURRENT_SOURCE = null;

  document.getElementById('result-area').style.display = 'none';

  document.querySelector('.banner p').textContent = '請選擇題庫';

  updateMistakeCount();

  goScreen('home');

}



function updateMistakeCount() {

  var total = 0;

  for (var src in MISTAKE_BOOK) {

    for (var k in MISTAKE_BOOK[src]) total++;

  }

  var el = document.getElementById('mistake-count');

  if (el) el.textContent = total + ' 題待加強';

}



function openMistakeBook() {

  var total = 0;

  for (var src in MISTAKE_BOOK) {

    for (var k in MISTAKE_BOOK[src]) total++;

  }

  // 選擇要練習哪個題庫的錯題

  var html = '<div class="card-grid">';

  if (MISTAKE_BOOK['luo']) {

    var luoCount = Object.keys(MISTAKE_BOOK['luo']).length;

    html += '<div class="mode-card" onclick="startMistakePractice(\'luo\')">' +

      '<div style="font-size:2rem">📘</div>' +

      '<h2>一般業錯題</h2>' +

      '<p>'+luoCount+' 題</p>' +

      '</div>';

  }

  if (MISTAKE_BOOK['jia']) {

    var jiaCount = Object.keys(MISTAKE_BOOK['jia']).length;

    html += '<div class="mode-card" onclick="startMistakePractice(\'jia\')">' +

      '<div style="font-size:2rem">📗</div>' +

      '<h2>甲業錯題</h2>' +

      '<p>'+jiaCount+' 題</p>' +

      '</div>';

  }

  html += '</div>';

  // 顯示提示或清空按鈕

  if (total === 0) {

    html += '<p style="text-align:center;color:#666;margin:20px 0;">錯題本目前是空的，先去練習或考試答錯題目會自動加入！</p>';

  }

  // 新增清空按鈕

  html += '<div style="margin-top:20px;text-align:center;">' +

    '<button onclick="clearMistakeBook()" style="background:#dc3545;color:white;border:none;padding:12px 24px;border-radius:8px;font-size:1rem;cursor:pointer;">🗑️ 清空錯題本</button>' +

    '</div>';

  document.getElementById('chapter-list').innerHTML = html;

  goScreen('chapter-select');

}



function clearMistakeBook() {

  if (confirm('確定要清空所有錯題記錄嗎？此操作無法復原！')) {

    MISTAKE_BOOK = {};

    saveMistakeBook();

    alert('錯題本已清空！');

    goScreen('home');

    updateMistakeCount();

  }

}



function startMistakePractice(src) {

  CURRENT_SOURCE = src;

  document.querySelector('.banner p').textContent = SOURCE_NAMES[src] + ' - 錯題本';

  var mistakes = MISTAKE_BOOK[src] || {};

  var qs = [];

  for (var k in mistakes) {

    var m = mistakes[k];

    qs.push({

      _ch: m.ch,

      id: m.id,

      question: m.question,

      options: m.options,

      answer: m.answer,

      note: m.note,

      _mistake: true,

      _wrongCount: m.wrongCount

    });

  }

  shuffleArray(qs);

  STATE.questions = qs;

  STATE.current = 0;

  STATE.answers = [];

  STATE.done = false;

  STATE.chId = 'mistake';

  STATE.mode = 'mistake';

  document.getElementById('nav-row').style.display = 'flex';

  document.getElementById('result-area').style.display = 'none';

  goScreen('quiz-screen');

  renderQuestion();

}



// 鍵盤快捷鍵功能

var KEYBOARD_SHORTCUTS_ENABLED = true;



document.addEventListener('keydown', function(e) {

  // 如果是在輸入框中，不啟用快捷鍵

  if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') {

    return;

  }

  

  // 檢查是否在答題畫面

  var isQuizScreen = document.getElementById('quiz-screen').classList.contains('active');

  if (!isQuizScreen || !KEYBOARD_SHORTCUTS_ENABLED) {

    return;

  }

  

  // 數字鍵 1-4 或字母鍵 A-D 選擇答案

  if (e.key >= '1' && e.key <= '4') {

    var optionIndex = parseInt(e.key) - 1;

    var options = ['A', 'B', 'C', 'D'];

    selectOptionWithKeyboard(options[optionIndex]);

  } else if (e.key.toLowerCase() >= 'a' && e.key.toLowerCase() <= 'd') {

    selectOptionWithKeyboard(e.key.toUpperCase());

  }

  

  // Enter 鍵：下一題 或 查看結果

  if (e.key === 'Enter') {

    var answered = STATE.answers[STATE.current];

    if (answered !== undefined) {

      // 已答題，進入下一題

      if (STATE.current < STATE.questions.length - 1) {

        nextQ();

      } else {

        showResult();

      }

    }

  }

  

  // 方向鍵：切換題目

  if (e.key === 'ArrowRight' || e.key === 'ArrowDown') {

    if (STATE.current < STATE.questions.length - 1) {

      nextQ();

    }

  }

  if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') {

    if (STATE.current > 0) {

      prevQ();

    }

  }

  

  // Space 鍵：顯示/隱藏解析（練習模式）

  if (e.key === ' ' && STATE.mode === 'practice') {

    e.preventDefault(); // 防止頁面滾動

    // 如果已經答題，顯示解析（已自動顯示）

  }

});



// 用鍵盤選擇答案

function selectOptionWithKeyboard(opt) {

  var q = STATE.questions[STATE.current];

  if (!q) return;

  

  // 如果已經答題（練習模式），不重複選擇

  if (STATE.answers[STATE.current] !== undefined && STATE.mode === 'practice') {

    return;

  }

  

  // 模擬按鈕點擊

  var buttons = document.querySelectorAll('.option-btn');

  for (var i = 0; i < buttons.length; i++) {

    var btn = buttons[i];

    var btnText = btn.textContent.trim();

    if (btnText.indexOf(opt + '.') === 0) {

      btn.click();

      break;

    }

  }

}



if (document.readyState === 'loading') {

  document.addEventListener('DOMContentLoaded', init);

} else {

  init();

}
