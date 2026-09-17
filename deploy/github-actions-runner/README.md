# Self-hosted runner for production deploy

Job `deploy-brix-pc` in `.github/workflows/deploy.yml` runs on a **self-hosted** runner with label `lessons-portal-deploy`, because `brix-pc` (`192.168.150.90`) is on a private LAN and unreachable from GitHub-hosted runners.

## Install (control machine on the same network as brix-pc)

```bash
chmod +x deploy/github-actions-runner/install-local-runner.sh
./deploy/github-actions-runner/install-local-runner.sh
```

Default install path: `~/service/lessons-portal-local/actions-runner`.

The script registers the runner with labels: `self-hosted`, `linux`, `lessons-portal-deploy`, and installs a user `systemd` service (`./svc.sh`).

## Requirements on the runner host

- `gh` CLI authenticated as a user who can administer `yuriisamohvalov-creator/lesson-portal`
- Network: SSH to `brix-pc` (same as manual Ansible)
- GitHub repository secrets configured (see `deploy/ansible/README.md`): `BRIX_PC_*`, `ANSIBLE_VAULT_PASSWORD`

Optional: install Ansible system-wide to speed up jobs (`pip install --user ansible` is still run in CI).

## Service management

User-level systemd (default install without sudo):

```bash
systemctl --user status 'actions.runner.*.service'
systemctl --user restart 'actions.runner.yuriisamohvalov-creator-lesson-portal.*.service'
```

System service (if installed with sudo via `RUNNER_USE_SUDO_SVC=1`):

```bash
cd ~/service/lessons-portal-local/actions-runner
sudo ./svc.sh status
```

## Re-register

```bash
cd ~/service/lessons-portal-local/actions-runner
./svc.sh stop
./config.sh remove --unattended
rm -f .runner
cd /path/to/lesson-portal
./deploy/github-actions-runner/install-local-runner.sh
```

## Security

- Runner executes production deploy with repository secrets; keep the host trusted and updated.
- Prefer a dedicated deploy SSH key (see CI `BRIX_PC_SSH_PRIVATE_KEY`) rather than your personal passphrase-protected key.
