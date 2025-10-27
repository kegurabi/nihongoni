import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig(() => {
  const isVercel = !!process.env.VERCEL;
  // correct GitHub Pages repo name
  const ghPagesBase = '/nihongoni/';

  return {
    // use relative paths on Vercel, use repo base for GH Pages
    base: isVercel ? './' : ghPagesBase,
    plugins: [react()],
  };
});
