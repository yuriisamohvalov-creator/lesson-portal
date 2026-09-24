#!/usr/bin/env bash
# Register a self-hosted GitHub Actions runner for deploy-brix-pc (LAN access to brix-pc).
# Installs under ~/service/lessons-portal-local/actions-runner (see project CLAUDE.md rule 10).
#
# Prerequisites: gh CLI logged in, curl, tar, systemd --user (or sudo for system service).
# Usage: ./deploy/github-actions-runner/install-local-runner.sh
set -euo pipefail

REPO="${GITHUB_REPOSITORY:-yuriisamohvalov-creator/lesson-portal}"
RUNNER_ROOT="${RUNNER_ROOT:-$HOME/service/lessons-portal-local/actions-runner}"
LABELS="${RUNNER_LABELS:-self-hosted,linux,lessons-portal-deploy}"
RUNNER_NAME="${RUNNER_NAME:-$(hostname -s)-lessons-portal-deploy}"

RUNNER_VERSION="${RUNNER_VERSION:-}"
if [[ -z "$RUNNER_VERSION" ]]; then
  RUNNER_VERSION="$(curl -fsSL https://api.github.com/repos/actions/runner/releases/latest | python3 -c "import sys,json; print(json.load(sys.stdin)['tag_name'].lstrip('v'))")"
fi

ARCH="$(uname -m)"
case "$ARCH" in
  x86_64) RUNNER_ARCH=x64 ;;
  aarch64|arm64) RUNNER_ARCH=arm64 ;;
  *)
    echo "Unsupported arch: $ARCH" >&2
    exit 1
    ;;
esac

mkdir -p "$RUNNER_ROOT"
cd "$RUNNER_ROOT"

if [[ ! -f ./config.sh ]]; then
  TAR="actions-runner-linux-${RUNNER_ARCH}-${RUNNER_VERSION}.tar.gz"
  URL="https://github.com/actions/runner/releases/download/v${RUNNER_VERSION}/${TAR}"
  echo "Downloading $URL"
  curl -fsSL -o "$TAR" "$URL"
  tar xzf "$TAR"
  rm -f "$TAR"
fi

if [[ ! -f .runner ]]; then
  TOKEN="$(gh api -X POST "repos/${REPO}/actions/runners/registration-token" --jq .token)"
  ./config.sh \
    --url "https://github.com/${REPO}" \
    --token "$TOKEN" \
    --name "$RUNNER_NAME" \
    --labels "$LABELS" \
    --unattended \
    --replace
else
  echo "Runner already configured (.runner exists)."
fi

install_user_systemd() {
  local svc_file="actions.runner.yuriisamohvalov-creator-lesson-portal.${RUNNER_NAME}.service"
  local unit_path="${XDG_CONFIG_HOME:-$HOME/.config}/systemd/user/${svc_file}"
  mkdir -p "$(dirname "$unit_path")"
  cat > "$unit_path" <<EOF
[Unit]
Description=GitHub Actions Runner (${REPO}.${RUNNER_NAME})
After=network-online.target

[Service]
ExecStart=${RUNNER_ROOT}/run.sh
WorkingDirectory=${RUNNER_ROOT}
KillMode=process
KillSignal=SIGTERM
TimeoutStopSec=5min
Restart=always
RestartSec=5

[Install]
WantedBy=default.target
EOF
  loginctl enable-linger "$USER" 2>/dev/null || true
  systemctl --user daemon-reload
  systemctl --user enable --now "$svc_file"
  systemctl --user status "$svc_file" --no-pager || true
  echo "User systemd unit: $unit_path"
}

if [[ "${EUID}" -eq 0 ]] || [[ "${RUNNER_USE_SUDO_SVC:-}" == "1" ]]; then
  sudo ./svc.sh install
  sudo ./svc.sh start
  sudo ./svc.sh status
else
  install_user_systemd
fi

echo "Self-hosted runner: name=$RUNNER_NAME labels=$LABELS path=$RUNNER_ROOT"
