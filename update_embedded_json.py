#!/usr/bin/env python3
"""
更新 index.html 中嵌入的 quizData JSON
將 chapter*.json 的完整資料（包含解析欄位）嵌入到 index.html
"""

import json
import re
from pathlib import Path

def main():
    work_dir = Path('/tmp/cpc-quiz-analysis')
    os.chdir(work_dir)
    
    # 讀取所有 chapter*.json (一般業 17 章)
    chapters_data = {}
    for i in range(1, 18):
        with open(f'chapter{i}.json', 'r', encoding='utf-8') as f:
            ch_data = json.load(f)
            # 移除 total_questions 和 note 之外的頂層欄位
            chapters_data[str(i)] = {
                'chapter': ch_data['chapter'],
                'note': ch_data.get('note', ''),
                'total_questions': ch_data['total_questions'],
                'questions': ch_data['questions']
            }
    
    # 讀取甲業題庫 chapterA*.json (20 章)
    jia_chapters = {}
    for ch_key in ['A1', 'A2', 'A3', 'A4', 'A5', 'A6', 'A7', 'A8', 'A9', 'A10',
                   'A11', 'A12', 'A13', 'A14', 'A15', 'A16', 'A17', 'A18', 'A19', 'A20']:
        filepath = work_dir / f'chapter{ch_key}.json'
        if filepath.exists():
            with open(filepath, 'r', encoding='utf-8') as f:
                ch_data = json.load(f)
                jia_chapters[ch_key] = {
                    'chapter': ch_data['chapter'],
                    'total_questions': ch_data['total_questions'],
                    'questions': ch_data['questions']
                }
    
    # 讀取 index.html
    with open('index.html', 'r', encoding='utf-8') as f:
        html_content = f.read()
    
    # 替換 quizData
    new_quiz_data = json.dumps(chapters_data, ensure_ascii=False)
    # 使用正則表達式替換 quizData 內容
    pattern = r'(<script type="application/json" id="quizData">).+?(</script>)'
    replacement = f'\\g<1>{new_quiz_data}\\g<2>'
    html_content = re.sub(pattern, replacement, html_content, flags=re.DOTALL)
    
    # 替換 quizData2 (甲業題庫)
    new_quiz_data2 = json.dumps(jia_chapters, ensure_ascii=False)
    pattern2 = r'(<textarea id="quizData2" style="display:none">\n).+?(\n</textarea>)'
    replacement2 = f'\\g<1>{new_quiz_data2}\\g<2>'
    html_content = re.sub(pattern2, replacement2, html_content, flags=re.DOTALL)
    
    # 寫回 index.html
    with open('index.html', 'w', encoding='utf-8') as f:
        f.write(html_content)
    
    print("✓ 已更新 index.html 中的 quizData 和 quizData2")
    print(f"  一般業：{len(chapters_data)} 章")
    print(f"  甲業：{len(jia_chapters)} 章")

if __name__ == '__main__':
    import os
    main()
