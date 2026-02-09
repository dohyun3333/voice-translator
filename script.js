// 전역 변수
let recognition;
let isListening = false;
let audioStream = null;
let audioContext = null;
let selectedDeviceId = localStorage.getItem('selectedAudioDevice') || '';
let permissionGranted = localStorage.getItem('audioPermissionGranted') === 'true';
let deeplApiKey = localStorage.getItem('deeplApiKey') || '';
let listenLanguage = localStorage.getItem('listenLanguage') || 'ja';  // 기본값: 일본어, 'auto'도 가능
let historyData = [];  // 현재 세션의 히스토리 데이터 배열
let historyIdCounter = 0;  // 고유 ID 카운터

// 세션 관리 변수
let sessions = JSON.parse(localStorage.getItem('chatSessions') || '[]');  // 모든 세션 배열
let currentSessionId = null;  // 현재 활성 세션 ID
let sessionIdCounter = parseInt(localStorage.getItem('sessionIdCounter') || '0');  // 세션 ID 카운터

// 페이지 로드 시 초기화
window.onload = async function() {
    // 오디오 장치 목록 로드
    await refreshAudioDevices();

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
};

// 언어 선택 함수
function setListenLanguage(lang) {
    // 자동 감지는 비활성화됨
    if (lang === 'auto') {
        alert('⚠️ 자동 감지 기능은 현재 개발 중입니다.\n한국어 듣기 또는 일본어 듣기를 선택해주세요.');
        return;
    }

    const previousLang = listenLanguage;
    listenLanguage = lang;
    localStorage.setItem('listenLanguage', lang);
    updateLanguageButtons();

    // 실행 중이면 언어만 전환 (세션과 인식 모두 유지)
    if (isListening && recognition) {
        console.log(`언어 전환 중: ${previousLang === 'ja' ? '일본어' : '한국어'} → ${lang === 'ja' ? '일본어' : '한국어'}`);

        // 자동 재시작을 일시적으로 막기 위해 플래그 설정
        const wasListening = isListening;
        isListening = false;

        // 기존 인식 중지
        recognition.stop();

        // 새 인식 시작
        setTimeout(() => {
            const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
            recognition = new SpeechRecognition();
            recognition.lang = lang === 'ja' ? 'ja-JP' : 'ko-KR';
            recognition.continuous = true;
            recognition.interimResults = true;

            recognition.onstart = function() {
                const langName = lang === 'ja' ? '일본어' : '한국어';
                updateStatus(`${langName} 인식 중`);
                console.log(`✅ ${langName} 인식 시작됨`);
            };

            recognition.onresult = function(event) {
                let interimTranscript = '';
                let finalTranscript = '';

                for (let i = event.resultIndex; i < event.results.length; i++) {
                    const transcript = event.results[i][0].transcript;
                    if (event.results[i].isFinal) {
                        finalTranscript += transcript;
                    } else {
                        interimTranscript += transcript;
                    }
                }

                if (interimTranscript) {
                    document.getElementById('sourceText').textContent = interimTranscript;
                }

                if (finalTranscript) {
                    document.getElementById('sourceText').textContent = finalTranscript;
                    translateText(finalTranscript);
                }
            };

            recognition.onerror = handleRecognitionError;

            recognition.onend = function() {
                if (isListening) {
                    try {
                        console.log('음성 인식이 종료되어 자동 재시작 중...');
                        recognition.start();
                    } catch (e) {
                        console.error('재시작 오류:', e);
                        stopListening();
                    }
                }
            };

            // 리스닝 상태 복원 및 시작
            isListening = wasListening;
            recognition.start();
            console.log(`🎯 언어 전환 완료: ${lang === 'ja' ? '일본어' : '한국어'} (세션 유지, 인식 계속)`);
        }, 300);
    }
}

// 언어 버튼 상태 업데이트
function updateLanguageButtons() {
    const jaBtn = document.getElementById('listenJaBtn');
    const koBtn = document.getElementById('listenKoBtn');

    // 모든 버튼 비활성화
    jaBtn.classList.remove('active');
    koBtn.classList.remove('active');

    // 선택된 버튼만 활성화 (auto는 사용 안함)
    if (listenLanguage === 'ja') {
        jaBtn.classList.add('active');
    } else {
        koBtn.classList.add('active');
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
    const select = document.getElementById('audioSource');

    if (!select) {
        console.error('❌ 오디오 장치 선택 요소(#audioSource)를 찾을 수 없습니다!');
        return;
    }

    // MediaDevices API 지원 확인
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        console.error('❌ 이 브라우저는 MediaDevices API를 지원하지 않습니다!');
        alert('⚠️ 이 브라우저는 오디오 장치 접근을 지원하지 않습니다. Chrome을 사용해주세요.');
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
        select.innerHTML = '<option value="">🎧 오디오 장치 선택...</option>';
        console.log('✅ 드롭다운 초기화 완료');

        if (audioInputs.length === 0) {
            console.warn('⚠️ 오디오 입력 장치가 없습니다!');
            select.innerHTML = '<option value="">❌ 오디오 장치 없음</option>';
            updateStatus('오디오 장치 없음');
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
            updateStatus('준비 완료');
        } else {
            console.log('선택된 장치 없음');
            updateStatus('대기 중');
        }

    } catch (error) {
        console.error('❌ 오디오 장치 접근 오류:', error);
        console.error('📋 에러 상세:');
        console.error('  - 이름:', error.name);
        console.error('  - 메시지:', error.message);
        console.error('  - 스택:', error.stack);

        updateStatus('마이크 권한 필요');

        // 에러 타입별 상세 안내
        if (error.name === 'NotAllowedError' || error.name === 'PermissionDeniedError') {
            console.error('⚠️ 사용자가 마이크 권한을 거부했습니다.');
            console.error('💡 해결 방법:');
            console.error('   1. 주소창 왼쪽의 자물쇠 아이콘 클릭');
            console.error('   2. 마이크 권한을 "허용"으로 변경');
            console.error('   3. 페이지 새로고침');
            alert('⚠️ 마이크 권한이 필요합니다!\n\n주소창 왼쪽의 자물쇠 아이콘을 클릭하여\n마이크 권한을 "허용"으로 설정해주세요.');
        } else if (error.name === 'NotFoundError' || error.name === 'DevicesNotFoundError') {
            console.error('⚠️ 오디오 입력 장치를 찾을 수 없습니다.');
            console.error('💡 해결 방법:');
            console.error('   1. 마이크나 오디오 입력 장치가 연결되어 있는지 확인');
            console.error('   2. BlackHole이 설치되어 있는지 확인');
            alert('⚠️ 오디오 입력 장치를 찾을 수 없습니다!\n\n마이크나 BlackHole이 연결/설치되어 있는지 확인해주세요.');
        } else if (error.name === 'NotReadableError' || error.name === 'TrackStartError') {
            console.error('⚠️ 오디오 장치를 사용할 수 없습니다 (다른 앱에서 사용 중일 수 있음).');
            alert('⚠️ 오디오 장치를 사용할 수 없습니다!\n\n다른 앱에서 마이크를 사용 중인지 확인해주세요.');
        } else {
            console.error('⚠️ 알 수 없는 오류가 발생했습니다.');
            alert('⚠️ 오디오 장치 접근 중 오류가 발생했습니다:\n' + error.message);
        }
    }
}

// 음성 인식 시작
async function startListening() {
    console.log('시작 버튼 클릭됨');

    // DeepL API 키 확인
    if (!deeplApiKey) {
        alert('⚠️ 먼저 DeepL API 키를 입력하고 저장해주세요!\n\nhttps://www.deepl.com/ko/pro-api 에서 무료로 발급받을 수 있습니다.');
        return;
    }

    console.log('API 키 확인 완료');

    try {
        // 세션이 없을 때만 새 세션 시작
        if (currentSessionId === null) {
            createNewSession();
            console.log('새 세션 생성 완료');
        } else {
            console.log('기존 세션 계속 사용:', currentSessionId);
        }
    } catch (error) {
        console.error('세션 생성 오류:', error);
        alert('세션 생성 중 오류 발생: ' + error.message);
        return;
    }

    // Web Speech API 지원 확인
    if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
        alert('⚠️ 이 브라우저는 음성 인식을 지원하지 않습니다. Chrome 브라우저를 사용해주세요.');
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

        const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;

        // 단일 언어 모드
        recognition = new SpeechRecognition();
        recognition.lang = listenLanguage === 'ja' ? 'ja-JP' : 'ko-KR';
        recognition.continuous = true;
        recognition.interimResults = true;

        recognition.onstart = function() {
            isListening = true;
            const langName = listenLanguage === 'ja' ? '일본어' : '한국어';
            updateStatus(`${langName} 인식 중`);
            document.getElementById('startBtn').disabled = true;
            document.getElementById('stopBtn').disabled = false;
        };

        recognition.onresult = function(event) {
            let interimTranscript = '';
            let finalTranscript = '';

            for (let i = event.resultIndex; i < event.results.length; i++) {
                const transcript = event.results[i][0].transcript;
                if (event.results[i].isFinal) {
                    finalTranscript += transcript;
                } else {
                    interimTranscript += transcript;
                }
            }

            if (interimTranscript) {
                document.getElementById('sourceText').textContent = interimTranscript;
            }

            if (finalTranscript) {
                document.getElementById('sourceText').textContent = finalTranscript;
                translateText(finalTranscript);
            }
        };

        recognition.onerror = handleRecognitionError;

        recognition.onend = function() {
            if (isListening) {
                try {
                    recognition.start();
                } catch (e) {
                    console.error('재시작 오류:', e);
                    stopListening();
                }
            }
        };

        recognition.start();

    } catch (error) {
        console.error('시작 오류:', error);
        updateStatus('시작 실패');
        alert('⚠️ 오디오 장치 접근 오류:\n' + error.message + '\n\n오디오 장치를 다시 선택해주세요.');
    }
}

// 텍스트에서 언어 감지 (정규식 기반)
function detectLanguageFromText(text) {
    // 일본어 문자 체크 (히라가나, 가타카나, 한자)
    const hasJapanese = /[\u3040-\u309F\u30A0-\u30FF\u4E00-\u9FAF]/.test(text);
    // 한글 체크
    const hasKorean = /[가-힣ㄱ-ㅎㅏ-ㅣ]/.test(text);

    // 일본어 문자 개수
    const japaneseCount = (text.match(/[\u3040-\u309F\u30A0-\u30FF\u4E00-\u9FAF]/g) || []).length;
    // 한글 개수
    const koreanCount = (text.match(/[가-힣ㄱ-ㅎㅏ-ㅣ]/g) || []).length;

    console.log(`텍스트 분석: "${text}" - 일본어:${japaneseCount}자, 한글:${koreanCount}자`);

    // 일본어 문자가 더 많으면 일본어
    if (japaneseCount > koreanCount) {
        return 'ja';
    } else if (koreanCount > japaneseCount) {
        return 'ko';
    }

    // 같으면 어느 쪽에 문자가 있는지로 판단
    if (hasJapanese) return 'ja';
    if (hasKorean) return 'ko';

    return null;
}

// 공통 음성 인식 오류 핸들러
function handleRecognitionError(event) {
    console.error('음성 인식 오류:', event.error);

    if (event.error === 'no-speech') {
        updateStatus('음성 대기 중...');
    } else if (event.error === 'audio-capture') {
        updateStatus('오디오 캡처 오류');
        alert('⚠️ 오디오 캡처 오류가 발생했습니다.\n\n1. BlackHole이 올바르게 설치되었는지 확인하세요.\n2. 화상회의 앱 오디오가 Multi-Output Device로 설정되었는지 확인하세요.\n3. "설정 가이드"를 참고해주세요.');
    } else if (event.error === 'not-allowed') {
        updateStatus('마이크 권한 거부됨');
        alert('⚠️ 마이크 권한이 거부되었습니다. 브라우저 설정에서 권한을 허용해주세요.');
    } else {
        updateStatus('오류: ' + event.error);
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

    // 세션 ID 초기화 (다음 시작 시 새 세션 생성)
    currentSessionId = null;
    console.log('세션 종료 및 초기화 완료');

    updateStatus('중지됨');
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
        document.getElementById('floatingTarget').textContent = targetText;

        // 플로팅 자막 표시
        showFloatingSubtitle();

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
        if (error.message === 'Failed to fetch' || error.name === 'TypeError') {
            alert('⚠️ 서버에 연결할 수 없습니다.\n\n페이지를 새로고침하거나 잠시 후 다시 시도해주세요.');
        } else if (errorMessage.includes('API 키가 올바르지 않습니다')) {
            updateApiKeyStatus('❌ API 키가 올바르지 않습니다', 'red');
            alert('⚠️ DeepL API 키가 올바르지 않습니다.\n\nAPI 키를 다시 확인하고 저장 버튼을 눌러 재설정해주세요.');
        } else if (errorMessage.includes('무료 사용량이 초과')) {
            updateApiKeyStatus('⚠️ 무료 사용량 초과', 'orange');
            alert('⚠️ DeepL 무료 사용량(월 50만 자)이 초과되었습니다.\n\n다음 달에 다시 사용하거나 유료 플랜으로 업그레이드하세요.');
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

    // 상태별 색상 설정
    if (message.includes('듣는 중') || message.includes('인식 중')) {
        dotEl.style.color = '#10b981'; // 초록색
    } else if (message.includes('번역 중')) {
        dotEl.style.color = '#3b82f6'; // 파란색
    } else if (message.includes('중지') || message.includes('오류') || message.includes('실패')) {
        dotEl.style.color = '#ef4444'; // 빨간색
    } else {
        dotEl.style.color = '#9ca3af'; // 회색 (대기 중)
    }

    console.log('상태 업데이트:', message);
}

// 플로팅 자막 표시
function showFloatingSubtitle() {
    const floating = document.getElementById('floatingSubtitle');
    floating.style.display = 'block';

    // 5초 후 서서히 사라지기
    setTimeout(() => {
        floating.style.opacity = '0';
        setTimeout(() => {
            floating.style.display = 'none';
            floating.style.opacity = '1';
        }, 500);
    }, 5000);
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
                ${currentTime.toLocaleTimeString('ko-KR', {
                    hour: '2-digit',
                    minute: '2-digit',
                    second: '2-digit'
                })}
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
    if (historyData.length === 0) {
        alert('복사할 내역이 없습니다.');
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

    navigator.clipboard.writeText(text).then(() => {
        alert('✅ 전체 내역이 클립보드에 복사되었습니다!');
    }).catch(err => {
        console.error('복사 실패:', err);
        alert('⚠️ 복사에 실패했습니다.');
    });
}

// 히스토리 내보내기 (텍스트 파일)
function exportHistory() {
    if (historyData.length === 0) {
        alert('내보낼 내역이 없습니다.');
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

    alert('✅ 파일이 다운로드되었습니다!');
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
    navigator.clipboard.writeText(text).then(() => {
        alert('✅ 클립보드에 복사되었습니다!');
    }).catch(err => {
        console.error('복사 실패:', err);
        alert('⚠️ 복사에 실패했습니다. 수동으로 복사해주세요.');
    });
}

// 플로팅 자막 표시
function showFloatingSubtitle() {
    const floatingSubtitle = document.getElementById('floatingSubtitle');
    if (floatingSubtitle) {
        floatingSubtitle.style.display = 'block';
        floatingSubtitle.style.opacity = '1';

        // 5초 후 자동으로 숨김
        setTimeout(() => {
            floatingSubtitle.style.opacity = '0';
            setTimeout(() => {
                floatingSubtitle.style.display = 'none';
            }, 500);
        }, 5000);
    }
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

        if (data.success) {
            showPublicUrl(data.url);
            if (data.warning) {
                console.log('경고:', data.warning);
            }
        } else {
            alert('터널 생성 실패: ' + data.error);
            btn.disabled = false;
            btn.textContent = '🚀 공유 링크 생성';
        }
    } catch (error) {
        alert('터널 생성 중 오류: ' + error.message);
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
        alert('터널 중지 실패: ' + error.message);
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

    if (!window.networkData) {
        addressesDiv.innerHTML = '<p style="color: #ef4444;">네트워크 정보를 불러올 수 없습니다.</p>';
        return;
    }

    const data = window.networkData;

    // 주소 목록 생성
    let html = '<div style="font-size: 11px; color: #6b7280; margin-bottom: 6px;">같은 와이파이의 다른 기기에서 접속:</div>';

    if (data.localAddresses && data.localAddresses.length > 0) {
        data.localAddresses.forEach((addr, index) => {
            // HTTPS 주소만 표시 (마이크 사용 가능)
            if (addr.httpsUrl) {
                html += `
                    <div class="network-address-item" style="background: #ecfdf5; border: 1px solid #10b981;">
                        <div style="flex: 1; min-width: 0;">
                            <div style="font-size: 10px; color: #059669;">🎤 ${addr.interface} (마이크 사용 가능)</div>
                            <div style="font-family: monospace; font-size: 11px; margin-top: 2px; overflow: hidden; text-overflow: ellipsis;">${addr.httpsUrl}</div>
                        </div>
                        <button onclick="copyToClipboard('${addr.httpsUrl}')" class="copy-btn">복사</button>
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
            ⚠️ 접속 시 "안전하지 않음" 경고가 표시되면<br>
            → '고급' → '안전하지 않은 사이트로 이동' 클릭
        </div>`;
    } else {
        html += '<p style="color: #ef4444; font-size: 11px;">로컬 IP 주소를 찾을 수 없습니다.</p>';
        html += '<p style="font-size: 10px; color: #6b7280;">와이파이에 연결되어 있는지 확인해주세요.</p>';
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

// 세션 탭 렌더링 (카드 형식)
function renderSessionTabs() {
    const container = document.getElementById('sessionTabs');
    if (!container) return;

    if (sessions.length === 0) {
        container.innerHTML = '<div style="font-size: 13px; color: #9ca3af; padding: 12px; text-align: center; background: #f9fafb; border-radius: 8px;">저장된 세션이 없습니다</div>';
        return;
    }

    // 별표순, 최신순으로 정렬
    const sortedSessions = [...sessions].sort((a, b) => {
        // 별표가 있는 것을 우선
        if (a.starred && !b.starred) return -1;
        if (!a.starred && b.starred) return 1;
        // 그 다음 최신순
        return b.timestamp - a.timestamp;
    });

    container.innerHTML = sortedSessions.map(session => {
        const date = new Date(session.timestamp);
        const timeStr = `${date.getMonth() + 1}/${date.getDate()} ${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`;
        const weekday = ['일', '월', '화', '수', '목', '금', '토'][date.getDay()];
        const isActive = session.id === currentSessionId;
        const count = session.historyData.length;
        const title = session.title || generateAutoTitle(session);
        const starred = session.starred || false;

        return `
            <div class="session-card ${isActive ? 'active' : ''} ${starred ? 'starred' : ''}" onclick="loadSession(${session.id})">
                <div class="session-card-header">
                    <div class="session-card-title">${title}</div>
                    <div class="session-card-actions">
                        <button class="session-edit-btn"
                                onclick="editSessionTitle(${session.id}, event)"
                                title="제목 편집">
                            ✏️
                        </button>
                        <button class="session-star-btn ${starred ? 'starred' : ''}"
                                onclick="toggleSessionStar(${session.id}, event)"
                                title="${starred ? '중요 표시 해제' : '중요 표시'}">
                            ${starred ? '⭐' : '☆'}
                        </button>
                        <button class="session-delete-btn"
                                onclick="deleteSession(${session.id}, event)"
                                title="세션 삭제">
                            🗑️
                        </button>
                    </div>
                </div>
                <div class="session-card-meta">
                    <span>📅 ${timeStr} (${weekday})</span>
                    <span>💬 ${count}개</span>
                </div>
            </div>
        `;
    }).join('');
}

// 자동 제목 생성 (회의록 번호)
function generateAutoTitle(session) {
    // 세션 ID를 기반으로 회의록 번호 생성
    return `회의록 ${session.id}`;
}

// 세션 중요 표시 토글
function toggleSessionStar(sessionId, event) {
    if (event) {
        event.stopPropagation();
    }

    const session = sessions.find(s => s.id === sessionId);
    if (session) {
        session.starred = !session.starred;
        localStorage.setItem('chatSessions', JSON.stringify(sessions));
        renderSessionTabs();
    }
}

// 세션 제목 편집
function editSessionTitle(sessionId, event) {
    if (event) {
        event.stopPropagation();
    }

    const session = sessions.find(s => s.id === sessionId);
    if (!session) return;

    const currentTitle = session.title || generateAutoTitle(session);
    const newTitle = prompt('세션 제목을 입력하세요:', currentTitle);

    if (newTitle !== null && newTitle.trim() !== '') {
        session.title = newTitle.trim();
        localStorage.setItem('chatSessions', JSON.stringify(sessions));
        renderSessionTabs();
    }
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
