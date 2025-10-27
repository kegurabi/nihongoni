import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig(({ mode }) => {
  const isVercel = !!process.env.VERCEL;
  // correct GitHub Pages repo name used in package.json homepage
  const ghPagesBase = '/nihongoni/';

  return {
    base: isVercel ? './' : ghPagesBase,
    plugins: [react()],
  }
})
