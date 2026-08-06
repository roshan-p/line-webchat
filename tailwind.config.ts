import type { Config } from 'tailwindcss';

const config: Config = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'sans-serif'],
      },
      colors: {
        line: {
          green: '#06C755',
          bg: '#0f0f1a',
          dark: '#1a1a2e',
          panel: '#16213e',
          border: '#2a2a4a',
          ink: '#111111',
          text: '#f0f0f5',
          muted: '#8888a0',
        },
      },
    },
  },
  plugins: [],
};

export default config;
