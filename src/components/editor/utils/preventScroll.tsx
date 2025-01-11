export const preserveScroll = (fn: () => void) => {
  const scrollPos = window.scrollY;
  fn();
  requestAnimationFrame(() => {
    window.scrollTo(0, scrollPos);
  });
};