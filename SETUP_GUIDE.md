# 📖 빠른 설정 가이드 (5분 완성!)

이 가이드를 따라하면 5분 안에 **Zoom/Google Meet** 일본어 번역기를 사용할 수 있습니다!

---

## ✅ 체크리스트

설정하면서 하나씩 체크해보세요:

- [ ] 1. BlackHole 설치 완료
- [ ] 2. 컴퓨터 재부팅 완료
- [ ] 3. Multi-Output Device 생성 완료
- [ ] 4. Zoom/Google Meet 오디오 설정 완료
- [ ] 5. Claude API 키 발급 완료
- [ ] 6. 번역기 첫 실행 완료

---

## 🎯 단계별 설정

### 1단계: BlackHole 설치 (2분)

#### Mac 터미널 열기
1. **Spotlight** 실행: `Cmd + Space`
2. "터미널" 입력 후 Enter

#### 설치 명령어 입력
터미널에 다음을 복사해서 붙여넣고 Enter:

```bash
brew install blackhole-2ch
```

#### 비밀번호 입력
- Mac 로그인 비밀번호를 입력하세요 (화면에 안 보입니다)
- Enter 누르기

#### 설치 완료 대기
- 약 1-2분 소요
- "successfully installed"가 보이면 완료!

#### ⚠️ 중요: 컴퓨터 재부팅
```bash
sudo reboot
```
또는 Apple 메뉴 → 재시동

---

### 2단계: Multi-Output Device 만들기 (1분)

#### Audio MIDI Setup 실행
1. **Spotlight** 실행: `Cmd + Space`
2. "Audio MIDI" 입력
3. **Audio MIDI Setup** 선택

#### Multi-Output Device 생성
1. 왼쪽 하단 **+ 버튼** 클릭
2. **"Create Multi-Output Device"** 선택

#### 장치 설정
오른쪽 패널에서:
- ✅ **BlackHole 2ch** 체크
- ✅ **내장 스피커** (또는 현재 사용 중인 스피커) 체크
- 🕐 **내장 스피커** 옆 시계 아이콘 클릭 (Master Device 설정)

#### 이름 변경 (선택)
- "Multi-Output Device"를 더블클릭
- "Zoom Output"으로 변경

---

### 3단계: 화상회의 앱 설정 (30초)

#### Zoom 오디오 설정
1. Zoom 앱 실행
2. 오른쪽 상단 **톱니바퀴 아이콘** (설정) 클릭
3. 왼쪽 메뉴에서 **"오디오"** 선택
4. **스피커** 드롭다운 클릭
5. **"Multi-Output Device"** (또는 "Zoom Output") 선택

#### Google Meet 오디오 설정
1. Google Meet 회의 입장
2. 우측 하단 **더보기 (⋮)** 클릭
3. **"설정"** 선택
4. **"오디오"** 탭 선택
5. **스피커**를 **"Multi-Output Device"** (또는 "Zoom Output")로 변경

#### ✅ 마이크는 그대로!
- 마이크는 변경하지 마세요
- 기본 마이크를 계속 사용합니다

---

### 4단계: Claude API 키 발급 (1분)

#### Anthropic 웹사이트 접속
1. https://console.anthropic.com/ 열기
2. 구글 계정으로 로그인 (빠름!)

#### API 키 생성
1. 왼쪽 메뉴 **"API Keys"** 클릭
2. **"Create Key"** 버튼 클릭
3. 이름 입력 (예: "Zoom Translator")
4. **Create** 클릭

#### API 키 복사
- 생성된 키 복사 (sk-ant-로 시작)
- **⚠️ 주의**: 이 키는 다시 볼 수 없으니 잘 보관하세요!

---

### 5단계: 번역기 실행 (1분)

#### 파일 열기
1. Finder에서 `zoom-translator` 폴더 열기
2. `index.html` 파일을 **Chrome 브라우저**로 열기
   - 파일을 Chrome 아이콘에 드래그 or
   - 파일 더블클릭

#### 마이크 권한 허용
- "마이크 사용 허용" 팝업이 뜨면 **"허용"** 클릭

#### API 키 입력
1. 맨 위 **API 키 입력란**에 복사한 키 붙여넣기
2. **"저장"** 버튼 클릭

#### 오디오 소스 선택
- **"오디오 입력 소스"** 드롭다운 클릭
- **"BlackHole 2ch ⭐ (권장)"** 선택

---

## 🎊 완성! 테스트하기

### YouTube로 테스트
1. 번역기에서 **"시작하기"** 버튼 클릭
2. 새 탭에서 YouTube 열기
3. "일본어 뉴스" 또는 "日本語 ニュース" 검색
4. 영상 재생

### 확인할 것
- ✅ 왼쪽 박스에 일본어가 나타나나요?
- ✅ 오른쪽 박스에 한국어 번역이 나타나나요?
- ✅ 화면 최상단에 큰 자막이 떠 있나요?

**모두 YES면 성공!** 🎉

---

## 🔥 화상회의에서 사용하기

### 준비
1. 번역기를 먼저 실행 (**시작하기** 버튼)
2. Zoom 또는 Google Meet 회의 시작

### 사용 중
- 상대방이 일본어로 말하면 자동 번역!
- 화면 상단 자막을 보면서 회의 진행
- 히스토리에서 과거 내용 확인

### 팁
- 번역기 창을 작게 만들어서 옆에 배치
- 또는 듀얼 모니터 사용
- 플로팅 자막이 회의 화면 위에 표시됩니다!
- **Zoom과 Google Meet 모두 동일하게 작동합니다!**

---

## 🆘 문제 해결

### BlackHole이 안 보여요
```bash
# 터미널에서 확인
ls /Library/Audio/Plug-Ins/HAL/BlackHole2ch.driver
```
- 파일이 있으면 재부팅하세요
- 없으면 다시 설치: `brew install blackhole-2ch`

### 내 소리가 안 들려요
- Audio MIDI Setup으로 돌아가기
- Multi-Output Device에서 스피커가 체크되어 있는지 확인
- Master Device(시계 아이콘)가 스피커로 설정되어 있는지 확인

### 음성 인식이 안 돼요
1. 화상회의 앱 설정 → 오디오 → 스피커가 "Multi-Output Device"인지 확인
2. 번역기에서 "BlackHole 2ch"가 선택되어 있는지 확인
3. **"새로고침"** 버튼을 눌러보세요

### 번역이 안 돼요
- API 키가 올바른지 확인
- https://console.anthropic.com/settings/keys 에서 키 확인
- 크레딧이 남아있는지 확인

---

## 💡 꿀팁

### 화면 배치
```
┌──────────────┬──────────────┐
│              │              │
│ Zoom/Meet    │   번역기     │
│   (크게)     │   (작게)     │
│              │              │
└──────────────┴──────────────┘
        플로팅 자막 (위)
```

### 단축키
- `Ctrl + Space`: 빠르게 시작/중지
- `ESC`: 설정 가이드 닫기

### 비용 절약
- 테스트 시에만 번역기 실행
- 안 쓸 때는 중지 버튼 누르기
- API 사용량 모니터링: https://console.anthropic.com/settings/usage

---

## 📞 도움이 더 필요하신가요?

1. **설정 가이드 버튼** 클릭 (번역기 내)
2. **README.md** 파일 참고
3. Chrome 개발자 도구(F12) → Console 탭에서 에러 확인

---

**설정 완료 시간**: 약 5분
**난이도**: ⭐⭐☆☆☆ (쉬움)
**추천도**: ⭐⭐⭐⭐⭐
**지원 플랫폼**: Zoom, Google Meet

즐거운 화상회의 되세요! 🎉
