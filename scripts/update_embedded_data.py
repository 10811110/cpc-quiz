#!/usr/bin/env python3
"""
更新 web/index.html 中嵌入的題目資料（使用 data/raw/chapters.json）
"""

import json
import re
from pathlib import Path

def main():
    work_dir = Path(__file__).resolve().parent.parent
    
    # 讀取 data/raw/chapters.json（一般業）
    with open(work_dir / 'data/raw/chapters.json', 'r', encoding='utf-8') as f:
        chapters_data = json.load(f)
    
    # 讀取甲業題庫
    with open(work_dir / 'data/raw/甲業總複習.json', 'r', encoding='utf-8') as f:
        jia_data = json.load(f)
    
    # 讀取 web/index.html
    with open(work_dir / 'web/index.html', 'r', encoding='utf-8') as f:
        html_content = f.read()
    
    # 替換 quizData（一般業）
    new_quiz_data = json.dumps(chapters_data, ensure_ascii=False)
    pattern = r'(<script type="application/json" id="quizData">).+?(</script>)'
    replacement = f'\\g<1>{new_quiz_data}\\g<2>'
    html_content = re.sub(pattern, replacement, html_content, flags=re.DOTALL)
    
    # 替換 quizData2（甲業）
    new_quiz_data2 = json.dumps(jia_data, ensure_ascii=False)
    pattern2 = r'(<textarea id="quizData2" style="display:none">\n).+?(\n</textarea>)'
    replacement2 = f'\\g<1>{new_quiz_data2}\\g<2>'
    html_content = re.sub(pattern2, replacement2, html_content, flags=re.DOTALL)
    
    # 寫回 web/index.html
    tmp = str(work_dir / 'web/index.html') + '.tmp'
    with open(tmp, 'w', encoding='utf-8') as f:
        f.write(html_content)
    os.replace(tmp, work_dir / 'web/index.html')
    
    print("✓ 已更新 web/index.html 中的嵌入資料")
    print(f"  一般業：{len(chapters_data)} 章，{sum(c['total_questions'] for c in chapters_data.values())} 題")
    print(f"  甲業：{jia_data['A']['total_questions']} 題")

if __name__ == '__main__':
    main()
