import json
import os
import re

SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
PROJECT_ROOT = os.path.dirname(SCRIPT_DIR)
quiz_dir = PROJECT_ROOT

print("=" * 80)
print("📊 所有題庫詳解完整度檢查")
print("=" * 80)

# 初始化變數
tech_total = 0
tech_detailed = 0
jia_total = 0
jia_detailed = 0
organic_total = 0
organic_detailed = 0

# ========== 1. 技術士題庫（外部 JSON 檔案）==========
print("\n【技術士題庫】")
print("-" * 80)

tech_chapters = []
for i in range(1, 6):
    ch_file = f'{quiz_dir}tech_chapter{i}.json'
    if os.path.exists(ch_file):
        with open(ch_file, 'r', encoding='utf-8') as f:
            ch = json.load(f)
        
        detailed = sum(1 for q in ch['questions'] if len(q.get('analysis', '')) > 80 and '本題正確答案為' not in q.get('analysis', ''))
        total = len(ch['questions'])
        percentage = detailed / total * 100 if total > 0 else 0
        tech_chapters.append((i, ch.get('chapter', f'第{i}章'), total, detailed, percentage))
        status = "✅" if percentage >= 80 else "⚠️"
        print(f"第{i}章 {ch.get('chapter', ''):<20} {total:4}題 {detailed:4}題 {percentage:6.1f}% {status}")

if tech_chapters:
    tech_total = sum(t[2] for t in tech_chapters)
    tech_detailed = sum(t[3] for t in tech_chapters)
    tech_overall = tech_detailed / tech_total * 100 if tech_total > 0 else 0
    print(f"技術士總計：{tech_total}題 {tech_detailed}題完整 {tech_overall:.1f}%")
else:
    tech_overall = 0
    print("⚠️  技術士題庫檔案不存在")

# ========== 2. 甲業題庫（嵌入 web/index.html）==========
print("\n【甲業題庫】（嵌入 web/index.html）")
print("-" * 80)

with open(f'{quiz_dir}web/index.html', 'r', encoding='utf-8') as f:
    html_content = f.read()

# 提取甲業題庫數據
jia_match = re.search(r'const JIA_QUESTIONS = \[(.*?)\];', html_content, re.DOTALL)
if jia_match:
    jia_data = json.loads('[' + jia_match.group(1) + ']')
    
    jia_chapters = {}
    for q in jia_data:
        ch_id = q.get('chId', 0)
        if ch_id not in jia_chapters:
            jia_chapters[ch_id] = []
        jia_chapters[ch_id].append(q)
    
    jia_stats = []
    for ch_id in sorted(jia_chapters.keys()):
        questions = jia_chapters[ch_id]
        total = len(questions)
        detailed = sum(1 for q in questions if len(q.get('analysis', '')) > 80 and '本題正確答案為' not in q.get('analysis', ''))
        percentage = detailed / total * 100 if total > 0 else 0
        jia_stats.append((ch_id, total, detailed, percentage))
        status = "✅" if percentage >= 80 else "⚠️"
        print(f"第{ch_id:2}章 {total:4}題 {detailed:4}題 {percentage:6.1f}% {status}")
    
    jia_total = sum(s[1] for s in jia_stats)
    jia_detailed = sum(s[2] for s in jia_stats)
    jia_overall = jia_detailed / jia_total * 100 if jia_total > 0 else 0
    print(f"甲業總計：{jia_total}題 {jia_detailed}題完整 {jia_overall:.1f}%")
else:
    jia_overall = 0
    print("⚠️  無法提取甲業題庫數據")

# ========== 3. 有機溶劑題庫（嵌入 web/index.html）==========
print("\n【有機溶劑題庫】（嵌入 web/index.html）")
print("-" * 80)

organic_match = re.search(r'const ORGANIC_QUESTIONS = \[(.*?)\];', html_content, re.DOTALL)
if organic_match:
    organic_data = json.loads('[' + organic_match.group(1) + ']')
    
    organic_chapters = {}
    for q in organic_data:
        ch_id = q.get('chId', 0)
        if ch_id not in organic_chapters:
            organic_chapters[ch_id] = []
        organic_chapters[ch_id].append(q)
    
    organic_stats = []
    for ch_id in sorted(organic_chapters.keys()):
        questions = organic_chapters[ch_id]
        total = len(questions)
        detailed = sum(1 for q in questions if len(q.get('analysis', '')) > 80 and '本題正確答案為' not in q.get('analysis', ''))
        percentage = detailed / total * 100 if total > 0 else 0
        organic_stats.append((ch_id, total, detailed, percentage))
        status = "✅" if percentage >= 80 else "⚠️"
        print(f"第{ch_id}章 {total:4}題 {detailed:4}題 {percentage:6.1f}% {status}")
    
    organic_total = sum(s[1] for s in organic_stats)
    organic_detailed = sum(s[2] for s in organic_stats)
    organic_overall = organic_detailed / organic_total * 100 if organic_total > 0 else 0
    print(f"有機溶劑總計：{organic_total}題 {organic_detailed}題完整 {organic_overall:.1f}%")
else:
    organic_overall = 0
    print("⚠️  無法提取有機溶劑題庫數據")

# ========== 總結 ==========
print("\n" + "=" * 80)
print("📈 所有題庫總結")
print("=" * 80)

all_total = 725 + tech_total + jia_total + organic_total
all_detailed = 718 + tech_detailed + jia_detailed + organic_detailed
all_overall = all_detailed / all_total * 100 if all_total > 0 else 0

jia_status = "✅" if jia_overall >= 80 else "⚠️"
tech_status = "✅" if tech_overall >= 80 else "⚠️"
organic_status = "✅" if organic_overall >= 80 else "⚠️"
all_status = "✅" if all_overall >= 80 else "⚠️"

print(f"""
┌─────────────┬─────────┬───────────┬──────────┬────────┐
│   題庫名稱   │  總題數  │  完整詳解  │  完整度   │  狀態  │
├─────────────┼─────────┼───────────┼──────────┼────────┤
│  一般業      │   725   │    718    │  99.0%   │   ✅   │
│  甲業        │  {jia_total:5}  │   {jia_detailed:5}   │  {jia_overall:5.1f}%  │   {jia_status}   │
│  技術士      │  {tech_total:5}  │   {tech_detailed:5}   │  {tech_overall:5.1f}%  │   {tech_status}   │
│  有機溶劑    │  {organic_total:5}  │   {organic_detailed:5}   │  {organic_overall:5.1f}%  │   {organic_status}   │
├─────────────┼─────────┼───────────┼──────────┼────────┤
│  總計        │  {all_total:5}  │   {all_detailed:5}   │  {all_overall:5.1f}%  │   {all_status}   │
└─────────────┴─────────┴───────────┴──────────┴────────┘
""")

# 找出需要改進的題庫
print("\n📋 需要改進的題庫：")
if jia_overall < 80:
    print(f"   ⚠️  甲業題庫：{jia_overall:.1f}% ({jia_detailed}/{jia_total})")
if tech_overall < 80:
    print(f"   ⚠️  技術士題庫：{tech_overall:.1f}% ({tech_detailed}/{tech_total})")
if organic_overall < 80:
    print(f"   ⚠️  有機溶劑題庫：{organic_overall:.1f}% ({organic_detailed}/{organic_total})")

if jia_overall >= 80 and tech_overall >= 80 and organic_overall >= 80:
    print("   ✅ 所有題庫完整度都達到 80% 以上！")
