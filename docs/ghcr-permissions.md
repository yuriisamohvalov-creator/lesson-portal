# GHCR: push из GitHub Actions и Ansible

## Симптом

CI job `build-images` падает при push:

```text
denied: permission_denied: read_package
```

Образы `ghcr.io/yuriisamohvalov-creator/lesson-portal-{backend,frontend}` были впервые опубликованы **вне** workflow (Ansible / локальный `docker push` с PAT). У таких пакетов `GITHUB_TOKEN` из Actions **не имеет** доступа, пока не настроены права пакета или не используется рабочий PAT.

## Что уже настроено в репозитории

1. **Workflow permissions** репозитория: `Read and write permissions` для `GITHUB_TOKEN` (не только read).
2. **Job `build-images`**: `packages: write`, логин в `ghcr.io` с `secrets.GHCR_TOKEN || secrets.GITHUB_TOKEN`, username — `github.repository_owner`.

## Вариант A — только `GITHUB_TOKEN` (без PAT в secrets)

Для **каждого** пакета:

1. Откройте страницу пакета на GitHub (Packages → `lesson-portal-backend`, `lesson-portal-frontend`).
2. **Package settings** → **Manage Actions access** (не путать с «Connect repository»).
3. **Add repository** → `yuriisamohvalov-creator/lesson-portal`.
4. Роль: **Write** (для push из CI).

Перезапустите failed workflow на `stable-release`.

## Вариант B — PAT (CI + Ansible + brix-pc)

Classic PAT владельца `yuriisamohvalov-creator`:

| Scope | Зачем |
|--------|--------|
| `read:packages` | pull на brix-pc и в CI |
| `write:packages` | push из CI / Ansible |

1. Создайте PAT: GitHub → Settings → Developer settings → Personal access tokens (classic).
2. Обновите vault и secret (из корня репозитория):

   ```bash
   export GHCR_PAT='ghp_...'   # новый токен, не коммитить
   ./deploy/ansible/scripts/sync-ghcr-token.sh
   ```

   Скрипт пишет `vault_ghcr_token` в `deploy/ansible/inventory/group_vars/all/vault.yml` (ansible-vault) и `GHCR_TOKEN` в GitHub Actions secrets. Использует `/usr/bin/python3 -m ansible.cli.vault`, чтобы не ломаться, если `ansible-vault` в PATH с shebang от Python self-hosted runner.

3. Проверка локально:

   ```bash
   echo "$GHCR_PAT" | docker login ghcr.io -u yuriisamohvalov-creator --password-stdin
   docker pull ghcr.io/yuriisamohvalov-creator/lesson-portal-backend:stable-release
   ```

**Важно:** старый `vault_ghcr_token` в vault (401 от `api.github.com/user`) нужно заменить — иначе push и pull с prod не работают.

## Связь с Ansible

- `vault_ghcr_token` — `inventory/group_vars/all/vault.yml`.
- `build-and-push.yml` и `deploy-brix-pc.yml` делают `docker login ghcr.io` на control node / brix-pc при наличии переменной.

## Ссылки

- [Publishing with GitHub Actions (GHCR)](https://docs.github.com/en/packages/managing-github-packages-using-github-actions-workflows/publishing-and-installing-a-package-with-github-actions)
- [Ensuring workflow access to your package](https://docs.github.com/en/packages/managing-github-packages-using-github-actions-workflows/publishing-and-installing-a-package-with-github-actions#upgrading-a-workflow-that-accesses-ghcrio)
