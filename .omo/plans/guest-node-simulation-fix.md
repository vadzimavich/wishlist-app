# Guest Node Simulation Fix — Переход на react-spring + pointer drag

## TL;DR

> **Quick Summary**: Заменить framer-motion drag и кастомную force-симуляцию (simulateTick, runSimulation) на pointer events + react-spring useSprings. Кружки перетягиваются плавно, SVG линии синхронизированы, при перетаскивании расступаются только ближайшие (по коллизии, не по edges), при отпускании — никакого перерасчета, равномерное радиальное расположение.
>
> **Deliverables**:
> - `InviteGuests.tsx` — полный переезд на новую систему
> - `package.json` — добавлен `@react-spring/web`
>
> **Estimated Effort**: Medium (1 component rewrite ~250-350 строк)
> **Parallel Execution**: YES — 2 waves
> **Critical Path**: Task 1 (зависимость) → Task 2, 3

---

## Context

### Original Request
"Симуляция нодов гостей на странице инвайта работает не так, как нужно — при перетягивании кружок гостя отрывается от точки узла и улетает. Также, при перетягивании не должны передвигаться связанные кружки, а только те, к которым мы приближаем кружок — они должны расступиться, чтобы избежать наложения. Также, при отпускании кружка возникает перерасчет сетки, в итоге кружки могут оказаться в совершенно других местах. Сделай так, чтобы все было плавно и бесшовно, чтобы кружки были распределены по секции равномерно и не отрывались от точек узлов"

### Interview Summary
**Key Discussions**:
- **Технический стек**: framer-motion (есть) + react-spring (добавить) — FM для entrance, RS для runtime физики
- **Разделение CSS-свойств**: FM → scale/opacity, RS → left/top (positioning)
- **Механизм коллизии**: target-based — на каждый pointer move вычисляем target-позиции всех нодов, передаем в api.start()
- **Debug слайдеры**: переделать с параметров симуляции на spring-параметры (tension, friction, mass, minDistance)
- **generateEdges**: исправить Math.random() → детерминированная генерация по ID
- **Guest count changes**: простой сброс с spring-анимацией (без симуляции)

### Metis Review
**Identified Gaps** (addressed):
- **GAP 1 — Collision push underspecified**: Решение — target-based подход. На каждый pointer move: вычислить target для dragged нода (позиция указателя), для остальных — естественная радиальная позиция + коллизионный сдвиг. Передать в api.start().
- **GAP 2 — generateEdges randomness**: Math.random() убран. Детерминированная генерация на основе порядкового индекса гостей (sorted by ID).
- **GAP 3 — Spring configs per node role**: Разные конфиги: dragged (tension: 350, friction: 25, immediate), passive push (tension: 150, friction: 18), center (tension: 80, friction: 28).
- **GAP 4 — FM + RS conflict**: FM контролирует scale/opacity, RS контролирует left/top. Никакого пересечения CSS-свойств.
- **GAP 5 — Guest count changes**: Simple re-init при изменении guests через SignalR. Springs плавно переходят на новые позиции.
- **GAP 6 — Pointer capture**: Явный setPointerCapture(event.pointerId) при onPointerDown.

---

## Work Objectives

### Core Objective
Replace framer-motion drag with pointer events + react-spring useSprings for collision-based push-apart dragging, eliminate full simulation re-run on dragEnd, and implement deterministic even radial initial layout — all in InviteGuests.tsx only (+ add @react-spring/web to package.json).

### Concrete Deliverables
1. `frontend/package.json` — добавлена зависимость `@react-spring/web`
2. `frontend/src/components/invite/InviteGuests.tsx` — полностью переработан компонент

### Definition of Done
- [ ] `npm run build` проходит без ошибок
- [ ] Все гости равномерно распределены по секции (радиально/спирально)
- [ ] При drag кружок не отрывается от SVG линии — линии следуют за кружком
- [ ] При drag расступаются только физически накладывающиеся кружки (не connected по edges)
- [ ] При отпускании никакого перерасчета — кружки остаются на месте
- [ ] Все входные анимации (framer-motion) работают
- [ ] Работает на touch-устройствах

### Must Have
- SVG линии синхронизированы с кружками в реальном времени (shared spring values)
- При drag dragged нод двигается мгновенно (immediate), соседи — плавно отодвигаются (spring)
- Никакого перерасчета симуляции при отпускании — только остановка pointer capture
- Равномерное радиальное расположение при инициализации
- Детерминированные ребра (без Math.random())
- setPointerCapture для надежного drag

### Must NOT Have (Guardrails)
- **Никакой force-симуляции** — simulateTick, runSimulation, buildNodesLinks удалены полностью
- **Никакого framer-motion drag** — drag prop не используется
- **Никакого пересечения FM/RS CSS-свойств**: FM → scale/opacity, RS → left/top
- **Никаких изменений** в других компонентах, API, store, типах

---

## Verification Strategy (MANDATORY)

> **ZERO HUMAN INTERVENTION** — ALL verification is agent-executed.

### Test Decision
- **Infrastructure exists**: NO
- **Automated tests**: None
- **Agent-Executed QA**: Playwright (browser) + Bash (build verification)

### QA Policy
Every task MUST include agent-executed QA scenarios.
Evidence saved to `.omo/evidence/task-{N}-{scenario-slug}.{ext}`.

- **Build verification**: Bash — `npm run build`, check for errors
- **Behavior verification**: Playwright — open invite page, interact with guests
- **Visual verification**: Playwright — assert SVG line positions, node positions
- **Touch verification**: Playwright — `page.touchscreen` for drag simulation

---

## Execution Strategy

### Parallel Execution Waves

```
Wave 1 (Foundation — sequential, 1 task):
├── Task 1: Install @react-spring/web, audit current InviteGuests.tsx [quick]

Wave 2 (Implementation — sequential within file edits, 4 tasks):
├── Task 2: Implement new drag + collision + positioning system [visual-engineering]
├── Task 3: Deterministic edges + radial layout + spring debug sliders [unspecified-high]
├── Task 4: Remove old simulation code, finalize component [unspecified-high] (strictly after Task 3)
└── Task F1: Final verification wave [parallel reviews]

Critical Path: Task 1 → Task 2 → Task 3 → Task 4 → F1
```

---

## TODOs

- [x] 1. **Install @react-spring/web**

  **What to do**:
  - Установить `@react-spring/web` в frontend: `npm install @react-spring/web`
  - Прочитать текущий `InviteGuests.tsx` от начала до конца, составить карту:
    - Какие функции/переменные относятся к симуляции (simulateTick, runSimulation, buildNodesLinks, OBSIDIAN_DEFAULTS) → будут удалены
    - Какие относятся к framer-motion drag (drag, dragElastic, dragConstraints, onDrag, onDragEnd) → будут заменены
    - Какие относятся к entrance анимациям (variants, containerVariants, nodeVariants) → остаются
    - Какие относятся к типам (SimNode, SimLink, Props) → Props остается, SimNode/SimLink удаляются
    - Какие относятся к отладке (Slider, params, showDebug) → params заменяются на springParams
  - Проверить типы GuestPublic (уже есть в `@/types`)

  **Must NOT do**:
  - Не устанавливать другие пакеты
  - Не изменять типы GuestPublic или другие файлы

  **Recommended Agent Profile**:
  - **Category**: `quick`
  - **Skills**: [] (простая установка пакета + чтение файла)

  **Parallelization**:
  - **Can Run In Parallel**: NO (блокирующая задача для всех остальных)
  - **Blocks**: Tasks 2, 3, 4

  **Acceptance Criteria**:
  - [ ] `@react-spring/web` в `package.json` dependencies
  - [ ] `npm install` проходит без ошибок
  - [ ] Составлена карта изменений (comment or note в коде)

  **QA Scenarios (MANDATORY)**:
  ```
  Scenario: Install verification
    Tool: Bash
    Preconditions: package.json не содержит @react-spring/web
    Steps:
      1. grep '"@react-spring/web"' frontend/package.json → должен найти
    Expected Result: Пакет присутствует в dependencies
    Evidence: .omo/evidence/task-1-install-verify.txt

  Scenario: Build passes
    Tool: Bash
    Preconditions: Пакет установлен
    Steps:
      1. cd frontend && npm run build
    Expected Result: Build successful, no errors
    Evidence: .omo/evidence/task-1-build-verify.txt
  ```

  **Commit**: YES
  - Message: `chore(deps): add @react-spring/web — guest drag physics`
  - Files: `frontend/package.json`, `frontend/package-lock.json`

- [x] 2. **Implement core drag system: pointer events + react-spring useSprings**

  **What to do**:
  - Заменить framer-motion `drag`/`onDrag`/`onDragEnd` на pointer events:
    1. Удалить `drag`, `dragElastic`, `dragConstraints` с `<motion.div>`
    2. Добавить `onPointerDown` на каждую гостевую ноду (орбитальные)
    3. Добавить `onPointerMove` и `onPointerUp` на контейнер (`graphRef`)
    4. В `onPointerDown`: записать `pointerId`, `draggedGuestId`, offset (`clientX - guestCenterX`), вызвать `setPointerCapture`
    5. В `onPointerMove`: вычислить новую позицию для dragged гостя (clamped to container bounds), обновить spring target c `immediate: true`
    6. Проверить коллизии со ВСЕМИ другими гостями (не только connected по edges):
       - Для каждого другого гостя: вычислить расстояние между центрами
       - Если расстояние < THRESHOLD (гость диаметр + отступ), вычислить push вектор
       - Push вектор = normalized direction × (THRESHOLD - distance) × 0.5
       - Применить push к target-позиции другого гостя (через api.start с spring-конфигом)
       - push magnitude уменьшается линейно от максимума при overlap до 0 на THRESHOLD
    7. В `onPointerUp`: отпустить pointer capture, ничего не пересчитывать
  - Реализовать react-spring useSprings:
    ```tsx
    import { useSprings, animated } from '@react-spring/web'

    const [springs, api] = useSprings(orbitCount, i => ({
      x: initialPositions[i].x,
      y: initialPositions[i].y,
      config: { tension: 170, friction: 26, mass: 1 }
    }))
    ```
  - Spring конфиги по ролям:
    - Dragged: `{ tension: 400, friction: 28, mass: 0.8 }` + `immediate: true` на каждом move
    - Passive push: `{ tension: 150, friction: 18, mass: 1.2 }` — мягкий отскок
    - Center guest: `{ tension: 80, friction: 28, mass: 2 }` — плавный возврат к центру
  - Центральный гость (current user) — свой отдельный `useSpring`:
    - Всегда target `(cx, cy)` с gentle конфигом
    - animated.div для позиционирования
  - Каждый орбитальный гость — `<animated.div>` вместо `<motion.div>`:
    ```tsx
    <animated.div
      style={{
        position: 'absolute',
        left: spring.x.to(x => `${x - 27}px`),
        top: spring.y.to(y => `${y - 27}px`),
        touchAction: 'none',
      }}
      onPointerDown={handlePointerDown(guest.id)}
      // ...content
    />
    ```
  - ВАЖНО: Каждый гость ОБЕРНУТ в framer-motion `<motion.div>` только для entrance (scale/opacity):
    ```tsx
    <motion.div variants={nodeVariants} className="absolute" style={{ pointerEvents: 'none' }}>
      <animated.div style={positionSpring} onPointerDown={handlePointerDown}>
        {/* content */}
      </animated.div>
    </motion.div>
    ```
  - SVG линии — `animated.line`:
    ```tsx
    {edges.map(([aId, bId], i) => {
      const aSpring = idToSpring(aId)
      const bSpring = idToSpring(bId)
      return (
        <animated.line
          x1={aSpring.x} y1={aSpring.y}
          x2={bSpring.x} y2={bSpring.y}
          stroke="..." strokeWidth={1.2}
        />
      )
    })}
    ```

  **Must NOT do**:
  - Не использовать framer-motion `drag` prop
  - Не запускать force-симуляцию
  - Не трогать entrance анимации (variants, containerVariants, nodeVariants)
  - Не удалять center guest

  **Recommended Agent Profile**:
  - **Category**: `visual-engineering`
  - **Skills**: [`/frontend-ui-ux`] — нужен точный контроль над UI + drag physics
  - **Skills Evaluated but Omitted**:
    - `typescript-programmer`: не нужен — код TypeScript, но не сложная логика
    - `git-master`: не нужен — без коммитов на этом этапе

  **Parallelization**:
  - **Can Run In Parallel**: NO (зависит от Task 1)
  - **Blocked By**: Task 1
  - **Blocks**: Task 3, 4

  **References**:
  - `InviteGuests.tsx:248-307` — текущий drag код, который заменяем
  - `InviteGuests.tsx:356-416` — текущий рендер с framer-motion drag
  - `InviteGuests.tsx:62-142` — simulateTick/runSimulation (будет удалено в Task 4)
  - react-spring docs: `https://react-spring.io/docs/hooks/use-springs` — useSprings API
  - react-spring animated SVG: `https://react-spring.io/docs/concepts/animations` — animated.line

  **Acceptance Criteria**:
  - [ ] `npm run build` проходит
  - [ ] При drag кружок следует за указателем без задержки
  - [ ] SVG линии следуют за кружками (shared spring values)
  - [ ] При drag расступаются только физически накладывающиеся кружки (collision push)
  - [ ] SConnected по edges кружки НЕ двигаются при drag
  - [ ] setPointerCapture обеспечивает drag за пределами элемента
  - [ ] Drag работает на touch (через pointer events)

  **QA Scenarios (MANDATORY)**:
  ```
  Scenario: Drag follows pointer — SVG lines synced
    Tool: Playwright
    Preconditions: Invite page loaded with 5+ guests
    Steps:
      1. Get initial positions of guest circle and SVG line endpoints for that guest
      2. page.mouse.move(guestX, guestY)
      3. page.mouse.down()
      4. page.mouse.move(guestX + 100, guestY + 50, { steps: 10 })
      5. While dragging, read guest circle position (boundingRect) and SVG line x1/y1 attributes
    Expected Result: SVG line endpoints match circle center within 2px throughout drag
    Evidence: .omo/evidence/task-2-drag-line-sync.mp4 (screencast)

  Scenario: Collision push — nearby circles move away, edge-connected stay
    Tool: Playwright
    Preconditions: Invite page with 3+ guests (guest A, B, C). A-B are edge-connected. C is near A
    Steps:
      1. Record positions of B and C
      2. Drag A toward C (collision zone)
      3. Record positions after drag
    Expected Result: C moved away (pushed); B did not move (edge-connected but not overlapping)
    Evidence: .omo/evidence/task-2-collision-push.txt (position deltas)

  Scenario: No jump on release
    Tool: Playwright
    Preconditions: Invite page with guests
    Steps:
      1. Record all guest positions
      2. Drag a guest and release
      3. Measure positions 100ms after release
    Expected Result: Delta from last drag position < 5px for all guests
    Evidence: .omo/evidence/task-2-no-jump.txt

  Scenario: Touch drag
    Tool: Playwright
    Preconditions: Invite page with guests, mobile viewport
    Steps:
      1. page.touchscreen.tap(guestX, guestY)
      2. page.touchscreen.move(guestX + 80, guestY + 40)
      3. page.touchscreen.release()
    Expected Result: Guest moved to new position, SVG lines follow
    Evidence: .omo/evidence/task-2-touch-drag.txt
  ```

  **Commit**: NO (groups with Task 3-4)

- [x] 3. **Deterministic edges + radial layout + spring debug sliders**

  **What to do**:
  - **Radial layout (заменяет force simulation для начальной расстановки)**:
    ```tsx
    function computeRadialLayout(
      count: number, cx: number, cy: number,
      containerW: number, containerH: number
    ): { x: number; y: number }[] {
      const margin = 50
      const availableRadius = Math.min(containerW, containerH) / 2 - margin
      const radius = Math.max(60, Math.min(availableRadius, 50 + count * 8))
      // Single ring if < 12 guests, multi-ring spiral if more
      if (count <= 1) return [{ x: cx, y: cy }]
      if (count <= 12) {
        return Array.from({ length: count }, (_, i) => {
          const angle = (i / count) * Math.PI * 2 - Math.PI / 2
          return { x: cx + Math.cos(angle) * radius, y: cy + Math.sin(angle) * radius }
        })
      }
      // Spiral layout for 12+ guests
      return Array.from({ length: count }, (_, i) => {
        const t = i / count
        const angle = t * Math.PI * 4 - Math.PI / 2  // 2 full rotations
        const r = radius * (0.6 + t * 0.4)  // inner to outer
        return { x: cx + Math.cos(angle) * r, y: cy + Math.sin(angle) * r }
      })
    }
    ```
  - **Определение: guest diameter = 54px** (как в current code), **THRESHOLD = 70px** (диаметр + padding)
  - **generateEdges — детерминированная версия**:
    - Убрать `Math.random()` полностью
    - Сортировать гостей по ID (алфавитно)
    - Каждый гость соединяется с 1-2 следующими по порядку (с циклическим замыканием)
    - Центральный гость соединяется с первыми 3-4 гостями
    - Алгоритм:
      ```tsx
      function generateEdges(ids: string[], centerId?: string): [string, string][] {
        const sorted = [...ids].sort()
        const result: [string, string][] = []
        // Каждый соединяется со следующим и через один
        for (let i = 0; i < sorted.length; i++) {
          const next = (i + 1) % sorted.length
          const skip = (i + 2) % sorted.length
          if (next !== i) result.push([sorted[i], sorted[next]])
          if (sorted.length > 6 && skip !== i && skip !== next) result.push([sorted[i], sorted[skip]])
        }
        // Центральный гость соединяется с первыми N
        if (centerId) {
          for (let i = 0; i < Math.min(4, sorted.length); i++) {
            result.push([centerId, sorted[i]])
          }
        }
        return result
      }
      ```
  - **Дебаг слайдеры → spring параметры**:
    - Размер: tension (min=40, max=400, step=10), friction (min=8, max=40, step=1), mass (min=0.5, max=5, step=0.1), minDistance (min=50, max=150, step=5)
    - Применяются к конфигу useSprings через api.start
    - Удалить старые: centerStrength, repelStrength, linkStrength, linkDistance, alphaDecay, velocityDecay, distanceMin
    - Удалить SimNode, SimLink, OBSIDIAN_DEFAULTS типы

  **Must NOT do**:
  - Не добавлять заново force-симуляцию
  - Не оставлять Math.random() в generateEdges
  - Не удалять debug панель — только заменить содержимое слайдеров

  **Recommended Agent Profile**:
  - **Category**: `unspecified-high`
  - **Skills**: [] — чисто алгоритмическая работа, без UI/визуальных требований

  **Parallelization**:
  - **Can Run In Parallel**: NO — Tasks 3 и 4 оба модифицируют одни и те же части InviteGuests.tsx (SimNode, SimLink, OBSIDIAN_DEFAULTS). Запускать строго последовательно: Task 3 → Task 4.
  - **Parallel Group**: Wave 2 (последовательно с Task 4)
  - **Blocked By**: Task 2

  **References**:
  - `InviteGuests.tsx:36-60` — текущий generateEdges (заменяем)
  - `InviteGuests.tsx:198-223` — текущий buildAndRun (заменяем на computeRadialLayout)
  - `InviteGuests.tsx:25-34` — SimNode, SimLink, OBSIDIAN_DEFAULTS (удаляем)
  - `InviteGuests.tsx:309-319` — текущий Slider компонент (переиспользуем)

  **Acceptance Criteria**:
  - [ ] Начальное расположение гостей — равномерное радиальное/спиральное
  - [ ] generateEdges возвращает одинаковые ребра при одинаковых входных данных (нет Math.random())
  - [ ] Debug слайдеры контролируют tension, friction, mass, minDistance
  - [ ] Изменение spring параметров через слайдеры влияет на анимацию

  **QA Scenarios (MANDATORY)**:
  ```
  Scenario: Radial layout even distribution
    Tool: Playwright
    Preconditions: Invite page loaded with 8 guests
    Steps:
      1. Select all guest circles
      2. Compute angles from center for each guest
      3. Sort angles and compute differences
    Expected Result: Angular differences are within 15% of each other (even distribution)
    Evidence: .omo/evidence/task-3-radial-distribution.txt

  Scenario: Deterministic edges
    Tool: Playwright
    Preconditions: Invite page with guests
    Steps:
      1. Reload page 3 times
      2. Each time, collect all SVG line endpoint pairs
    Expected Result: Identical edge set across all 3 reloads
    Evidence: .omo/evidence/task-3-deterministic-edges.txt

  Scenario: Debug sliders affect physics
    Tool: Playwright
    Preconditions: Invite page with debug panel open
    Steps:
      1. Set tension slider to minimum (40)
      2. Drag a guest and release
      3. Observe return-to-rest behavior
      4. Set tension to maximum (400)
      5. Repeat drag
    Expected Result: Low tension → slow return, High tension → snappy return
    Evidence: .omo/evidence/task-3-spring-sliders.txt
  ```

  **Commit**: NO (groups with Task 4)

- [x] 4. **Remove old simulation code, cleanup, и финальная интеграция**

  **What to do**:
  - Удалить (или закомментировать с пометкой REMOVED) следующие функции:
    - `simulateTick()` — полностью (заменено на react-spring physics)
    - `runSimulation()` — полностью (заменено на target-based collision + spring)
    - `buildNodesLinks()` — полностью (заменено на computeRadialLayout)
    - `interface SimNode` — удалить
    - `interface SimLink` — удалить
    - `OBSIDIAN_DEFAULTS` — удалить
    - `buildAndRun` useCallback — удалить
    - `handleDrag` useCallback — удалить (заменено на pointer events)
    - `handleDragEnd` useCallback — удалить (больше не нужен)
    - `params` state — удалить (заменено на springParams)
    - `edges`, `allIds`, `orbitIds`, `centerGuest`, `orbitingGuests` memo — проверить, нужны ли. edges остается, остальное вероятно да
  - Обновить `useEffect` для начального позиционирования:
    - Убрать вызов `buildAndRun`
    - Вместо этого: измерить контейнер, вычислить `computeRadialLayout`, установить `useSprings` targets
  - Оставить `ResizeObserver` — на ресайз пересчитать layout и обновить spring targets (api.start с плавной анимацией к новым позициям)
  - Итоговая структура компонента:
    1. Props + состояние (guests, currentGuestId, positions, springParams, draggedGuestId ref, pointerOffset ref)
    2. useMemo: visibleGuests, attending, orbitingGuests, centerGuest, allIds, edges (с новой generateEdges)
    3. computeRadialLayout функция
    4. useSprings для орбитальных гостей
    5. useSpring для центрального гостя
    6. useEffect: измерение контейнера → инициализация spring targets
    7. useEffect: ResizeObserver
    8. handlePointerDown / handlePointerMove / handlePointerUp
    9. collisionPush функция (вызывается из handlePointerMove)
    10. Рендер: framer-motion entrance wrapper → animated.div для позиций → animated.line для SVG
    11. Debug UI: spring sliders
  - Убедиться, что framer-motion entrance анимации (variants, containerVariants, nodeVariants) ОСТАЛИСЬ нетронутыми
    - containerVariants, nodeVariants — остаются
    - `<motion.div variants={containerVariants}>` — остается
    - `<motion.div variants={nodeVariants}>` — остается (как обертка)

  **Must NOT do**:
  - Не удалять entrance анимации framer-motion
  - Не сломать Slider компонент (переиспользуется для spring слайдеров)
  - Не удалять Props интерфейс

  **Recommended Agent Profile**:
  - **Category**: `unspecified-high`
  - **Skills**: [] — cleanup + integration

  **Parallelization**:
  - **Can Run In Parallel**: NO — Tasks 3 и 4 оба модифицируют одни и те же части InviteGuests.tsx (SimNode, SimLink, OBSIDIAN_DEFAULTS). Запускать строго последовательно: Task 3 → Task 4.
  - **Parallel Group**: Wave 2 (последовательно с Task 3)
  - **Blocked By**: Tasks 1, 2, 3

  **Acceptance Criteria**:
  - [ ] `npm run build` проходит
  - [ ] simulateTick, runSimulation, buildNodesLinks, SimNode, SimLink, OBSIDIAN_DEFAULTS удалены
  - [ ] handleDrag, handleDragEnd, buildAndRun, params state удалены
  - [ ] Компонент работает: drag, collision push, radial layout, spring анимации
  - [ ] Entrance анимации framer-motion работают (scale 0→1, opacity 0→1, stagger)
  - [ ] ResizeObserver плавно пересчитывает позиции при изменении размера окна

  **QA Scenarios (MANDATORY)**:
  ```
  Scenario: No old simulation code
    Tool: Bash
    Preconditions: After cleanup
    Steps:
      1. grep -n "simulateTick\|runSimulation\|buildNodesLinks\|SimNode\|SimLink\|OBSIDIAN_DEFAULTS" frontend/src/components/invite/InviteGuests.tsx
    Expected Result: No matches found
    Evidence: .omo/evidence/task-4-cleanup.txt

  Scenario: Entrance animations still work
    Tool: Playwright
    Preconditions: Fresh page load
    Steps:
      1. Navigate to invite/[token]
      2. Observe guest circles on mount
    Expected Result: Circles animate in (scale 0→1, opacity 0→1) with stagger delay
    Evidence: .omo/evidence/task-4-entrance-anim.mp4

  Scenario: Full build passes
    Tool: Bash
    Preconditions: All changes made
    Steps:
      1. cd frontend && npm run build
    Expected Result: Build successful, no errors or warnings
    Evidence: .omo/evidence/task-4-build.txt
  ```

  **Commit**: YES (с Task 3)
  - Message: `feat(invite): rewrite guest node drag with react-spring + pointer events`
  - Files: `frontend/src/components/invite/InviteGuests.tsx`
  - Pre-commit: `cd frontend && npm run build`

---

## Final Verification Wave (MANDATORY — after ALL implementation tasks)

> 4 review agents run in PARALLEL. ALL must APPROVE. Present consolidated results to user and get explicit "okay" before completing.
>
> **Do NOT auto-proceed after verification. Wait for user's explicit approval before marking work complete.**

- [x] F1. **Plan Compliance Audit** — `oracle`
  Read the plan end-to-end. For each "Must Have": verify implementation exists (read file, run build). For each "Must NOT Have": grep InviteGuests.tsx for forbidden patterns (simulateTick, runSimulation, drag prop, Math.random in generateEdges). Check evidence files exist in .omo/evidence/. Compare deliverables against plan.
  Output: `Must Have [N/N] | Must NOT Have [N/N] | Tasks [N/N] | VERDICT: APPROVE/REJECT`

- [x] F2. **Code Quality Review** — `unspecified-high`
  Run `npm run build` + linter. Review changed InviteGuests.tsx for: `as any`, `@ts-ignore`, empty catches, `console.log` in prod, commented-out code, unused imports, over-abstraction, generic names.
  Output: `Build [PASS/FAIL] | Lint [PASS/FAIL] | Files [N clean/N issues] | VERDICT`

- [x] F3. **Real Manual QA** — `unspecified-high` (+ `playwright` skill)
  Start from clean page load. Execute EVERY QA scenario from ALL tasks — follow exact steps, capture evidence. Test cross-task integration: drag + collision + SVG sync + entrance animation + no-jump-on-release. Save to `.omo/evidence/final-qa/`.
  Output: `Scenarios [N/N pass] | Integration [N/N] | VERDICT`

- [x] F4. **Scope Fidelity Check** — `deep`
  For each task: read "What to do", read actual diff (git diff). Verify 1:1 — everything in spec was built (no missing), nothing beyond spec was built (no creep). Check "Must NOT do" compliance. Flag unaccounted changes.
  Output: `Tasks [N/N compliant] | Contamination [CLEAN/N issues] | VERDICT`

---

## Commit Strategy

- **1**: `chore(deps): add @react-spring/web — guest drag physics`
  - `package.json`, `package-lock.json`
- **2-4**: `feat(invite): rewrite guest node drag with react-spring + pointer events`
  - `frontend/src/components/invite/InviteGuests.tsx`

---

## Success Criteria

### Verification Commands
```bash
cd frontend && npm run build  # Expected: Build successful, no errors
```

### Final Checklist
- [ ] `npm run build` passes
- [ ] All guests evenly distributed radially
- [ ] SVG lines follow circles during drag
- [ ] Collision push moves nearby (overlapping) nodes, not edge-connected
- [ ] No position jump on drag end (delta < 5px)
- [ ] Entrance animations (framer-motion) still play
- [ ] Touch drag works
- [ ] 0 guests → empty state; 1 guest → center only
- [ ] Debug sliders control spring params
- [ ] Edges are deterministic across reloads
