#!/usr/bin/env python3
"""解析職安學科 PDF 題庫 - 技術士技能檢定格式"""
import pymupdf
import re
import json

PDF_PATH = "/home/ben900415/.hermes/cache/documents/doc_4a26d16dfc6d_職安學科.pdf"
OUTPUT_PATH = "/home/ben900415/cpc-quiz/chapter_zhian.json"

def parse_pdf():
    doc = pymupdf.open(PDF_PATH)
    print(f"📖 PDF 總頁數：{len(doc)}")
    
    # 收集所有頁面文字
    all_text = ""
    for i in range(len(doc)):
        all_text += doc[i].get_text()
    
    # 移除頁碼
    all_text = re.sub(r'Page \d+ of \d+', '', all_text)
    
    questions = []
    # 答案數字映射
    ans_map = {'1':'A', '2':'B', '3':'C', '4':'D'}
    # 選項符號映射
    opt_map = {'①':'A', '②':'B', '③':'C', '④':'D'}
    
    # 找所有題目起始位置
    q_starts = []
    for m in re.finditer(r'(?:^|\n)(\d+)\.\s*\((\d)\)', all_text):
        q_starts.append((m.start(), int(m.group(1)), int(m.group(2))))
    
    print(f"📊 找到 {len(q_starts)} 個題目")
    
    # 選項正則
    opt_pattern = re.compile(r'([①②③④])([^①②③④]+)', re.DOTALL)
    
    for i, (start, q_num, ans_num) in enumerate(q_starts):
        # 題目範圍：從當前題開始到下一題之前
        end = q_starts[i+1][0] if i+1 < len(q_starts) else len(all_text)
        q_block = all_text[start:end]
        
        # 提取題目文字
        match = re.match(r'(?:^|\n)\d+\.\s*\(\d\)\s*\n?(.+?)(?=①)', q_block, re.DOTALL)
        if not match:
            print(f"⚠️ Q{q_num}: 題目文字提取失敗")
            continue
        
        q_text = match.group(1).strip()
        
        # 解析選項
        opts = {}
        for opt_match in opt_pattern.finditer(q_block):
            key = opt_map.get(opt_match.group(1))
            if key:
                val = opt_match.group(2).strip()
                # 清理尾部和多餘空白
                val = re.sub(r'\s+', ' ', val)
                val = re.sub(r'\s+。', '。', val)
                val = re.sub(r'[。．\s]+$', '', val)
                opts[key] = val
        
        # 清理題目文字
        clean_q = re.sub(r'\s+', ' ', q_text)
        clean_q = clean_q.strip()
        
        ans = ans_map.get(str(ans_num), 'A')
        
        questions.append({
            'id': q_num,
            'question': clean_q,
            'options': opts,
            'answer': ans,
            'analysis': f'本題正確答案為{ans}。',
            'law': '職業安全衛生相關法規',
            'tip': '熟記題目關鍵字，多練習類似題型'
        })
    
    # 輸出 JSON
    data = {
        'chapter': '技術士技能檢定職業安全衛生共同科目',
        'note': '勞動部勞動力發展署技能檢定學科測試參考資料',
        'total_questions': len(questions),
        'questions': questions
    }
    
    with open(OUTPUT_PATH, 'w', encoding='utf-8') as f:
        json.dump(data, f, ensure_ascii=False, indent=2)
    
    print(f"✅ 已解析 {len(questions)} 題")
    print(f"📁 輸出至：{OUTPUT_PATH}")
    
    # 檢查問題
    issues = []
    for q in questions:
        for k in ['A', 'B', 'C', 'D']:
            if k not in q['options'] or not q['options'].get(k, '').strip():
                issues.append(f"Q{q['id']} option {k} is empty")
        if q['answer'] not in ['A', 'B', 'C', 'D']:
            issues.append(f"Q{q['id']} bad answer: {q['answer']}")
    
    if issues:
        print(f"\n⚠️ 發現 {len(issues)} 個問題：")
        for issue in issues[:10]:
            print(f"  - {issue}")
    else:
        print("✅ 沒有發現問題")
    
    # 顯示前 3 題預覽
    print("\n📋 前 3 題預覽：")
    for q in questions[:3]:
        print(f"\nQ{q['id']}: {q['question'][:60]}...")
        print(f"  選項：{q['options']}")
        print(f"  答案：{q['answer']}")
    
    return data

if __name__ == '__main__':
    parse_pdf()
