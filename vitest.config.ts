import { defineConfig } from 'vitest/config';

export default defineConfig({
    test: {
        environment: 'happy-dom',
        globals: false,
        include: ['tests/**/*.test.ts'],
        setupFiles: ['./tests/setup.ts'],
    },
    define: {
        __LOCAL_API__: 'false',
    },
});
