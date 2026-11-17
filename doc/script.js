const backgroundVideo = document.querySelector('.background__video')

if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
  backgroundVideo.pause()
  backgroundVideo.removeAttribute('autoplay')
}
