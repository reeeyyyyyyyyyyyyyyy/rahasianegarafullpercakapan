/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,jsx,ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        bg: '#F5F5F7',
        'bg-dark': '#1C1C1E',
        primary: '#007AFF',
        'primary-hover': '#0051D5',
        secondary: '#5856D6',
        success: '#34C759',
        warning: '#FF9500',
        danger: '#FF3B30',
        'text-primary': '#000000',
        'text-secondary': '#8E8E93',
        'card-bg': '#FFFFFF',
        'card-border': '#D1D1D6',
        'overlay': 'rgba(0, 0, 0, 0.5)',
      },
      fontFamily: {
        sans: ['-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'Roboto', 'Helvetica', 'Arial', 'sans-serif'],
      },
    },
  },
  plugins: [],
}
