const STORAGE_KEY = '3d-textbook:learner-id';

/** 로그인 없이 쓰는 익명 학습자 ID. 브라우저에 한 번 만들어 두고 계속 쓴다. */
export function getLearnerId(): string {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) return saved;
    const id = createUuid();
    localStorage.setItem(STORAGE_KEY, id);
    return id;
  } catch {
    return createUuid();
  }
}

/** crypto.randomUUID는 https·localhost에서만 있으므로, 교실 와이파이(http) 접속을 위해 직접 만든다. */
export function createUuid(): string {
  if (typeof crypto.randomUUID === 'function') return crypto.randomUUID();
  const bytes = crypto.getRandomValues(new Uint8Array(16));
  bytes[6] = (bytes[6]! & 0x0f) | 0x40;
  bytes[8] = (bytes[8]! & 0x3f) | 0x80;
  const hex = Array.from(bytes, (byte) => byte.toString(16).padStart(2, '0')).join('');
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}
