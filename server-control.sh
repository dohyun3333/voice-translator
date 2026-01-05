#!/bin/bash

# 음성번역 서버 제어 스크립트
# 이 스크립트가 있는 디렉토리를 기준으로 동작합니다.

# 스크립트가 있는 디렉토리로 이동
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

# 환경 변수
HTTP_PORT=${PORT:-3000}
HTTPS_PORT=${HTTPS_PORT:-3443}
PID_FILE="$SCRIPT_DIR/.server.pid"

# 색상 코드
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# 로컬 IP 가져오기
get_local_ip() {
    if command -v ipconfig &> /dev/null; then
        # Windows (Git Bash)
        ipconfig | grep -i "IPv4" | head -1 | awk '{print $NF}'
    elif command -v ip &> /dev/null; then
        # Linux
        ip route get 1 | awk '{print $7; exit}'
    else
        # macOS
        ifconfig | grep "inet " | grep -v 127.0.0.1 | awk '{print $2}' | head -1
    fi
}

case "$1" in
    start)
        echo -e "${GREEN}🚀 서버를 시작합니다...${NC}"

        # 이미 실행 중인지 확인
        if [ -f "$PID_FILE" ]; then
            OLD_PID=$(cat "$PID_FILE")
            if kill -0 "$OLD_PID" 2>/dev/null; then
                echo -e "${YELLOW}⚠️  서버가 이미 실행 중입니다 (PID: $OLD_PID)${NC}"
                exit 1
            fi
        fi

        # npm이 설치되어 있는지 확인
        if ! command -v npm &> /dev/null; then
            echo -e "${RED}❌ npm이 설치되어 있지 않습니다.${NC}"
            echo "   Node.js를 설치해주세요: https://nodejs.org"
            exit 1
        fi

        # node_modules 확인
        if [ ! -d "node_modules" ]; then
            echo "📦 의존성을 설치합니다..."
            npm install
        fi

        # 서버 시작 (백그라운드)
        nohup npm start > server.log 2> server.error.log &
        echo $! > "$PID_FILE"

        sleep 2

        if curl -s "http://localhost:$HTTP_PORT" > /dev/null 2>&1; then
            echo -e "${GREEN}✅ 서버가 성공적으로 시작되었습니다.${NC}"
            echo ""
            echo "📱 접속 주소:"
            echo "   - 이 컴퓨터: http://localhost:$HTTP_PORT"

            LOCAL_IP=$(get_local_ip)
            if [ ! -z "$LOCAL_IP" ]; then
                echo "   - 같은 네트워크: https://$LOCAL_IP:$HTTPS_PORT (마이크 사용 가능)"
            fi
        else
            echo -e "${RED}❌ 서버 시작에 실패했습니다.${NC}"
            echo "   로그를 확인하세요: cat server.error.log"
        fi
        ;;

    stop)
        echo -e "${YELLOW}🛑 서버를 중지합니다...${NC}"

        if [ -f "$PID_FILE" ]; then
            PID=$(cat "$PID_FILE")
            if kill -0 "$PID" 2>/dev/null; then
                kill "$PID"
                rm "$PID_FILE"
                echo -e "${GREEN}✅ 서버가 중지되었습니다.${NC}"
            else
                echo "서버가 실행 중이지 않습니다."
                rm "$PID_FILE"
            fi
        else
            # PID 파일이 없으면 프로세스 직접 찾기
            pkill -f "node proxy-server.js" 2>/dev/null
            echo -e "${GREEN}✅ 서버가 중지되었습니다.${NC}"
        fi
        ;;

    restart)
        echo -e "${YELLOW}🔄 서버를 재시작합니다...${NC}"
        $0 stop
        sleep 1
        $0 start
        ;;

    status)
        if [ -f "$PID_FILE" ]; then
            PID=$(cat "$PID_FILE")
            if kill -0 "$PID" 2>/dev/null; then
                echo -e "${GREEN}✅ 서버가 실행 중입니다 (PID: $PID)${NC}"
                echo ""
                echo "📱 접속 주소:"
                echo "   - 이 컴퓨터: http://localhost:$HTTP_PORT"

                LOCAL_IP=$(get_local_ip)
                if [ ! -z "$LOCAL_IP" ]; then
                    echo "   - 같은 네트워크: https://$LOCAL_IP:$HTTPS_PORT (마이크 사용 가능)"
                fi
            else
                echo -e "${RED}❌ 서버가 실행 중이지 않습니다.${NC}"
            fi
        else
            echo -e "${RED}❌ 서버가 실행 중이지 않습니다.${NC}"
        fi
        ;;

    logs)
        echo "📋 서버 로그 (최근 30줄):"
        echo "----------------------------------------"
        if [ -f "server.log" ]; then
            tail -n 30 server.log
        else
            echo "로그 파일이 없습니다."
        fi
        ;;

    errors)
        echo "⚠️  에러 로그 (최근 30줄):"
        echo "----------------------------------------"
        if [ -f "server.error.log" ]; then
            tail -n 30 server.error.log
        else
            echo "에러 로그 파일이 없습니다."
        fi
        ;;

    ssl)
        echo "🔐 SSL 인증서를 생성합니다..."
        mkdir -p ssl

        if command -v openssl &> /dev/null; then
            openssl req -x509 -newkey rsa:4096 \
                -keyout ssl/key.pem \
                -out ssl/cert.pem \
                -days 365 -nodes \
                -subj "/CN=localhost"

            if [ -f "ssl/cert.pem" ]; then
                echo -e "${GREEN}✅ SSL 인증서가 생성되었습니다.${NC}"
                echo "   - ssl/key.pem"
                echo "   - ssl/cert.pem"
                echo ""
                echo "서버를 재시작하면 HTTPS가 활성화됩니다."
            fi
        else
            echo -e "${RED}❌ openssl이 설치되어 있지 않습니다.${NC}"
        fi
        ;;

    *)
        echo "음성번역 서버 제어 스크립트"
        echo ""
        echo "사용법: ./server-control.sh [명령]"
        echo ""
        echo "명령:"
        echo "  start    - 서버 시작"
        echo "  stop     - 서버 중지"
        echo "  restart  - 서버 재시작"
        echo "  status   - 서버 상태 확인"
        echo "  logs     - 서버 로그 보기"
        echo "  errors   - 에러 로그 보기"
        echo "  ssl      - SSL 인증서 생성"
        echo ""
        ;;
esac
