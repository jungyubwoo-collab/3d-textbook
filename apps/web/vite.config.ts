import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  // 개발·미리보기 중에는 /api 요청을 API 서버(apps/api)로 넘긴다.
  server: { proxy: { '/api': 'http://localhost:4000' } },
  preview: { proxy: { '/api': 'http://localhost:4000' } },
  build: {
    // three.js만 700kB가 넘으므로 경고 기준을 올린다.
    chunkSizeWarningLimit: 900,
    rolldownOptions: {
      output: {
        // 자주 바뀌지 않는 라이브러리를 따로 묶어 배포 뒤에도 브라우저 캐시를 쓰게 한다.
        codeSplitting: {
          groups: [
            { name: 'three', test: /node_modules[\\/]three[\\/]/ },
            {
              name: 'react-three',
              test: /node_modules[\\/](@react-three|three-stdlib|camera-controls)[\\/]/,
            },
            { name: 'react', test: /node_modules[\\/](react|react-dom|scheduler)[\\/]/ },
          ],
        },
      },
    },
  },
});
