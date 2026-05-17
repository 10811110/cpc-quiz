#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
批量生成有機溶劑題庫詳解
用法: python3 generate_analysis.py --chapter 1 --start 0 --count 10
"""
import json, re, argparse, subprocess, sys, os

OLLAMA_URL = os.environ.get('OLLAMA_HOST', 'http://localhost:11434')
MODEL = 'kimi-k2.6:cloud'
INDEX_HTML = '/home/ben900415/cpc-quiz/web/index.html'
LAWS_DIR = '/home/ben900415/cpc-quiz/職安法_txt'

def read_laws():
    """讀取所有法規文字，返回前 8000 字作為 context"""
    texts = []
    for f in sorted(os.listdir(LAWS_DIR)):
        if f.endswith('.txt'):
            with open(os.path.join(LAWS_DIR, f), 'r', encoding='utf-8') as fh:
                texts.append(f"--- {f} ---\n{fh.read()}")
    full = "\n\n".join(texts)
    return full[:12000]  # 取前 12000 字

def load_quiz_data():
    with open(INDEX_HTML, 'r', encoding='utf-8') as f:
        html = f.read()
    m = re.search(r'<textarea id="quizData3"[^>]*>(.*?)</textarea>', html, re.DOTALL)
    if not m:
        raise ValueError("找不到 quizData3")
    return json.loads(m.group(1)), html

def save_quiz_data(data, original_html):
    new_json = json.dumps(data, ensure_ascii=False, separators=(',', ':'))
    new_html = re.sub(
        r'(<textarea id="quizData3"[^>]*>).*?(</textarea>)',
        r'\1' + new_json + r'\2',
        original_html,
        flags=re.DOTALL
    )
    # 備份
    import shutil
    shutil.copy2(INDEX_HTML, INDEX_HTML + '.bak')
    with open(INDEX_HTML, 'w', encoding='utf-8') as f:
        f.write(new_html)
    print(f"已更新 {INDEX_HTML}，備份於 {INDEX_HTML}.bak")

def call_model(prompt):
    """呼叫 Ollama generate"""
    payload = json.dumps({
        "model": MODEL,
        "prompt": prompt,
        "stream": False,
        "options": {"temperature": 0.3}
    })
    result = subprocess.run(
        ["curl", "-s", f"{OLLAMA_URL}/api/generate", "-d", payload],
        capture_output=True, text=True, encoding='utf-8'
    )
    try:
        resp = json.loads(result.stdout)
        return resp.get("response", "").strip()
    except:
        print(f"ERROR: {result.stdout[:200]}")
        return ""

def build_prompt(question, options, answer, law_context):
    opts_text = "\n".join([f"{k}. {v}" for k, v in options.items()])
    return f"""你是一位台灣職業安全衛生法規專家。請根據以下法規，為這道有機溶劑題目撰寫簡潔正確的詳解。

【法規參考】
{law_context[:6000]}

【題目】
{question}

【選項】
{opts_text}

【正確答案】{answer}

請只輸出詳解內容（1~3句話），說明為什麼此答案是正確的，可引用相關法規條文或概念。不要輸出題目、選項或答案。只輸出純文字詳解。"""

def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('--chapter', type=str, default='1', help='章節 ID')
    parser.add_argument('--start', type=int, default=0, help='起始題目索引（0-based）')
    parser.add_argument('--count', type=int, default=5, help='一次處理幾題')
    args = parser.parse_args()

    print(f"載入題庫與法規...")
    data, html = load_quiz_data()
    law_ctx = read_laws()

    ch = data.get(args.chapter)
    if not ch:
        print(f"找不到第 {args.chapter} 章")
        sys.exit(1)

    questions = ch.get('questions', [])
    end = min(args.start + args.count, len(questions))

    print(f"第 {args.chapter} 章共 {len(questions)} 題，處理索引 {args.start}~{end-1}")

    for i in range(args.start, end):
        q = questions[i]
        qid = q.get('id', i+1)
        question_text = q.get('question', '')
        options = q.get('options', {})
        answer = q.get('answer', '')
        current_analysis = q.get('analysis', '')

        if current_analysis and len(current_analysis) > 10 and not current_analysis.strip().isdigit():
            print(f"  [{i+1}/{end}] ID={qid} 已有詳解，跳過")
            continue

        print(f"  [{i+1}/{end}] ID={qid} 生成中... ", end='', flush=True)
        if not answer:
            print("跳過（無答案）")
            continue

        prompt = build_prompt(question_text, options, answer, law_ctx)
        analysis = call_model(prompt)

        # 清理輸出
        analysis = analysis.strip().replace('\n', ' ').replace('  ', ' ')
        if len(analysis) < 5:
            print(f"輸出過短，重試...")
            analysis = call_model(prompt)  # 重試一次
            analysis = analysis.strip().replace('\n', ' ').replace('  ', ' ')

        q['analysis'] = analysis
        print(f"→ {analysis[:60]}...")

    save_quiz_data(data, html)
    print("\n完成！")

if __name__ == '__main__':
    main()
