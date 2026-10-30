# DG FIT deployment

Server layout (`176.96.128.247`, `fit.dgmcraft.online`):

- `/opt/dgfit/app` — clone of this repository
- `/opt/dgfit/.env` — secrets (from `env.template`, `chmod 600`)
- `/opt/dgfit/data` — PostgreSQL data, uploads
- `/opt/dgfit/backups` — daily `pg_dump` files, last 14 days (`backup.sh`, cron 04:17)

Caddy (host) proxies `fit.dgmcraft.online` to `127.0.0.1:3920`.

Deploy the latest `main`:

```bash
/opt/dgfit/app/deploy/deploy.sh
```

Reset a user's password: Admin panel → Users, or ask Claude to run the reset on the server.
