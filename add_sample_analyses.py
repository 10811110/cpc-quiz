#!/usr/bin/env python3
"""
填寫範例題目解析內容
展示解析、法規出處、答題技巧功能
"""

import json

def add_sample_analyses():
    # 更新 chapter1.json 的前 3 題作為範例
    with open('/tmp/cpc-quiz-analysis/chapter1.json', 'r', encoding='utf-8') as f:
        data = json.load(f)
    
    # 第 1 題範例
    data['questions'][0]['analysis'] = '組織溝通協調需要共同語言與專業背景，專業訓練互異會導致溝通障礙。'
    data['questions'][0]['law'] = '企業管理學 - 組織溝通理論'
    data['questions'][0]['tip'] = '關鍵字「阻力」→ 找負面選項，「互異」、「缺乏」都是負面詞'
    
    # 第 2 題範例
    data['questions'][1]['analysis'] = '部屬與上司因職位不同，角色地位有差異，這是溝通中最基本的障礙因素。'
    data['questions'][1]['law'] = '企業管理學 - 層級溝通'
    data['questions'][1]['tip'] = '「部屬對上司」→ 直接聯想「角色地位不同」'
    
    # 第 3 題範例
    data['questions'][2]['analysis'] = '雙向溝通需要講述、傾聽、瞭解三個要素，主觀是單向溝通的特徵。'
    data['questions'][2]['law'] = '溝通理論 - 雙向溝通模型'
    data['questions'][2]['tip'] = '題目問「不屬於」→ 找負面選項，「主觀」是溝通障礙'
    
    with open('/tmp/cpc-quiz-analysis/chapter1.json', 'w', encoding='utf-8') as f:
        json.dump(data, f, ensure_ascii=False, indent=2)
    
    print("✓ 已更新 chapter1.json 前 3 題作為範例")
    print("  包含解析、法規出處、答題技巧")

if __name__ == '__main__':
    add_sample_analyses()
