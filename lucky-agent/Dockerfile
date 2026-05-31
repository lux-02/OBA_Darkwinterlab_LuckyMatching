# Railway Nixpacks의 corepack@0.24.1 ↔ pnpm 11.2.2 비호환(ERR_VM_DYNAMIC_IMPORT_CALLBACK_MISSING)
# 회피용 결정적 빌드. corepack을 쓰지 않고 pnpm을 직접 설치한다.
# 모든 서비스가 이 Dockerfile을 공유하고, 각 서비스의 startCommand(railway)가
# 실행할 프로세스를 고른다 (pnpm --filter ./servers/<x> start 등).
FROM node:22

WORKDIR /app

# corepack 우회 — pnpm 직접 설치 (alpha 템플릿 packageManager 핀과 동일 버전)
RUN corepack disable 2>/dev/null || true \
  && npm install -g pnpm@11.2.2

# 의존성 (lockfile 드리프트 허용 — 빌더 환경 차이 방어)
COPY . .
RUN pnpm install --no-frozen-lockfile

# 모노레포 전체 빌드 (각 서비스 startCommand가 자기 것만 실행)
RUN pnpm -r build

# startCommand(railway)가 CMD를 오버라이드한다.
CMD ["node", "-e", "console.error('Set a startCommand on the Railway service'); process.exit(1)"]
