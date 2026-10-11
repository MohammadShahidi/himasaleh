#!/bin/sh
# One-time server preparation (Ubuntu 24.04, run as root). Idempotent.
#   - 2 GB swap, Docker, firewall, `deploy` user (key passed as $1), /srv/himasaleh
#   - frees ports 80/443 (the previous product's nginx is removed; certbot and its certificate stay)
#   - certbot renewal hook reloads the Caddy proxy
# Usage: sh server-setup.sh "ssh-ed25519 AAAA... himasaleh-ci-deploy"
set -eu
PUBKEY=${1:?pass the deploy public key}
APP_DIR=/srv/himasaleh

if ! swapon --show | grep -q swapfile; then
  fallocate -l 2G /swapfile; chmod 600 /swapfile; mkswap /swapfile; swapon /swapfile
  echo '/swapfile none swap sw 0 0' >> /etc/fstab
fi

# Previous product ("masaleh")
systemctl disable --now masaleh.service 2>/dev/null || true
rm -f /etc/systemd/system/masaleh.service; systemctl daemon-reload
systemctl disable --now nginx 2>/dev/null || true
apt-get purge -y nginx nginx-common 2>/dev/null || true
rm -rf /opt/masaleh /opt/node22 /etc/masaleh /etc/nginx
userdel -r masaleh 2>/dev/null || true

if ! command -v docker >/dev/null 2>&1; then
  apt-get update && apt-get install -y docker.io docker-compose-v2
fi
systemctl enable --now docker

id deploy >/dev/null 2>&1 || useradd -m -s /bin/bash deploy
usermod -aG docker deploy
install -d -m 700 -o deploy -g deploy /home/deploy/.ssh
echo "$PUBKEY" > /home/deploy/.ssh/authorized_keys
chown deploy:deploy /home/deploy/.ssh/authorized_keys; chmod 600 /home/deploy/.ssh/authorized_keys
install -d -o deploy -g deploy "$APP_DIR" "$APP_DIR/infra" /var/backups/himasaleh
mkdir -p /var/www/certbot

# Certificate renewal: certbot (webroot) -> reload Caddy so it picks up the new files
mkdir -p /etc/letsencrypt/renewal-hooks/deploy
cat > /etc/letsencrypt/renewal-hooks/deploy/reload-caddy.sh <<HOOK
#!/bin/sh
docker compose -f $APP_DIR/infra/docker-compose.yml exec -T proxy caddy reload --config /etc/caddy/Caddyfile || true
HOOK
chmod +x /etc/letsencrypt/renewal-hooks/deploy/reload-caddy.sh
sed -i 's/^renew_hook = .*/renew_hook =/' /etc/letsencrypt/renewal/himasaleh.ir.conf 2>/dev/null || true

echo "ready. Next: put $APP_DIR/infra/.env (see infra/.env.example), then run the Deploy workflow."
