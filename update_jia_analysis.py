#!/usr/bin/env python3
"""
更新甲業題庫解析欄位並嵌入到 index.html
"""

import json
import re
import os
from pathlib import Path

def main():
    work_dir = Path('/tmp/cpc-quiz-analysis')
    src_dir = Path('/home/ben900415/題庫練習網頁')
    
    # 讀取並更新甲業題庫
    with open(src_dir / '甲業總複習.json', 'r', encoding='utf-8') as f:
        jia_data = json.load(f)
    
    # 為每題新增解析欄位
    updated_count = 0
    for key in jia_data:
        for q in jia_data[key].get('questions', []):
            if 'analysis' not in q:
                q['analysis'] = ''
                q['law'] = ''
                q['tip'] = ''
                updated_count += 1
    
    # 寫入 chapterA1.json 到工作目錄
    with open(work_dir / 'chapterA1.json', 'w', encoding='utf-8') as f:
        json.dump(jia_data, f, ensure_ascii=False, indent=2)
    
    print(f"✓ 已更新甲業題庫 {updated_count} 題")
    
    # 讀取 index.html
    with open(work_dir / 'index.html', 'r', encoding='utf-8') as f:
        html_content = f.read()
    
    # 替換 quizData2 (甲業題庫)
    new_quiz_data2 = json.dumps(jia_data, ensure_ascii=False)
    pattern2 = r'(<textarea id="quizData2" style="display:none">\n).+?(\n</textarea>)'
    replacement2 = f'\\g<1>{new_quiz_data2}\\g<2>'
    html_content = re.sub(pattern2, replacement2, html_content, flags=re.DOTALL)
    
    # 寫回 index.html
    with open(work_dir / 'index.html', 'w', encoding='utf-8') as f:
        f.write(html_content)
    
    print("✓ 已更新 index.html 中的 quizData2（甲業題庫）")

if __name__ == '__main__':
    main()
