# 실시간 대화 번역기 - 전체 기능 문서

## 📋 프로젝트 개요

**실시간 한일 음성 번역기**는 Zoom, Google Meet 등 화상회의 프로그램에서 상대방의 음성을 실시간으로 번역하는 웹 애플리케이션입니다.

### 주요 특징
- 🎤 실시간 음성 인식 (Web Speech API)
- 🌐 DeepL 자동 번역 (언어 자동 감지)
- 💾 Google Sheets 자동 저장
- 📱 네트워크 공유 (로컬 HTTPS, ngrok)
- 🌍 다국어 UI (한국어/일본어)
- 📊 세션 기반 대화 기록 관리

---

## 🛠 기술 스택

### Frontend
- **HTML5**: 시맨틱 마크업
- **CSS3**: 반응형 디자인
- **JavaScript (ES6+)**:
  - Web Speech API (음성 인식)
  - Web Audio API (오디오 스트림 처리)
  - Fetch API (번역 요청)
  - LocalStorage (세션 관리)

### Backend
- **Node.js + Express**: DeepL API 프록시 서버
- **Google Apps Script**: Google Sheets 자동 저장 웹앱

### APIs
- **DeepL API**: 고품질 번역 (한국어 ↔ 일본어)
- **Web Speech API**: 브라우저 기반 음성 인식

### Deployment
- **Koyeb**: GitHub main 브랜치 자동 배포
- **GitHub**: 버전 관리

---

## 📁 파일 구조

```
음성번역/
├── index.html              # 메인 HTML (UI 구조)
├── script.js               # 클라이언트 JavaScript (핵심 로직)
├── style.css               # 스타일시트
├── server.js               # Node.js 프록시 서버
├── package.json            # Node.js 의존성
├── .gitignore              # Git 제외 파일
├── FEATURES.md             # 이 문서
└── /tmp/
    ├── google-apps-script-translation-saver.js  # Apps Script 기본 버전
    └── google-apps-script-improved.js           # Apps Script 개선 버전 (미사용)
```

---

## 🚀 주요 기능

### 1. 실시간 음성 인식 및 번역

#### 음성 인식 (Web Speech API)
- **지원 언어**: 한국어 (`ko-KR`), 일본어 (`ja-JP`)
- **모드**: 연속 인식 (`continuous: true`)
- **중간 결과**: 실시간 표시 (`interimResults: true`)
- **자동 번역 타이머**: 1.5초 침묵 후 자동 번역

**관련 코드** (`script.js`):
```javascript
// 라인 761-929: startListening() 함수
// 라인 825: recognition.lang = listenLanguage === 'ja' ? 'ja-JP' : 'ko-KR';
// 라인 826: recognition.continuous = true;
// 라인 827: recognition.interimResults = true;
// 라인 880-889: 1.5초 자동 번역 타이머
```

#### 번역 (DeepL API)
- **자동 언어 감지**: 원본 언어 자동 인식
- **대상 언어**: 일본어 → 한국어, 한국어 → 일본어
- **API 키**: 하드코딩 (라인 12-14)

**관련 코드** (`script.js`):
```javascript
// 라인 12: const DEFAULT_DEEPL_API_KEY = '2bc6b0c2-115a-4fb9-841e-315aaf7968c5';
// 라인 14: let deeplApiKey = DEFAULT_DEEPL_API_KEY;
// 라인 974-1057: translateText() 함수
```

**프록시 서버** (`server.js`):
- DeepL API Free/Pro 자동 선택
- CORS 에러 방지
- 에러 핸들링

---

### 2. BlackHole 오디오 캡처

Zoom/Meet의 음성을 캡처하기 위해 **BlackHole 2ch** 가상 오디오 장치를 사용합니다.

#### 설치 방법
```bash
brew install blackhole-2ch
```

#### 오디오 믹서 설정
1. **Audio MIDI Setup** 앱 실행
2. "다중 출력 장치 생성" (Multi-Output Device)
3. BlackHole 2ch + 스피커 체크
4. Zoom/Meet 스피커를 "다중 출력 장치"로 변경

**관련 코드** (`script.js`):
```javascript
// 라인 567-759: refreshAudioDevices() - 오디오 장치 목록 로드
// 라인 796-810: 오디오 제약 조건 설정
```

---

### 3. Google Sheets 자동 저장

번역된 대화 내용을 Google Spreadsheet에 자동으로 저장합니다.

#### Apps Script Web App
- **URL**: `https://script.google.com/macros/s/AKfycbyrPb9y1i3Cs28Opq2iUyW5h9veXTdAvAlePfqIFIOJKyuZxlYyj-Pxx14gWMjLq1w7EA/exec`
- **액세스**: 누구나 (Anyone)
- **기능**: POST 요청으로 번역 데이터 수신 및 시트에 기록

**저장 데이터**:
- 날짜/시간 (timestamp)
- 원문 (sourceText)
- 번역 (targetText)
- 감지 언어 (detectedLang: JA, KO, etc.)
- 세션 ID (sessionId)

**관련 코드** (`script.js`):
```javascript
// 라인 16: const GOOGLE_SHEET_URL = '...';
// 라인 1017-1024: saveToGoogleSheet() 호출
// 라인 1892-1921: saveToGoogleSheet() 함수 (no-cors 모드)
```

**Apps Script 코드**: `/tmp/google-apps-script-translation-saver.js`

---

### 4. 세션 관리

대화 내역을 세션 단위로 관리하여 나중에 다시 볼 수 있습니다.

#### 세션 기능
- **자동 생성**: 시작 버튼 클릭 시 새 세션 생성
- **자동 저장**: 중지 버튼 클릭 시 localStorage에 저장
- **최대 10개**: 오래된 세션 자동 삭제
- **세션 탭**: 이전 세션 목록 표시 (기본값: 숨김)

**세션 데이터 구조**:
```javascript
{
  id: 세션ID,
  timestamp: 생성시간,
  historyData: [번역내역배열],
  language: 'ja' | 'ko'
}
```

**관련 코드** (`script.js`):
```javascript
// 라인 21-24: 세션 관리 변수
// 라인 1656-1677: createNewSession()
// 라인 1680-1716: saveCurrentSession()
// 라인 1719-1756: renderSessionTabs()
// 라인 1759-1784: loadSession()
// 라인 1787-1809: deleteSession()
```

---

### 5. 네트워크 공유

다른 기기에서 번역기에 접속할 수 있도록 네트워크 정보를 제공합니다.

#### 로컬 네트워크 (HTTPS)
- 같은 와이파이의 다른 기기에서 접속
- HTTPS 자체 서명 인증서 (마이크 사용 가능)
- QR 코드 자동 생성

#### 외부 공유 (ngrok)
- 인터넷 어디서나 접속 가능
- ngrok 터널 자동 생성
- 공개 URL + QR 코드

**관련 코드**:
- `script.js` 라인 1512-1633: 네트워크 정보 표시
- `script.js` 라인 1406-1507: ngrok 터널 관리
- `server.js`: HTTPS 서버 + ngrok 통합

---

### 6. 다국어 UI (i18n)

한국어와 일본어 UI를 지원합니다.

#### 지원 언어
- 한국어 (`ko`): 기본값
- 일본어 (`ja`)

**관련 코드** (`script.js`):
```javascript
// 라인 26-183: i18n 객체 정의
// 라인 186-199: getI18nText() 안전한 접근 함수
// 라인 354-359: toggleUILanguage() 언어 전환
// 라인 362-476: updateUILanguage() UI 업데이트
```

---

### 7. 키보드 단축키

빠른 조작을 위한 키보드 단축키를 제공합니다.

| 키 | 기능 |
|---|---|
| `-` | 시작 |
| `=` | 중지 |
| `9` | 한국어 듣기 |
| `0` | 일본어 듣기 |
| `Ctrl + Space` | 시작/중지 토글 |
| `ESC` | 모달 닫기 |

**관련 코드** (`script.js`): 라인 1353-1404

---

## 🔧 설정 및 배포

### 1. DeepL API 키 설정

**현재 상태**: 하드코딩 (localStorage 무시)

**변경 방법**:
```javascript
// script.js 라인 12
const DEFAULT_DEEPL_API_KEY = '여기에-새-키-입력';
```

**복구 방법** (API 키 입력 UI):
`index.html` 라인 33-49의 주석 해제

---

### 2. Google Sheets 연동

#### 스프레드시트 생성
1. Google Sheets에서 새 스프레드시트 생성
2. 시트 이름: **"번역 히스토리"**
3. 헤더 (1행):
   - A1: 날짜/시간
   - B1: 원문
   - C1: 번역
   - D1: 감지언어
   - E1: 세션ID

#### Apps Script 배포
1. **확장 프로그램** → **Apps Script**
2. `/tmp/google-apps-script-translation-saver.js` 코드 복사
3. **배포** → **새 배포**
4. 유형: **웹 앱**
5. 액세스: **누구나**
6. 배포 후 **웹 앱 URL** 복사

#### URL 설정
```javascript
// script.js 라인 16
const GOOGLE_SHEET_URL = '복사한-웹앱-URL';
```

---

### 3. Koyeb 배포

#### 자동 배포 설정
- GitHub 저장소: `dohyun3333/voice-translator`
- 브랜치: `main`
- 빌드 명령: `npm install`
- 실행 명령: `npm start`
- 포트: `3000`

#### 환경 변수
- `PORT`: `3000`
- `NODE_ENV`: `production`

**배포 URL**: `https://misleading-eveline-treenod-0081d021.koyeb.app/`

---

## 🎨 주석 처리된 기능 (복구 가능)

### 1. API 키 입력 UI

**위치**: `index.html` 라인 33-49

**주석 해제 방법**:
```html
<!-- 라인 33-34: API 키 버튼 -->
<button onclick="toggleApiKeyInput()" class="icon-btn" id="toggleApiBtn" title="API 키">🔑</button>

<!-- 라인 40-49: API 키 입력 섹션 -->
<div class="api-key-compact" id="apiKeySection" style="display: none;">
    <input type="password" id="deeplApiKey" placeholder="DeepL API 키 입력" class="api-input-compact">
    <button onclick="saveDeepLApiKey()" class="api-save-btn">저장</button>
    <span id="apiKeyStatus" class="api-status"></span>
</div>
```

**추가 변경 필요**:
```javascript
// script.js 라인 14를 다음으로 변경:
let deeplApiKey = localStorage.getItem('deeplApiKey') || DEFAULT_DEEPL_API_KEY;
```

---

### 2. 세션 탭 토글 메뉴

**위치**: `index.html` 라인 20-23

**주석 해제 방법**:
```html
<!-- 라인 21-23: 세션 탭 토글 버튼 -->
<button onclick="toggleSessionTabsVisibility()" class="paw-menu-item">
    📂 이전 대화 목록 보기/숨기기
</button>
```

**관련 함수**: `script.js` 라인 1841-1858 `toggleSessionTabsVisibility()`

---

## 📖 사용 방법

### 초기 설정

1. **BlackHole 설치**:
   ```bash
   brew install blackhole-2ch
   ```

2. **Multi-Output Device 설정**:
   - Audio MIDI Setup → 다중 출력 장치 생성
   - BlackHole 2ch + 스피커 체크

3. **Zoom/Meet 설정**:
   - 스피커를 "다중 출력 장치"로 변경
   - 마이크는 변경하지 않음

---

### 번역기 실행

1. **페이지 접속**: `https://misleading-eveline-treenod-0081d021.koyeb.app/`

2. **오디오 장치 선택**: BlackHole 2ch ⭐ (권장)

3. **언어 선택**:
   - 🎧 일본어 듣기 (0): 상대방이 일본어로 말함
   - 🎧 한국어 듣기 (9): 상대방이 한국어로 말함

4. **시작**: 시작 (-) 버튼 클릭

5. **번역 확인**:
   - 현재 자막: 실시간 번역 표시
   - 대화 기록: 전체 번역 내역

6. **중지**: 중지 (=) 버튼 클릭
   - 세션 자동 저장 (localStorage)
   - Google Sheets 자동 저장

---

## 🐛 트러블슈팅

### 1. 마이크 권한 오류
- Chrome 주소창 왼쪽 자물쇠 아이콘 클릭
- 마이크 권한을 "허용"으로 변경
- 페이지 새로고침

### 2. BlackHole이 보이지 않음
- Mac 재부팅 필요
- `brew list | grep blackhole` 로 설치 확인

### 3. 번역 실패 (403 오류)
- DeepL API 키 확인
- 무료 사용량(월 50만 자) 초과 확인

### 4. Google Sheets 저장 안됨
- Apps Script 웹앱 URL 확인 (`script.js` 라인 16)
- Apps Script 배포 설정: "누구나" 확인
- 브라우저 콘솔에서 에러 확인

### 5. 음성 인식이 안됨
- Chrome 브라우저 사용 (Safari/Firefox 미지원)
- 오디오 장치가 올바르게 선택되었는지 확인
- 다른 앱에서 마이크를 사용 중인지 확인

---

## 📝 주요 커밋 히스토리

| 커밋 해시 | 날짜 | 메시지 |
|----------|------|--------|
| `68cf8b4` | 최근 | UI: 고양이 발바닥 메뉴에서 세션 탭 토글 항목 숨김 (기능 유지, 복구 가능) |
| `7b6931b` | 최근 | Feature: 구글 스프레드시트 자동 저장 기능 추가 |
| `fe222bf` | 최근 | UI: API 키 버튼 및 입력창 숨김 처리 |
| `3e2a854` | 이전 | Fix: localStorage 무시하고 하드코딩 키 강제 사용 |
| `0b2fc75` | 이전 | feat: 주요 사용성 개선 및 기본 API 키 설정 |

---

## 🔗 참고 링크

- **DeepL API**: https://www.deepl.com/ko/pro-api
- **Web Speech API**: https://developer.mozilla.org/en-US/docs/Web/API/Web_Speech_API
- **BlackHole**: https://github.com/ExistentialAudio/BlackHole
- **Koyeb**: https://www.koyeb.com/
- **GitHub 저장소**: https://github.com/dohyun3333/voice-translator

---

## 📄 라이센스

MIT License (추정)

---

## 👤 개발자

- **GitHub**: dohyun3333
- **프로젝트**: voice-translator

---

## 🎯 향후 개선 사항 (제안)

1. ~~Google Sheets 시각화 개선 (색상 코딩, 자동 필터)~~ → 취소됨
2. 다른 언어 쌍 지원 (영어, 중국어 등)
3. 음성 출력 (TTS) 기능
4. 모바일 앱 버전
5. 실시간 협업 기능 (여러 사용자 동시 접속)

---

**최종 업데이트**: 2026-02-23
**문서 버전**: 1.0
