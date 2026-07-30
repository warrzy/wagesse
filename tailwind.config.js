/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './app/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './lib/**/*.{js,ts,jsx,tsx,mdx}',
    './styles/**/*.{css,scss}',
  ],
  theme: {
    extend: {
      colors: {
        // Palette Wagesse adaptée au Burkina Faso
        'earth': '#8B6F47',        // Terre
        'terracotta': '#E8714D',   // Terre cuite / Orange
        'sand': '#D4B896',          // Sable
        'anthracite': '#2C3E50',    // Gris foncé
        'cream': '#F5F1ED',         // Blanc cassé
        'success': '#4CAF50',       // Vert validation
        'warning': '#FFA500',       // Orange alerte
        'danger': '#EF4444',        // Rouge danger
      },
      fontFamily: {
        'sans': ['Inter', 'system-ui', 'sans-serif'],
      },
      spacing: {
        'safe': 'max(1rem, env(safe-area-inset-bottom))',
      },
    },
  },
  plugins: [],
}
