#!/usr/bin/env python3
"""
批次生成題目解析腳本
使用 Ollama Pro API 批量生成詳細解析（analysis, law, tip）
"""

import json
import sys
import argparse
from pathlib import Path

# 讀取環境變數
import os
from dotenv import load_dotenv
load_dotenv()

OLLAMA_PRO_API_KEY = os.getenv('OLLAMA_PRO_API_KEY')
if not OLLAMA_PRO_API_KEY:
    print("❌ 錯誤：請設定環境變數 OLLAMA_PRO_API_KEY")
    sys.exit(1)

OLLAMA_PRO_BASE_URL = "https://api.ollama-pro.com/v1"

import requests

def load_questions(chapter):
    """載入指定章節的題目"""
    chapter_file = Path(f'chapter{chapter}.json')
    if not chapter_file.exists():
        print(f"❌ 找不到 chapter{chapter}.json")
        sys.exit(1)
    
    with open(chapter_file, 'r', encoding='utf-8') as f:
        data = json.load(f)
    
    # 處理不同格式
    if isinstance(data, list):
        questions = data
    elif isinstance(data, dict) and 'questions' in data:
        questions = data['questions']
    else:
        print(f"❌ chapter{chapter}.json 格式錯誤")
        sys.exit(1)
    
    return questions

def generate_analysis(question_text, options, answer):
    """使用 Ollama Pro API 生成解析"""
    
    options_text = "\n".join([f"{opt['id']}. {opt['text']}" for opt in options])
    
    prompt = f"""你是職業安全衛生考試的專業講師。請為以下選擇題生成詳細解析：

題目：{question_text}

選項：
{options_text}

正確答案：{answer}

請生成以下三個欄位（JSON 格式）：
{{
  "analysis": "50-100 字的詳細解析，說明為什麼這個答案正確，其他選項為什麼錯誤",
  "law": "具體的法規出處或理論來源（例如：職業安全衛生法第 5 條、勞工健康保護規則第 14 條）",
  "tip": "答題技巧，包含關鍵字聯想或口訣（例如：關鍵字「立即」→ 找最緊急的選項）"
}}

注意：
- 解析要具體，不要只說「本題正確答案為{answer}」
- 法規出處要精確，不要只寫「職業安全衛生相關法規」
- 答題技巧要有實用的關鍵字提示"""

    headers = {
        "Authorization": f"Bearer {OLLAMA_PRO_API_KEY}",
        "Content-Type": "application/json"
    }
    
    payload = {
        "model": "qwen2.5-coder-32b-instruct",
        "messages": [
            {"role": "user", "content": prompt}
        ],
        "temperature": 0.3,
        "max_tokens": 1000
    }
    
    try:
        response = requests.post(
            f"{OLLAMA_PRO_BASE_URL}/chat/completions",
            headers=headers,
            json=payload,
            timeout=60
        )
        response.raise_for_status()
        
        result = response.json()
        content = result['choices'][0]['message']['content']
        
        # 嘗試解析 JSON
        if '```json' in content:
            content = content.split('```json')[1].split('```')[0].strip()
        elif '```' in content:
            content = content.split('```')[1].split('```')[0].strip()
        
        analysis_data = json.loads(content)
        return analysis_data
        
    except Exception as e:
        print(f"❌ API 呼叫失敗：{e}")
        return None

def save_questions(chapter, questions):
    """保存題目到 JSON 檔案"""
    chapter_file = Path(f'chapter{chapter}.json')
    
    with open(chapter_file, 'w', encoding='utf-8') as f:
        json.dump(questions, f, ensure_ascii=False, indent=2)
    
    print(f"✅ 已保存 chapter{chapter}.json")

def main():
    parser = argparse.ArgumentParser(description='批次生成題目解析')
    parser.add_argument('--chapter', type=int, required=True, help='章節編號')
    parser.add_argument('--start', type=int, required=True, help='起始題號（從 1 開始）')
    parser.add_argument('--end', type=int, required=True, help='結束題號（包含）')
    args = parser.parse_args()
    
    print(f"📚 開始生成第二章 Q{args.start}-Q{args.end} 的解析...")
    
    questions = load_questions(args.chapter)
    
    # 調整索引（題目從 1 開始，陣列從 0 開始）
    start_idx = args.start - 1
    end_idx = args.end
    
    for i in range(start_idx, min(end_idx, len(questions))):
        q = questions[i]
        q_num = i + 1
        
        print(f"\n📝 處理 Q{q_num}...")
        
        # 檢查是否已有解析
        if 'analysis' in q and q['analysis'] and q['analysis'] != '本題正確答案為選項 ①':
            print(f"   ⏭️  已有解析，跳過")
            continue
        
        # 生成解析
        analysis_data = generate_analysis(
            q['text'],
            q['options'],
            q['answer']
        )
        
        if analysis_data:
            q['analysis'] = analysis_data.get('analysis', '')
            q['law'] = analysis_data.get('law', '')
            q['tip'] = analysis_data.get('tip', '')
            print(f"   ✅ 生成成功")
            print(f"      解析：{q['analysis'][:50]}...")
            print(f"      法規：{q['law']}")
            print(f"      技巧：{q['tip']}")
        else:
            print(f"   ❌ 生成失敗，保留空值")
            q['analysis'] = ''
            q['law'] = ''
            q['tip'] = ''
    
    # 保存結果
    save_questions(args.chapter, questions)
    
    print(f"\n🎉 批次完成！共處理 {args.end - args.start + 1} 題")

if __name__ == '__main__':
    main()
