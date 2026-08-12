# Ansible deployment for Lessons Portal

These Ansible roles replace the removed GitLab CI/CD procedures:

- `deploy/gitlab-local-deploy.sh` → `playbooks/deploy-local.yml`
- `deploy/build-and-push-images.sh` + `deploy/gitlab-prod-deploy.sh` → `playbooks/build-and-push.yml` + `playbooks/deploy-brix-pc.yml`

Registry: **GitHub Container Registry (`ghcr.io`)** instead of the old `gitlab.local:5050`.

## Requirements

- Ansible 2.15+
- Docker + Docker Compose plugin on the control node (for build) and on targets
- GitHub PAT with `read:packages` and `write:packages` scopes
- SSH access to `brix-pc` (key loaded in ssh-agent or configured in inventory)

## Setup

1. Install Ansible (example for Debian/Ubuntu):

   ```bash
   python3 -m pip install --user ansible
   ```

2. Copy and fill vault examples:

   ```bash
   cp deploy/ansible/examples/vault-brix_pc.yml.example \
      deploy/ansible/inventory/group_vars/brix_pc/vault.yml
   # edit vault.yml with your real tokens
   ansible-vault encrypt deploy/ansible/inventory/group_vars/brix_pc/vault.yml
   ```

3. Adjust target addresses if needed:

   - `deploy/ansible/inventory/group_vars/brix_pc.yml` — `brix_pc_host`, `brix_pc_user`, `deploy_dir`
   - `deploy/ansible/inventory/group_vars/local.yml` — `deploy_dir`, `local_env_file`

## Usage

Run playbooks from the `deploy/ansible/` directory so `ansible.cfg` and `roles_path` are picked up automatically:

```bash
cd deploy/ansible
```

### Local development stack

```bash
ansible-playbook \
  -i inventory/hosts.yml \
  playbooks/deploy-local.yml
```

### Build and push images

```bash
ansible-playbook \
  -i inventory/hosts.yml \
  playbooks/build-and-push.yml
```

To tag a release branch or tag explicitly:

```bash
ansible-playbook \
  -i inventory/hosts.yml \
  playbooks/build-and-push.yml \
  -e "image_movable_tag=stable-release"
```

### Deploy production on brix-pc

```bash
ansible-playbook \
  -i inventory/hosts.yml \
  playbooks/deploy-brix-pc.yml \
  --ask-vault-pass
```

Deploy a specific movable tag (e.g. `stable-release`):

```bash
ansible-playbook \
  -i inventory/hosts.yml \
  playbooks/deploy-brix-pc.yml \
  --ask-vault-pass \
  -e "deploy_image_tag=stable-release"
```

### Configure nginx and TLS on brix-pc

```bash
ansible-playbook \
  -i inventory/hosts.yml \
  playbooks/setup-nginx-brix-pc.yml
```

This installs nginx, obtains a Let's Encrypt certificate for `{{ domain }}`, and configures the reverse proxy for the production stack.

## Secrets

Production `.env` on `brix-pc` stays encrypted with `deploy/secrets.sh`. The Ansible role decrypts it to `.env.runtime` on the server using the master key from `vault_secrets_master_key`.

To generate or rotate the master key on `brix-pc`:

```bash
ssh ysamohvalov@192.168.150.90
cd /home/ysamohvalov/service/lessons-portal
./deploy/secrets.sh gen-key
```

## Inventory overview

| Group      | Host       | Purpose                              |
|------------|------------|--------------------------------------|
| `local`    | localhost  | Local dev stack (hot reload)         |
| `brix_pc`  | brix-pc    | Production server (lessons.samoh.ru) |

## GitHub Actions

The repository includes `.github/workflows/deploy.yml` that automates the same steps:

- **Test** backend and frontend on every PR/push.
- **Build and push** images on `stable-release` branch and tags.
- **Deploy** to `brix-pc` via Ansible after images are pushed.

Required GitHub repository secrets:

| Secret | Purpose |
|--------|---------|
| `BRIX_PC_HOST` | IP or hostname of brix-pc |
| `BRIX_PC_USER` | SSH user on brix-pc |
| `BRIX_PC_SSH_PRIVATE_KEY` | SSH private key for Ansible to connect |
| `ANSIBLE_VAULT_PASSWORD` | Password for `deploy/ansible/inventory/group_vars/brix_pc/vault.yml` |

If you prefer to deploy manually, use the playbooks above instead of the workflow.

## Notes

- `build-and-push.yml` runs on the control node because Docker image builds require the project source and Prisma engines cache.
- `deploy-brix-pc.yml` never builds images on the server; it pulls prebuilt images from GHCR.
- The old `docker-compose.override.yml` is automatically removed on `brix-pc` to avoid exposing dev ports.
