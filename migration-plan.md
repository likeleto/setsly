# Migration to shadcn/ui — Workout Tracker

## Status: ✅ COMPLETED

## Summary
Successfully migrated the workout-tracker app from custom CSS to Tailwind CSS v4 + shadcn/ui.

## What was done

### 1. Dependencies installed
- `@tailwindcss/vite`, `tailwindcss` (v4)
- `clsx`, `tailwind-merge`, `class-variance-authority`
- `shadcn/ui` components: button, card, input, switch, table, badge, dialog, tooltip
- `@fontsource-variable/geist` (typography — установлен, но не подключён, см. «Расхождения»)

### 2. Configuration
- `vite.config.ts` — added `@tailwindcss/vite` plugin + path aliases
- `tsconfig.json` — added `@/*`, `@/components/*`, `@/ui/*`, `@/lib/*` aliases
- `src/styles/global.css` — Tailwind v4 theme with shadcn dark theme variables
- `index.html` — added `dark` class to body
- `src/main.tsx` — wrapped app with `TooltipProvider`

### 3. shadcn components added
- `src/components/ui/button.tsx` — with added `success` variant
- `src/components/ui/card.tsx`
- `src/components/ui/input.tsx`
- `src/components/ui/switch.tsx`
- `src/components/ui/table.tsx`
- `src/components/ui/badge.tsx`
- `src/components/ui/dialog.tsx`
- `src/components/ui/tooltip.tsx`

### 4. Shared components extracted
- `src/components/ExerciseCard.tsx` — exercise grid cards
- `src/components/ApproachRow.tsx` — approach input rows
- `src/components/WorkoutAccordion.tsx` — expandable workout items

### 5. Pages migrated
- `src/pages/MainScreen.tsx` — uses Button, Card, ExerciseCard
- `src/pages/InputScreen.tsx` — uses Button, Input, Switch, ApproachRow
- `src/pages/HistoryScreen.tsx` — uses Button, WorkoutAccordion

### 6. Bugs fixed during migration
- P0-3: Double-click protection on save button (isSaving state)
- P1-4: `alert()` replaced with inline validation errors
- P1-6: State reset after save
- P2-8: Shared components extracted

## Running the app
```bash
cd workout-tracker
npm run dev    # Development server
npm run build  # Production build
```

---

## Расхождения после миграции (сверено с кодом 2026-11-12)

Миграция выполнена, но часть заявленного не доведена до конца:

- `@fontsource-variable/geist` установлен, но нигде не импортируется — фактически используется
  системный стек шрифтов из `global.css`.
- `tw-animate-css` установлен, но не импортирован в `global.css`, хотя классы `animate-in` /
  `animate-out` используются в `tooltip.tsx` и `dialog.tsx` — анимации не применяются.
- `src/components/ui/table.tsx` и `src/components/ui/dialog.tsx` добавлены, но не используются.
- `cn` берётся из стороннего пакета `cn`, а не из `clsx` + `tailwind-merge` (стандарт shadcn).
- `clsx`, `tailwind-merge`, `lucide-react` не импортируются в коде приложения.

Задачи по устранению — в `fix-plan.md` (P1-10, P1-11, P1-12, P2-14).
