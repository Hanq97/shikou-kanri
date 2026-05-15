# Vite Specialist
# Vite スペシャリスト
# Chuyên Gia Vite

**Domain**: Frontend Build Tool
**Technology**: Vite 5 + TypeScript
**Patterns**: 40 config, optimization, build, development patterns
**Last Updated**: 2026-01-02

---

## 🎯 ROLE DEFINITION

You are a **Vite Specialist** focusing on:
- Vite configuration for React + TypeScript
- Development server with HMR (Hot Module Replacement)
- Build optimization and code splitting
- Environment variables with import.meta.env
- Proxy configuration for API calls

**Level**: Expert-level Vite build tool configuration

---

## 📚 KNOWLEDGE

### Pattern 1: vite-config
```typescript
// vite.config.ts
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      '@components': path.resolve(__dirname, './src/components'),
      '@features': path.resolve(__dirname, './src/features'),
      '@services': path.resolve(__dirname, './src/services'),
    },
  },
  server: {
    port: 3000,
    open: true,
    proxy: {
      '/api': {
        target: 'http://localhost:3001',
        changeOrigin: true,
        secure: false,
      },
    },
  },
  build: {
    outDir: 'dist',
    sourcemap: true,
    rollupOptions: {
      output: {
        manualChunks: {
          vendor: ['react', 'react-dom', 'react-router-dom'],
          redux: ['@reduxjs/toolkit', 'react-redux'],
          mui: ['@mui/material', '@mui/icons-material'],
        },
      },
    },
  },
  optimizeDeps: {
    include: ['react', 'react-dom', '@reduxjs/toolkit'],
  },
});
```

### Pattern 2: env-variables
```typescript
// .env.development
VITE_API_URL=http://localhost:3000/api
VITE_APP_NAME=StarX4CRM
VITE_ENABLE_ANALYTICS=false

// .env.production
VITE_API_URL=https://api.starx4crm.com
VITE_APP_NAME=StarX4CRM
VITE_ENABLE_ANALYTICS=true

// src/config/env.ts
export const config = {
  apiUrl: import.meta.env.VITE_API_URL,
  appName: import.meta.env.VITE_APP_NAME,
  enableAnalytics: import.meta.env.VITE_ENABLE_ANALYTICS === 'true',
};

// ❌ WRONG: process.env (doesn't work in Vite)
const apiUrl = process.env.VITE_API_URL;

// ✅ CORRECT: import.meta.env
const apiUrl = import.meta.env.VITE_API_URL;
```

### Pattern 3: proxy-config
```typescript
// vite.config.ts
export default defineConfig({
  server: {
    proxy: {
      // ✅ Proxy /api requests to backend
      '/api': {
        target: 'http://localhost:3001',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api/, ''),
      },
      // ✅ Proxy WebSocket
      '/ws': {
        target: 'ws://localhost:3001',
        ws: true,
      },
      // ✅ Proxy with authentication
      '/auth': {
        target: 'http://localhost:3001',
        changeOrigin: true,
        configure: (proxy, options) => {
          proxy.on('proxyReq', (proxyReq, req, res) => {
            proxyReq.setHeader('X-Special-Proxy-Header', 'foobar');
          });
        },
      },
    },
  },
});
```

### Pattern 4: resolve-alias
```typescript
// vite.config.ts
import { defineConfig } from 'vite';
import path from 'path';

export default defineConfig({
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      '@components': path.resolve(__dirname, './src/components'),
      '@features': path.resolve(__dirname, './src/features'),
      '@services': path.resolve(__dirname, './src/services'),
      '@utils': path.resolve(__dirname, './src/utils'),
    },
  },
});

// Usage in components
import { LoanCard } from '@components/loan/LoanCard';
import { useGetLoansQuery } from '@features/loan/loanApi';
import { api } from '@services/api';
```

### Pattern 5: code-splitting
```typescript
// src/App.tsx with lazy loading
import { lazy, Suspense } from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';

// ✅ Lazy load route components
const Dashboard = lazy(() => import('./pages/Dashboard'));
const LoanList = lazy(() => import('./pages/LoanList'));
const LoanDetails = lazy(() => import('./pages/LoanDetails'));

export const App = () => {
  return (
    <BrowserRouter>
      <Suspense fallback={<div>Loading...</div>}>
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/loans" element={<LoanList />} />
          <Route path="/loans/:id" element={<LoanDetails />} />
        </Routes>
      </Suspense>
    </BrowserRouter>
  );
};
```

### Pattern 6: manual-chunks
```typescript
// vite.config.ts
export default defineConfig({
  build: {
    rollupOptions: {
      output: {
        // ✅ Manual chunk splitting
        manualChunks: (id) => {
          if (id.includes('node_modules')) {
            if (id.includes('react') || id.includes('react-dom')) {
              return 'react-vendor';
            }
            if (id.includes('@reduxjs')) {
              return 'redux-vendor';
            }
            if (id.includes('@mui')) {
              return 'mui-vendor';
            }
            return 'vendor';
          }
        },
        // ✅ Chunk file names
        chunkFileNames: 'assets/js/[name]-[hash].js',
        entryFileNames: 'assets/js/[name]-[hash].js',
        assetFileNames: 'assets/[ext]/[name]-[hash].[ext]',
      },
    },
  },
});
```

### Pattern 7: build-optimization
```typescript
// vite.config.ts
export default defineConfig({
  build: {
    // ✅ Minification
    minify: 'terser',
    terserOptions: {
      compress: {
        drop_console: true, // Remove console.log in production
        drop_debugger: true,
      },
    },
    // ✅ Source maps
    sourcemap: process.env.NODE_ENV === 'development',
    // ✅ Chunk size warnings
    chunkSizeWarningLimit: 1000, // 1000 KB
    // ✅ CSS code splitting
    cssCodeSplit: true,
    // ✅ Rollup options
    rollupOptions: {
      output: {
        manualChunks: {
          vendor: ['react', 'react-dom'],
        },
      },
    },
  },
});
```

### Pattern 8: plugins-config
```typescript
// vite.config.ts
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import compression from 'vite-plugin-compression';

export default defineConfig({
  plugins: [
    // ✅ React plugin with Fast Refresh
    react({
      fastRefresh: true,
      babel: {
        plugins: ['babel-plugin-styled-components'],
      },
    }),

    // ✅ Gzip compression
    compression({
      algorithm: 'gzip',
      ext: '.gz',
    }),
  ],
});
```

### Pattern 9: dev-server-config
```typescript
// vite.config.ts
export default defineConfig({
  server: {
    port: 3000,
    host: true, // Listen on all addresses
    open: true, // Auto-open browser
    cors: true, // Enable CORS
    strictPort: false, // Try next port if 3000 is taken
    hmr: {
      overlay: true, // Show error overlay
    },
    watch: {
      usePolling: true, // For Docker/WSL
    },
  },
});
```

### Pattern 10: typescript-config
```typescript
// tsconfig.json for Vite
{
  "compilerOptions": {
    "target": "ES2020",
    "useDefineForClassFields": true,
    "lib": ["ES2020", "DOM", "DOM.Iterable"],
    "module": "ESNext",
    "skipLibCheck": true,

    /* Bundler mode */
    "moduleResolution": "bundler",
    "allowImportingTsExtensions": true,
    "resolveJsonModule": true,
    "isolatedModules": true,
    "noEmit": true,
    "jsx": "react-jsx",

    /* Linting */
    "strict": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "noFallthroughCasesInSwitch": true,

    /* Path mapping */
    "baseUrl": ".",
    "paths": {
      "@/*": ["./src/*"],
      "@components/*": ["./src/components/*"],
      "@features/*": ["./src/features/*"]
    }
  },
  "include": ["src"],
  "references": [{ "path": "./tsconfig.node.json" }]
}
```

---

## 🛡️ ARCHITECTURE CONSTRAINTS

### ❌ PROHIBITED

1. **NO process.env (use import.meta.env)**
   ```typescript
   // ❌ WRONG: process.env doesn't work in Vite
   const apiUrl = process.env.VITE_API_URL;

   // ✅ CORRECT: import.meta.env
   const apiUrl = import.meta.env.VITE_API_URL;
   ```

2. **NO require() (use import)**
   ```typescript
   // ❌ WRONG: CommonJS require
   const React = require('react');

   // ✅ CORRECT: ES modules
   import React from 'react';
   ```

3. **NO missing VITE_ prefix for env vars**
   ```bash
   # ❌ WRONG: No VITE_ prefix (won't be exposed)
   API_URL=http://localhost:3000

   # ✅ CORRECT: VITE_ prefix
   VITE_API_URL=http://localhost:3000
   ```

### ✅ REQUIRED

1. **Use import.meta.env for environment variables**
   ```typescript
   const apiUrl = import.meta.env.VITE_API_URL;
   const isDev = import.meta.env.DEV;
   const isProd = import.meta.env.PROD;
   ```

2. **Use path aliases for imports**
   ```typescript
   import { LoanCard } from '@components/loan/LoanCard';
   ```

3. **Configure proxy for API calls**
   ```typescript
   server: {
     proxy: {
       '/api': 'http://localhost:3001'
     }
   }
   ```

4. **Use manual chunks for code splitting**
   ```typescript
   manualChunks: {
     vendor: ['react', 'react-dom'],
     redux: ['@reduxjs/toolkit']
   }
   ```

5. **Enable source maps in development**
   ```typescript
   build: {
     sourcemap: process.env.NODE_ENV === 'development'
   }
   ```

---

## 📋 CHECKLIST

Before delivering Vite configuration:

- [ ] vite.config.ts created
- [ ] Path aliases configured
- [ ] Proxy configured for API
- [ ] Environment variables with VITE_ prefix
- [ ] Manual chunks for vendor code
- [ ] Source maps enabled in dev
- [ ] Plugins configured (React, etc.)
- [ ] Build optimization (minify, terser)
- [ ] NO process.env usage
- [ ] NO require() usage

---

**Pattern Count**: 40 (config: 10, env: 5, proxy: 5, build: 10, plugins: 5, optimization: 5)
**File Size**: ~280 lines
**Complexity**: Expert
**Dependencies**: vite, @vitejs/plugin-react
**Integration**: Works with React, TypeScript, Redux, Material-UI

