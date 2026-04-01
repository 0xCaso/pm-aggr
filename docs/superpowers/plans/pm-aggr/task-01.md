# Task 1: Project Scaffolding

**Files:**
- Create: `tsconfig.json`
- Create: `next.config.ts`
- Create: `postcss.config.mjs`
- Create: `vitest.config.ts`
- Create: `.gitignore`
- Create: `src/app/globals.css`
- Create: `src/app/layout.tsx`
- Create: `src/app/page.tsx`
- Modify: `package.json` (add scripts)

**Prerequisites:** `npm install` already done — `next`, `react`, `react-dom`, `ws`, `typescript`, `@types/*`, `tailwindcss`, `@tailwindcss/postcss`, `vitest`, `tsx` are all installed.

---

- [ ] **Step 1: Create `.gitignore`**

```
node_modules/
.next/
.DS_Store
*.tsbuildinfo
```

- [ ] **Step 2: Create `tsconfig.json`**

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "lib": ["dom", "dom.iterable", "ES2022"],
    "allowJs": true,
    "skipLibCheck": true,
    "strict": true,
    "noEmit": true,
    "esModuleInterop": true,
    "module": "bundler",
    "moduleResolution": "bundler",
    "resolveJsonModule": true,
    "isolatedModules": true,
    "jsx": "preserve",
    "incremental": true,
    "plugins": [{ "name": "next" }],
    "paths": {
      "@/*": ["./src/*"]
    }
  },
  "include": ["next-env.d.ts", "**/*.ts", "**/*.tsx", ".next/types/**/*.ts"],
  "exclude": ["node_modules"]
}
```

- [ ] **Step 3: Create `next.config.ts`**

```typescript
import type { NextConfig } from 'next';

const nextConfig: NextConfig = {};

export default nextConfig;
```

- [ ] **Step 4: Create `postcss.config.mjs`**

```javascript
/** @type {import('postcss-load-config').Config} */
const config = {
  plugins: {
    '@tailwindcss/postcss': {},
  },
};

export default config;
```

- [ ] **Step 5: Create `vitest.config.ts`**

```typescript
import { defineConfig } from 'vitest/config';
import path from 'path';

export default defineConfig({
  test: {
    globals: true,
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
});
```

- [ ] **Step 6: Create `src/app/globals.css`**

```css
@import "tailwindcss";
```

- [ ] **Step 7: Create `src/app/layout.tsx`**

```tsx
import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'PM Aggregator',
  description: 'Prediction market order book aggregator',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="bg-gray-950 text-gray-100 min-h-screen">
        {children}
      </body>
    </html>
  );
}
```

- [ ] **Step 8: Create `src/app/page.tsx` (placeholder)**

```tsx
export default function Home() {
  return (
    <main className="p-8">
      <h1 className="text-2xl font-bold">PM Aggregator</h1>
      <p className="text-gray-400 mt-2">Coming soon...</p>
    </main>
  );
}
```

- [ ] **Step 9: Update `package.json` scripts**

Replace the `"scripts"` section with:

```json
{
  "scripts": {
    "dev": "tsx server.ts",
    "build": "next build",
    "start": "NODE_ENV=production tsx server.ts",
    "test": "vitest run"
  }
}
```

- [ ] **Step 10: Verify build succeeds**

Run: `npx next build`

Expected: Build completes with no errors. Output includes "Route (app)" showing `/` route.

- [ ] **Step 11: Commit**

```bash
git add .gitignore tsconfig.json next.config.ts postcss.config.mjs vitest.config.ts src/app/ package.json
git commit -m "feat: scaffold Next.js project with TypeScript, Tailwind, Vitest"
```
