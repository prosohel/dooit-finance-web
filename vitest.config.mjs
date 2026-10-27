import { defineConfig } from 'vitest/config'

// Only the pure-logic modules are tested here — no DOM, no React.
export default defineConfig({
  // Vite auto-loads the project's postcss.config.mjs (Tailwind v4's
  // @tailwindcss/postcss) at startup even though these tests never touch
  // CSS. That plugin isn't shaped the way plain PostCSS expects, which
  // crashes Vite before a single test runs. None of these modules import
  // CSS, so short-circuit with an empty PostCSS config instead.
  css: {
    postcss: { plugins: [] },
  },
  test: {
    environment: 'node',
    include: ['views/**/__tests__/**/*.test.js', 'lib/**/__tests__/**/*.test.js'],
  },
})
