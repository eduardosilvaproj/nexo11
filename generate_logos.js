const fs = require('fs');

const COLORS = {
  blue: '#1A9BE8',
  green: '#22C97A',
  dark: '#1B1F28',
  white: '#FFFFFF',
  black: '#000000'
};

const getSvg = (variant) => {
  let c1 = COLORS.blue;
  let c2 = COLORS.green;
  let textMain = COLORS.white;
  let textSub = 'rgba(255,255,255,0.7)';
  let bg = 'transparent';

  if (variant === 'white') {
    c1 = c2 = textMain = textSub = COLORS.white;
  } else if (variant === 'black') {
    c1 = c2 = textMain = COLORS.black;
    textSub = 'rgba(0,0,0,0.7)';
  }

  const symbol = \`
    <g transform="translate(10,10) scale(0.8)">
      <defs>
        <linearGradient id="grad-\${variant}" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stop-color="\${c1}" />
          <stop offset="100%" stop-color="\${c2}" />
        </linearGradient>
      </defs>
      <path d="M30 20L50 40L70 20" stroke="url(#grad-\${variant})" stroke-width="12" stroke-linecap="round" stroke-linejoin="round" />
      <path d="M30 80L50 60L70 80" stroke="url(#grad-\${variant})" stroke-width="12" stroke-linecap="round" stroke-linejoin="round" />
      <path d="M20 30L40 50L20 70" stroke="url(#grad-\${variant})" stroke-width="12" stroke-linecap="round" stroke-linejoin="round" />
      <path d="M80 30L60 50L80 70" stroke="url(#grad-\${variant})" stroke-width="12" stroke-linecap="round" stroke-linejoin="round" />
    </g>\`;

  const text = \`
    <g transform="translate(100, 35)">
      <text fill="\${textMain}" font-family="sans-serif" font-weight="900" font-style="italic" font-size="42" letter-spacing="-2">NEXUS</text>
      <text fill="\${textSub}" font-family="sans-serif" font-weight="500" font-size="10" letter-spacing="4" transform="translate(2, 50)">PLANEJADOS</text>
    </g>\`;

  if (variant === 'symbol') {
    return \`<svg width="100" height="100" viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">\${symbol}</svg>\`;
  }

  if (variant === 'vertical') {
    return \`<svg width="300" height="400" viewBox="0 0 300 400" xmlns="http://www.w3.org/2000/svg">
      <g transform="translate(100, 50)">\${symbol}</g>
      <g transform="translate(50, 180) scale(1.2)">\${text}</g>
    </svg>\`;
  }

  return \`<svg width="500" height="120" viewBox="0 0 500 120" xmlns="http://www.w3.org/2000/svg">
    \${symbol}
    \${text}
  </svg>\`;
};

const dirs = ['public/nexus/logos', 'public/nexus/icons'];
dirs.forEach(d => fs.mkdirSync(d, { recursive: true }));

const files = [
  { name: 'logo-main', variant: 'main' },
  { name: 'logo-white', variant: 'white' },
  { name: 'logo-black', variant: 'black' },
  { name: 'logo-horizontal', variant: 'main' },
  { name: 'logo-vertical', variant: 'vertical' },
  { name: 'symbol-x', variant: 'symbol' }
];

files.forEach(f => {
  const svgPath = dirs[0] + '/' + f.name + '.svg';
  fs.writeFileSync(svgPath, getSvg(f.variant));
});

const iconSizes = [32, 64, 192, 512];
iconSizes.forEach(size => {
  const svg = getSvg('symbol').replace('width="100"', 'width="' + size + '"').replace('height="100"', 'height="' + size + '"');
  fs.writeFileSync('public/nexus/icons/icon-' + size + '.svg', svg);
});

fs.writeFileSync('public/nexus-logo.svg', getSvg('main'));
