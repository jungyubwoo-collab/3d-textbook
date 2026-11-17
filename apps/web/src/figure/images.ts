/**
 * 그림(figure 블록)에 쓰는 이미지. 페이지는 canvas에 한 번에 그려지므로
 * 이미지는 책을 그리기 전에 미리 받아 두고(preloadImages), 그릴 때는 받아 둔 것을 꺼내 쓴다.
 */
const loaded = new Map<string, HTMLImageElement>();

/** 이미지를 모두 받는다. 못 받은 이미지는 건너뛴다(그림만 비고 책은 그대로 열린다). */
export function preloadImages(urls: string[]): Promise<void> {
  if (typeof Image === 'undefined') return Promise.resolve();
  return Promise.all(
    urls.map(
      (url) =>
        new Promise<void>((resolve) => {
          if (loaded.has(url)) {
            resolve();
            return;
          }
          const image = new Image();
          image.decoding = 'async';
          image.addEventListener(
            'load',
            () => {
              loaded.set(url, image);
              resolve();
            },
            { once: true },
          );
          image.addEventListener('error', () => resolve(), { once: true });
          image.src = url;
        }),
    ),
  ).then(() => undefined);
}

/**
 * 받아 둔 스케치 이미지를 칸 안에 비율을 지켜 가운데 맞춰 그린다.
 * 흰 바탕의 선 그림을 '곱하기'로 겹쳐, 모눈종이 위에 연필로 그린 것처럼 보이게 한다.
 */
export function drawSketch(
  ctx: CanvasRenderingContext2D,
  url: string,
  size: { width: number; height: number },
  inset = 0,
): void {
  const image = loaded.get(url);
  if (!image) return;
  const width = size.width - inset * 2;
  const height = size.height - inset * 2;
  const scale = Math.min(width / image.naturalWidth, height / image.naturalHeight);
  const w = image.naturalWidth * scale;
  const h = image.naturalHeight * scale;
  ctx.save();
  ctx.globalCompositeOperation = 'multiply';
  ctx.drawImage(image, (size.width - w) / 2, (size.height - h) / 2, w, h);
  ctx.restore();
}
