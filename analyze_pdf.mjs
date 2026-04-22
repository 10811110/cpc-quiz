import { getDocument } from 'pdfjs-dist/legacy/build/pdf.mjs';
import { readFileSync, writeFileSync } from 'fs';

const pdfPath = '/home/ben900415/.openclaw/workspace/一般業職業安全衛生業務主管精選-羅杰晟-2026年.pdf';
const data = new Uint8Array(readFileSync(pdfPath));
const pdf = await getDocument({ data, useWorkerFetch: false, isEvalSupported: false, useSystemFonts: true }).promise;

console.log('總頁數:', pdf.numPages);

// 讀取所有頁面的完整文字
let fullText = '';
for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i);
    const content = await page.getTextContent();
    fullText += '\n===PDF_PAGE:' + i + '===\n' + content.items.map(item => item.str).join('');
}

// 找各章節的起始位置
const chapters = ['第一章','第二章','第三章','第四章','第五章','第六章','第七章','第八章','第九章','第十章','第十一章','第十二章','第十三章','第十四章','第十五章','第十六章','第十七章'];
chapters.forEach(ch => {
    const idx = fullText.indexOf(ch);
    console.log(ch, '在全文位置:', idx);
    if (idx > -1) {
        const context = fullText.substring(idx-50, idx+150).replace(/\n/g,' ');
        console.log('  上下文:', context);
    }
});

// 儲存完整文字供後續處理
writeFileSync('full_text.txt', fullText, 'utf-8');
console.log('\n完整文字已存至 full_text.txt，長度:', fullText.length);
