#!/bin/bash

# 음성번역 서버 제어 스크립트

PLIST_PATH=~/Library/LaunchAgents/com.zoomtranslator.server.plist
SERVICE_NAME="com.zoomtranslator.server"

case "$1" in
    start)
        echo "🚀 서버를 시작합니다..."
        launchctl load "$PLIST_PATH" 2>/dev/null
        sleep 2
        if curl -s http://localhost:3000 > /dev/null; then
            echo "✅ 서버가 성공적으로 시작되었습니다."
            echo "📱 http://localhost:3000"
        else
            echo "❌ 서버 시작에 실패했습니다."
        fi
        ;;

    stop)
        echo "🛑 서버를 중지합니다..."
        launchctl unload "$PLIST_PATH" 2>/dev/null
        echo "✅ 서버가 중지되었습니다."
        ;;

    restart)
        echo "🔄 서버를 재시작합니다..."
        launchctl unload "$PLIST_PATH" 2>/dev/null
        sleep 1
        launchctl load "$PLIST_PATH" 2>/dev/null
        sleep 2
        if curl -s http://localhost:3000 > /dev/null; then
            echo "✅ 서버가 재시작되었습니다."
            echo "📱 http://localhost:3000"
        else
            echo "❌ 서버 재시작에 실패했습니다."
        fi
        ;;

    status)
        if launchctl list | grep -q "$SERVICE_NAME"; then
            echo "✅ 서버가 실행 중입니다."
            echo "📱 http://localhost:3000"

            # 로컬 IP 주소 확인
            LOCAL_IP=$(ifconfig | grep "inet " | grep -v 127.0.0.1 | awk '{print $2}' | head -1)
            if [ ! -z "$LOCAL_IP" ]; then
                echo "📱 같은 와이파이의 다른 기기: http://$LOCAL_IP:3000"
            fi
        else
            echo "❌ 서버가 실행 중이지 않습니다."
        fi
        ;;

    logs)
        echo "📋 서버 로그:"
        tail -n 20 /Users/t-drhee/Desktop/개발폴더/음성번역/server.log
        ;;

    errors)
        echo "⚠️ 에러 로그:"
        tail -n 20 /Users/t-drhee/Desktop/개발폴더/음성번역/server.error.log
        ;;

    disable)
        echo "🚫 자동 시작을 비활성화합니다..."
        launchctl unload "$PLIST_PATH" 2>/dev/null
        echo "✅ 자동 시작이 비활성화되었습니다."
        echo "ℹ️  다시 활성화하려면: ./server-control.sh start"
        ;;

    *)
        echo "음성번역 서버 제어 스크립트"
        echo ""
        echo "사용법: ./server-control.sh [명령]"
        echo ""
        echo "명령:"
        echo "  start    - 서버 시작 (자동 시작 활성화)"
        echo "  stop     - 서버 중지"
        echo "  restart  - 서버 재시작"
        echo "  status   - 서버 상태 확인"
        echo "  logs     - 서버 로그 보기"
        echo "  errors   - 에러 로그 보기"
        echo "  disable  - 자동 시작 비활성화"
        echo ""
        ;;
esac
