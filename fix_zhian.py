#!/usr/bin/env python3
"""修正職安學科題庫 - 清理選項中的多餘空白"""
import json
import re

JSON_PATH = "/home/ben900415/cpc-quiz/chapter_zhian.json"

def fix_spacing():
    with open(JSON_PATH, 'r', encoding='utf-8') as f:
        data = json.load(f)
    
    fixed_count = 0
    for q in data['questions']:
        # 清理題目文字中的多餘空白
        q['question'] = re.sub(r'\s+', '', q['question'])
        
        # 清理選項文字中的多餘空白
        for key in q['options']:
            # 移除所有空白（中文不需要空格）
            q['options'][key] = re.sub(r'\s+', '', q['options'][key])
            fixed_count += 1
    
    with open(JSON_PATH, 'w', encoding='utf-8') as f:
        json.dump(data, f, ensure_ascii=False, indent=2)
    
    print(f"✅ 已修正 {fixed_count} 個欄位的空白問題")
    return data

if __name__ == '__main__':
    data = fix_spacing()
    
    # 顯示前 3 題預覽
    print("\n📋 修正後前 3 題預覽：")
    for q in data['questions'][:3]:
        print(f"\nQ{q['id']}: {q['question']}")
        print(f"  選項：{q['options']}")
        print(f"  答案：{q['answer']}")
