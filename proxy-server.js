const express = require('express');
const cors = require('cors');
const path = require('path');
const axios = require('axios');
const fs = require('fs');

const app = express();
// Koyeb/클라우드 환경에서는 PORT 환경변수 사용
const PORT = process.env.PORT || 3000;

// 모든 출처에서의 요청 허용
app.use(cors());
app.use(express.json());

// 정적 파일 제공 (HTML, CSS, JS)
app.use(express.static(path.join(__dirname)));

// 용어집 로드
let glossary = { ko_to_ja: {}, ja_to_ko: {} };
const glossaryPath = path.join(__dirname, 'glossary.json');

if (fs.existsSync(glossaryPath)) {
    try {
        const data = fs.readFileSync(glossaryPath, 'utf-8');
        glossary = JSON.parse(data);
        console.log(`✅ 용어집 로드 완료: 한→일 ${Object.keys(glossary.ko_to_ja).length}개, 일→한 ${Object.keys(glossary.ja_to_ko).length}개`);
    } catch (error) {
        console.error('⚠️ 용어집 로드 실패:', error.message);
    }
} else {
    console.log('ℹ️ 용어집 파일이 없습니다. "npm run load-terms"를 실행하여 용어집을 생성하세요.');
}

// 언어 감지 함수 (간단한 정규식 기반)
function detectLanguage(text) {
    // 한글 체크
    if (/[ㄱ-ㅎ|ㅏ-ㅣ|가-힣]/.test(text)) {
        return 'KO';
    }
    // 일본어 체크 (히라가나, 가타카나, 한자)
    if (/[\u3040-\u309F|\u30A0-\u30FF|\u4E00-\u9FAF]/.test(text)) {
        return 'JA';
    }
    // 영어 체크
    if (/^[a-zA-Z\s]+$/.test(text)) {
        return 'EN';
    }
    // 기타
    return 'AUTO';
}

// 용어 치환 함수 (번역 전 전처리) - XML 태그 사용으로 DeepL이 보존하도록 함
function applyGlossary(text, direction) {
    let result = text;
    let replacements = [];

    if (direction === 'ko-ja' && glossary.ko_to_ja) {
        // 한국어 → 일본어: 한국어 용어를 일본어로 치환
        // 긴 용어부터 먼저 치환 (부분 매칭 방지)
        const terms = Object.keys(glossary.ko_to_ja).sort((a, b) => b.length - a.length);

        terms.forEach(koTerm => {
            const jaTerm = glossary.ko_to_ja[koTerm];
            if (result.includes(koTerm)) {
                // XML 태그 형태로 placeholder 생성 (DeepL이 보존함)
                const placeholder = `<x id="${replacements.length}"/>`;
                result = result.replace(new RegExp(escapeRegExp(koTerm), 'g'), placeholder);
                replacements.push({ placeholder, term: jaTerm, id: replacements.length });
            }
        });
    } else if (direction === 'ja-ko' && glossary.ja_to_ko) {
        // 일본어 → 한국어: 일본어 용어를 한국어로 치환
        const terms = Object.keys(glossary.ja_to_ko).sort((a, b) => b.length - a.length);

        terms.forEach(jaTerm => {
            const koTerm = glossary.ja_to_ko[jaTerm];
            if (result.includes(jaTerm)) {
                const placeholder = `<x id="${replacements.length}"/>`;
                result = result.replace(new RegExp(escapeRegExp(jaTerm), 'g'), placeholder);
                replacements.push({ placeholder, term: koTerm, id: replacements.length });
            }
        });
    }

    return { text: result, replacements };
}

// 정규식 특수문자 이스케이프
function escapeRegExp(string) {
    return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

// 번역 후 용어 복원 함수 - XML 태그를 실제 용어로 교체
function restoreGlossaryTerms(translatedText, replacements) {
    let result = translatedText;

    replacements.forEach(({ placeholder, term, id }) => {
        // XML 태그 형태로 찾기 (DeepL이 보존한 태그)
        const tagPattern = new RegExp(`<x\\s+id=["']?${id}["']?\\s*/>`, 'g');
        result = result.replace(tagPattern, term);
    });

    return result;
}

// DeepL API 프록시 엔드포인트
app.post('/api/translate', async (req, res) => {
    const { text, autoDetect, apiKey } = req.body;

    if (!text) {
        return res.status(400).json({
            error: '번역할 텍스트가 필요합니다.'
        });
    }

    if (!apiKey) {
        return res.status(400).json({
            error: 'DeepL API 키가 필요합니다.'
        });
    }

    try {
        let sourceLang, targetLang, direction;

        if (autoDetect) {
            // 언어 자동 감지
            const detectedLang = detectLanguage(text);
            console.log(`언어 감지 결과: ${detectedLang}`);

            // 감지된 언어에 따라 목표 언어 결정
            if (detectedLang === 'JA') {
                sourceLang = 'JA';
                targetLang = 'KO';  // 일본어 → 한국어
                direction = 'ja-ko';
            } else if (detectedLang === 'KO') {
                sourceLang = 'KO';
                targetLang = 'JA';  // 한국어 → 일본어
                direction = 'ko-ja';
            } else {
                // 기타 언어는 한국어로 번역
                sourceLang = null;  // DeepL이 자동 감지
                targetLang = 'KO';
                direction = null;  // 용어집 적용 안함
            }
        } else {
            // 수동 설정 (하위 호환성)
            sourceLang = req.body.from ? req.body.from.toUpperCase() : null;
            targetLang = req.body.to ? req.body.to.toUpperCase() : 'KO';

            // 방향 결정
            if (sourceLang === 'KO' && targetLang === 'JA') {
                direction = 'ko-ja';
            } else if (sourceLang === 'JA' && targetLang === 'KO') {
                direction = 'ja-ko';
            } else {
                direction = null;
            }
        }

        // 1단계: 용어집 적용 (번역 전 치환)
        let processedText = text;
        let replacements = [];

        if (direction) {
            const glossaryResult = applyGlossary(text, direction);
            processedText = glossaryResult.text;
            replacements = glossaryResult.replacements;

            if (replacements.length > 0) {
                console.log(`✅ 용어집 적용: ${replacements.length}개 용어 치환됨`);
            }
        }

        console.log(`DeepL 번역 요청 (${sourceLang || 'AUTO'} → ${targetLang}):`, processedText);

        // 2단계: DeepL API 호출
        const params = {
            text: [processedText],
            target_lang: targetLang,
            tag_handling: 'xml'  // XML 태그 보존 (용어집 placeholder 보호)
        };

        // 소스 언어가 지정되면 추가
        if (sourceLang) {
            params.source_lang = sourceLang;
        }

        const response = await axios.post(
            'https://api-free.deepl.com/v2/translate',
            params,
            {
                headers: {
                    'Authorization': `DeepL-Auth-Key ${apiKey}`,
                    'Content-Type': 'application/json'
                }
            }
        );

        // 디버깅: API 응답 전체 출력
        console.log('DeepL API 응답:', JSON.stringify(response.data, null, 2));

        let translatedText = response.data.translations[0].text;
        const detectedSourceLang = response.data.translations[0].detected_source_language;

        // 3단계: 용어 복원 (번역 후)
        if (replacements.length > 0) {
            translatedText = restoreGlossaryTerms(translatedText, replacements);
            console.log('✅ 용어 복원 완료:', translatedText);
        }

        console.log('번역 완료:', translatedText);
        console.log('감지된 언어:', detectedSourceLang);

        res.json({
            source: text,
            translated: translatedText,
            from: detectedSourceLang,
            to: targetLang,
            detectedLang: detectedSourceLang.toLowerCase()
        });

    } catch (error) {
        console.error('번역 오류:', error.response?.data || error.message);

        let errorMessage = '번역 실패: ';
        if (error.response?.status === 403) {
            errorMessage += 'API 키가 올바르지 않습니다.';
        } else if (error.response?.status === 456) {
            errorMessage += '무료 사용량이 초과되었습니다.';
        } else {
            errorMessage += error.response?.data?.message || error.message;
        }

        res.status(error.response?.status || 500).json({
            error: errorMessage
        });
    }
});

// 네트워크 정보 API (클라우드 배포용)
app.get('/api/network-info', (req, res) => {
    res.json({
        port: PORT,
        environment: process.env.NODE_ENV || 'development'
    });
});

// 메인 페이지 라우트
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

// 서버 시작
app.listen(PORT, '0.0.0.0', () => {
    console.log(`✅ 서버가 포트 ${PORT}에서 실행 중입니다.`);
});
