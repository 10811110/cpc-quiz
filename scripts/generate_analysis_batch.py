#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
批量生成有機溶劑題庫詳解 - Batch 10題一次 + 獨立JSON保存

用法:
  python3 generate_analysis_batch.py --chapter 1 --start 0 --batch_size 10
  python3 generate_analysis_batch.py --all
"""
import json, re, argparse, subprocess, sys, os, time

OLLAMA_URL = os.environ.get('OLLAMA_HOST', 'http://localhost:11434')
MODEL = 'kimi-k2.6:cloud'
QUIZ_DIR = '/home/ben900415/cpc-quiz'
INDEX_HTML = f'{QUIZ_DIR}/web/index.html'
ORGANIC_JSON = f'{QUIZ_DIR}/data/raw/organic_solvent.json'
LAWS_DIR = f'{QUIZ_DIR}/職安法_txt'

def load_or_extract_json():
    """載入獨立JSON，若不存在則從web/index.html抽出"""
    if os.path.exists(ORGANIC_JSON):
        with open(ORGANIC_JSON, 'r', encoding='utf-8') as f:
            return json.load(f)
    
    with open(INDEX_HTML, 'r', encoding='utf-8') as f:
        html = f.read()
    m = re.search(r'<textarea id="quizData3"[^>]*>(.*?)</textarea>', html, re.DOTALL)
    if not m:
        raise ValueError("找不到 quizData3")
    data = json.loads(m.group(1))
    save_json(data)
    print(f"已從 web/index.html 抽出到 {ORGANIC_JSON}")
    return data

def save_json(data):
    """保存獨立JSON"""
    with open(ORGANIC_JSON, 'w', encoding='utf-8') as f:
        json.dump(data, f, ensure_ascii=False, separators=(',', ':'))

def save_back_to_html(data):
    """將獨立JSON寫回 web/index.html"""
    with open(INDEX_HTML, 'r', encoding='utf-8') as f:
        html = f.read()
    
    json_str = json.dumps(data, ensure_ascii=False, separators=(',', ':'))
    new_html = re.sub(
        r'(<textarea id="quizData3"[^>]*>).*?(</textarea>)',
        r'\1' + json_str + r'\2',
        html,
        flags=re.DOTALL
    )
    
    import shutil
    suffix = time.strftime('%Y%m%d_%H%M%S')
    shutil.copy2(INDEX_HTML, f"{INDEX_HTML}.{suffix}.bak")
    
    with open(INDEX_HTML, 'w', encoding='utf-8') as f:
        f.write(new_html)
    print(f"已同步回寫 web/index.html，備份於 {INDEX_HTML}.{suffix}.bak")

def read_laws():
    """讀取所有法規文字"""
    texts = []
    for f in sorted(os.listdir(LAWS_DIR)):
        if f.endswith('.txt'):
            with open(os.path.join(LAWS_DIR, f), 'r', encoding='utf-8') as fh:
                texts.append(f"--- {f} ---\n{fh.read()}")
    full = "\n\n".join(texts)
    return full[:12000]  # 取前 12000 字

def call_model(prompt, timeout=300):
    """呼叫 Ollama generate via urllib (避免 subprocess timeout)"""
    import urllib.request
    payload = json.dumps({
        "model": MODEL,
        "prompt": prompt,
        "stream": False,
        "options": {"temperature": 0.2}
    }).encode('utf-8')

    req = urllib.request.Request(
        f"{OLLAMA_URL}/api/generate",
        data=payload,
        headers={'Content-Type': 'application/json'},
        method='POST'
    )

    start = time.time()
    try:
        resp = urllib.request.urlopen(req, timeout=timeout)
        data = json.loads(resp.read())
        elapsed = time.time() - start
        return data.get("response", "").strip(), elapsed
    except Exception as e:
        elapsed = time.time() - start
        print(f"  [error] API 失敗 ({elapsed:.1f}s): {type(e).__name__}")
        return "", elapsed

def build_batch_prompt(questions, law_context):
    """為一批題目建構 prompt"""
    questions_text = []
    for i, q in enumerate(questions):
        opts_text = "\n".join([f"    {k}. {v}" for k, v in q['options'].items()])
        questions_text.append(
            f"[第{i+1}題]\n"
            f"題目: {q['question']}\n"
            f"選項:\n{opts_text}\n"
            f"正確答案: {q.get('answer','?')}\n"
        )
    
    questions_block = "\n---\n".join(questions_text)
    
    return f"""你是台灣職業安全衛生法規專家。請根據以下法規，為每一道有機溶劑題目撰寫簡潔正確的詳解。

【法規參考】
{law_context}

【題目】
{questions_block}

【輸出格式】
對每道題目，請以下列格式輸出：
第1題: [詳解內容1~3句話]
第2題: [詳解內容1~3句話]
...
第{len(questions)}題: [詳解內容1~3句話]

注意：
- 只輸出詳解，不要重複題目
- 說明為何答案正確，可引用法規條文概念
- 每題詳解保持簡潔（30~80中文字）
- 確保每行以「第N題:」開頭
"""

def parse_batch_response(response, num_questions):
    """解析模型回傳，提取每題詳解"""
    results = []
    for i in range(1, num_questions + 1):
        # 多種格式匹配
        patterns = [
            rf'第{i}題[:：]\s*(.+?)(?=\n第{i+1}題|\Z)',
            rf'第\s*{i}\s*題[:：]?\s*(.+?)(?=\n第\s*{i+1}\s*題|\Z)',
            rf'\[{i}\][:：]\s*(.+?)(?=\n\[{i+1}\]|\Z)',
        ]
        for pat in patterns:
            m = re.search(pat, response, re.DOTALL)
            if m:
                text = m.group(1).strip().replace('\n', ' ').replace('  ', ' ')
                if 3 <= len(text) <= 200:
                    results.append(text)
                    break
        else:
            results.append("")  # 沒找到
    return results

def process_chapter(data, chapter_id, law_context, batch_size=10, dry_run=False):
    """處理單一章節"""
    ch = data.get(str(chapter_id))
    if not ch:
        print(f"找不到第 {chapter_id} 章")
        return 0
    
    questions = ch.get('questions', [])
    # 找出需要補詳解的題目
    needed = []
    for i, q in enumerate(questions):
        analysis = q.get('analysis', '') or ''
        is_empty = not analysis or analysis.strip() == '' or len(analysis.strip()) <= 3 or analysis.strip().isdigit()
        if is_empty and q.get('answer'):
            needed.append((i, q))
    
    if not needed:
        print(f"第 {chapter_id} 章: 所有題目已有詳解或無答案，跳過")
        return 0
    
    print(f"第 {chapter_id} 章: 共 {len(questions)} 題，需要補詳解 {len(needed)} 題，batch size={batch_size}")
    
    total_updated = 0
    for batch_start in range(0, len(needed), batch_size):
        batch_items = needed[batch_start:batch_start+batch_size]
        batch_qs = [q for _, q in batch_items]
        
        print(f"  [batch {batch_start//batch_size + 1}/{(len(needed)-1)//batch_size + 1}] "
              f"索引 {batch_start+1}~{min(batch_start+batch_size, len(needed))} 生成中...", end='', flush=True)
        
        if dry_run:
            print(" (dry run)")
            continue
        
        prompt = build_batch_prompt(batch_qs, law_context)
        response, elapsed = call_model(prompt)
        
        if not response:
            print(f" ❌ 失敗 ({elapsed:.1f}s)")
            continue
        
        results = parse_batch_response(response, len(batch_qs))
        
        success_count = 0
        for (idx, _), analysis in zip(batch_items, results):
            if analysis:
                questions[idx]['analysis'] = analysis
                success_count += 1
            else:
                print(f"\n    ⚠ 第 {idx+1} 題 (ID={questions[idx]['id']}) 未返回詳解")
        
        print(f" ✅ {success_count}/{len(batch_qs)} 成功 ({elapsed:.1f}s)")
        total_updated += success_count
        
        # 每個 batch 後保存
        save_json(data)
        time.sleep(1)  # 避免過載
    
    return total_updated

def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('--chapter', type=str, default=None, help='指定章節（1-7）')
    parser.add_argument('--start', type=int, default=0, help='章節內起始索引')
    parser.add_argument('--batch_size', type=int, default=10, help='每批次題數')
    parser.add_argument('--all', action='store_true', help='處理全部章節')
    parser.add_argument('--sync', action='store_true', help='處理完後同步回 web/index.html')
    parser.add_argument('--dry-run', action='store_true', help='只統計，不實際生成')
    args = parser.parse_args()

    print(f"載入題庫...")
    data = load_or_extract_json()
    
    if args.dry_run:
        print("\n=== 乾跑模式：統計缺失狀況 ===")
        for ch_id in ['1','2','3','4','5','6','7']:
            ch = data.get(ch_id)
            if not ch:
                continue
            questions = ch['questions']
            empty_count = sum(1 for q in questions 
                              if (not q.get('analysis') or len(q.get('analysis','')) <= 3 or q.get('analysis','').strip().isdigit())
                              and q.get('answer'))
            no_ans = sum(1 for q in questions if not q.get('answer'))
            print(f"第 {ch_id} 章: {len(questions)}題, 需補詳解:{empty_count}, 無答案:{no_ans}")
        return

    print(f"讀取法規上下文（前 15000 字）...")
    law_context = read_laws()

    chapters_to_process = ['1','2','3','4','5','6','7'] if args.all else [args.chapter]
    
    total_updated = 0
    for ch_id in chapters_to_process:
        if ch_id not in data:
            print(f"跳過不存在的章節 {ch_id}")
            continue
        updated = process_chapter(data, ch_id, law_context, args.batch_size, args.dry_run)
        total_updated += updated
        print()
    
    # 最終保存
    save_json(data)
    print(f"獨立 JSON 已保存: {ORGANIC_JSON}")
    
    if args.sync or args.all:
        save_back_to_html(data)
        print(f"web/index.html 已同步更新")
    
    print(f"\n總計更新: {total_updated} 題詳解")

if __name__ == '__main__':
    main()
