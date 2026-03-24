(function setInitialsFavicon() {
  const title = String(document.title || '').trim();
  const stopwords = new Set(['de', 'del', 'la', 'el', 'y', 'a', 'en']);

  function pickInitials(text) {
    const words = text
      .split(/\s+/)
      .map((word) => word.replace(/[^A-Za-z0-9]/g, ''))
      .filter(Boolean);

    const relevant = words.filter((word) => !stopwords.has(word.toLowerCase()));
    const source = relevant.length >= 2 ? relevant : words;

    if (source.length >= 2) {
      return `${source[0][0]}${source[1][0]}`.toUpperCase();
    }
    if (source.length === 1) {
      return source[0].slice(0, 2).toUpperCase();
    }
    return 'AP';
  }

  const initials = pickInitials(title);
  function renderIcon(size) {
    const canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext('2d');
    if (!ctx) {
      return '';
    }

    ctx.clearRect(0, 0, size, size);
    const fontSize = initials.length > 1 ? Math.round(size * 0.72) : Math.round(size * 0.82);
    ctx.font = `800 ${fontSize}px "Segoe UI", Arial, sans-serif`;
    ctx.fillStyle = '#2f3e72';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'alphabetic';

    const metrics = ctx.measureText(initials);
    const left = metrics.actualBoundingBoxLeft || 0;
    const right = metrics.actualBoundingBoxRight || metrics.width || 0;
    const ascent = metrics.actualBoundingBoxAscent || fontSize * 0.8;
    const descent = metrics.actualBoundingBoxDescent || fontSize * 0.2;
    const textWidth = left + right;
    const textHeight = ascent + descent;
    const x = (size - textWidth) / 2 + left;
    const y = (size + textHeight) / 2 - descent;
    ctx.fillText(initials, x, y);

    return canvas.toDataURL('image/png');
  }

  const href16 = renderIcon(16);
  const href32 = renderIcon(32);
  let favicon = document.querySelector("link[rel='icon']");
  if (!favicon) {
    favicon = document.createElement('link');
    favicon.setAttribute('rel', 'icon');
    document.head.appendChild(favicon);
  }
  favicon.setAttribute('type', 'image/png');
  favicon.setAttribute('href', href16 || href32);
  favicon.setAttribute('sizes', '16x16');

  let favicon32 = document.querySelector("link[rel='icon'][sizes='32x32']");
  if (!favicon32) {
    favicon32 = document.createElement('link');
    favicon32.setAttribute('rel', 'icon');
    favicon32.setAttribute('sizes', '32x32');
    document.head.appendChild(favicon32);
  }
  favicon32.setAttribute('type', 'image/png');
  favicon32.setAttribute('href', href32 || href16);
})();
