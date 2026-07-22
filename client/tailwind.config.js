/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      fontFamily: {
        sans:    ['Inter', 'system-ui', 'sans-serif'],
        display: ['"Plus Jakarta Sans"', 'Inter', 'sans-serif'],
      },
      colors: {
        brand: {
          50:'#E9FBF0',100:'#C9F5DB',200:'#96EBBB',300:'#5FDD97',
          400:'#33CE78',500:'#25D366',600:'#1BAE52',700:'#178A44',
          800:'#166E39',900:'#135A31',
        },
      },
      boxShadow: {
        soft:  '0 1px 3px rgba(0,0,0,.05), 0 8px 24px rgba(0,0,0,.06)',
        glow:  '0 4px 24px rgba(37,211,102,.22)',
        card:  '0 1px 2px rgba(15,23,42,.04), 0 4px 16px rgba(15,23,42,.06)',
      },
      borderRadius: { xl2: '1.125rem' },
      keyframes: {
        fadeUp:   { '0%':{opacity:'0',transform:'translateY(8px)'},'100%':{opacity:'1',transform:'translateY(0)'} },
        popIn:    { '0%':{opacity:'0',transform:'scale(.96)'},'100%':{opacity:'1',transform:'scale(1)'} },
        flash:    { '0%':{background:'rgba(37,211,102,.14)'},'100%':{background:'transparent'} },
        shimmer:  { '100%':{transform:'translateX(100%)'} },
        pulseDot: { '0%,100%':{opacity:'1'},'50%':{opacity:'.35'} },
      },
      animation: {
        fadeUp:  'fadeUp .32s ease both',
        popIn:   'popIn .2s ease both',
        flash:   'flash .8s ease',
        pulseDot:'pulseDot 1.4s ease-in-out infinite',
      },
    },
  },
  plugins: [],
}
