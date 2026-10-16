// Textura papíru (SVG šum) a potrhané okraje listů jako CSS proměnné --grain a --torn.
// Ve Fázi 9 je nahradí skutečné textury z mockupu – stačí změnit tenhle soubor.
export function installTexture(root: HTMLElement = document.documentElement) {
  const svg = `<svg xmlns='http://www.w3.org/2000/svg' width='220' height='220'><filter id='n'><feTurbulence type='fractalNoise' baseFrequency='.85' numOctaves='3' stitchTiles='stitch'/><feColorMatrix values='0 0 0 0 .3  0 0 0 0 .28  0 0 0 0 .25  0 0 0 .22 0'/></filter><rect width='100%' height='100%' filter='url(%23n)'/></svg>`;
  root.style.setProperty('--grain', `url("data:image/svg+xml;utf8,${svg.replace(/#/g, '%23').replace(/"/g, "'")}")`);
  let s = 7;
  const r = () => (s = (s * 9301 + 49297) % 233280) / 233280;
  const pts: string[] = [];
  const N = 46;
  for (let i = 0; i <= N; i++) pts.push(`${((i / N) * 100).toFixed(2)}% ${(r() * 4).toFixed(1)}px`);
  for (let i = 1; i < 10; i++) pts.push(`calc(100% - ${(r() * 3).toFixed(1)}px) ${i * 10}%`);
  for (let i = N; i >= 0; i--) pts.push(`${((i / N) * 100).toFixed(2)}% calc(100% - ${(r() * 5).toFixed(1)}px)`);
  for (let i = 9; i > 0; i--) pts.push(`${(r() * 3).toFixed(1)}px ${i * 10}%`);
  root.style.setProperty('--torn', `polygon(${pts.join(',')})`);
}
