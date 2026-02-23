// 전역 변수
let recognition;
let isListening = false;
let audioStream = null;
let audioContext = null;
let selectedDeviceId = localStorage.getItem('selectedAudioDevice') || '';
let permissionGranted = localStorage.getItem('audioPermissionGranted') === 'true';
// 회사 제공 DeepL API 키 (기본값)
const DEFAULT_DEEPL_API_KEY = '2bc6b0c2-115a-4fb9-841e-315aaf7968c5';
let deeplApiKey = localStorage.getItem('deeplApiKey') || DEFAULT_DEEPL_API_KEY;
let listenLanguage = localStorage.getItem('listenLanguage') || 'ja';  // 기본값: 일본어
let historyData = [];  // 현재 세션의 히스토리 데이터 배열
let historyIdCounter = 0;  // 고유 ID 카운터

// 세션 관리 변수
let sessions = JSON.parse(localStorage.getItem('chatSessions') || '[]');  // 모든 세션 배열
let currentSessionId = null;  // 현재 활성 세션 ID
let sessionIdCounter = parseInt(localStorage.getItem('sessionIdCounter') || '0');  // 세션 ID 카운터

// UI 언어 설정
let uiLanguage = localStorage.getItem('uiLanguage') || 'ko';  // 기본값: 한국어

// 다국어 텍스트
const i18n = {
    ko: {
        title: '실시간 대화 번역기',
        audioDevice: '오디오 장치 선택...',
        listenKorean: '🎧 한국어 듣기 (9)',
        listenJapanese: '🎧 일본어 듣기 (0)',
        startBtn: '시작 (-)',
        stopBtn: '중지 (=)',
        statusWaiting: '대기 중',
        statusReady: '준비 완료',
        statusListening: '인식 중',
        statusTranslating: '번역 중...',
        statusStopped: '중지됨 (세션 저장됨)',
        originalText: '원문',
        translatedText: '번역',
        historyTitle: '대화 기록',
        searchPlaceholder: '검색...',
        exportBtn: '내보내기',
        copyAllBtn: '전체 복사',
        clearBtn: '지우기',
        previousChats: '이전 대화:',
        noSessions: '저장된 세션 없음',
        time: '시간',
        apiKeyPlaceholder: 'DeepL API 키 입력',
        saveBtn: '저장',
        pleaseSpeak: '로 말씀해주세요...',
        waitingTranslation: '번역 대기 중...',
        translating: '번역 중...',
        menuToggleSessions: '📂 이전 대화 목록 보기/숨기기',
        networkTitle: '다른 기기 접속',
        networkLocal: '같은 와이파이의 다른 기기에서 접속:',
        networkCloud: '🌐 인터넷 어디서나 접속:',
        networkCloudLabel: '🌍 클라우드 URL (마이크 사용 가능)',
        networkLocalLabel: '🎤 {interface} (마이크 사용 가능)',
        networkQrHint: '💡 QR 코드를 스캔하여 휴대폰에서 바로 접속하세요!',
        networkHttpsWarning: '⚠️ 접속 시 "안전하지 않음" 경고가 표시되면<br>→ \'고급\' → \'안전하지 않은 사이트로 이동\' 클릭',
        networkNoIp: '로컬 IP 주소를 찾을 수 없습니다.',
        networkCheckWifi: '와이파이에 연결되어 있는지 확인해주세요.',
        copyBtn: '복사',
        sessionBadge: '이전 세션',
        korean: '한국어',
        japanese: '일본어',
        koreanLang: '한국어',
        japaneseLang: '일본어',
        switchingTo: '로 전환 중...',
        waitingVoice: '음성 대기 중...',
        audioCaptureError: '오디오 캡처 오류',
        micPermissionDenied: '마이크 권한 거부',
        unknownError: '알 수 없는 오류',
        // Alert 메시지
        alertBrowserNotSupported: '⚠️ 이 브라우저는 오디오 장치 접근을 지원하지 않습니다. Chrome을 사용해주세요.',
        alertMicPermissionNeeded: '⚠️ 마이크 권한이 필요합니다!\n\n주소창 왼쪽의 자물쇠 아이콘을 클릭하여\n마이크 권한을 "허용"으로 설정해주세요.',
        alertNoAudioDevice: '⚠️ 오디오 입력 장치를 찾을 수 없습니다!\n\n마이크나 BlackHole이 연결/설치되어 있는지 확인해주세요.',
        alertAudioDeviceInUse: '⚠️ 오디오 장치를 사용할 수 없습니다!\n\n다른 앱에서 마이크를 사용 중인지 확인해주세요.',
        alertAudioAccessError: '⚠️ 오디오 장치 접근 중 오류가 발생했습니다:\n',
        alertApiKeyNeeded: '⚠️ 먼저 DeepL API 키를 입력하고 저장해주세요!\n\nhttps://www.deepl.com/ko/pro-api 에서 무료로 발급받을 수 있습니다.',
        alertSessionError: '세션 생성 중 오류 발생: ',
        alertSpeechNotSupported: '⚠️ 이 브라우저는 음성 인식을 지원하지 않습니다. Chrome 브라우저를 사용해주세요.',
        alertAudioDeviceError: '⚠️ 오디오 장치 접근 오류:\n',
        alertServerError: '⚠️ 서버에 연결할 수 없습니다.\n\n페이지를 새로고침하거나 잠시 후 다시 시도해주세요.',
        alertInvalidApiKey: '⚠️ DeepL API 키가 올바르지 않습니다.\n\nAPI 키를 다시 확인하고 저장 버튼을 눌러 재설정해주세요.',
        alertQuotaExceeded: '⚠️ DeepL 무료 사용량(월 50만 자)이 초과되었습니다.\n\n다음 달에 다시 사용하거나 유료 플랜으로 업그레이드하세요.',
        alertNoHistory: '복사할 내역이 없습니다.',
        alertCopySuccess: '✅ 전체 내역이 클립보드에 복사되었습니다!',
        alertCopyFailed: '⚠️ 복사에 실패했습니다.',
        alertNoExportData: '내보낼 내역이 없습니다.',
        alertFileDownloaded: '✅ 파일이 다운로드되었습니다!',
        alertCopied: '✅ 클립보드에 복사되었습니다!',
        alertCopyFailedManual: '⚠️ 복사에 실패했습니다. 수동으로 복사해주세요.',
        alertTunnelError: '터널 생성 실패: ',
        alertTunnelCreateError: '터널 생성 중 오류: ',
        alertTunnelStopError: '터널 중지 실패: ',
        alertNoSessions: '저장된 이전 대화가 없습니다.',
        sessionListTitle: '📂 저장된 대화 목록:\n\n',
        sessionListFooter: '\n\n세션 탭을 클릭하여 불러올 수 있습니다.'
    },
    ja: {
        title: 'リアルタイム会話翻訳機',
        audioDevice: 'オーディオデバイスを選択...',
        listenKorean: '🎧 韓国語を聞く (9)',
        listenJapanese: '🎧 日本語を聞く (0)',
        startBtn: '開始 (-)',
        stopBtn: '停止 (=)',
        statusWaiting: '待機中',
        statusReady: '準備完了',
        statusListening: '認識中',
        statusTranslating: '翻訳中...',
        statusStopped: '停止しました（セッション保存済み）',
        originalText: '原文',
        translatedText: '翻訳',
        historyTitle: '会話履歴',
        searchPlaceholder: '検索...',
        exportBtn: 'エクスポート',
        copyAllBtn: '全てコピー',
        clearBtn: '消去',
        previousChats: '以前の会話:',
        noSessions: '保存されたセッションなし',
        time: '時間',
        apiKeyPlaceholder: 'DeepL APIキーを入力',
        saveBtn: '保存',
        pleaseSpeak: 'で話してください...',
        waitingTranslation: '翻訳待機中...',
        translating: '翻訳中...',
        menuToggleSessions: '📂 以前の会話リストを表示/非表示',
        networkTitle: '他のデバイスで接続',
        networkLocal: '同じWi-Fiの他のデバイスから接続:',
        networkCloud: '🌐 インターネットのどこからでも接続:',
        networkCloudLabel: '🌍 クラウドURL（マイク使用可能）',
        networkLocalLabel: '🎤 {interface}（マイク使用可能）',
        networkQrHint: '💡 QRコードをスキャンしてスマホから直接接続してください！',
        networkHttpsWarning: '⚠️ 接続時に「安全ではありません」警告が表示されたら<br>→ 「詳細設定」→「安全でないサイトに移動」をクリック',
        networkNoIp: 'ローカルIPアドレスが見つかりません。',
        networkCheckWifi: 'Wi-Fiに接続されているか確認してください。',
        copyBtn: 'コピー',
        sessionBadge: '以前のセッション',
        korean: '韓国語',
        japanese: '日本語',
        koreanLang: '韓国語',
        japaneseLang: '日本語',
        switchingTo: 'に切り替え中...',
        waitingVoice: '音声待機中...',
        audioCaptureError: 'オーディオキャプチャエラー',
        micPermissionDenied: 'マイク権限拒否',
        unknownError: '不明なエラー',
        // Alert メッセージ
        alertBrowserNotSupported: '⚠️ このブラウザはオーディオデバイスへのアクセスをサポートしていません。Chromeを使用してください。',
        alertMicPermissionNeeded: '⚠️ マイク権限が必要です！\n\nアドレスバー左側の鍵アイコンをクリックして\nマイク権限を「許可」に設定してください。',
        alertNoAudioDevice: '⚠️ オーディオ入力デバイスが見つかりません！\n\nマイクまたはBlackHoleが接続/インストールされているか確認してください。',
        alertAudioDeviceInUse: '⚠️ オーディオデバイスを使用できません！\n\n他のアプリでマイクを使用中か確認してください。',
        alertAudioAccessError: '⚠️ オーディオデバイスアクセス中にエラーが発生しました:\n',
        alertApiKeyNeeded: '⚠️ まずDeepL APIキーを入力して保存してください！\n\nhttps://www.deepl.com/ja/pro-api で無料で発行できます。',
        alertSessionError: 'セッション生成中にエラーが発生しました: ',
        alertSpeechNotSupported: '⚠️ このブラウザは音声認識をサポートしていません。Chromeブラウザを使用してください。',
        alertAudioDeviceError: '⚠️ オーディオデバイスアクセスエラー:\n',
        alertServerError: '⚠️ サーバーに接続できません。\n\nページを再読み込みするか、しばらくしてから再度お試しください。',
        alertInvalidApiKey: '⚠️ DeepL APIキーが正しくありません。\n\nAPIキーを再確認して保存ボタンを押して再設定してください。',
        alertQuotaExceeded: '⚠️ DeepL無料使用量（月50万文字）を超過しました。\n\n来月再度使用するか、有料プランにアップグレードしてください。',
        alertNoHistory: 'コピーする履歴がありません。',
        alertCopySuccess: '✅ 全ての履歴がクリップボードにコピーされました！',
        alertCopyFailed: '⚠️ コピーに失敗しました。',
        alertNoExportData: 'エクスポートする履歴がありません。',
        alertFileDownloaded: '✅ ファイルがダウンロードされました！',
        alertCopied: '✅ クリップボードにコピーされました！',
        alertCopyFailedManual: '⚠️ コピーに失敗しました。手動でコピーしてください。',
        alertTunnelError: 'トンネル生成失敗: ',
        alertTunnelCreateError: 'トンネル生成中にエラー: ',
        alertTunnelStopError: 'トンネル停止失敗: ',
        alertNoSessions: '保存された以前の会話がありません。',
        sessionListTitle: '📂 保存された会話リスト:\n\n',
        sessionListFooter: '\n\nセッションタブをクリックして読み込めます。'
    }
};

// 안전한 i18n 접근 함수
function getI18nText(key) {
    try {
        if (i18n && i18n[uiLanguage] && i18n[uiLanguage][key]) {
            return i18n[uiLanguage][key];
        }
        if (i18n && i18n.ko && i18n.ko[key]) {
            return i18n.ko[key];
        }
        return key;
    } catch (e) {
        console.error('i18n 접근 오류:', e);
        return key;
    }
}

// 페이지 로드 시 초기화
window.onload = async function() {
    console.log('🚀 window.onload 시작');
    console.log('📊 현재 uiLanguage:', uiLanguage);
    console.log('📚 i18n 객체 존재:', typeof i18n);

    // 드롭다운이 비어있지 않도록 초기 옵션 보장
    const select = document.getElementById('audioSource');
    if (select) {
        console.log('✅ audioSource 요소 발견');
        // 기본 옵션이 없으면 추가
        if (select.options.length === 0) {
            console.warn('⚠️ 드롭다운이 비어있음 - 기본 옵션 추가');
            select.innerHTML = '<option value="">🎧 오디오 장치 선택...</option>';
        }
    } else {
        console.error('❌ audioSource 요소를 찾을 수 없습니다!');
    }

    // UI 언어 적용
    try {
        console.log('🌐 updateUILanguage 호출');
        updateUILanguage();
    } catch (error) {
        console.error('❌ updateUILanguage 오류:', error);
    }

    // 오디오 장치 목록 로드 (에러가 발생해도 나머지 초기화는 계속 진행)
    try {
        console.log('🎤 refreshAudioDevices 호출');
        await refreshAudioDevices();
        console.log('✅ refreshAudioDevices 완료');
    } catch (error) {
        console.error('❌ 오디오 장치 로드 실패:', error);
        console.error('오류 스택:', error.stack);

        // 에러 발생 시 드롭다운에 기본 메시지 표시
        const select = document.getElementById('audioSource');
        if (select) {
            const errorMsg = uiLanguage === 'ko' ? '장치 로드 실패' : 'デバイス読み込み失敗';
            select.innerHTML = `<option value="">❌ ${errorMsg}</option>`;
            console.log('📝 에러 메시지를 드롭다운에 표시함');
        }

        const statusMsg = uiLanguage === 'ko' ? '마이크 권한 필요' : 'マイク権限必要';
        updateStatus(statusMsg);
    }

    // DeepL API 키 복원
    if (deeplApiKey) {
        const input = document.getElementById('deeplApiKey');
        if (input) {
            input.value = '••••••••••••••••';
            input.disabled = true;
        }
        updateApiKeyStatus('✅', '#10b981');
        // API 키가 있으면 버튼 스타일 변경
        const toggleBtn = document.getElementById('toggleApiBtn');
        if (toggleBtn) {
            toggleBtn.classList.add('has-key');
        }
    }

    // 언어 선택 버튼 상태 복원
    updateLanguageButtons();

    // 검색 기능 초기화
    const searchInput = document.getElementById('searchInput');
    if (searchInput) {
        searchInput.addEventListener('input', filterHistory);
    }

    // 네트워크 정보 로드
    loadNetworkInfo();

    // 세션 탭 렌더링
    renderSessionTabs();

    // 세션 탭 및 액션 버튼 표시 상태 복원
    const sessionTabsVisible = localStorage.getItem('sessionTabsVisible');
    const sessionTabsContainer = document.querySelector('.session-tabs-container');
    const actionButtons = document.getElementById('historyActionButtons');

    if (sessionTabsVisible === 'true') {
        sessionTabsContainer.style.display = 'block';
        actionButtons.style.display = 'flex';
    } else {
        // 기본값은 숨김
        sessionTabsContainer.style.display = 'none';
        actionButtons.style.display = 'none';
    }
};

// 언어 선택 함수
function setListenLanguage(lang) {
    const wasListening = isListening;
    listenLanguage = lang;
    localStorage.setItem('listenLanguage', lang);
    updateLanguageButtons();

    // 실행 중이면 재시작
    if (wasListening) {
        const t = i18n[uiLanguage];
        const langName = lang === 'ja' ? t.japaneseLang : t.koreanLang;
        updateStatus(`${langName}${t.switchingTo}`);
        stopListening();
        setTimeout(() => {
            startListening();
        }, 500);
    }
}

// 언어 버튼 상태 업데이트
function updateLanguageButtons() {
    const jaBtn = document.getElementById('listenJaBtn');
    const koBtn = document.getElementById('listenKoBtn');

    if (listenLanguage === 'ja') {
        jaBtn.classList.add('active');
        koBtn.classList.remove('active');
    } else {
        koBtn.classList.add('active');
        jaBtn.classList.remove('active');
    }
}

// UI 언어 전환
function toggleUILanguage() {
    uiLanguage = uiLanguage === 'ko' ? 'ja' : 'ko';
    localStorage.setItem('uiLanguage', uiLanguage);
    updateUILanguage();
}

// UI 언어 업데이트
function updateUILanguage() {
    const t = i18n[uiLanguage];

    // 제목
    const titleEl = document.querySelector('h1');
    if (titleEl) {
        const pawIcon = titleEl.querySelector('.paw-icon');
        const pawMenu = titleEl.querySelector('.paw-menu');
        titleEl.innerHTML = '';
        if (pawIcon) titleEl.appendChild(pawIcon);
        titleEl.appendChild(document.createTextNode('\n                    ' + t.title + '\n                    '));
        if (pawMenu) titleEl.appendChild(pawMenu);
    }

    // 오디오 장치 선택
    const audioSource = document.getElementById('audioSource');
    if (audioSource && audioSource.options[0]) {
        audioSource.options[0].text = '🎧 ' + t.audioDevice;
    }

    // 언어 듣기 버튼
    const listenKoBtn = document.getElementById('listenKoBtn');
    const listenJaBtn = document.getElementById('listenJaBtn');
    if (listenKoBtn) listenKoBtn.textContent = t.listenKorean;
    if (listenJaBtn) listenJaBtn.textContent = t.listenJapanese;

    // 시작/중지 버튼
    const startBtn = document.getElementById('startBtn');
    const stopBtn = document.getElementById('stopBtn');
    if (startBtn) startBtn.textContent = t.startBtn;
    if (stopBtn) stopBtn.textContent = t.stopBtn;

    // 상태 텍스트 업데이트
    const statusLabel = document.querySelector('.status-label');
    if (statusLabel) {
        const currentStatus = statusLabel.textContent;
        // 현재 상태를 파악하여 적절한 언어로 변경
        if (currentStatus.includes('대기') || currentStatus.includes('待機')) {
            statusLabel.textContent = t.statusWaiting;
        } else if (currentStatus.includes('준비') || currentStatus.includes('準備')) {
            statusLabel.textContent = t.statusReady;
        } else if (currentStatus.includes('인식') || currentStatus.includes('認識')) {
            statusLabel.textContent = t.statusListening;
        } else if (currentStatus.includes('번역') || currentStatus.includes('翻訳')) {
            statusLabel.textContent = t.statusTranslating;
        } else if (currentStatus.includes('중지') || currentStatus.includes('停止')) {
            statusLabel.textContent = t.statusStopped;
        }
    }

    // 현재 자막
    const sourceText = document.getElementById('sourceText');
    const targetText = document.getElementById('targetText');
    if (sourceText && sourceText.textContent === '원문' || sourceText.textContent === '原文') {
        sourceText.textContent = t.originalText;
    }
    if (targetText && targetText.textContent === '번역' || targetText.textContent === '翻訳') {
        targetText.textContent = t.translatedText;
    }

    // 대화 기록 섹션
    const historyTitle = document.querySelector('.history-section h2');
    if (historyTitle) historyTitle.textContent = t.historyTitle;

    const searchInput = document.getElementById('searchInput');
    if (searchInput) searchInput.placeholder = t.searchPlaceholder;

    // 액션 버튼들
    const actionButtons = document.getElementById('historyActionButtons');
    if (actionButtons) {
        const buttons = actionButtons.querySelectorAll('.action-btn');
        if (buttons[0]) buttons[0].textContent = t.exportBtn;
        if (buttons[1]) buttons[1].textContent = t.copyAllBtn;
        if (buttons[2]) buttons[2].textContent = t.clearBtn;
    }

    // 세션 탭 라벨
    const sessionLabel = document.querySelector('.session-tabs-label');
    if (sessionLabel) sessionLabel.textContent = t.previousChats;

    // 테이블 헤더
    const thElements = document.querySelectorAll('.history-table th');
    if (thElements.length >= 3) {
        thElements[1].textContent = t.time;
        thElements[2].textContent = t.originalText;
        thElements[3].textContent = t.translatedText;
    }

    // API 키 입력
    const apiKeyInput = document.getElementById('deeplApiKey');
    if (apiKeyInput && !apiKeyInput.disabled) {
        apiKeyInput.placeholder = t.apiKeyPlaceholder;
    }

    // 저장 버튼
    const apiSaveBtn = document.querySelector('.api-save-btn');
    if (apiSaveBtn) apiSaveBtn.textContent = t.saveBtn;

    // 메뉴 항목
    const pawMenuItem = document.querySelector('.paw-menu-item');
    if (pawMenuItem) pawMenuItem.textContent = t.menuToggleSessions;

    // 네트워크 정보 제목
    const networkHeader = document.querySelector('#networkInfo .network-header strong');
    if (networkHeader) networkHeader.textContent = t.networkTitle;

    // 세션 렌더링 (저장된 세션 없음 메시지)
    renderSessionTabs();

    // 언어 전환 버튼 툴팁
    const langToggleBtn = document.getElementById('langToggleBtn');
    if (langToggleBtn) {
        langToggleBtn.title = uiLanguage === 'ko' ? t.japanese : t.korean;
    }
}

// API 키 입력창 토글
function toggleApiKeyInput() {
    const section = document.getElementById('apiKeySection');
    const toggleBtn = document.getElementById('toggleApiBtn');

    if (section.style.display === 'none') {
        section.style.display = 'flex';
    } else {
        section.style.display = 'none';
    }
}

// DeepL API 키 저장
function saveDeepLApiKey() {
    const input = document.getElementById('deeplApiKey');
    if (!input) return;

    const key = input.value.trim();

    if (input.disabled) {
        // 이미 저장된 키 재설정
        input.disabled = false;
        input.value = '';
        deeplApiKey = '';
        localStorage.removeItem('deeplApiKey');
        updateApiKeyStatus('', '');
        input.focus();

        // 토글 버튼 스타일 제거
        const toggleBtn = document.getElementById('toggleApiBtn');
        if (toggleBtn) {
            toggleBtn.classList.remove('has-key');
        }
        return;
    }

    if (!key) {
        updateApiKeyStatus('⚠️', '#f59e0b');
        return;
    }

    // API 키 형식 검증 (간단한 체크)
    if (!key.includes('-') || key.length < 30) {
        updateApiKeyStatus('❌', '#ef4444');
        return;
    }

    deeplApiKey = key;
    localStorage.setItem('deeplApiKey', key);
    input.value = '••••••••••••••••';
    input.disabled = true;
    updateApiKeyStatus('✅', '#10b981');

    // 토글 버튼 스타일 업데이트
    const toggleBtn = document.getElementById('toggleApiBtn');
    if (toggleBtn) {
        toggleBtn.classList.add('has-key');
    }

    // 입력창 자동으로 닫기
    setTimeout(() => {
        document.getElementById('apiKeySection').style.display = 'none';
    }, 1000);
}

// API 키 상태 업데이트
function updateApiKeyStatus(message, color) {
    const status = document.getElementById('apiKeyStatus');
    if (!status) return;  // UI 요소가 없으면 무시
    status.textContent = message;
    status.style.color = color;
}

// 오디오 장치 목록 새로고침
async function refreshAudioDevices() {
    console.log('=== 오디오 장치 목록 로딩 시작 ===');
    console.log('📊 현재 uiLanguage:', uiLanguage);
    console.log('📚 i18n 객체 타입:', typeof i18n);
    console.log('🌐 i18n[uiLanguage] 존재:', i18n ? typeof i18n[uiLanguage] : 'i18n이 없음');

    const select = document.getElementById('audioSource');

    if (!select) {
        console.error('❌ CRITICAL: audioSource 요소를 찾을 수 없습니다!');
        return;
    }

    console.log('✅ audioSource 요소 확인됨');
    console.log('📝 현재 옵션 개수:', select.options.length);

    // MediaDevices API 지원 확인
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        console.error('❌ 이 브라우저는 MediaDevices API를 지원하지 않습니다!');
        const t = i18n && i18n[uiLanguage] ? i18n[uiLanguage] : i18n.ko;
        select.innerHTML = '<option value="">❌ ' + (uiLanguage === 'ko' ? '브라우저 미지원' : 'ブラウザ未対応') + '</option>';
        updateStatus(uiLanguage === 'ko' ? '브라우저 미지원' : 'ブラウザ未対応');
        if (t && t.alertBrowserNotSupported) {
            alert(t.alertBrowserNotSupported);
        }
        return;
    }

    try {
        // 권한 요청
        console.log('🎤 오디오 권한 요청 중...');
        console.log('📱 브라우저:', navigator.userAgent);

        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        console.log('✅ 오디오 권한 획득 완료');
        console.log('🎵 스트림 정보:', {
            active: stream.active,
            id: stream.id,
            tracks: stream.getTracks().length
        });

        // 권한 받은 후 즉시 스트림 정리
        stream.getTracks().forEach(track => {
            console.log(`  ⏹️ 트랙 정지: ${track.label}`);
            track.stop();
        });
        permissionGranted = true;
        localStorage.setItem('audioPermissionGranted', 'true');

        // 모든 오디오 입력 장치 가져오기
        console.log('📋 장치 목록 가져오는 중...');
        const devices = await navigator.mediaDevices.enumerateDevices();
        console.log(`📊 전체 장치 수: ${devices.length}`);

        // 모든 장치 출력 (디버깅용)
        devices.forEach((device, i) => {
            console.log(`  ${i+1}. [${device.kind}] ${device.label || '(이름 없음)'}`);
        });

        const audioInputs = devices.filter(device => device.kind === 'audioinput');
        console.log(`🎧 오디오 입력 장치 수: ${audioInputs.length}`);

        // 드롭다운 초기화
        console.log('🔧 드롭다운 초기화 시작');
        const t = i18n && i18n[uiLanguage] ? i18n[uiLanguage] : i18n.ko;
        console.log('📖 i18n 텍스트 객체:', t ? 'OK' : 'NULL');
        const audioDeviceText = t && t.audioDevice ? t.audioDevice : '오디오 장치 선택...';
        console.log('💬 드롭다운 텍스트:', audioDeviceText);

        select.innerHTML = `<option value="">🎧 ${audioDeviceText}</option>`;
        console.log('✅ 드롭다운 초기화 완료');
        console.log('📊 초기화 후 옵션 개수:', select.options.length);
        console.log('📝 첫 번째 옵션 텍스트:', select.options[0] ? select.options[0].text : 'NONE');

        if (audioInputs.length === 0) {
            console.warn('⚠️ 오디오 입력 장치가 없습니다!');
            select.innerHTML = '<option value="">❌ ' + (uiLanguage === 'ko' ? '오디오 장치 없음' : 'オーディオデバイスなし') + '</option>';
            updateStatus(uiLanguage === 'ko' ? '오디오 장치 없음' : 'オーディオデバイスなし');
            return;
        }

        let blackHoleDevice = null;
        let firstDevice = null;

        console.log('🔨 장치를 드롭다운에 추가 중...');
        audioInputs.forEach((device, index) => {
            console.log(`  추가 ${index + 1}/${audioInputs.length}: ${device.label || '이름 없음'}`);

            const option = document.createElement('option');
            option.value = device.deviceId;
            option.textContent = device.label || `마이크 ${select.options.length}`;

            // BlackHole 강조 표시
            if (device.label && device.label.toLowerCase().includes('blackhole')) {
                option.textContent += ' ⭐ (권장)';
                blackHoleDevice = device;
                console.log('  ⭐ BlackHole 장치 발견!');
            }

            // 첫 번째 장치 저장
            if (!firstDevice) {
                firstDevice = device;
            }

            select.appendChild(option);
        });

        console.log(`✅ 총 ${audioInputs.length}개 장치 추가 완료`);
        console.log(`📋 현재 드롭다운 옵션 수: ${select.options.length}`);

        // 이전에 선택한 장치 복원 또는 자동 선택
        if (selectedDeviceId && audioInputs.some(d => d.deviceId === selectedDeviceId)) {
            // 저장된 장치가 있고 현재도 사용 가능하면 그것을 사용
            select.value = selectedDeviceId;
        } else {
            // 선택된 장치가 없거나 사용 불가능하면 자동 선택: BlackHole 우선, 없으면 첫 번째 장치
            const autoSelectDevice = blackHoleDevice || firstDevice;
            if (autoSelectDevice) {
                selectedDeviceId = autoSelectDevice.deviceId;
                select.value = selectedDeviceId;
                localStorage.setItem('selectedAudioDevice', selectedDeviceId);
            } else {
                // 장치가 하나도 없으면 localStorage에서 제거
                selectedDeviceId = '';
                localStorage.removeItem('selectedAudioDevice');
            }
        }

        // 장치 변경 이벤트 리스너
        select.onchange = function() {
            selectedDeviceId = this.value;
            if (selectedDeviceId) {
                localStorage.setItem('selectedAudioDevice', selectedDeviceId);
            } else {
                localStorage.removeItem('selectedAudioDevice');
            }
        };

        if (selectedDeviceId) {
            console.log('선택된 장치:', selectedDeviceId);
            const t = i18n[uiLanguage];
            updateStatus(t.statusReady);
        } else {
            console.log('선택된 장치 없음');
            const t = i18n[uiLanguage];
            updateStatus(t.statusWaiting);
        }

    } catch (error) {
        console.error('❌ 오디오 장치 접근 오류:', error);
        console.error('📋 에러 상세:');
        console.error('  - 이름:', error.name);
        console.error('  - 메시지:', error.message);
        console.error('  - 스택:', error.stack);

        const t = i18n && i18n[uiLanguage] ? i18n[uiLanguage] : i18n.ko;

        // 드롭다운에 에러 메시지 표시
        select.innerHTML = `<option value="">❌ ${error.name === 'NotAllowedError' ? (uiLanguage === 'ko' ? '마이크 권한 필요' : 'マイク権限必要') : (uiLanguage === 'ko' ? '장치 접근 실패' : 'デバイスアクセス失敗')}</option>`;
        updateStatus(uiLanguage === 'ko' ? '마이크 권한 필요' : 'マイク権限必要');

        // 에러 타입별 상세 안내
        if (error.name === 'NotAllowedError' || error.name === 'PermissionDeniedError') {
            console.error('⚠️ 사용자가 마이크 권한을 거부했습니다.');
            console.error('💡 해결 방법:');
            console.error('   1. 주소창 왼쪽의 자물쇠 아이콘 클릭');
            console.error('   2. 마이크 권한을 "허용"으로 변경');
            console.error('   3. 페이지 새로고침');
            if (t && t.alertMicPermissionNeeded) {
                alert(t.alertMicPermissionNeeded);
            }
        } else if (error.name === 'NotFoundError' || error.name === 'DevicesNotFoundError') {
            console.error('⚠️ 오디오 입력 장치를 찾을 수 없습니다.');
            console.error('💡 해결 방법:');
            console.error('   1. 마이크나 오디오 입력 장치가 연결되어 있는지 확인');
            console.error('   2. BlackHole이 설치되어 있는지 확인');
            if (t && t.alertNoAudioDevice) {
                alert(t.alertNoAudioDevice);
            }
        } else if (error.name === 'NotReadableError' || error.name === 'TrackStartError') {
            console.error('⚠️ 오디오 장치를 사용할 수 없습니다 (다른 앱에서 사용 중일 수 있음).');
            if (t && t.alertAudioDeviceInUse) {
                alert(t.alertAudioDeviceInUse);
            }
        } else {
            console.error('⚠️ 알 수 없는 오류가 발생했습니다.');
            if (t && t.alertAudioAccessError) {
                alert(t.alertAudioAccessError + error.message);
            }
        }
    }
}

// 음성 인식 시작
async function startListening() {
    console.log('시작 버튼 클릭됨');
    const t = i18n[uiLanguage];

    // DeepL API 키 확인
    if (!deeplApiKey) {
        alert(t.alertApiKeyNeeded);
        return;
    }

    console.log('API 키 확인 완료');

    try {
        // 새 세션 시작
        createNewSession();
        console.log('세션 생성 완료');
    } catch (error) {
        console.error('세션 생성 오류:', error);
        alert(t.alertSessionError + error.message);
        return;
    }

    // Web Speech API 지원 확인
    if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
        alert(t.alertSpeechNotSupported);
        return;
    }

    try {
        // 오디오 설정 준비
        const audioConstraints = {
            echoCancellation: false,
            noiseSuppression: false,
            autoGainControl: false
        };

        // 특정 장치가 선택되었으면 해당 장치 사용, 아니면 기본 마이크 사용
        if (selectedDeviceId) {
            audioConstraints.deviceId = { exact: selectedDeviceId };
        }

        // 선택된 오디오 장치에서 스트림 가져오기
        audioStream = await navigator.mediaDevices.getUserMedia({
            audio: audioConstraints
        });

        // Web Audio API 초기화
        audioContext = new (window.AudioContext || window.webkitAudioContext)();
        const source = audioContext.createMediaStreamSource(audioStream);

        // 오디오 분석기 추가 (선택사항)
        const analyser = audioContext.createAnalyser();
        source.connect(analyser);

        // Speech Recognition 초기화
        const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
        recognition = new SpeechRecognition();

        // 선택된 언어로 음성 인식 설정
        recognition.lang = listenLanguage === 'ja' ? 'ja-JP' : 'ko-KR';
        recognition.continuous = true;  // 연속 인식
        recognition.interimResults = true;  // 중간 결과도 받기

        // 음성 인식 이벤트 핸들러
        recognition.onstart = function() {
            isListening = true;
            const t = i18n[uiLanguage];
            const langName = listenLanguage === 'ja' ? t.japaneseLang : t.koreanLang;
            updateStatus(`${langName} ${t.statusListening}`);
            document.getElementById('startBtn').disabled = true;
            document.getElementById('stopBtn').disabled = false;

            // 초기 메시지 표시
            document.getElementById('sourceText').textContent = `${langName}${t.pleaseSpeak}`;
            document.getElementById('targetText').textContent = t.waitingTranslation;
        };

        recognition.onresult = function(event) {
            let interimTranscript = '';
            let finalTranscript = '';

            // 인식 결과 처리
            for (let i = event.resultIndex; i < event.results.length; i++) {
                const transcript = event.results[i][0].transcript;
                if (event.results[i].isFinal) {
                    finalTranscript += transcript;
                } else {
                    interimTranscript += transcript;
                }
            }

            // 원문 텍스트 표시 (중간 결과)
            if (interimTranscript) {
                const t = i18n[uiLanguage];
                document.getElementById('sourceText').textContent = interimTranscript;
                // 새로운 음성 입력이 시작되면 이전 번역 결과 지우기
                document.getElementById('targetText').textContent = t.waitingTranslation;
            }

            // 최종 결과가 있으면 번역 시작
            if (finalTranscript) {
                const t = i18n[uiLanguage];
                document.getElementById('sourceText').textContent = finalTranscript;
                document.getElementById('targetText').textContent = t.translating;
                translateText(finalTranscript);
            }
        };

        recognition.onerror = function(event) {
            console.error('음성 인식 오류:', event.error);
            const t = i18n[uiLanguage];

            if (event.error === 'no-speech') {
                updateStatus(t.waitingVoice);
            } else if (event.error === 'audio-capture') {
                updateStatus(t.audioCaptureError);
            } else if (event.error === 'not-allowed') {
                updateStatus(t.micPermissionDenied);
            } else {
                updateStatus(t.unknownError + ': ' + event.error);
            }
        };

        recognition.onend = function() {
            if (isListening) {
                // 자동으로 다시 시작
                try {
                    recognition.start();
                } catch (e) {
                    console.error('재시작 오류:', e);
                    stopListening();
                }
            }
        };

        // 인식 시작
        recognition.start();

    } catch (error) {
        console.error('시작 오류:', error);
        updateStatus('시작 실패');
        const t = i18n[uiLanguage];
        alert(t.alertAudioDeviceError + error.message);
    }
}

// 음성 인식 중지
function stopListening() {
    isListening = false;

    if (recognition) {
        recognition.stop();
        recognition = null;
    }

    if (audioStream) {
        audioStream.getTracks().forEach(track => track.stop());
        audioStream = null;
    }

    if (audioContext) {
        audioContext.close();
        audioContext = null;
    }

    // 현재 세션 저장
    saveCurrentSession();

    const t = i18n[uiLanguage];
    updateStatus(t.statusStopped);

    // 자막 영역 초기화
    document.getElementById('sourceText').textContent = t.originalText;
    document.getElementById('targetText').textContent = t.translatedText;

    document.getElementById('startBtn').disabled = false;
    document.getElementById('stopBtn').disabled = true;
}

// Google Translate로 번역 (언어 자동 감지)
async function translateText(sourceText) {
    // 빈 텍스트 무시
    if (!sourceText.trim()) {
        return;
    }

    updateStatus('번역 중...');
    console.log('번역 시작:', sourceText);

    try {
        console.log('DeepL로 번역 요청 (언어 자동 감지)...');

        const response = await fetch('/api/translate', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                text: sourceText,
                autoDetect: true,
                apiKey: deeplApiKey
            })
        });

        console.log('API 응답 상태:', response.status);

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            console.error('API 오류 응답:', errorData);
            throw new Error(`API 오류 (${response.status}): ${errorData.error || '알 수 없는 오류'}`);
        }

        const data = await response.json();
        console.log('번역 완료:', data);
        const targetText = data.translated;
        const detectedLang = data.detectedLang || 'unknown';

        // 결과 표시
        document.getElementById('targetText').textContent = targetText;

        // 히스토리에 추가 (언어 정보 포함)
        addToHistory(sourceText, targetText, detectedLang);

        const langName = listenLanguage === 'ja' ? '일본어' : '한국어';
        updateStatus(`${langName} 인식 중`);

    } catch (error) {
        console.error('번역 오류 상세:', error);
        console.error('오류 타입:', error.name);
        console.error('오류 메시지:', error.message);

        let errorMessage = error.message;

        // 프록시 서버 연결 실패 감지
        if (error.message === 'Failed to fetch' || error.name === 'TypeError') {
            errorMessage = '프록시 서버에 연결할 수 없습니다. 프록시 서버가 실행 중인지 확인하세요.';
            console.error('💡 해결 방법: 터미널에서 "npm install && npm start"를 실행하여 프록시 서버를 시작하세요.');
        }

        document.getElementById('targetText').textContent = '⚠️ 번역 실패: ' + errorMessage;
        updateStatus('번역 오류');

        // 에러 타입별 알림
        const t = i18n[uiLanguage];
        if (error.message === 'Failed to fetch' || error.name === 'TypeError') {
            alert(t.alertServerError);
        } else if (errorMessage.includes('API 키가 올바르지 않습니다') || errorMessage.includes('APIキーが正しくありません')) {
            updateApiKeyStatus('❌ API 키가 올바르지 않습니다', 'red');
            alert(t.alertInvalidApiKey);
        } else if (errorMessage.includes('무료 사용량이 초과') || errorMessage.includes('無料使用量を超過')) {
            updateApiKeyStatus('⚠️ 무료 사용량 초과', 'orange');
            alert(t.alertQuotaExceeded);
        }
    }
}

// 상태 업데이트
function updateStatus(message) {
    const dotEl = document.querySelector('.status-dot');
    const labelEl = document.querySelector('.status-label');

    if (!dotEl || !labelEl) {
        console.error('상태 표시 요소를 찾을 수 없습니다.');
        return;
    }

    labelEl.textContent = message;

    // 상태별 색상 설정 (한국어/일본어 모두 지원)
    if (message.includes('듣는 중') || message.includes('인식 중') ||
        message.includes('認識中') || message.includes('聞いています')) {
        dotEl.style.color = '#10b981'; // 초록색
    } else if (message.includes('번역 중') || message.includes('翻訳中')) {
        dotEl.style.color = '#3b82f6'; // 파란색
    } else if (message.includes('중지') || message.includes('오류') || message.includes('실패') ||
               message.includes('停止') || message.includes('エラー') || message.includes('失敗')) {
        dotEl.style.color = '#ef4444'; // 빨간색
    } else {
        dotEl.style.color = '#9ca3af'; // 회색 (대기 중)
    }

    console.log('상태 업데이트:', message);
}

// 히스토리에 추가
function addToHistory(sourceText, targetText, detectedLang) {
    const now = new Date();
    const id = historyIdCounter++;

    // 히스토리 데이터 객체 생성
    const historyItem = {
        id: id,
        timestamp: now,
        sourceText: sourceText,
        targetText: targetText,
        detectedLang: detectedLang,
        starred: false
    };

    // 배열 맨 앞에 추가
    historyData.unshift(historyItem);
    console.log('✅ 히스토리 추가:', sourceText, '→', targetText, '(총', historyData.length, '개)');

    // 최대 100개까지 유지
    if (historyData.length > 100) {
        historyData.pop();
    }

    // UI 업데이트
    renderHistory();
}

// 히스토리 UI 렌더링
function renderHistory(filterText = '') {
    const tbody = document.getElementById('history');
    tbody.innerHTML = '';

    let dataToRender = [];

    if (filterText) {
        // 검색어가 있으면 모든 세션에서 검색
        const allHistory = [];

        // 현재 세션 포함
        historyData.forEach(item => {
            allHistory.push({ ...item, sessionId: currentSessionId });
        });

        // 저장된 세션들도 포함
        sessions.forEach(session => {
            session.historyData.forEach(item => {
                allHistory.push({ ...item, sessionId: session.id });
            });
        });

        // 검색어로 필터링
        dataToRender = allHistory.filter(item =>
            item.sourceText.toLowerCase().includes(filterText.toLowerCase()) ||
            item.targetText.toLowerCase().includes(filterText.toLowerCase())
        );

        // 시간순으로 정렬 (최신순)
        dataToRender.sort((a, b) => b.timestamp - a.timestamp);
    } else {
        // 검색어가 없으면 현재 세션만 표시
        dataToRender = [...historyData];
    }

    let lastTime = null;
    dataToRender.forEach((item, index) => {
        const currentTime = item.timestamp;

        // 5분 단위로 구분선 표시
        if (index === 0 || (lastTime && (lastTime - currentTime) > 5 * 60 * 1000)) {
            const separatorRow = document.createElement('tr');
            separatorRow.className = 'time-separator';
            separatorRow.innerHTML = `
                <td colspan="5">
                    ${currentTime.toLocaleString('ko-KR', {
                        month: 'short',
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit'
                    })}
                </td>
            `;
            tbody.appendChild(separatorRow);
        }
        lastTime = currentTime;

        // 다른 세션의 데이터인지 확인
        const isFromOtherSession = filterText && item.sessionId !== currentSessionId;
        const sessionBadge = isFromOtherSession ? '<span class="session-badge">이전 세션</span>' : '';

        // 데이터 행 추가
        const row = document.createElement('tr');
        row.className = item.starred ? 'starred' : '';
        if (isFromOtherSession) {
            row.classList.add('from-other-session');
        }
        row.innerHTML = `
            <td>
                <button class="star-btn ${item.starred ? 'active' : ''}"
                        onclick="toggleStar(${item.id}, ${item.sessionId || 'null'})"
                        title="중요 표시">
                    ${item.starred ? '★' : '☆'}
                </button>
            </td>
            <td class="time-cell">
                ${String(currentTime.getHours()).padStart(2, '0')}:${String(currentTime.getMinutes()).padStart(2, '0')}
            </td>
            <td class="source-cell">${sessionBadge}${item.sourceText}</td>
            <td class="target-cell">${item.targetText}</td>
            <td>
                <button class="delete-btn"
                        onclick="deleteHistoryItem(${item.id}, ${item.sessionId || 'null'})"
                        title="삭제">
                    🗑️
                </button>
            </td>
        `;
        tbody.appendChild(row);
    });
}

// 별표 토글
function toggleStar(id, sessionId = null) {
    if (sessionId === null || sessionId === currentSessionId) {
        // 현재 세션의 항목
        const item = historyData.find(h => h.id === id);
        if (item) {
            item.starred = !item.starred;
        }
    } else {
        // 다른 세션의 항목
        const session = sessions.find(s => s.id === sessionId);
        if (session) {
            const item = session.historyData.find(h => h.id === id);
            if (item) {
                item.starred = !item.starred;
                localStorage.setItem('chatSessions', JSON.stringify(sessions));
            }
        }
    }

    // 검색어가 있으면 검색 결과 유지
    const searchInput = document.getElementById('searchInput');
    renderHistory(searchInput ? searchInput.value : '');
}

// 개별 히스토리 항목 삭제
function deleteHistoryItem(id, sessionId = null) {
    if (sessionId === null || sessionId === currentSessionId) {
        // 현재 세션의 항목 삭제
        historyData = historyData.filter(h => h.id !== id);
    } else {
        // 다른 세션의 항목 삭제
        const session = sessions.find(s => s.id === sessionId);
        if (session) {
            session.historyData = session.historyData.filter(h => h.id !== id);
            localStorage.setItem('chatSessions', JSON.stringify(sessions));
            renderSessionTabs();
        }
    }

    // 검색어가 있으면 검색 결과 유지
    const searchInput = document.getElementById('searchInput');
    renderHistory(searchInput ? searchInput.value : '');
}

// 히스토리 지우기
function clearHistory() {
    if (confirm('번역 히스토리를 모두 지우시겠습니까?')) {
        historyData = [];
        renderHistory();
    }
}

// 히스토리 필터링 (검색)
function filterHistory() {
    const searchText = document.getElementById('searchInput').value;
    renderHistory(searchText);
}

// 전체 히스토리 복사
function copyAllHistory() {
    const t = i18n[uiLanguage];
    if (historyData.length === 0) {
        alert(t.alertNoHistory);
        return;
    }

    let text = '=== 대화 기록 ===\n\n';
    historyData.forEach(item => {
        const time = item.timestamp.toLocaleString('ko-KR');
        const star = item.starred ? '⭐ ' : '';
        text += `${star}[${time}]\n`;
        text += `${t.originalText}: ${item.sourceText}\n`;
        text += `${t.translatedText}: ${item.targetText}\n\n`;
    });

    navigator.clipboard.writeText(text).then(() => {
        alert(t.alertCopySuccess);
    }).catch(err => {
        console.error('복사 실패:', err);
        alert(t.alertCopyFailed);
    });
}

// 히스토리 내보내기 (텍스트 파일)
function exportHistory() {
    const t = i18n[uiLanguage];
    if (historyData.length === 0) {
        alert(t.alertNoExportData);
        return;
    }

    let text = '=== 대화 기록 ===\n\n';
    historyData.forEach(item => {
        const time = item.timestamp.toLocaleString('ko-KR');
        const star = item.starred ? '⭐ ' : '';
        text += `${star}[${time}]\n`;
        text += `원문: ${item.sourceText}\n`;
        text += `번역: ${item.targetText}\n\n`;
    });

    const blob = new Blob([text], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `대화기록_${new Date().toISOString().slice(0,10)}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    alert(t.alertFileDownloaded);
}

// 설정 가이드 모달 열기
function showSetupGuide() {
    document.getElementById('setupModal').style.display = 'block';
}

// 설정 가이드 모달 닫기
function closeSetupGuide() {
    document.getElementById('setupModal').style.display = 'none';
}

// 클립보드에 복사
function copyToClipboard(text) {
    const t = i18n[uiLanguage];
    navigator.clipboard.writeText(text).then(() => {
        alert(t.alertCopied);
    }).catch(err => {
        console.error('복사 실패:', err);
        alert(t.alertCopyFailedManual);
    });
}

// 모달 외부 클릭 시 닫기
window.onclick = function(event) {
    const modal = document.getElementById('setupModal');
    if (event.target === modal) {
        closeSetupGuide();
    }
};

// 키보드 단축키
document.addEventListener('keydown', function(e) {
    // 입력창에 포커스가 있으면 단축키 비활성화
    const activeElement = document.activeElement;
    const isInputFocused = activeElement.tagName === 'INPUT' ||
                           activeElement.tagName === 'TEXTAREA' ||
                           activeElement.isContentEditable;

    // Ctrl+Space: 시작/중지 토글
    if (e.ctrlKey && e.code === 'Space') {
        e.preventDefault();
        if (isListening) {
            stopListening();
        } else {
            startListening();
        }
    }

    // - 키: 시작
    if (e.key === '-' && !isInputFocused) {
        e.preventDefault();
        const startBtn = document.getElementById('startBtn');
        if (!startBtn.disabled && !isListening) {
            startListening();
        }
    }

    // = 키: 중지
    if (e.key === '=' && !isInputFocused) {
        e.preventDefault();
        const stopBtn = document.getElementById('stopBtn');
        if (!stopBtn.disabled && isListening) {
            stopListening();
        }
    }

    // 9 키: 한국어 듣기
    if (e.key === '9' && !isInputFocused) {
        e.preventDefault();
        setListenLanguage('ko');
    }

    // 0 키: 일본어 듣기
    if (e.key === '0' && !isInputFocused) {
        e.preventDefault();
        setListenLanguage('ja');
    }

    // ESC: 모달 닫기
    if (e.key === 'Escape') {
        closeSetupGuide();
    }
});

// ==================== 외부 공유 (ngrok) 기능 ====================

// 외부 공유 섹션 토글
function toggleShareLink() {
    const shareSection = document.getElementById('shareSection');

    if (shareSection.style.display === 'none') {
        shareSection.style.display = 'block';
        // 기존 공유 상태 확인
        checkTunnelStatus();
    } else {
        shareSection.style.display = 'none';
    }
}

// 터널 상태 확인
async function checkTunnelStatus() {
    try {
        const response = await fetch('/api/network-info');
        const data = await response.json();

        if (data.publicUrl) {
            showPublicUrl(data.publicUrl);
        }
    } catch (error) {
        console.error('터널 상태 확인 실패:', error);
    }
}

// 터널 시작
async function startTunnel() {
    const btn = document.getElementById('tunnelStartBtn');
    btn.disabled = true;
    btn.textContent = '⏳ 생성 중...';

    try {
        const response = await fetch('/api/tunnel/start', { method: 'POST' });
        const data = await response.json();

        const t = i18n[uiLanguage];
        if (data.success) {
            showPublicUrl(data.url);
            if (data.warning) {
                console.log('경고:', data.warning);
            }
        } else {
            alert(t.alertTunnelError + data.error);
            btn.disabled = false;
            btn.textContent = '🚀 공유 링크 생성';
        }
    } catch (error) {
        const t = i18n[uiLanguage];
        alert(t.alertTunnelCreateError + error.message);
        btn.disabled = false;
        btn.textContent = '🚀 공유 링크 생성';
    }
}

// 터널 중지
async function stopTunnel() {
    try {
        const response = await fetch('/api/tunnel/stop', { method: 'POST' });
        const data = await response.json();

        if (data.success) {
            document.getElementById('shareContent').style.display = 'block';
            document.getElementById('shareUrl').style.display = 'none';
            document.getElementById('tunnelStartBtn').disabled = false;
            document.getElementById('tunnelStartBtn').textContent = '🚀 공유 링크 생성';
            document.getElementById('shareToggleBtn').classList.remove('active');
        }
    } catch (error) {
        const t = i18n[uiLanguage];
        alert(t.alertTunnelStopError + error.message);
    }
}

// 공개 URL 표시
function showPublicUrl(url) {
    document.getElementById('shareContent').style.display = 'none';
    document.getElementById('shareUrl').style.display = 'block';
    document.getElementById('publicUrlText').textContent = url;
    document.getElementById('shareToggleBtn').classList.add('active');

    // QR 코드 생성
    const qrDiv = document.getElementById('shareQrCode');
    const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=120x120&data=${encodeURIComponent(url)}`;
    qrDiv.innerHTML = `<img src="${qrUrl}" alt="QR Code" style="width: 120px; height: 120px; border-radius: 6px; background: white; padding: 5px;">`;
}

// 공개 URL 복사
function copyPublicUrl() {
    const url = document.getElementById('publicUrlText').textContent;
    navigator.clipboard.writeText(url).then(() => {
        const status = document.querySelector('.status-label');
        const originalText = status.textContent;
        status.textContent = '✅ 링크가 복사되었습니다!';
        setTimeout(() => {
            status.textContent = originalText;
        }, 2000);
    });
}

// ==================== 네트워크 정보 기능 ====================

// 네트워크 정보 로드
async function loadNetworkInfo() {
    try {
        const response = await fetch('/api/network-info');
        const data = await response.json();

        // 네트워크 정보를 전역 변수에 저장
        window.networkData = data;
    } catch (error) {
        console.error('네트워크 정보 로드 실패:', error);
    }
}

// 네트워크 정보 토글
function toggleNetworkInfo() {
    const networkInfo = document.getElementById('networkInfo');

    if (networkInfo.style.display === 'none') {
        // 열기
        networkInfo.style.display = 'block';
        displayNetworkInfo();
    } else {
        // 닫기
        networkInfo.style.display = 'none';
    }
}

// 네트워크 정보 표시
function displayNetworkInfo() {
    const addressesDiv = document.getElementById('networkAddresses');
    const qrDiv = document.getElementById('qrCode');
    const t = i18n[uiLanguage];

    if (!window.networkData) {
        addressesDiv.innerHTML = '<p style="color: #ef4444;">네트워크 정보를 불러올 수 없습니다.</p>';
        return;
    }

    const data = window.networkData;
    const currentUrl = window.location.origin;
    const isKoyeb = currentUrl.includes('koyeb.app');

    // 주소 목록 생성
    let html = '';

    // Koyeb/클라우드 환경인 경우 현재 URL 표시
    if (isKoyeb) {
        html += `<div style="font-size: 11px; color: #6b7280; margin-bottom: 6px;">${t.networkCloud}</div>`;
        html += `
            <div class="network-address-item" style="background: #dbeafe; border: 1px solid #3b82f6;">
                <div style="flex: 1; min-width: 0;">
                    <div style="font-size: 10px; color: #1e40af;">${t.networkCloudLabel}</div>
                    <div style="font-family: monospace; font-size: 11px; margin-top: 2px; overflow: hidden; text-overflow: ellipsis;">${currentUrl}</div>
                </div>
                <button onclick="copyToClipboard('${currentUrl}')" class="copy-btn">${t.copyBtn}</button>
            </div>
        `;
        // 클라우드 URL의 QR 코드 생성
        generateQRCode(currentUrl);
        html += `<div style="font-size: 10px; color: #6b7280; margin-top: 8px; padding: 6px; background: #e0e7ff; border-radius: 4px;">${t.networkQrHint}</div>`;
    } else {
        // 로컬 환경인 경우
        html += `<div style="font-size: 11px; color: #6b7280; margin-bottom: 6px;">${t.networkLocal}</div>`;

        if (data.localAddresses && data.localAddresses.length > 0) {
            data.localAddresses.forEach((addr, index) => {
                // HTTPS 주소만 표시 (마이크 사용 가능)
                if (addr.httpsUrl) {
                    const label = t.networkLocalLabel.replace('{interface}', addr.interface);
                    html += `
                        <div class="network-address-item" style="background: #ecfdf5; border: 1px solid #10b981;">
                            <div style="flex: 1; min-width: 0;">
                                <div style="font-size: 10px; color: #059669;">${label}</div>
                                <div style="font-family: monospace; font-size: 11px; margin-top: 2px; overflow: hidden; text-overflow: ellipsis;">${addr.httpsUrl}</div>
                            </div>
                            <button onclick="copyToClipboard('${addr.httpsUrl}')" class="copy-btn">${t.copyBtn}</button>
                        </div>
                    `;

                    // 첫 번째 HTTPS 주소의 QR 코드 생성
                    if (index === 0) {
                        generateQRCode(addr.httpsUrl);
                    }
                }
            });

            // HTTPS 안내 메시지
            html += `<div style="font-size: 10px; color: #6b7280; margin-top: 8px; padding: 6px; background: #fef3c7; border-radius: 4px;">
                ${t.networkHttpsWarning}
            </div>`;
        } else {
            html += `<p style="color: #ef4444; font-size: 11px;">${t.networkNoIp}</p>`;
            html += `<p style="font-size: 10px; color: #6b7280;">${t.networkCheckWifi}</p>`;
            // 로컬 환경이지만 IP가 없는 경우 현재 URL의 QR 코드라도 표시
            generateQRCode(currentUrl);
        }
    }

    addressesDiv.innerHTML = html;
}

// QR 코드 생성
function generateQRCode(url) {
    const qrDiv = document.getElementById('qrCode');

    if (!qrDiv) {
        console.error('QR 코드 div를 찾을 수 없습니다.');
        return;
    }

    // QR Server API 사용 (무료, 안정적)
    const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${encodeURIComponent(url)}`;

    qrDiv.innerHTML = `
        <div style="margin-top: 8px; padding-top: 8px; border-top: 1px solid #e5e7eb;">
            <div style="font-size: 11px; color: #6b7280; margin-bottom: 6px;">📱 QR 스캔</div>
            <img src="${qrUrl}" alt="QR Code" style="width: 120px; height: 120px; border-radius: 6px; background: white; padding: 5px;"
                 onerror="this.style.display='none'; this.parentElement.innerHTML='<div style=\\'font-size: 10px; color: #ef4444;\\'>QR 코드 로드 실패</div>';">
        </div>
    `;

    console.log('QR 코드 생성:', qrUrl);
}

// 클립보드에 복사
function copyToClipboard(text) {
    navigator.clipboard.writeText(text).then(() => {
        // 임시 알림 표시
        const status = document.getElementById('status');
        const originalText = status.textContent;
        status.textContent = '✅ 주소가 복사되었습니다!';
        status.style.color = '#10b981';

        setTimeout(() => {
            status.textContent = originalText;
            status.style.color = '';
        }, 2000);
    }).catch(err => {
        console.error('복사 실패:', err);
    });
}

// ==================== 세션 관리 기능 ====================

// 새 세션 생성
function createNewSession() {
    // 이미 활성 세션이 있으면 먼저 저장
    if (currentSessionId !== null && historyData.length > 0) {
        saveCurrentSession();
    }

    // 새 세션 생성
    currentSessionId = ++sessionIdCounter;
    localStorage.setItem('sessionIdCounter', sessionIdCounter);

    // 히스토리 초기화
    historyData = [];
    historyIdCounter = 0;

    // UI 초기화 (확인 없이 바로 초기화)
    renderHistory();

    // 세션 탭 업데이트
    renderSessionTabs();

    console.log('새 세션 시작:', currentSessionId);
}

// 현재 세션 저장
function saveCurrentSession() {
    // 저장할 데이터가 없으면 저장하지 않음
    if (currentSessionId === null || historyData.length === 0) {
        return;
    }

    const session = {
        id: currentSessionId,
        timestamp: Date.now(),
        historyData: [...historyData],
        language: listenLanguage
    };

    // 기존 세션 찾기
    const existingIndex = sessions.findIndex(s => s.id === currentSessionId);

    if (existingIndex >= 0) {
        // 기존 세션 업데이트
        sessions[existingIndex] = session;
    } else {
        // 새 세션 추가
        sessions.push(session);

        // 최대 10개 유지 (오래된 것부터 삭제)
        if (sessions.length > 10) {
            sessions.shift();
        }
    }

    // localStorage에 저장
    localStorage.setItem('chatSessions', JSON.stringify(sessions));

    // 세션 탭 업데이트
    renderSessionTabs();

    console.log('세션 저장:', currentSessionId, '대화 수:', historyData.length);
}

// 세션 탭 렌더링
function renderSessionTabs() {
    const container = document.getElementById('sessionTabs');
    if (!container) return;
    const t = i18n[uiLanguage];

    if (sessions.length === 0) {
        container.innerHTML = `<div style="font-size: 11px; color: #9ca3af; padding: 4px 0;">${t.noSessions}</div>`;
        return;
    }

    // 최신순으로 정렬
    const sortedSessions = [...sessions].sort((a, b) => b.timestamp - a.timestamp);

    container.innerHTML = sortedSessions.map(session => {
        const date = new Date(session.timestamp);
        const timeStr = `${date.getMonth() + 1}/${date.getDate()} ${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`;
        const isActive = session.id === currentSessionId;
        const count = session.historyData.length;

        return `
            <div class="session-tab-wrapper">
                <button
                    class="session-tab ${isActive ? 'active' : ''}"
                    onclick="loadSession(${session.id})"
                    title="${count}개 대화"
                >
                    <div class="session-time">${timeStr}</div>
                    <div class="session-count">${count}</div>
                </button>
                <button
                    class="session-delete-btn"
                    onclick="deleteSession(${session.id}, event)"
                    title="세션 삭제"
                >×</button>
            </div>
        `;
    }).join('');
}

// 세션 불러오기
function loadSession(sessionId) {
    // 현재 세션 저장 (변경사항이 있으면)
    if (currentSessionId !== null && currentSessionId !== sessionId && historyData.length > 0) {
        saveCurrentSession();
    }

    // 세션 찾기
    const session = sessions.find(s => s.id === sessionId);
    if (!session) {
        console.error('세션을 찾을 수 없습니다:', sessionId);
        return;
    }

    // 세션 데이터 로드
    currentSessionId = session.id;
    historyData = [...session.historyData];
    historyIdCounter = Math.max(...historyData.map(h => h.id), 0);
    listenLanguage = session.language || 'ja';

    // UI 업데이트
    updateLanguageButtons();
    renderHistory();
    renderSessionTabs();

    console.log('세션 로드:', sessionId, '대화 수:', historyData.length);
}

// 세션 삭제
function deleteSession(sessionId, event) {
    if (event) {
        event.stopPropagation(); // 세션 클릭 이벤트 방지
    }

    // 세션 삭제
    const index = sessions.findIndex(s => s.id === sessionId);
    if (index >= 0) {
        sessions.splice(index, 1);
        localStorage.setItem('chatSessions', JSON.stringify(sessions));
    }

    // 현재 세션이 삭제된 경우
    if (currentSessionId === sessionId) {
        currentSessionId = null;
        historyData = [];
        historyIdCounter = 0;
        renderHistory();
    }

    renderSessionTabs();
    console.log('세션 삭제:', sessionId);
}

// ==================== 고양이 발바닥 메뉴 ====================

// 고양이 발바닥 메뉴 토글
function togglePawMenu() {
    const menu = document.getElementById('pawMenu');
    if (menu.style.display === 'none' || menu.style.display === '') {
        menu.style.display = 'block';

        // 외부 클릭 시 메뉴 닫기
        setTimeout(() => {
            document.addEventListener('click', closePawMenuOnClickOutside);
        }, 0);
    } else {
        menu.style.display = 'none';
        document.removeEventListener('click', closePawMenuOnClickOutside);
    }
}

// 메뉴 외부 클릭 시 닫기
function closePawMenuOnClickOutside(event) {
    const menu = document.getElementById('pawMenu');
    const pawIcon = document.querySelector('.paw-clickable');

    if (!menu.contains(event.target) && !pawIcon.contains(event.target)) {
        menu.style.display = 'none';
        document.removeEventListener('click', closePawMenuOnClickOutside);
    }
}

// 세션 탭(이전 대화 목록) 토글
function toggleSessionTabsVisibility() {
    const sessionTabsContainer = document.querySelector('.session-tabs-container');
    const actionButtons = document.getElementById('historyActionButtons');

    if (sessionTabsContainer.style.display === 'none') {
        sessionTabsContainer.style.display = 'block';
        actionButtons.style.display = 'flex';
        localStorage.setItem('sessionTabsVisible', 'true');
    } else {
        sessionTabsContainer.style.display = 'none';
        actionButtons.style.display = 'none';
        localStorage.setItem('sessionTabsVisible', 'false');
    }

    // 메뉴 닫기
    document.getElementById('pawMenu').style.display = 'none';
    document.removeEventListener('click', closePawMenuOnClickOutside);
}

// 이전 대화 목록 모달 표시
function showSessionsList() {
    const t = i18n[uiLanguage];
    if (sessions.length === 0) {
        alert(t.alertNoSessions);
        return;
    }

    const sessionList = sessions.map(session => {
        const date = new Date(session.timestamp);
        const dateStr = date.toLocaleString('ko-KR', {
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
        return `${dateStr} (${session.historyData.length}개 대화)`;
    }).join('\n');

    alert(t.sessionListTitle + sessionList + t.sessionListFooter);

    // 메뉴 닫기
    document.getElementById('pawMenu').style.display = 'none';
    document.removeEventListener('click', closePawMenuOnClickOutside);
}
