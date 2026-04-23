#!/usr/bin/env python3
"""
批量更新題目 JSON，新增解析欄位（analysis, law, tip）
保留原有的 note 欄位，新增空字串欄位供後續填寫
"""

import json
import os
from pathlib import Path

def update_chapter_file(filepath):
    """更新單一章節檔案"""
    with open(filepath, 'r', encoding='utf-8') as f:
        data = json.load(f)
    
    updated_count = 0
    for q in data.get('questions', []):
        # 新增解析欄位（如果不存在）
        if 'analysis' not in q:
            q['analysis'] = ''
            updated_count += 1
        if 'law' not in q:
            q['law'] = ''
        if 'tip' not in q:
            q['tip'] = ''
    
    with open(filepath, 'w', encoding='utf-8') as f:
        json.dump(data, f, ensure_ascii=False, indent=2)
    
    return updated_count

def main():
    # 工作目錄
    work_dir = Path('/tmp/cpc-quiz-analysis')
    os.chdir(work_dir)
    
    # 更新所有 chapter*.json 檔案
    chapter_files = sorted(work_dir.glob('chapter*.json'))
    
    total_updated = 0
    for filepath in chapter_files:
        count = update_chapter_file(filepath)
        print(f"✓ {filepath.name}: 更新 {count} 題")
        total_updated += count
    
    print(f"\n總計更新 {total_updated} 題")
    print("所有題目已新增 analysis, law, tip 欄位（預設為空字串）")
    print("可直接在 JSON 中填寫解析內容，或後續透過腳本/手動填寫")

if __name__ == '__main__':
    main()
