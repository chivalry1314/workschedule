module.exports = {
  apps: [
    {
      name: 'workschedule-api',
      script: './dist/main.js',
      cwd: '/opt/workschedule/workschedule-api',
      instances: 1,
      exec_mode: 'fork',
      env: {
        NODE_ENV: 'production',
        PORT: 3000,
      },
      env_file: '/opt/workschedule/workschedule-api/.env',
      log_file: '/opt/workschedule/logs/combined.log',
      out_file: '/opt/workschedule/logs/out.log',
      error_file: '/opt/workschedule/logs/error.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
      merge_logs: true,
      max_memory_restart: '512M',
      restart_delay: 3000,
      min_uptime: '10s',
      max_restarts: 5,
      watch: false,
      autorestart: true,
    },
  ],
};
