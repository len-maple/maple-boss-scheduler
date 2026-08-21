import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
// GitHub Pages のプロジェクトサイト (https://<user>.github.io/<repo>/) 配下で
// 動くように、リポジトリ名を base に設定する。
export default defineConfig({
    plugins: [react()],
    base: '/maplestoyr-boss-scheduler/',
});
