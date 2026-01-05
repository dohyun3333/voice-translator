const express = require('express');
const cors = require('cors');
const path = require('path');
const axios = require('axios');
const fs = require('fs');
const https = require('https');
const http = require('http');
const os = require('os');
const { spawn } = require('child_process');

const app = express();
// Koyeb/클라우드 환경에서는 PORT 환경변수 사용
const HTTP_PORT = process.env.PORT || 3000;
const HTTPS_PORT = process.env.HTTPS_PORT || 3443;

// ngrok 프로세스 관리
let ngrokProcess = null;
let publicUrl = null;

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

// 로컬 IP 주소 가져오기 함수
function getLocalAddresses() {
    const interfaces = os.networkInterfaces();
    const addresses = [];

    for (const name of Object.keys(interfaces)) {
        for (const iface of interfaces[name]) {
            // IPv4이고 내부 주소가 아닌 경우만
            if (iface.family === 'IPv4' && !iface.internal) {
                addresses.push({
                    interface: name,
                    ip: iface.address,
                    httpUrl: `http://${iface.address}:${HTTP_PORT}`,
                    httpsUrl: `https://${iface.address}:${HTTPS_PORT}`
                });
            }
        }
    }

    return addresses;
}

// 네트워크 정보 API
app.get('/api/network-info', (req, res) => {
    const localAddresses = getLocalAddresses();

    res.json({
        port: HTTP_PORT,
        httpsPort: HTTPS_PORT,
        environment: process.env.NODE_ENV || 'development',
        localAddresses: localAddresses,
        publicUrl: publicUrl
    });
});

// 터널 시작 API (ngrok)
app.post('/api/tunnel/start', async (req, res) => {
    // 이미 실행 중인 경우
    if (ngrokProcess && publicUrl) {
        return res.json({ success: true, url: publicUrl, warning: '이미 실행 중입니다.' });
    }

    try {
        // ngrok이 설치되어 있는지 확인
        const ngrokPath = await findNgrok();

        if (!ngrokPath) {
            return res.status(400).json({
                success: false,
                error: 'ngrok이 설치되어 있지 않습니다. brew install ngrok 또는 https://ngrok.com 에서 설치하세요.'
            });
        }

        // ngrok 실행
        ngrokProcess = spawn(ngrokPath, ['http', HTTPS_PORT.toString(), '--log=stdout']);

        let resolved = false;

        // stdout에서 URL 추출
        ngrokProcess.stdout.on('data', (data) => {
            const output = data.toString();
            console.log('ngrok:', output);

            // URL 추출 (url= 형식)
            const urlMatch = output.match(/url=(https:\/\/[^\s]+)/);
            if (urlMatch && !resolved) {
                publicUrl = urlMatch[1];
                resolved = true;
                console.log('✅ ngrok 터널 생성:', publicUrl);
            }
        });

        ngrokProcess.stderr.on('data', (data) => {
            console.error('ngrok error:', data.toString());
        });

        ngrokProcess.on('close', (code) => {
            console.log('ngrok 프로세스 종료:', code);
            ngrokProcess = null;
            publicUrl = null;
        });

        // URL이 생성될 때까지 대기 (최대 10초)
        let attempts = 0;
        while (!publicUrl && attempts < 20) {
            await new Promise(resolve => setTimeout(resolve, 500));
            attempts++;

            // ngrok API로 터널 정보 조회 시도
            if (!publicUrl) {
                try {
                    const tunnelRes = await axios.get('http://127.0.0.1:4040/api/tunnels', { timeout: 1000 });
                    const tunnels = tunnelRes.data.tunnels;
                    const httpsTunnel = tunnels.find(t => t.proto === 'https');
                    if (httpsTunnel) {
                        publicUrl = httpsTunnel.public_url;
                        console.log('✅ ngrok 터널 생성 (API):', publicUrl);
                    }
                } catch (e) {
                    // API 아직 준비 안됨
                }
            }
        }

        if (publicUrl) {
            res.json({ success: true, url: publicUrl });
        } else {
            res.status(500).json({ success: false, error: '터널 URL을 가져오는데 실패했습니다.' });
        }

    } catch (error) {
        console.error('터널 시작 오류:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// 터널 중지 API
app.post('/api/tunnel/stop', (req, res) => {
    if (ngrokProcess) {
        ngrokProcess.kill();
        ngrokProcess = null;
        publicUrl = null;
        console.log('✅ ngrok 터널 종료');
        res.json({ success: true });
    } else {
        res.json({ success: true, message: '실행 중인 터널이 없습니다.' });
    }
});

// ngrok 실행 파일 찾기
async function findNgrok() {
    const possiblePaths = [
        '/usr/local/bin/ngrok',
        '/opt/homebrew/bin/ngrok',
        process.env.HOME + '/ngrok',
        'ngrok'  // PATH에서 찾기
    ];

    for (const ngrokPath of possiblePaths) {
        try {
            const { execSync } = require('child_process');
            execSync(`${ngrokPath} version`, { stdio: 'ignore' });
            return ngrokPath;
        } catch (e) {
            // 이 경로에는 없음
        }
    }

    return null;
}

// 메인 페이지 라우트
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

// 클라우드 환경 감지 (Koyeb, Heroku 등)
const isCloudEnvironment = process.env.PORT && !process.env.LOCAL_DEV;

if (isCloudEnvironment) {
    // 클라우드 환경: HTTP 서버만 시작
    http.createServer(app).listen(HTTP_PORT, '0.0.0.0', () => {
        console.log(`✅ 서버가 포트 ${HTTP_PORT}에서 실행 중입니다 (클라우드 모드).`);
        console.log(`   환경: ${process.env.NODE_ENV || 'production'}`);
    });
} else {
    // 로컬 환경: HTTP와 HTTPS 서버 모두 시작
    const sslDir = path.join(__dirname, 'ssl');
    const keyPath = path.join(sslDir, 'key.pem');
    const certPath = path.join(sslDir, 'cert.pem');

    // HTTP 서버 시작
    http.createServer(app).listen(HTTP_PORT, '0.0.0.0', () => {
        console.log(`✅ HTTP 서버가 포트 ${HTTP_PORT}에서 실행 중입니다.`);
        console.log(`   http://localhost:${HTTP_PORT}`);
    });

    // HTTPS 서버 시작 (SSL 인증서가 있는 경우)
    if (fs.existsSync(keyPath) && fs.existsSync(certPath)) {
        try {
            const sslOptions = {
                key: fs.readFileSync(keyPath),
                cert: fs.readFileSync(certPath)
            };

            https.createServer(sslOptions, app).listen(HTTPS_PORT, '0.0.0.0', () => {
                console.log(`✅ HTTPS 서버가 포트 ${HTTPS_PORT}에서 실행 중입니다.`);
                console.log(`   https://localhost:${HTTPS_PORT}`);

                // 로컬 IP 주소 출력
                const addresses = getLocalAddresses();
                if (addresses.length > 0) {
                    console.log('\n📱 다른 기기에서 접속 (마이크 사용 가능):');
                    addresses.forEach(addr => {
                        console.log(`   ${addr.interface}: ${addr.httpsUrl}`);
                    });
                    console.log('\n⚠️  브라우저에서 "안전하지 않음" 경고가 나타나면:');
                    console.log('   → "고급" → "안전하지 않은 사이트로 이동" 클릭');
                }
            });
        } catch (error) {
            console.error('⚠️ HTTPS 서버 시작 실패:', error.message);
            console.log('   SSL 인증서를 생성하려면 다음 명령어를 실행하세요:');
            console.log('   openssl req -x509 -newkey rsa:4096 -keyout ssl/key.pem -out ssl/cert.pem -days 365 -nodes');
        }
    } else {
        console.log('\n⚠️  SSL 인증서가 없습니다. HTTPS 서버를 시작하지 않습니다.');
        console.log('   다른 기기에서 마이크를 사용하려면 SSL 인증서가 필요합니다.');
        console.log('   인증서 생성 명령어:');
        console.log('   mkdir -p ssl && openssl req -x509 -newkey rsa:4096 -keyout ssl/key.pem -out ssl/cert.pem -days 365 -nodes -subj "/CN=localhost"');
    }
}
