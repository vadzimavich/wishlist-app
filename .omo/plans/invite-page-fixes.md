# Invite Page — 8 UX Fixes

## TL;DR

> **Quick Summary**: Исправить 8 UX проблем на странице приглашения: убрать счётчики в вишлисте, починить скролл и контейнер чата, перенести кнопку чата в RSVP бар, стандартизировать заголовки с иконками, переделать сетку гостей на вертикальную, почистить hero.
>
> **Deliverables**:
> - Чистые карточки вишлиста (без ProgressBar "3 из 5" и сводного кольца)
> - Чат с нормальным скроллом и одинарным контейнером
> - Кнопка чата в RSVP баре (доступна всегда)
> - Единый стиль заголовков секций + иконки
> - Вертикально-текущая сетка гостей без обрезания
> - Hero без "прокрути чтобы подтвердить", с воздухом
>
> **Estimated Effort**: Medium (6-8 hours)
> **Parallel Execution**: YES — 3 waves
> **Critical Path**: Task 3 (lift chat state) → Task 5 (chat button in RSVP) — чат надо поднять первым

---

## Context

### Original Request
Пользователь попросил 8 фиксов для страницы приглашения на русском языке.

### Interview Summary
**Key Discussions**:
- Убрать ProgressBar ВЕЗДЕ (3 инстанса: карточки, модалка присоединения, модалка успеха)
- Сетка гостей: сохранить "ты в центре", перераспределять по вертикали, уменьшить расстояние
- Hero: больше gap и padding, всё в 100vh
- Кнопка чата: иконка MessageCircle в RSVP баре (потеря вертикальной вкладки — ок)
- Иконки заголовков: Calendar/MapPin/Users/Gift/Info/Bell
- Agent QA только (без юнит-тестов)

**Research Findings**:
- Чат-стор (Zustand) — глобальный, RsvpBar может читать сообщения для бейджа
- Двойной контейнер чата только на десктопе (строка 487 InviteChat.tsx)
- На десктопе нет max-height, из-за этого чат растёт за границы окна
- Заголовки разных секций используют разные классы (bold vs extrabold, md:text-5xl дрифт)
- GuestGrid использует @react-spring для физики, гости обрезаются overflow-hidden

### Metis Review
**Identified Gaps** (addressed):
- Q1: ProgressBar scope → убрать ВСЕ 3, подтверждено
- Q2: Guest grid → сохранить "ты в центре", расширять вниз
- Q4: Hero → больше gap + padding, всё в 100vh
- Q5: Кнопка чата → иконка в RSVP баре, ок
- Test strategy → Agent QA only

---

## Work Objectives

### Core Objective
8 frontend-only UX исправлений на странице приглашения wishlist-app.

### Concrete Deliverables
- [ ] `InviteWishlist.tsx` — без ProgressBar и сводного кольца
- [ ] `InviteChat.tsx` — нормальный скролл, один контейнер, без триггерных кнопок
- [ ] `InviteRsvpBar.tsx` — с кнопкой чата + бейджем непрочитанных
- [ ] `InviteClientPage.tsx` — с поднятым состоянием чата
- [ ] `InviteGuests.tsx` — вертикальная CSS-сетка вместо физики
- [ ] `InviteHero.tsx` — без "прокрути чтобы подтвердить", с воздухом
- [ ] `InviteDetails.tsx` — стабильный заголовок + иконка
- [ ] `InviteMap.tsx` — стабильный заголовок + иконка
- [ ] `InviteActivityFeed.tsx` — стабильный заголовок + иконка

### Definition of Done
- [ ] Playwright скриншот каждой секции ДО и ПОСЛЕ — визуальная разница отсутствует или улучшена
- [ ] Чат открывается и скроллится на десктопе и мобилке
- [ ] Кнопка чата видна в RSVP баре, открывает чат
- [ ] Все 6 заголовков секций имеют иконку и одинаковый размер/жирность
- [ ] 10+ гостей — все видны, скролл сетки работает, ничего не обрезано
- [ ] Hero вписывается в 100vh без скролла, нет текста "Прокрути чтобы подтвердить"
- [ ] Вишлист не показывает "3 из 5" или кольцо прогресса

### Must Have
- Все 8 пунктов из запроса пользователя
- Чат не выходит за границы окна
- Кнопка чата всегда доступна в RSVP баре
- Гости не обрезаются
- Заголовки единого стиля с иконками

### Must NOT Have (Guardrails)
- Никаких изменений бэкенда, SignalR, API
- Никаких новых зависимостей
- Логика чата (отправка/получение) не меняется
- Логика RSVP и выбора подарков не меняется
- @react-spring не удаляется из зависимостей (даже если стал не нужен)
- Никаких новых анимаций заголовков

---

## Verification Strategy (MANDATORY)

> **ZERO HUMAN INTERVENTION** — ALL verification is agent-executed.

### Test Decision
- **Infrastructure exists**: NO
- **Automated tests**: Agent QA only (Playwright + curl)
- **Framework**: none (project has no test infra)
- **QA tool**: Playwright (browser) + Bash (curl)

### QA Policy
Every task MUST include agent-executed QA scenarios.
Evidence saved to `.omo/evidence/task-{N}-{scenario-slug}.{ext}`.

- **UI/Frontend**: Playwright — navigate, interact, assert DOM, screenshot
- **Chat/Panel**: Playwright — open panel, assert scroll, assert no overflow
- **Verification**: Playwright screenshot diff + DOM assertions

---

## Execution Strategy

### Parallel Execution Waves

```
Wave 1 (Foundation — lift chat state + independent leaf changes):
├── Task 1: InviteHero.tsx — remove scroll text, add spacing [quick]
├── Task 2: InviteWishlist.tsx — remove ProgressBar + summary ring [quick]
├── Task 3: InviteClientPage.tsx — lift chatOpen state [quick]
├── Task 4: InviteActivityFeed.tsx — consistent header + icon [quick]
├── Task 5: InviteDetails.tsx — consistent header + icon [quick]
└── Task 6: InviteMap.tsx — consistent header + icon [quick]

Wave 2 (Dependent on Wave 1 — chat and guest grid):
├── Task 7: InviteChat.tsx — fix double container, fix scroll, remove triggers, accept isOpen prop [unspecified-high]
├── Task 8: InviteRsvpBar.tsx — add chat button with unread badge (depends: 3) [unspecified-high]
├── Task 9: InviteGuests.tsx — rewrite to vertical CSS grid (depends: none) [unspecified-high]
└── Task 10: InviteWishlist.tsx header — consistent header + icon [quick]

Wave FINAL (After ALL tasks — 4 parallel reviews):
├── Task F1: Plan compliance audit (oracle)
├── Task F2: Code quality review (unspecified-high)
├── Task F3: Real manual QA (unspecified-high + playwright)
└── Task F4: Scope fidelity check (deep)
-> Present results -> Get explicit user okay

Critical Path: Task 3 → Task 8 → F1-F4 → user okay
Parallel Speedup: ~60% faster than sequential
Max Concurrent: 5 (Waves 1)
```

### Dependency Matrix
- **1-6**: None — can start immediately
- **7**: 3 (needs isOpen prop) — chat fix
- **8**: 3, 7 (needs chat panel working + state) — RSVP bar chat button
- **9**: None — independent guest grid rewrite
- **10**: 2 (wishlist already cleaned) — consistent header
- **F1-F4**: ALL

### Agent Dispatch Summary
- **Wave 1**: 6 agents — 6 × quick
- **Wave 2**: 4 agents — 3 × unspecified-high, 1 × quick
- **FINAL**: 4 agents — oracle, unspecified-high, unspecified-high, deep

---

## TODOs

- [x] 1. InviteHero — удалить "Прокрути, чтобы подтвердить" + добавить воздуха

  **What to do**:
  - Удалить блок `{rsvpStatus === 'Pending' && (<motion.p>↓ Прокрути, чтобы подтвердить присутствие</motion.p>)}`
  - Увеличить `gap` между элементами контента (сейчас элементы идут вплотную)
  - Увеличить вертикальные отступы (padding), сохранив `min-h-screen`
  - Убедиться что весь контент вписывается в 100vh (не требует скролла)
  - Scroll indicator (мышка) оставить как декоративный элемент

  **Must NOT do**:
  - Не менять структуру hero секции (min-h-screen, flex centering)
  - Не удалять scroll indicator (мышка)
  - Не менять RSVP логику

  **Recommended Agent Profile**:
  - **Category**: `quick`
    - Reason: Изменения в одном файле, удаление + padding tweaks
  - **Skills**: `[]`
  - **Skills Evaluated but Omitted**: N/A

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 1 (with Tasks 2-6)
  - **Blocks**: None
  - **Blocked By**: None

  **References**:
  - `InviteHero.tsx:327-331` — блок для удаления
  - `InviteHero.tsx:208-350` — вся hero секция для понимания вёрстки

  **Acceptance Criteria**:
  - [ ] Текст "Прокрути, чтобы подтвердить" отсутствует в DOM
  - [ ] Hero вписывается в 100vh (Playwright: измерение высоты)
  - [ ] Gap между элементами контента > текущего

  **QA Scenarios**:
  ```
  Scenario: Hero no scroll hint text
    Tool: Playwright
    Preconditions: Load invite page with Pending status
    Steps:
      1. page.goto('/invite/{token}')
      2. page.waitForSelector('h1')
      3. const text = page.textContent('section')
    Expected Result: text does NOT include 'Прокрути, чтобы подтвердить'
    Evidence: .omo/evidence/task-1-no-scroll-hint.png

  Scenario: Hero fits in 100vh
    Tool: Playwright
    Preconditions: Load invite page
    Steps:
      1. page.goto('/invite/{token}')
      2. const vpHeight = page.viewportSize().height
      3. const heroHeight = page.evaluate(() => document.querySelector('section')?.scrollHeight)
    Expected Result: heroHeight <= vpHeight (no internal scroll needed)
    Evidence: .omo/evidence/task-1-hero-fits-viewport.txt
  ```

  **Evidence to Capture**:
  - [ ] Скриншот hero секции
  - [ ] Измерение высоты hero vs viewport

  **Commit**: YES
  - Message: `fix(invite): remove scroll hint text, add hero spacing`
  - Files: `frontend/src/components/invite/InviteHero.tsx`

---

- [x] 2. InviteWishlist — удалить ProgressBar и сводное кольцо

  **What to do**:
  - Удалить компонент `ProgressBar` (строки ~54-81)
  - Удалить SVG progress ring + "X из Y выбрано" блок (строки ~187-240)
  - Удалить `<ProgressBar ...>` из карточки товара (строки ~322-328)
  - Удалить `<ProgressBar ...>` из модалки "ты в сборе" (строки ~504-508)
  - Удалить `<ProgressBar ...>` из модалки успеха (строки ~594-599)
  - Удалить `ParticipantAvatars` component (строки ~35-52) — он используется ТОЛЬКО с ProgressBar
  - Убедиться что компонент не импортирует ничего лишнего (UserPlus, Check, Check может остаться)

  **Must NOT do**:
  - Не менять логику claim/join/cancel
  - Не менять карточки товаров кроме удаления ProgressBar
  - Не удалять импорты, которые используются в другом месте

  **Recommended Agent Profile**:
  - **Category**: `quick`
    - Reason: Один файл, удаление кода, логика не меняется
  - **Skills**: `[]`

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 1 (with Tasks 1, 3-6)
  - **Blocks**: Task 10 (wishlist header)
  - **Blocked By**: None

  **References**:
  - `InviteWishlist.tsx:35-52` — ParticipantAvatars (удалить)
  - `InviteWishlist.tsx:54-81` — ProgressBar (удалить)
  - `InviteWishlist.tsx:186-240` — сводное кольцо (удалить)
  - `InviteWishlist.tsx:322-328` — ProgressBar в карточке (удалить)
  - `InviteWishlist.tsx:504-508` — ProgressBar в модалке (удалить)
  - `InviteWishlist.tsx:594-599` — ProgressBar в успехе (удалить)

  **Acceptance Criteria**:
  - [ ] Текст "из" отсутствует в wishlist секции (не показывается "3 из 5" или "X из Y")
  - [ ] SVG круг с процентом отсутствует
  - [ ] Прогресс-бар (цветная полоска) отсутствует
  - [ ] ParticipantAvatars и ProgressBar функции удалены из файла

  **QA Scenarios**:
  ```
  Scenario: No progress text in wishlist cards
    Tool: Playwright
    Preconditions: Load invite page with collective gifts
    Steps:
      1. page.goto('/invite/{token}')
      2. const sectionText = page.textContent('[class*="wish-card"]')
    Expected Result: sectionText does NOT contain 'из' in numeric context (no "3 из 5")
    Evidence: .omo/evidence/task-2-no-progress-text.png

  Scenario: No SVG ring in wishlist
    Tool: Playwright
    Preconditions: Load invite page with gifts
    Steps:
      1. page.goto('/invite/{token}')
      2. const svgCount = page.locator('svg.wishlist-ring')... (or count all svgs inside wishlist section)
    Expected Result: No progress SVG in wishlist header area
    Evidence: .omo/evidence/task-2-no-svg-ring.png
  ```

  **Evidence to Capture**:
  - [ ] Скриншот wishlist секции
  - [ ] Подтверждение отсутствия текста "из"

  **Commit**: YES
  - Message: `feat(invite): remove progress bar and summary ring from wishlist`
  - Files: `frontend/src/components/invite/InviteWishlist.tsx`

---

- [x] 3. InviteClientPage — поднять состояние чата

  **What to do**:
  - Добавить `const [chatOpen, setChatOpen] = useState(false)` в компонент
  - Передать `isOpen={chatOpen}` и `onClose={() => setChatOpen(false)}` в `InviteChat`
  - Передать `onChatToggle={() => setChatOpen(prev => !prev)}` в `InviteRsvpBar`
  - Импортировать `useState` если ещё не импортирован

  **Must NOT do**:
  - Не менять структуру рендера компонентов
  - Не менять пропсы других компонентов

  **Recommended Agent Profile**:
  - **Category**: `quick`
    - Reason: Состояние + пропсы, один файл
  - **Skills**: `[]`

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 1 (with Tasks 1, 2, 4-6)
  - **Blocks**: Task 7, Task 8
  - **Blocked By**: None

  **References**:
  - `InviteClientPage.tsx:126-186` — JSX структура
  - `InviteClientPage.tsx:25-27` — существующие state/props
  - `InviteChat.tsx:52` — текущее `useState(false)` для isOpen

  **Acceptance Criteria**:
  - [ ] `chatOpen` стейт определён в InviteClientPage
  - [ ] InviteChat получает `isOpen` и `onClose` пропсы
  - [ ] InviteRsvpBar получает `onChatToggle` пропс

  **QA Scenarios**:
  ```
  Scenario: Chat state lifted correctly
    Tool: Bash (curl API) + Visual inspection
    Preconditions: Code compiled without errors
    Steps:
      1. Проверить npm run build (проверка типов)
    Expected Result: Build passes, no type errors about missing props
    Evidence: .omo/evidence/task-3-build-pass.txt
  ```

  **Evidence to Capture**:
  - [ ] Build output (tsc --noEmit)

  **Commit**: YES
  - Message: `refactor(invite): lift chat open state to InviteClientPage`
  - Files: `frontend/src/components/invite/InviteClientPage.tsx`

---

- [x] 4. InviteActivityFeed — единый заголовок + иконка

  **What to do**:
  - Заменить текущий h2 на единый стиль: `font-display font-bold text-3xl sm:text-4xl tracking-tight gradient-text-sweep flex items-center justify-center gap-3`
  - Добавить `<Bell size={28} className="text-brand-violet shrink-0" />` перед текстом "Лента активности"
  - Обернуть текст и иконку во flex контейнер (уже есть в классе)

  **Must NOT do**:
  - Не добавлять новых анимаций
  - Не менять subtitle "Последние действия гостей"

  **Recommended Agent Profile**:
  - **Category**: `quick`
    - Reason: Один заголовок, простая замена
  - **Skills**: `[]`

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 1 (with Tasks 1-3, 5, 6)
  - **Blocks**: None
  - **Blocked By**: None

  **References**:
  - `InviteActivityFeed.tsx:122-129` — текущий h2

  **Acceptance Criteria**:
  - [ ] Заголовок использует `font-bold` (не `font-extrabold`)
  - [ ] Перед текстом есть `<Bell>` иконка
  - [ ] Выравнивание по центру

  **QA Scenarios**:
  ```
  Scenario: Header has icon and correct style
    Tool: Playwright
    Preconditions: Load invite page with activity
    Steps:
      1. page.goto('/invite/{token}')
      2. const h2 = page.locator('h2:has-text("Лента активности")')
      3. const icon = h2.locator('svg')
      4. const fontWeight = h2.evaluate(el => getComputedStyle(el).fontWeight)
    Expected Result: icon exists, fontWeight is '700' (bold)
    Evidence: .omo/evidence/task-4-activity-header.png
  ```

  **Evidence to Capture**:
  - [ ] Скриншот заголовка

  **Commit**: YES (group with 4, 5, 6, 10)
  - Message: `style(invite): standardize section headers with icons`
  - Files: `frontend/src/components/invite/InviteActivityFeed.tsx`

---

- [x] 5. InviteDetails — единый заголовок + иконка

  **What to do**:
  - Для "Когда": заменить h2 на единый стиль, добавить `<Calendar size={28} className="text-brand-violet shrink-0" />`
  - Для "Детали": заменить h2 на единый стиль, добавить `<Info size={28} className="text-brand-violet shrink-0" />`
  - Импортировать `Calendar`, `Info` из `lucide-react` (проверить текущие импорты)

  **Must NOT do**:
  - Не менять содержимое секций (дата, описание)

  **Recommended Agent Profile**:
  - **Category**: `quick`
    - Reason: Два заголовка, простая замена
  - **Skills**: `[]`

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 1
  - **Blocks**: None
  - **Blocked By**: None

  **References**:
  - `InviteDetails.tsx:18` — h2 "Когда"
  - `InviteDetails.tsx:30` — h2 "Детали"
  - `lucide-react` — Calendar, Info

  **Acceptance Criteria**:
  - [ ] Calendar иконка перед "Когда"
  - [ ] Info иконка перед "Детали"
  - [ ] Оба h2 используют `font-bold`

  **QA Scenarios**:
  ```
  Scenario: Headers have icons
    Tool: Playwright
    Preconditions: Load invite page
    Steps:
      1. Проверить наличие svg иконок внутри h2
    Expected Result: Calendar и Info иконки присутствуют
    Evidence: .omo/evidence/task-5-details-headers.png
  ```

  **Evidence to Capture**:
  - [ ] Скриншот обоих заголовков

  **Commit**: YES (group with 4)
  - Files: `frontend/src/components/invite/InviteDetails.tsx`

---

- [x] 6. InviteMap — единый заголовок + иконка

  **What to do**:
  - Заменить h2 на единый стиль
  - Добавить `<MapPin size={28} className="text-brand-violet shrink-0" />` — MapPin уже импортирован

  **Must NOT do**:
  - Не менять логику карты

  **Recommended Agent Profile**:
  - **Category**: `quick`
    - Reason: Один заголовок, простая замена
  - **Skills**: `[]`

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 1
  - **Blocks**: None
  - **Blocked By**: None

  **References**:
  - `InviteMap.tsx:101` — h2 "Где"
  - `InviteMap.tsx:4` — существующий импорт MapPin

  **Acceptance Criteria**:
  - [ ] MapPin иконка перед "Где"
  - [ ] h2 использует `font-bold`

  **QA Scenarios**:
  ```
  Scenario: Map header has icon
    Tool: Playwright
    Steps: Проверить h2 "Где" содержит svg иконку MapPin
    Expected Result: Иконка присутствует
    Evidence: .omo/evidence/task-6-map-header.png
  ```

  **Evidence to Capture**:
  - [ ] Скриншот заголовка

  **Commit**: YES (group with 4)

---

- [x] 7. InviteChat — исправить двойной контейнер, скролл, убрать триггеры

  **What to do**:
  - **Убрать триггерные кнопки**: удалить десктопную side tab (строки ~406-436) и мобильную floating bubble (строки ~441-460)
  - **Исправить двойной контейнер**: в десктопной модалке (строка 487) убрать `<div className="liquid-glass p-6 ...">`, рендерить `chatPanelContent` напрямую вместо него
  - **Исправить скролл**: добавить `max-h` констрейнт на десктопную модалку (аналогично мобильной `max-h-[85vh]`)
  - **Принять isOpen/onClose пропсы**: заменить `const [isOpen, setIsOpen] = useState(false)` на `const { isOpen, onClose }: { isOpen: boolean; onClose: () => void }` из пропсов
  - Заменить все `setIsOpen(false)` на `onClose()`
  - **Удалить unreadCount**: удалить строку `const unreadCount = currentMessages.length` и все её использования (бейдж перенесён в RsvpBar)
  - Удалить неиспользуемые импорты (если появляются)

  **Must NOT do**:
  - Не менять содержимое чата (шапку, сообщения, инпут, контекстное меню)
  - Не менять SignalR хуки
  - Не менять мобильную bottom sheet (кроме удаления триггера)

  **Recommended Agent Profile**:
  - **Category**: `unspecified-high`
    - Reason: 4 взаимосвязанных изменения в одном файле, нужно аккуратно
  - **Skills**: `[]`

  **Parallelization**:
  - **Can Run In Parallel**: NO (depends on 3)
  - **Parallel Group**: Wave 2
  - **Blocks**: Task 8
  - **Blocked By**: Task 3

  **References**:
  - `InviteChat.tsx:52-53` — локальный useState для isOpen → заменить на пропсы
  - `InviteChat.tsx:406-436` — десктопный триггер (удалить)
  - `InviteChat.tsx:441-460` — мобильный триггер (удалить)
  - `InviteChat.tsx:478-491` — десктопная модалка (убрать double container)
  - `InviteChat.tsx:205-206` — chatPanelContent (убедиться что h-full + overflow-hidden работают)
  - `InviteChat.tsx:233-236` — messages area (flex-1 overflow-hidden > h-full overflow-y-auto)

  **Acceptance Criteria**:
  - [ ] Чат открывается/закрывается через пропсы isOpen/onClose (не внутренний стейт)
  - [ ] Десктопная модалка не имеет двойного liquid-glass контейнера
  - [ ] Десктопная модалка имеет max-h и скроллится
  - [ ] Нет плавающих кнопок чата (ни side tab, ни bubble)
  - [ ] unreadCount не используется в файле
  - [ ] Build проходит без ошибок типов

  **QA Scenarios**:
  ```
  Scenario: Chat panel scrolls on desktop
    Tool: Playwright
    Preconditions: Chat has 25+ messages
    Steps:
      1. page.goto('/invite/{token}')
      2. Open chat (via RSVP bar button if available, or page.evaluate)
      3. const panelHeight = page.locator('[class*="liquid-glass"]').boundingBox().height
      4. const vpHeight = page.viewportSize().height
    Expected Result: panelHeight <= vpHeight * 0.85 (fits in viewport)
    Evidence: .omo/evidence/task-7-chat-scrolls.png

  Scenario: No floating chat triggers
    Tool: Playwright
    Steps:
      1. page.goto('/invite/{token}')
      2. const sideTab = page.locator('button:has-text("Чат")')
      3. const floatingBtn = page.locator('[class*="fixed"][class*="bottom"][class*="right"]')
    Expected Result: No standalone chat trigger outside RSVP bar
    Evidence: .omo/evidence/task-7-no-floating-triggers.png

  Scenario: Single liquid-glass on desktop chat
    Tool: Playwright  
    Steps:
      1. Open chat
      2. count = page.evaluate(() => document.querySelectorAll('[class*="liquid-glass"]').length)
    Expected Result: Inside chat panel, only 1 or 2 liquid-glass (panel + context menu)
    Evidence: .omo/evidence/task-7-single-container.txt
  ```

  **Evidence to Capture**:
  - [ ] Скриншот открытого чата
  - [ ] Подтверждение размера панели

  **Commit**: YES
  - Message: `fix(invite): fix chat double container, scroll, remove triggers, accept props`
  - Files: `frontend/src/components/invite/InviteChat.tsx`

---

- [x] 8. InviteRsvpBar — добавить кнопку чата с бейджем

  **What to do**:
  - Принять пропс `onChatToggle: () => void`
  - Добавить `<MessageCircle>` иконку рядом с существующей `<Phone>` иконкой
  - Показать бейдж с количеством непрочитанных сообщений:
    - Читать `useChatStore((s) => s.messages['__event__']?.length ?? 0)`
    - Показывать красный кружок с числом, когда чат закрыт (нужен пропс `chatOpen?: boolean`)
    - Скрывать бейдж когда чат открыт
  - Импортировать `MessageCircle` из `lucide-react` и `useChatStore` из `@/lib/stores/chatStore`
  - Стиль кнопки: как у Phone (p-2 rounded-lg, hover-эффекты)

  **Must NOT do**:
  - Не менять RSVP логику (кнопки Да/Нет, мутации)
  - Не менять ContactSharingModal

  **Recommended Agent Profile**:
  - **Category**: `unspecified-high`
    - Reason: Работа с Zustand store + UI + пропсы
  - **Skills**: `[]`

  **Parallelization**:
  - **Can Run In Parallel**: NO
  - **Parallel Group**: Wave 2
  - **Blocks**: None
  - **Blocked By**: Task 3, Task 7 (лучше после 7 чтобы чат работал)

  **References**:
  - `InviteRsvpBar.tsx` — текущая структура, Phone кнопка как шаблон
  - `chatStore.ts` — Zustand store, messages['__event__']
  - `InviteChat.tsx:201` — текущая логика unreadCount = currentMessages.length

  **Acceptance Criteria**:
  - [ ] Кнопка чата (MessageCircle) отображается в RSVP баре
  - [ ] Бейдж с числом сообщений виден когда чат закрыт
  - [ ] Бейдж скрыт когда чат открыт
  - [ ] Нажатие на кнопку вызывает onChatToggle
  - [ ] Build проходит

  **QA Scenarios**:
  ```
  Scenario: Chat button visible in RSVP bar
    Tool: Playwright
    Steps:
      1. page.goto('/invite/{token}')
      2. const rsvpBar = page.locator('[class*="fixed"][class*="bottom"]')
      3. const chatBtn = rsvpBar.locator('button[title*="Чат"]')
    Expected Result: chatBtn exists and is visible
    Evidence: .omo/evidence/task-8-chat-button-in-rsvp.png

  Scenario: Chat button opens chat
    Tool: Playwright
    Steps:
      1. Click chat button in RSVP bar
      2. Wait for chat panel to appear
    Expected Result: Chat panel opens (message list visible or empty state)
    Evidence: .omo/evidence/task-8-chat-opens.png
  ```

  **Evidence to Capture**:
  - [ ] Скриншот RSVP бара с кнопкой чата
  - [ ] Скриншот открытого чата

  **Commit**: YES
  - Message: `feat(invite): add chat button to RSVP bar with unread badge`
  - Files: `frontend/src/components/invite/InviteRsvpBar.tsx`

---

- [x] 9. InviteGuests — переписать на вертикальную CSS сетку

  **What to do**:
  - **Удалить** всю @react-spring физику: useSprings, useSpring, animated.div, pointer handlers (handlePointerDown/Move/Up)
  - **Удалить** функции: computeGridLayout, useMediaQuery (можно заменить Tailwind responsive)
  - **Удалить** homePositionsRef, draggedGuestIdRef, isDraggingRef, hasMovedRef
  - **Сохранить**: логику фильтрации гостей (visibleGuests, attending), контактный поп-ап, "(ты)" индикатор, эмодзи, цвет статуса (Attending/NotAttending border)
  - **Переписать рендер** на CSS Grid:
    - Концепция: flex-wrap контейнер, "текущий гость" в центре с чуть большим размером
    - Для десктопа: `flex flex-wrap justify-center gap-3 sm:gap-4`
    - Для мобилы: уменьшить размер кружков
    - Если гостей много → flex-wrap автоматически переносит на следующую строку
    - `overflow-visible` — никакого обрезания
  - Удалить `overflow-hidden` с контейнера
  - Удалить из импортов: `useSprings`, `useSpring`, `animated` из `@react-spring/web`
  - Удалить `springParams` стейт (он только для debug)

  **Must NOT do**:
  - Сохранить contact popup (Phone/MessageCircle info при клике)
  - Сохранить "(ты)" label
  - Сохранить status-based coloring (Attending = зеленая, NotAttending = фиолетовая)
  - Сохранить contact indicator icon
  - НЕ удалять @react-spring из package.json
  - НЕ удалять импорт `motion` из framer-motion (используется для анимации появления)

  **Recommended Agent Profile**:
  - **Category**: `unspecified-high`
    - Reason: Переписывание компонента средней сложности
  - **Skills**: `[]`

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 2 (parallel with 7, 8)
  - **Blocks**: None
  - **Blocked By**: None

  **References**:
  - `InviteGuests.tsx` — весь файл, 442 строки
  - `InviteGuests.tsx:42-52` — пропсы и стейт
  - `InviteGuests.tsx:54-62` — visibleGuests, вычисления
  - `InviteGuests.tsx:66-72` — useSprings/centerSpring (удалить)
  - `InviteGuests.tsx:108-139` — ResizeObserver + меры (удалить)
  - `InviteGuests.tsx:157-259` — pointer handlers (удалить)
  - `InviteGuests.tsx:261-441` — JSX рендер (сохранить концепцию, переписать на flex)

  **Acceptance Criteria**:
  - [ ] Все гости видны, ничего не обрезано
  - [ ] "Текущий гость" в центре/особый
  - [ ] Контактный поп-ап работает при клике
  - [ ] Нет @react-spring кода (useSprings, animated)
  - [ ] Сетка переходит на новые строки при overflow
  - [ ] 0 errors в TypeScript build

  **QA Scenarios**:
  ```
  Scenario: All guests visible with 10+ attending
    Tool: Playwright
    Preconditions: Event with 10+ attending guests
    Steps:
      1. page.goto('/invite/{token}')
      2. const guestSection = page.locator('section:has(h2:has-text("Гости"))')
      3. const guestAvatars = guestSection.locator('[class*="rounded-full"]')
      4. const count = guestAvatars.count()
    Expected Result: count >= number of attending guests, no clipping (scroll if needed)
    Evidence: .omo/evidence/task-9-guests-visible.png

  Scenario: Current guest has special styling
    Tool: Visual inspection
    Steps:
      1. Find current guest (with "(ты)" label)
    Expected Result: "(ты)" label visible, guest is prominent
    Evidence: .omo/evidence/task-9-current-guest.png
  ```

  **Evidence to Capture**:
  - [ ] Скриншот секции гостей с 10+
  - [ ] Скриншот контактного поп-апа

  **Commit**: YES
  - Message: `refactor(invite): replace guest physics grid with vertical CSS grid`
  - Files: `frontend/src/components/invite/InviteGuests.tsx`

---

- [x] 10. InviteWishlist — единый заголовок + иконка

  **What to do**:
  - Заменить текущий h2 "Вишлист" на единый стиль
  - Добавить `<Gift size={28} className="text-brand-violet shrink-0" />` перед текстом

  **Must NOT do**:
  - Не менять subtitle "Нажми на товар..."

  **Recommended Agent Profile**:
  - **Category**: `quick`
    - Reason: Один заголовок
  - **Skills**: `[]`

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 2 (parallel with 7, 8, 9)
  - **Blocks**: None
  - **Blocked By**: Task 2 (wishlist уже почищен)

  **References**:
  - `InviteWishlist.tsx:178-180` — текущий h2

  **Acceptance Criteria**:
  - [ ] Gift иконка перед "Вишлист"
  - [ ] h2 использует font-bold

  **QA Scenarios**:
  ```
  Scenario: Wishlist header has icon
    Tool: Playwright
    Steps: Проверить h2 "Вишлист" содержит svg иконку Gift
    Expected Result: Иконка присутствует
    Evidence: .omo/evidence/task-10-wishlist-header.png
  ```

  **Evidence to Capture**:
  - [ ] Скриншот заголовка

  **Commit**: YES (group with 4)

---

## Final Verification Wave (MANDATORY — after ALL implementation tasks)

- [x] F1. **Plan Compliance Audit** — `oracle`
  Read the plan end-to-end. For each "Must Have": verify implementation exists (read file, curl endpoint, run command). For each "Must NOT Have": search codebase for forbidden patterns — reject with file:line if found. Check evidence files exist in .omo/evidence/. Compare deliverables against plan.
  Output: `Must Have [N/N] | Must NOT Have [N/N] | Tasks [N/N] | VERDICT: APPROVE/REJECT`

- [x] F2. **Code Quality Review** — `unspecified-high`
  Run `tsc --noEmit` + linter. Review all changed files for: `as any`/`@ts-ignore`, empty catches, console.log in prod, commented-out code, unused imports. Check AI slop: excessive comments, over-abstraction.
  Output: `Build [PASS/FAIL] | Lint [PASS/FAIL] | Files [N clean/N issues] | VERDICT`

- [x] F3. **Real Manual QA** — `unspecified-high` (+ `playwright` skill for UI)
  Execute EVERY QA scenario from EVERY task — follow exact steps, capture evidence. Test cross-task integration (chat → RSVP bar button → open/close). Test edge cases: 0 guests, 0 messages, 0 wishlist items. Save to `.omo/evidence/final-qa/`.
  Output: `Scenarios [N/N pass] | Integration [N/N] | Edge Cases [N tested] | VERDICT`

- [x] F4. **Scope Fidelity Check** — `deep`
  For each task: read "What to do", read actual diff (git log/diff). Verify 1:1 — everything in spec was built (no missing), nothing beyond spec was built (no creep). Check "Must NOT do" compliance.
  Output: `Tasks [N/N compliant] | Contamination [CLEAN/N issues] | Unaccounted [CLEAN/N files] | VERDICT`

---

## Commit Strategy

- **1**: `fix(invite): remove scroll hint text, add hero spacing` — `InviteHero.tsx`
- **2**: `feat(invite): remove progress bar and summary ring from wishlist` — `InviteWishlist.tsx`
- **3**: `refactor(invite): lift chat open state to InviteClientPage` — `InviteClientPage.tsx`
- **4-6, 10**: `style(invite): standardize section headers with icons` — `InviteActivityFeed.tsx`, `InviteDetails.tsx`, `InviteMap.tsx`, `InviteWishlist.tsx`
- **7**: `fix(invite): fix chat double container, scroll, remove triggers, accept props` — `InviteChat.tsx`
- **8**: `feat(invite): add chat button to RSVP bar with unread badge` — `InviteRsvpBar.tsx`
- **9**: `refactor(invite): replace guest physics grid with vertical CSS grid` — `InviteGuests.tsx`

---

## Success Criteria

### Verification Commands
```bash
cd frontend && npx tsc --noEmit  # TypeScript check
```

### Final Checklist
- [x] All "Must Have" present
- [x] All "Must NOT Have" absent
- [x] All 8 user requirements implemented
- [x] Build passes
- [x] All QA scenarios pass (F3)
