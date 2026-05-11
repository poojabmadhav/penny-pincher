/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          dark:   '#8A5F41',  // darkest — headers
          mid:    '#A77F60',  // mid brown — borders, secondary elements
          light:  '#F3E4C9',  // cream — backgrounds
          accent: '#CCD67F',  // lime — active/highlight states
        },
      },
    },
  },
  plugins: [],
}
