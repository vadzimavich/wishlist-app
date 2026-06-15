# 🚀 Гайд по деплою

Всё приложение разворачивается полностью бесплатно:
- **Vercel** — Next.js frontend
- **Render** — ASP.NET Core backend (Docker)
- **Supabase** — PostgreSQL база данных

> Изображения хранятся по прямым ссылкам с маркетплейсов (Wildberries, Ozon, AliExpress и др.) — дополнительные сервисы не требуются.

---

## 1. Supabase (PostgreSQL)

1. Зарегистрируйся на [supabase.com](https://supabase.com)
2. Создай новый проект (выбери регион поближе — Europe West)
3. Перейди в **Settings → Database**
4. Скопируй **Connection string (URI)**: `postgresql://postgres:[password]@db.[ref].supabase.co:5432/postgres`
5. Сохрани строку — понадобится для бэкенда

> ⚠️ Free tier: 500MB storage, 2 projects, pauses после 1 недели инактивности. Отключи паузу в Project Settings.

---

## 2. Render (ASP.NET Core Backend)

### 2.1 Подготовка Docker-образа

Убедись что `backend/WishlistApp.API/Dockerfile` существует (он уже в репозитории).

### 2.2 Создание сервиса

1. Зарегистрируйся на [render.com](https://render.com) через GitHub
2. **New → Web Service**
3. Подключи репозиторий wishlist-app
4. Настройки:
   ```
   Name:          wishlist-api
   Region:        Frankfurt (EU)
   Branch:        main
   Root Directory: backend
   Runtime:       Docker
   Dockerfile Path: WishlistApp.API/Dockerfile
   ```
5. Environment Variables (добавь все):
   ```
   ASPNETCORE_ENVIRONMENT=Production
   ConnectionStrings__DefaultConnection=<строка из Supabase>
   Jwt__Key=<минимум 32 символа случайная строка>
   Jwt__Issuer=wishlist-api
   Jwt__Audience=wishlist-client
   Jwt__ExpiryMinutes=60
   Jwt__RefreshExpiryDays=30
   AllowedOrigins=https://your-app.vercel.app
   ```
6. **Create Web Service** — первый деплой займёт 5–10 минут

> ⚠️ Free tier: сервис засыпает после 15 минут бездействия, холодный старт ~30 секунд. Для продакшена рассмотри Render Starter ($7/месяц) или Railway.

### 2.3 Запуск миграций БД

После успешного деплоя открой **Shell** в Render:
```bash
cd /app
dotnet ef database update --no-build
```
Или используй `--migrate-on-startup` флаг (уже включён в `Program.cs`).

---

## 3. Vercel (Next.js Frontend)

1. Зарегистрируйся на [vercel.com](https://vercel.com) через GitHub
2. **Add New Project** → импортируй репозиторий
3. Настройки:
   ```
   Framework Preset: Next.js
   Root Directory:   frontend
   Build Command:    npm run build
   Output Directory: .next (auto)
   ```
4. Environment Variables:
   ```
   NEXT_PUBLIC_API_URL=https://wishlist-api.onrender.com
   NEXT_PUBLIC_YANDEX_MAPS_API_KEY=<твой API-ключ Яндекс Карт>
   ```
5. **Deploy**

После деплоя:
- Скопируй URL Vercel (напр. `https://wishlist-app.vercel.app`)
- Обнови `AllowedOrigins` в переменных Render
- Обнови `NEXT_PUBLIC_API_URL` если нужно

---

## 4. Keep-alive (Vercel Cron)

Render's free tier spins down the backend after 15 minutes of inactivity.  
To prevent this, the frontend includes a Vercel Cron job that pings `/health` every 10 minutes.

### Setup
1. Deploy the frontend to Vercel (as above)
2. Vercel automatically picks up `vercel.json` — the cron job is deployed automatically
3. No additional configuration needed

### Verify
- After deployment, visit: `https://your-app.vercel.app/api/ping`
- Expected response: `{ "ok": true, "backend": 200, "data": { "status": "ok", ... } }`

### How it works
- `vercel.json` defines a cron schedule (`*/10 * * * *`)
- Vercel calls `GET /api/ping` every 10 minutes
- The ping endpoint forwards the request to `<NEXT_PUBLIC_API_URL>/health`
- This keeps the Render backend alive

### Troubleshooting
- If `/api/ping` returns `{ "ok": false }`, check that `NEXT_PUBLIC_API_URL` is set correctly in Vercel Environment Variables
- The cron job is **free** on Vercel (1 job included in the free tier)

---

## 5. GitHub Actions (CI/CD)

```yaml
# .github/workflows/deploy.yml
name: Deploy

on:
  push:
    branches: [main]

jobs:
  # Vercel деплоится автоматически при push в main
  # Render деплоится автоматически при push в main (включи в настройках)
  
  test-backend:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-dotnet@v4
        with:
          dotnet-version: '8.0.x'
      - run: cd backend && dotnet test
```

---

## 6. Переменные окружения — сводная таблица

| Переменная | Где используется | Описание |
|---|---|---|
| `ConnectionStrings__DefaultConnection` | Render | PostgreSQL URI из Supabase |
| `Jwt__Key` | Render | Секретный ключ JWT (32+ символов) |
| `Jwt__Issuer` | Render | Издатель токена (`wishlist-api`) |
| `Jwt__Audience` | Render | Аудитория токена (`wishlist-client`) |
| `AllowedOrigins` | Render | URL Vercel-приложения (CORS) |
| `NEXT_PUBLIC_API_URL` | Vercel | URL Render бэкенда |
| `NEXT_PUBLIC_YANDEX_MAPS_API_KEY` | Vercel | API-ключ Яндекс Карт (бесплатно до 100K загрузок/мес) |

---

## 7. Локальный запуск через Docker Compose

```bash
# Скопируй и заполни .env
cp .env.example .env

# Запуск всего стека
docker compose up -d

# Логи
docker compose logs -f api
docker compose logs -f frontend

# Остановка
docker compose down

# Сброс БД (осторожно!)
docker compose down -v
```

Сервисы:
- Frontend:  http://localhost:3000
- API:       http://localhost:5000
- Swagger:   http://localhost:5000/swagger
- DB:        localhost:5432

---

## 8. Troubleshooting

### CORS ошибки
- Проверь `AllowedOrigins` в Render (должен точно совпадать с URL Vercel, без слеша в конце)
- Для локальной разработки: `http://localhost:3000` уже добавлен в `appsettings.Development.json`

### Сервис на Render не просыпается
- Free tier: после 15 мин бездействия — холодный старт ~30 сек
- Используй [UptimeRobot](https://uptimerobot.com/) (бесплатный) для пинга каждые 10 минут

### SignalR не подключается
- Убедись что бэкенд доступен через HTTPS (Render даёт SSL автоматически)
- В браузере проверь WebSocket в DevTools → Network → WS вкладка

### EF Core миграции не применяются
- Проверь строку подключения: Supabase требует `Ssl Mode=Require;Trust Server Certificate=true;`
- Запусти вручную через Shell на Render: `dotnet ef database update`
