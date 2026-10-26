#!/bin/bash
# 阿里云 ECS 99 元/年服务器初始化脚本（Ubuntu 22.04 LTS）
# 以 root 身份执行：bash setup-server.sh

set -e

APP_DIR=/opt/workschedule
LOG_DIR=$APP_DIR/logs
DB_DIR=$APP_DIR/workschedule-api/data

# 更新系统并安装必要软件
apt-get update
apt-get install -y curl wget git nginx build-essential python3

# 安装 Node.js 22 LTS（使用官方 NodeSource 源）
if ! command -v node &> /dev/null || [ "$(node -v | cut -d'v' -f2 | cut -d'.' -f1)" != "22" ]; then
  curl -fsSL https://deb.nodesource.com/setup_22.x | bash -
  apt-get install -y nodejs
fi

# 安装 PM2
npm install -g pm2

# 创建应用目录
mkdir -p $APP_DIR $LOG_DIR $DB_DIR
chown -R www-data:www-data $APP_DIR
chmod 755 $APP_DIR

# Nginx 站点配置（如果用户已准备好 nginx.conf）
if [ -f "$APP_DIR/workschedule-api/scripts/nginx.conf" ]; then
  cp $APP_DIR/workschedule-api/scripts/nginx.conf /etc/nginx/sites-available/workschedule
  ln -sf /etc/nginx/sites-available/workschedule /etc/nginx/sites-enabled/workschedule
  rm -f /etc/nginx/sites-enabled/default
  nginx -t && systemctl reload nginx
fi

# 防火墙放行 80/443
if command -v ufw &> /dev/null; then
  ufw allow 80/tcp
  ufw allow 443/tcp
  ufw --force enable
fi

# 设置 PM2 开机自启
env PATH=$PATH:/usr/bin pm2 startup systemd -u www-data --hp /var/www
systemctl enable pm2-www-data 2>/dev/null || true

echo "服务器初始化完成。请将代码部署到 $APP_DIR，并配置 .env 后执行："
echo "  cd $APP_DIR/workschedule-api && npm ci && npm run build"
echo "  pm2 start ecosystem.config.cjs"
echo "  pm2 save"
