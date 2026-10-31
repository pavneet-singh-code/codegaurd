const scale = (a) => Object.fromEntries([50, 100, 200, 300, 400, 500, 600, 700, 800, 900].map((k, i) => [k, a[i]]));

// Palette idea: Prussian-blue ink on pale graph paper, with a teacher's red pen for matches and a highlighter for emphasis.
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        ink: '#10294A',
        paper: '#F2F6F8',
        slate: scale(['#F2F6F8', '#E7EEF2', '#D6E2E9', '#B9C9D5', '#8BA0B3', '#677D93', '#4C6279', '#344A63', '#1F3552', '#10294A']),
        indigo: scale(['#EAF0F8', '#D3DFF0', '#A9BFDF', '#7C9AC8', '#4F72AA', '#2C4F85', '#17386A', '#10294A', '#0C203A', '#08162A']),
        emerald: scale(['#E7F5EE', '#C9EBDA', '#9AD8BC', '#62BF98', '#2FA474', '#1F8A5B', '#187049', '#135A3B', '#0E452E', '#093121']),
        amber: scale(['#FFF8DB', '#FFF0B0', '#FFE58A', '#FBD34F', '#F2B91F', '#D99A0B', '#B27A05', '#8A5E04', '#6B4803', '#4A3202']),
        red: scale(['#FDECEE', '#FAD3D8', '#F4A9B2', '#EC7683', '#E24556', '#D62839', '#B71D2D', '#951725', '#72111C', '#4F0B13']),
        rose: scale(['#FDECEE', '#FAD3D8', '#F4A9B2', '#EC7683', '#E24556', '#D62839', '#B71D2D', '#951725', '#72111C', '#4F0B13']),
        sky: scale(['#E8F3F8', '#CFE6F0', '#A6D0E1', '#74B3CD', '#4592B3', '#2B7799', '#1F5F7D', '#184B63', '#123A4D', '#0C2A38']),
        violet: scale(['#F1EEF8', '#E0DAF0', '#C4B9E2', '#A393CF', '#826CBA', '#6A52A4', '#553F88', '#43326C', '#322550', '#221938']),
      },
      borderRadius: { DEFAULT: '2px', sm: '2px', md: '3px', lg: '3px', xl: '4px', '2xl': '4px', '3xl': '6px' },
      fontFamily: {
        sans: ['"Schibsted Grotesk"', 'system-ui', 'sans-serif'],
        mono: ['"JetBrains Mono"', 'ui-monospace', 'monospace'],
        hand: ['Caveat', '"Segoe Script"', 'cursive'],
      },
      boxShadow: { sm: '0 1px 0 rgba(16,41,74,.10)', xl: '0 14px 30px -14px rgba(16,41,74,.45)' },
    },
  },
  plugins: [],
};
