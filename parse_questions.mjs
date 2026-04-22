import { getDocument } from 'pdfjs-dist/legacy/build/pdf.mjs';
import { readFileSync, writeFileSync } from 'fs';

const pdfPath = process.argv[2];
const outputPath = process.argv[3] || 'questions.json';

const data = new Uint8Array(readFileSync(pdfPath));
const pdf = await getDocument({ data, useWorkerFetch: false, isEvalSupported: false, useSystemFonts: true }).promise;

let fullText = '';
for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i);
    const content = await page.getTextContent();
    fullText += '\n' + content.items.map(item => item.str).join('');
}

function isChinese(c) {
    return c >= 0x4e00 && c <= 0x9fa5;
}

const chapterStarts = [2370, 5331, 11936, 16038, 20079, 22626, 25787, 29888, 32402, 34861, 37317, 43629, 48170, 50534, 53013];
const expected = [29, 81, 65, 48, 34, 30, 39, 31, 34, 35, 35, 45, 23, 70, 40, 35, 52];

function getChapter(pos) {
    let ch = 1;
    for (let i = 0; i < chapterStarts.length; i++) {
        if (pos >= chapterStarts[i]) ch = i + 1;
    }
    return ch;
}

function findQuestionIds(text, start, end) {
    const ids = [];
    for (let i = start; i < end - 3 && i < text.length - 3; i++) {
        const c0 = text.charCodeAt(i);
        const c1 = text.charCodeAt(i + 1);
        const c2 = text.charCodeAt(i + 2);
        if (c0 >= 48 && c0 <= 57 && c1 >= 48 && c1 <= 57 && c2 >= 48 && c2 <= 57) {
            const c3 = text.charCodeAt(i + 3);
            let chinesePos = -1;
            if (isChinese(c3)) chinesePos = i + 3;
            else if (c3 === 32 && i + 4 < text.length && isChinese(text.charCodeAt(i + 4))) chinesePos = i + 4;
            if (chinesePos === -1) continue;
            if (c3 >= 0x2460 && c3 <= 0x247f) continue;
            // Must be preceded by newline, start, period, Chinese period, or answer digit (1-4)
            const prev = i > 0 ? text.charCodeAt(i - 1) : -1;
            const prevIsAns = prev >= 49 && prev <= 52;
            const prevIsDigit = prev >= 48 && prev <= 57;
            if (prev !== -1 && prev !== 10 && prev !== 13 && prev !== 46 && prev !== 12290 && !prevIsAns && !prevIsDigit) continue;
            ids.push({ pos: i, num: text.substring(i, i + 3) });
        }
    }
    return ids;
}

const allIds = findQuestionIds(fullText, 0, fullText.length);
console.log('Total valid IDs:', allIds.length);

const blocks = [];
for (let i = 0; i < allIds.length; i++) {
    const { pos, num } = allIds[i];
    const onePos = fullText.indexOf('①', pos);
    if (onePos === -1) continue;

    let end = fullText.length;
    for (let j = i + 1; j < allIds.length; j++) {
        if (allIds[j].pos > onePos) {
            end = allIds[j].pos;
            break;
        }
    }
    const block = fullText.substring(pos, end);
    blocks.push({ pos, num, block });
}

const validBlocks = blocks.filter(b => (b.block.match(/[①②③④]/g) || []).length >= 4);
console.log('Valid blocks:', validBlocks.length);

function parseBlock(block, qNum, chapter) {
    const optMatches = [...block.matchAll(/([①②③④])([^(①②③④)]+)/g)].slice(0, 4);
    if (optMatches.length < 4) return null;

    const rawOptions = optMatches.map(m => m[2].trim().replace(/[。\d]+$/, ''));
    if (!rawOptions.every(o => o.length > 0)) return null;
    const optionMap = { A: rawOptions[0], B: rawOptions[1], C: rawOptions[2], D: rawOptions[3] };

    const firstOneIdx = block.indexOf('①');
    if (firstOneIdx === -1) return null;
    let qText = block.substring(3, firstOneIdx).trim().replace(/^[\s\n\r\t]+/, '');
    if (qText.length === 0) return null;

    const after4Idx = block.indexOf('④');
    if (after4Idx === -1) return null;
    const after4 = block.substring(after4Idx + 1);
    const dotIdx = after4.indexOf('。');
    const answerRaw = dotIdx > -1 ? after4.substring(dotIdx + 1).trim().charAt(0) : after4.trim().slice(-1);
    const answerMap = { '1': 'A', '2': 'B', '3': 'C', '4': 'D' };

    return {
        id: chapter + '.' + qNum,
        question: qText,
        options: optionMap,
        answer: answerMap[answerRaw] || answerRaw,
        chapter
    };
}

const questions = [];
const seenByChapter = {};

for (const b of validBlocks) {
    const chapter = getChapter(b.pos);
    if (!seenByChapter[chapter]) seenByChapter[chapter] = new Set();
    if (seenByChapter[chapter].has(b.num)) continue;
    seenByChapter[chapter].add(b.num);

    const q = parseBlock(b.block, b.num, chapter);
    if (q) questions.push(q);
}

questions.sort((a, b) => {
    if (a.chapter !== b.chapter) return a.chapter - b.chapter;
    return parseInt(a.id.split('.')[1]) - parseInt(b.id.split('.')[1]);
});

const byChapter = {};
questions.forEach(q => { byChapter[q.chapter] = (byChapter[q.chapter] || 0) + 1; });

const output = { total: questions.length, source: pdfPath, questions };
writeFileSync(outputPath, JSON.stringify(output, null, 2), 'utf-8');

console.log('total:', questions.length);
Object.entries(byChapter).forEach(([k, v]) => {
    const exp = expected[parseInt(k) - 1] || '?';
    console.log('ch' + k + ': ' + v + '/' + exp);
});