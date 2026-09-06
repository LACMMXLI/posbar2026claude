import swc from 'unplugin-swc';
import { defineConfig } from 'vitest/config';

// SWC es necesario para que Vitest emita metadatos de decoradores (inyección de NestJS).
export default defineConfig({
  test: {
    globals: false,
    environment: 'node',
    include: ['src/**/*.spec.ts', 'test/**/*.spec.ts'],
    root: './',
  },
  plugins: [
    swc.vite({
      module: { type: 'es6' },
      jsc: {
        target: 'es2022',
        parser: { syntax: 'typescript', decorators: true },
        transform: { legacyDecorator: true, decoratorMetadata: true },
      },
    }),
  ],
});
