export function optimizedImageUrl(src: string, width = 1200) {
  if (!src.includes('res.cloudinary.com') || !src.includes('/image/upload/')) {
    return src;
  }

  const transform = `f_auto,q_auto,w_${width},c_limit`;
  if (src.includes('/image/upload/f_auto,')) return src;

  return src.replace('/image/upload/', `/image/upload/${transform}/`);
}
