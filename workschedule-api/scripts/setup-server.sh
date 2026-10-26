#!/bin/bash
# 阿里云 ECS 99 元/年服务器初始化脚本
# 支持 Ubuntu/Debian（apt）以及 Alibaba Cloud Linux / CentOS / RHEL（yum/dnf）
# 以 root 身份执行：bash setup-server.sh

set -e

APP_DIR=/opt/workschedule
LOG_DIR=$APP_DIR/logs
DB_DIR=$APP_DIR/workschedule-api/data

# 检测系统类型
if [ -f /etc/os-release ]; then
  . /etc/os-release
  OS_ID=$(echo "$ID" | tr '[:upper:]' '[:lower:]')
else
  echo "无法识别操作系统，请手动安装依赖"
  exit 1
fi

IS_DEBIAN=false
IS_RHEL=false

if [[ "$OS_ID" =~ ^(ubuntu|debian)$ ]]; then
  IS_DEBIAN=true
elif [[ "$OS_ID" =~ ^(almalinux|centos|rocky|fedora|alios|alibaba|anolis|opencloudos)$ ]]; then
  IS_RHEL=true
else
  echo "未明确识别的系统：$OS_ID，将尝试按 RHEL 系处理"
  IS_RHEL=true
fi

if [ "$IS_DEBIAN" = true ]; then
  PKG_UPDATE="apt-get update"
  PKG_INSTALL="apt-get install -y"
  BUILD_DEPS="build-essential"
  WEB_USER="www-data"
  WEB_GROUP="www-data"
  NGINX_SITE_AVAILABLE=/etc/nginx/sites-available
  NGINX_SITE_ENABLED=/etc/nginx/sites-enabled
  NGINX_DEFAULT_SITE=$NGINX_SITE_ENABLED/default
else
  PKG_UPDATE="yum update -y"
  PKG_INSTALL="yum install -y"
  BUILD_DEPS="gcc-c++ make"
  WEB_USER="nginx"
  WEB_GROUP="nginx"
  NGINX_SITE_AVAILABLE=/etc/nginx/conf.d
  NGINX_SITE_ENABLED=/etc/nginx/conf.d
  NGINX_DEFAULT_SITE=""
fi

# 更新系统并安装必要软件
$PKG_UPDATE
$PKG_INSTALL curl wget git nginx $BUILD_DEPS python3

# 安装 Node.js 22 LTS
if ! command -v node &> /dev/null || [ "$(node -v | cut -d'v' -f2 | cut -d'.' -f1)" != "22" ]; then
  if [ "$IS_DEBIAN" = true ]; then
    curl -fsSL https://deb.nodesource.com/setup_22.x | bash -
    apt-get install -y nodejs
  else
    curl -fsSL https://rpm.nodesource.com/setup_22.x | bash -
    yum install -y nodejs
  fi
fi

# 安装 PM2
npm install -g pm2

# 创建应用目录
mkdir -p $APP_DIR $LOG_DIR $DB_DIR
chown -R $WEB_USER:$WEB_GROUP $APP_DIR
chmod 755 $APP_DIR

# Nginx 站点配置（如果用户已准备好 nginx.conf）
if [ -f "$APP_DIR/workschedule-api/scripts/nginx.conf" ]; then
  mkdir -p $NGINX_SITE_AVAILABLE $NGINX_SITE_ENABLED
  cp $APP_DIR/workschedule-api/scripts/nginx.conf $NGINX_SITE_AVAILABLE/workschedule.conf
  if [ "$IS_DEBIAN" = true ]; then
    ln -sf $NGINX_SITE_AVAILABLE/workschedule.conf $NGINX_SITE_ENABLED/workschedule
    rm -f $NGINX_DEFAULT_SITE
  fi
  nginx -t && systemctl reload nginx
fi

# 防火墙放行 80/443
if command -v ufw &> /dev/null; then
  ufw allow 80/tcp
  ufw allow 443/tcp
  ufw --force enable
elif command -v firewall-cmd &> /dev/null; then
  firewall-cmd --permanent --add-service=http
  firewall-cmd --permanent --add-service=https
  firewall-cmd --reload
fi

# 设置 PM2 开机自启
env PATH=$PATH:/usr/bin pm2 startup systemd -u $WEB_USER --hp /var/www
systemctl enable pm2-$WEB_USER 2>/dev/null || true

echo "服务器初始化完成。请将代码部署到 $APP_DIR，并配置 .env 后执行："
echo "  cd $APP_DIR/workschedule-api && npm ci && npm run build"
echo "  pm2 start ecosystem.config.cjs"
echo "  pm2 save"
