// Small helpers for the media library and picker.
export function formatBytes(n) {
  const b = Number(n) || 0;
  if (b < 1024) return `${b} B`;
  if (b < 1024 * 1024) return `${Math.round(b / 1024)} KB`;
  return `${(b / (1024 * 1024)).toFixed(b < 10 * 1024 * 1024 ? 1 : 0)} MB`;
}

// What the media library accepts (the server checks the content too): images, audio and video.
// Twin of CC_MEDIA_AUDIO / CC_MEDIA_VIDEO in canvascore-admin/media.php.
export const AUDIO_EXT = ['mp3', 'm4a', 'ogg', 'wav'];
export const VIDEO_EXT = ['mp4', 'webm'];
const IMAGE_ACCEPT = 'image/*';
const AUDIO_ACCEPT = '.mp3,.m4a,.ogg,.wav,audio/*';
const VIDEO_ACCEPT = '.mp4,.webm,video/mp4,video/webm';
// The value of an <input type="file" accept> for a kind of file: 'image', 'audio', 'video' or anything else for all
export const acceptFor = (kind) => (kind === 'image' ? IMAGE_ACCEPT : kind === 'audio' ? AUDIO_ACCEPT : kind === 'video' ? VIDEO_ACCEPT : `${IMAGE_ACCEPT},${AUDIO_ACCEPT},${VIDEO_ACCEPT}`);
// Is it a file the library takes? By type, or by extension when the browser doesn't know the type (.m4a, .ogg…)
export function isAcceptedFile(file) {
  const type = String((file && file.type) || '');
  if (/^(image|audio|video)\//.test(type)) return true;
  const ext = String((file && file.name) || '').split('.').pop().toLowerCase();
  return !type && (AUDIO_EXT.includes(ext) || VIDEO_EXT.includes(ext));
}
// 'image' | 'audio' | 'video' of a library item (older answers carry no kind: they are images)
export const kindOf = (item) => (item && item.kind) || 'image';
