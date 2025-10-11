# Pre-configured Daytona Image for Civra Vite + React Projects
# This image speeds up generation by 50-70% by pre-installing dependencies

FROM node:20-slim

# Set working directory
WORKDIR /workspace

# Install system dependencies
RUN apt-get update && apt-get install -y \
    git \
    curl \
    && rm -rf /var/lib/apt/lists/*

# Install pnpm globally for faster package management
RUN npm install -g pnpm@latest npm@latest

# Create base package.json with common Vite dependencies
COPY docker/base-vite-package.json ./package.json

# Pre-install all common Vite + React dependencies
# This is the key optimization - deps are already installed
RUN pnpm install --no-frozen-lockfile && pnpm store prune

# Install Claude Code SDK globally
RUN npm install -g @anthropic-ai/claude-code

# Pre-configure environment for optimal performance
ENV NODE_ENV=development
ENV PNPM_HOME=/root/.local/share/pnpm
ENV PATH=$PNPM_HOME:$PATH

# Create npm cache directory
RUN mkdir -p /tmp/npm-cache /tmp/pnpm-cache
ENV NPM_CONFIG_CACHE=/tmp/npm-cache
ENV PNPM_CACHE_FOLDER=/tmp/pnpm-cache

# Warm up pnpm cache with additional common packages
RUN pnpm add -g typescript tsx

# Set up workspace directory structure
RUN mkdir -p /root/workspace

# Create template directory in /opt (won't be overridden by Daytona)
WORKDIR /opt/vite-template

# Copy the base package.json
RUN cp /workspace/package.json ./package.json

# Create Vite project files
RUN cat > index.html << 'EOF'
<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Generating Your Project...</title>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.tsx"></script>
  </body>
</html>
EOF

RUN mkdir -p src

RUN cat > src/main.tsx << 'EOF'
import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import './index.css'

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)
EOF

RUN cat > src/App.tsx << 'EOF'
export default function App() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center p-8">
      <div className="text-center text-white">
        <div className="mb-8">
          <div className="inline-block animate-spin rounded-full h-16 w-16 border-4 border-white border-t-transparent"></div>
        </div>
        <h1 className="text-4xl font-bold mb-4">Generating Your Project</h1>
        <p className="text-xl opacity-90">AI is crafting your custom application...</p>
        <p className="mt-4 text-sm opacity-75">This will only take a few seconds</p>
      </div>
    </div>
  )
}
EOF

RUN cat > src/index.css << 'EOF'
@tailwind base;
@tailwind components;
@tailwind utilities;

body {
  margin: 0;
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", "Roboto", sans-serif;
  -webkit-font-smoothing: antialiased;
}
EOF

RUN cat > vite.config.ts << 'EOF'
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  server: {
    host: true,
    port: 5173,
  },
})
EOF

RUN cat > tsconfig.json << 'EOF'
{
  "compilerOptions": {
    "target": "ES2020",
    "useDefineForClassFields": true,
    "lib": ["ES2020", "DOM", "DOM.Iterable"],
    "module": "ESNext",
    "skipLibCheck": true,
    "moduleResolution": "bundler",
    "allowImportingTsExtensions": true,
    "resolveJsonModule": true,
    "isolatedModules": true,
    "noEmit": true,
    "jsx": "react-jsx",
    "strict": true,
    "baseUrl": ".",
    "paths": {
      "@/*": ["./src/*"]
    }
  },
  "include": ["src"]
}
EOF

RUN cat > tsconfig.node.json << 'EOF'
{
  "compilerOptions": {
    "composite": true,
    "skipLibCheck": true,
    "module": "ESNext",
    "moduleResolution": "bundler",
    "allowSyntheticDefaultImports": true
  },
  "include": ["vite.config.ts"]
}
EOF

RUN cat > tailwind.config.js << 'EOF'
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: { extend: {} },
  plugins: [],
}
EOF

RUN cat > postcss.config.js << 'EOF'
export default {
  plugins: {
    tailwindcss: {},
    autoprefixer: {},
  },
}
EOF

# Link node_modules from base (so template has deps)
RUN ln -s /workspace/node_modules ./node_modules

WORKDIR /root

# Expose Vite's default port
EXPOSE 5173

CMD ["bash"]
