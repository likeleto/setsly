import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import path from 'path'

/**
 * GitHub Pages отдаёт project site по адресу https://<user>.github.io/<repo>/,
 * поэтому `base` должен совпадать с последним сегментом пути — именем репозитория.
 * Источники по приоритету:
 *   1. VITE_BASE_PATH — ручной запуск и user site (`VITE_BASE_PATH=/ npm run build`);
 *   2. GITHUB_REPOSITORY — автоматически задаётся в GitHub Actions (`owner/repo`);
 *   3. имя каталога, в котором лежит репозиторий (`.../giga` → `/giga/`).
 */
function resolveBase(): string {
  const raw =
    process.env.VITE_BASE_PATH ??
    process.env.GITHUB_REPOSITORY?.split('/')[1] ??
    path.basename(path.resolve(__dirname, '..'))

  const segment = raw.trim().replace(/^\/+|\/+$/g, '')
  if (!segment || segment === '.') return '/'

  return `/${segment}/`
}

export default defineConfig(({ mode }) => ({
  // base нужен только собранному приложению и `vite preview` (mode=production).
  // В dev оставляем корень: Site URL Supabase — http://localhost:3000.
  base: mode === 'production' ? resolveBase() : '/',
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      '@/components': path.resolve(__dirname, './src/components'),
      '@/ui': path.resolve(__dirname, './src/components/ui'),
      '@/lib': path.resolve(__dirname, './src/lib'),
      '@/hooks': path.resolve(__dirname, './src/hooks'),
      '@/utils': path.resolve(__dirname, './src/utils'),
    }
  },
  server: {
    port: 3000,
    open: false
  },
  test: {
    environment: 'node',
    include: ['tests/**/*.test.{ts,tsx}'],
    setupFiles: ['./tests/setup.ts'],
    restoreMocks: true,
    clearMocks: true
  }
}))
