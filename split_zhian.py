import json

# 讀取原始技術士題庫
with open('/home/ben900415/cpc-quiz/chapter_zhian.json', 'r', encoding='utf-8') as f:
    data = json.load(f)

questions = data['questions']
total = len(questions)
chapters = 5
per_chapter = total // chapters  # 20 題

# 拆分成 5 章
for i in range(chapters):
    start = i * per_chapter
    end = (i + 1) * per_chapter if i < chapters - 1 else total
    chapter_questions = questions[start:end]
    
    # 為每題添加章節標記
    for q in chapter_questions:
        q['_ch'] = str(i + 1)
    
    chapter_data = {
        'chapter': f'技術士技能檢定職業安全衛生共同科目 第{i+1}章',
        'note': '勞動部勞動力發展署技能檢定學科測試參考資料',
        'total_questions': len(chapter_questions),
        'questions': chapter_questions
    }
    
    # 寫入新檔案
    output_path = f'/home/ben900415/cpc-quiz/chapter_zhian_{i+1}.json'
    with open(output_path, 'w', encoding='utf-8') as f:
        json.dump(chapter_data, f, ensure_ascii=False, indent=2)
    
    print(f'Chapter {i+1}: {start+1}-{end} (共{len(chapter_questions)}題) → {output_path}')

print(f'\n完成！總共 {total} 題拆分成 {chapters} 章，每章約 {per_chapter} 題')
