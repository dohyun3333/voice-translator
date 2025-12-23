const XLSX = require('xlsx');
const fs = require('fs');
const path = require('path');

// 엑셀 파일 경로
const excelPath = '/Users/t-drhee/Downloads/[ID팀] 번역 AI 학습용 한_일 리스트.xlsx';

// 엑셀 파일 읽기
console.log('📖 엑셀 파일 읽는 중...');
const workbook = XLSX.readFile(excelPath);
const sheetName = workbook.SheetNames[0];
const sheet = workbook.Sheets[sheetName];

// JSON으로 변환
const data = XLSX.utils.sheet_to_json(sheet);

console.log(`✅ 총 ${data.length}개의 용어를 발견했습니다.\n`);

// 용어집 구조 생성
const glossary = {
    ko_to_ja: {},  // 한국어 → 일본어
    ja_to_ko: {}   // 일본어 → 한국어
};

// 데이터 처리
data.forEach((row, index) => {
    // 첫 번째 행 출력 (구조 확인용)
    if (index === 0) {
        console.log('📋 엑셀 파일 구조:');
        console.log(Object.keys(row));
        console.log('\n샘플 데이터:');
        console.log(row);
        console.log('\n');
    }

    // 컬럼명은 'ko'와 'ja'
    const korean = row['ko'] ? String(row['ko']).trim() : '';
    const japanese = row['ja'] ? String(row['ja']).trim() : '';

    if (korean && japanese) {
        glossary.ko_to_ja[korean] = japanese;
        glossary.ja_to_ko[japanese] = korean;

        // 처음 10개 출력 (확인용)
        if (index < 10) {
            console.log(`   [${index + 1}] 🇰🇷 ${korean} → 🇯🇵 ${japanese}`);
        }
    }
});

// 통계 출력
const koToJaCount = Object.keys(glossary.ko_to_ja).length;
const jaToKoCount = Object.keys(glossary.ja_to_ko).length;

console.log('📊 용어집 통계:');
console.log(`   한국어 → 일본어: ${koToJaCount}개`);
console.log(`   일본어 → 한국어: ${jaToKoCount}개`);
console.log('');

// 샘플 출력
console.log('📝 샘플 용어 (처음 5개):');
const sampleKo = Object.entries(glossary.ko_to_ja).slice(0, 5);
sampleKo.forEach(([ko, ja]) => {
    console.log(`   🇰🇷 ${ko} → 🇯🇵 ${ja}`);
});
console.log('');

// JSON 파일로 저장
const outputPath = path.join(__dirname, 'glossary.json');
fs.writeFileSync(outputPath, JSON.stringify(glossary, null, 2), 'utf-8');

console.log(`✅ 용어집이 저장되었습니다: ${outputPath}`);
console.log('');
console.log('🚀 이제 서버를 재시작하면 용어집이 적용됩니다!');
console.log('   npm start');
