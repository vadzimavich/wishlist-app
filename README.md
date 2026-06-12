# 🎁 WishList — Персональный вишлист с умными приглашениями

Веб-приложение для создания вишлистов и управления праздничными приглашениями. Хозяин события добавляет товары и гостей — каждый гость получает уникальную ссылку и может выбрать подарок или открыть групповой сбор.

---

## 📐 Архитектурные решения

### Next.js vs Telegram Mini App (TMA)

| Критерий | **Next.js** ✅ | TMA |
|---|---|---|
| Доступность | Любой браузер | Только пользователи Telegram |
| Аутентификация | JWT + email/OAuth | Telegram Auth (быстрее) |
| Push-уведомления | Web Push / email | Нативные Telegram (проще) |
| Аватарки | Загрузка вручную | Из Telegram профиля |
| SEO / шеринг | Полная поддержка | Ограничена |
| Обучение | React + .NET (цель) | Требует Telegram Bot SDK |
| Оффлайн | PWA возможен | Нет |

**Решение: Next.js.** Универсальность важнее удобства авторизации. Ссылки-приглашения открываются в любом браузере без аккаунта — это критично для UX гостей. TMA-версию можно добавить позже как отдельный канал.

### Стек

| Слой | Технология | Почему |
|---|---|---|
| **Frontend** | Next.js 14 (App Router) | SSR для SEO + RSC для перформанса |
| **Стили** | Tailwind CSS + CSS Modules | Утилиты + изолированный CSS |
| **Анимации** | GSAP + Framer Motion + Lenis | GSAP — параллакс/ScrollTrigger, FM — React-state анимации |
| **Состояние** | Zustand + TanStack Query | Zustand — UI-стейт, TQ — серверный кеш |
| **Backend** | ASP.NET Core 8 Web API | Изучение .NET, production-ready |
| **Real-time** | SignalR | Встроен в ASP.NET, WebSocket + fallback |
| **БД** | PostgreSQL + EF Core 8 | Реляции, бесплатно на Supabase |
| **Авторизация** | JWT + Refresh tokens | Stateless, масштабируемо |
| **Изображения** | Cloudinary (free tier) | CDN + трансформации on-the-fly |
| **Карты** | Yandex Maps API (free tier) | Интерактивная карта места проведения (до 100K загрузок/мес) |
| **Deploy FE** | Vercel (free) | Native Next.js support |
| **Deploy BE** | Render (free tier) | Docker-контейнер, 750h/месяц |
| **Deploy DB** | Supabase (free) | 500MB PostgreSQL |

---

## 🗺️ Карта функций

### Essential (MVP)
- [x] JWT-аутентификация (email + пароль)
- [x] CRUD вишлиста (фото, название, цена, ссылка-источник)
- [x] CRUD событий (дата, место, описание)
- [x] CRUD гостей с уникальными токенами-ссылками
- [x] Страница приглашения для гостя (без регистрации)
- [x] RSVP (подтверждение присутствия)
- [x] Выбор подарка (соло) → смена статуса в real-time
- [x] Групповой сбор → присоединение других гостей
- [x] SignalR real-time обновления статусов
- [x] Карта/адрес события (Yandex Maps API)

### Перспективные (Phase 2+)
- [ ] **Парсер ссылок** — API endpoint `POST /api/parser/fetch-meta` принимает URL, возвращает title/image/price (Wildberries, Ozon, AliExpress через Playwright или HtmlAgilityPack)
- [ ] Push-уведомления (Web Push API) — оповещение при присоединении к сбору
- [ ] Email-приглашения (SendGrid / Resend)
- [ ] OAuth (Google, VK)
- [ ] Несколько вишлистов на событие
- [ ] Telegram Bot для уведомлений
- [ ] PWA (offline support)
- [ ] Analytics дэшборд

---

## 🚀 Быстрый старт (локально)

### Требования
- Node.js 20+
- .NET 8 SDK
- Docker + Docker Compose (рекомендуется)
- PostgreSQL 15+ (или через Docker)

### 1. Клонирование
```bash
git clone https://github.com/your-username/wishlist-app.git
cd wishlist-app
```

### 2. Запуск через Docker Compose (рекомендуется)
```bash
cp .env.example .env
# Заполни .env своими значениями
docker compose up -d
```
Приложение доступно на:
- Frontend: http://localhost:3000
- Backend API: http://localhost:5000
- Swagger: http://localhost:5000/swagger

### 3. Ручной запуск (без Docker)

**Backend:**
```bash
cd backend/WishlistApp.API
cp appsettings.Development.json.example appsettings.Development.json
# Отредактируй строку подключения к БД
dotnet ef database update
dotnet run
```

**Frontend:**
```bash
cd frontend
cp .env.local.example .env.local
# Заполни NEXT_PUBLIC_API_URL=http://localhost:5000
npm install
npm run dev
```

---

## 📁 Структура проекта

```
wishlist-app/
├── backend/
│   └── WishlistApp.API/          # ASP.NET Core 8 Web API
│       ├── Controllers/           # REST endpoints
│       ├── Data/                  # EF Core DbContext + миграции
│       ├── DTOs/                  # Request/Response модели
│       ├── Hubs/                  # SignalR Hub
│       ├── Middleware/            # Auth middleware, error handling
│       ├── Models/                # Domain entities
│       └── Services/              # Business logic
├── frontend/
│   └── src/
│       ├── app/
│       │   ├── (admin)/           # Защищённые маршруты (adminpanel)
│       │   ├── auth/              # Логин/регистрация
│       │   └── invite/[token]/    # Публичная страница приглашения
│       ├── components/
│       │   ├── admin/             # Компоненты панели управления
│       │   ├── invite/            # Компоненты страницы приглашения
│       │   └── shared/            # Общие компоненты
│       ├── hooks/                 # React hooks
│       ├── lib/                   # API клиент, store, утилиты
│       └── types/                 # TypeScript типы
├── docs/
│   ├── ARCHITECTURE.md
│   ├── DEPLOY.md
│   └── AGENTS.md
└── docker-compose.yml
```

---

## 🌿 Git Flow

```
main          ──────●─────────────────────────────────●── (production)
                    │                                  │
develop       ──────●──●──●──●──●──●──●──●──●──●──────●── (staging)
                       │           │
feature/auth  ─────────●───────────●
feature/wishlist                   │──●───●
```

### Ветки
- `main` — только через PR из `develop`, тегируется (`v0.1.0`, `v0.2.0`)
- `develop` — интеграционная ветка
- `feature/*` — новые фичи (ответвляются от `develop`)
- `fix/*` — баг-фиксы
- `chore/*` — инфраструктура, документация

### Конвенция коммитов
```
feat(wishlist): add product CRUD endpoints
fix(auth): refresh token expiry calculation
chore(docker): add multi-stage Dockerfile
docs: update deploy instructions
```
