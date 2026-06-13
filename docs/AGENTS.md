# 🤖 Инструкции для кодинг-агентов

Этот документ описывает архитектуру проекта, соглашения и правила для агентов, работающих с кодовой базой.

---

## 📋 Обзор проекта

**WishList App** — персональный вишлист с системой приглашений на праздник.

- **Backend**: ASP.NET Core 8 Web API, EF Core, PostgreSQL, SignalR
- **Frontend**: Next.js 14 (App Router), TypeScript, Tailwind CSS, Framer Motion, GSAP

### Точки входа
```
backend/WishlistApp.API/Program.cs          — стартовая точка API
frontend/src/app/layout.tsx                  — корневой layout Next.js
frontend/src/lib/api.ts                      — HTTP клиент (все запросы к API)
frontend/src/lib/store.ts                    — Zustand store
```

---

## 🗄️ База данных

### Схема (EF Core entities → PostgreSQL)

```
Users               — зарегистрированные хозяева вишлистов
WishlistItems       — товары в вишлисте (userId FK)
Events              — праздники/события (userId FK)
Guests              — гости события (eventId FK, уникальный token)
GiftClaims          — выбор подарка гостем (wishlistItemId FK, guestId FK)
CollectiveParticipants — участники группового сбора (giftClaimId FK, guestId FK)
```

### Правила работы с БД
- **Миграции**: только через `dotnet ef migrations add <Name>` из директории `WishlistApp.API/`
- **Никогда не редактируй** файлы в `Data/Migrations/` вручную
- **Soft delete**: используй `IsDeleted` флаг для WishlistItems, не физическое удаление
- **UTC**: все DateTime поля хранятся в UTC (`DateTime.UtcNow`)

---

## 🔑 Аутентификация

### Поток
1. `POST /api/auth/register` → создаёт User, возвращает JWT + RefreshToken
2. `POST /api/auth/login` → JWT (1 час) + RefreshToken (30 дней, HttpOnly cookie)
3. `POST /api/auth/refresh` → обновляет JWT по RefreshToken
4. Все защищённые эндпоинты: `Authorization: Bearer <jwt>`

### Гостевой доступ
- Гость идентифицируется по `token` в URL: `/invite/[token]`
- `GET /api/guests/by-token/{token}` — публичный эндпоинт, не требует JWT
- Все действия гостя передают `guestToken` в теле запроса (не JWT)

---

## 📡 API соглашения

### Структура ответов
```typescript
// Успех
{ data: T, message?: string }

// Ошибка
{ error: string, details?: string[] }
```

### Эндпоинты

| Метод | URL | Auth | Описание |
|---|---|---|---|
| POST | `/api/auth/register` | ❌ | Регистрация |
| POST | `/api/auth/login` | ❌ | Вход |
| POST | `/api/auth/refresh` | ❌ | Обновление токена |
| GET | `/api/wishlist` | JWT | Список товаров |
| POST | `/api/wishlist` | JWT | Создать товар |
| PUT | `/api/wishlist/{id}` | JWT | Обновить товар |
| DELETE | `/api/wishlist/{id}` | JWT | Удалить товар |
| GET | `/api/events` | JWT | Список событий |
| POST | `/api/events` | JWT | Создать событие |
| PUT | `/api/events/{id}` | JWT | Обновить событие |
| DELETE | `/api/events/{id}` | JWT | Удалить событие |
| GET | `/api/events/{id}/guests` | JWT | Гости события |
| POST | `/api/events/{id}/guests` | JWT | Добавить гостя |
| DELETE | `/api/events/{id}/guests/{guestId}` | JWT | Удалить гостя |
| GET | `/api/guests/by-token/{token}` | ❌ | Данные гостя по токену |
| POST | `/api/guests/{token}/rsvp` | ❌ | RSVP гостя |
| POST | `/api/gifts/claim` | ❌ | Выбрать подарок |
| POST | `/api/gifts/{claimId}/join` | ❌ | Присоединиться к сбору |
| POST | `/api/parser/fetch-meta` | JWT | Парсинг URL товара |
| POST | `/api/media/upload` | JWT | Загрузка изображения |

### Валидация
- Все DTO используют DataAnnotations (`[Required]`, `[MaxLength]`, `[EmailAddress]`)
- Контроллеры проверяют `ModelState.IsValid` через глобальный фильтр
- HTTP статусы: `200` OK, `201` Created, `400` Bad Request, `401` Unauthorized, `403` Forbidden, `404` Not Found, `409` Conflict

---

## 📡 SignalR (Real-time)

### Hub: `/hubs/wishlist`

```typescript
// Подключение (frontend)
const connection = new HubConnectionBuilder()
  .withUrl(`${API_URL}/hubs/wishlist?eventId=${eventId}`)
  .build()

// События (server → client)
connection.on('GiftClaimed', (item: WishlistItem) => {})
connection.on('CollectiveJoined', (claim: GiftClaim) => {})
connection.on('GuestRsvpUpdated', (guest: Guest) => {})
```

### Группы SignalR
- Каждое событие — отдельная группа: `event-{eventId}`
- При подключении гость/хозяин присоединяется к группе события
- Все обновления рассылаются только в группу (не всем клиентам)

---

## 🎨 Frontend соглашения

### Структура компонентов

```
components/
├── admin/          — компоненты админ-панели (минимализм, shadcn/ui)
│   ├── WishlistTable.tsx
│   ├── EventForm.tsx
│   └── GuestList.tsx
├── invite/         — компоненты страницы приглашения (анимированные)
│   ├── HeroSection.tsx
│   ├── WishlistSection.tsx
│   ├── GiftModal.tsx
│   ├── GuestsList.tsx
│   └── InviteMap.tsx            # Яндекс Карта с местом проведения
└── shared/         — общие компоненты
    ├── Button.tsx
    └── LoadingSpinner.tsx
```

### Правила компонентов
- Серверные компоненты (RSC) — по умолчанию для страниц
- `'use client'` только для интерактивных компонентов с хуками/анимациями
- Все анимированные компоненты страницы приглашения — `'use client'`
- Никаких props drilling глубже 2 уровней — используй Zustand store

### Tailwind
- Кастомные классы в `tailwind.config.ts`
- Стили тёмной темы — единственная тема (нет toggle)
- CSS переменные в `globals.css` для цветов и эффектов

### Типы (TypeScript)
- Все типы — в `src/types/index.ts`
- Строгий режим: `"strict": true` в `tsconfig.json`
- Не используй `any` — используй `unknown` и type guards

---

## 🏗️ Паттерны

### Добавление новой фичи (пример: комментарии к товарам)

1. **Backend Model**: создай `Comment.cs` в `Models/`
2. **Migration**: `dotnet ef migrations add AddComments`
3. **DTO**: создай `CommentDto.cs` в `DTOs/`
4. **Service**: создай `CommentService.cs` в `Services/`
5. **Controller**: создай `CommentsController.cs` в `Controllers/`
6. **Frontend Types**: обнови `src/types/index.ts`
7. **API Client**: добавь методы в `src/lib/api.ts`
8. **Component**: создай компонент
9. **Integration**: подключи SignalR событие если нужен real-time

### Интеграция парсера (запланировано)

Точка интеграции готова: `POST /api/parser/fetch-meta`

Реализация в `Services/ParserService.cs`:
```csharp
// Вариант 1: HtmlAgilityPack (легковесный, Open Graph meta tags)
// Вариант 2: Microsoft.Playwright (JavaScript-рендеринг для Wildberries/Ozon)
// Вариант 3: Внешний сервис (apify.com, scraperapi.com)
```

На фронтенде: компонент `UrlImportInput` уже имеет проп `onParsed?: (data: ParsedProduct) => void`.

---

## ⚠️ Важные ограничения

1. **Render Free Tier**: `Keep-Alive` пинг необходим (UptimeRobot)
2. **Supabase Free Tier**: пауза после 7 дней → включи в настройках "Disable project pausing"
3. **Изображения**: используются прямые ссылки с маркетплейсов. Домены маркетплейсов разрешены в `next.config.ts → images.remotePatterns`
4. **SignalR CORS**: `withCredentials: false` — гостевые соединения без cookies
5. **Next.js Image**: разрешённые домены изображений указаны в `next.config.ts → images.remotePatterns`
6. **Yandex Maps API**: ключ хранится в `NEXT_PUBLIC_YANDEX_MAPS_API_KEY` (фронтенд only). Бесплатно до 100 000 загрузок карт в месяц. Получить ключ: https://developer.tech.yandex.ru/

---

## 🧪 Тестирование

```bash
# Backend unit tests
cd backend
dotnet test

# Frontend type check
cd frontend
npx tsc --noEmit

# Frontend lint
npx eslint src/

# E2E (Playwright) — Phase 2
npx playwright test
```

---

## 🔒 Безопасность

- Refresh tokens хранятся в HttpOnly Secure cookies (не доступны из JS)
- Guest tokens — UUID v4, нет sequential enumeration
- Все пользовательские inputы санируются через EF Core параметризованные запросы
- CORS: только whitelist доменов
- Rate limiting: 100 req/min на IP (реализовано через `AspNetCoreRateLimit`)
