/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './index.html',
    './src/**/*.{js,jsx,ts,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        // Map to existing CSS tokens so we can migrate gradually.
        primary: 'var(--primary)',
        secondary: 'var(--secondary)',
        success: 'var(--success)',
        warning: 'var(--warning)',
        danger: 'var(--danger)',
        dark: 'var(--dark)',
        light: 'var(--light)',
      },
      boxShadow: {
        soft: '0 4px 15px rgba(0,0,0,.05)',
      },
      borderRadius: {
        card: '16px',
      },
    },
  },
  plugins: [
    require('@tailwindcss/forms'),
  ],
}

