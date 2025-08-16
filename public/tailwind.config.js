/** @type {import('tailwindcss').Config} */
export default {
  content: ["./**/*.html","./**/*.js"],
  theme: {
    extend: {
      colors: {
        primary:'#1a1a2e', secondary:'#16213e', accent:'#0f3460', aurora:'#e94560',
        cyan:'#00d4ff', magenta:'#ff006e', gold:'#ffd700', teal:'#03dac6',
        dark:'#0a0a23', light:'#f8fafc', muted:'#64748b', success:'#00ea8d',
        warning:'#ffb800', error:'#ff4757',
      },
      fontFamily:{ sans:['Inter','system-ui','sans-serif'] },
      screens:{ xs:'320px', sm:'640px', md:'768px', lg:'1024px', xl:'1280px', '2xl':'1536px' },
      fontSize:{
        'fluid-xs':'clamp(.75rem,2vw,.875rem)','fluid-sm':'clamp(.875rem,2.5vw,1rem)',
        'fluid-base':'clamp(1rem,2.5vw,1.125rem)','fluid-lg':'clamp(1.125rem,3vw,1.25rem)',
        'fluid-xl':'clamp(1.25rem,3.5vw,1.5rem)','fluid-2xl':'clamp(1.5rem,4vw,2rem)',
        'fluid-3xl':'clamp(1.875rem,5vw,2.5rem)','fluid-4xl':'clamp(2.25rem,6vw,3rem)'
      }
    }
  },
  plugins: [],
}
