const fs = require('fs');
const pdfjsLib = require('pdfjs-dist/legacy/build/pdf.mjs');

async function readPdfPages(pdfPath, pages = 3) {
    const data = new Uint8Array(fs.readFileSync(pdfPath));
    
    const loadingTask = pdfjsLib.getDocument({ data });
    const pdf = await loadingTask.promise;
    
    console.log(`總頁數: ${pdf.numPages}\n`);
    console.log('='.repeat(50));

    for (let i = 1; i <= Math.min(pages, pdf.numPages); i++) {
        const page = await pdf.getPage(i);
        const textContent = await page.getTextContent();
        
        console.log(`\n【第 ${i} 頁】`);
        console.log('-'.repeat(50));
        
        if (textContent.items.length > 0) {
            const text = textContent.items.map(item => item.str).join('');
            console.log(text);
        } else {
            console.log('(此頁無文字內容)');
        }
        console.log();
    }
}

const pdfPath = process.argv[2];
if (!pdfPath) {
    console.log('用法: node pdf_reader.js <PDF檔案路徑>');
    process.exit(1);
}

readPdfPages(pdfPath).catch(err => {
    console.error('讀取 PDF 失敗:', err.message);
    process.exit(1);
});
