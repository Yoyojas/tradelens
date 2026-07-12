#!/bin/bash
# TradeLens 一键启动：后端 (Flask :5001) + 前端 (Vite :5173)
# 用法: ./start.sh   停止: Ctrl+C（两个进程一起退出）
set -e
cd "$(dirname "$0")"

# 确保 Postgres 在跑（已启动则此命令无害）
brew services start postgresql@17 >/dev/null 2>&1 || true

# 后端
if [ ! -d backend/.venv ]; then
  echo "!! backend/.venv 不存在，先在 backend/ 里建 venv 并安装依赖"; exit 1
fi
(
  cd backend
  source .venv/bin/activate
  # 启动前自动升级数据库结构并补种子（两者均幂等，重复执行无害）
  flask --app app db upgrade
  python seed.py
  exec python app.py
) &
BACKEND_PID=$!

cleanup() {
  echo ""
  echo "正在停止 TradeLens..."
  kill "$BACKEND_PID" 2>/dev/null || true
  exit 0
}
trap cleanup INT TERM

echo "后端已启动 (PID $BACKEND_PID) → http://127.0.0.1:5001"
echo "启动前端..."
npm run dev
# npm run dev 退出（Ctrl+C）后顺带清理后端
cleanup
