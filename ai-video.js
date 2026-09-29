// AI 视频试验田：播放控制。
//
// 视频标签带原生 controls：任何设备上都有一个能点的播放键，
// 不依赖这段 JS 也能看——这是保底。
//
// 这段 JS 额外做的：桌面端鼠标悬停自动播放（"预览"性质）。
//   - 悬停播的：鼠标移开就暂停并回到开头。
//   - 用户自己点播放键看完整一段：鼠标移开不打扰。
// 系统开了"减少动态效果"就完全不接管。

const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches

if (!prefersReducedMotion) {
  const videos = document.querySelectorAll('.ai-video')

  videos.forEach(video => {
    const card = video.closest('.ai-card')
    let hoverStarted = false

    card.addEventListener('mouseenter', () => {
      if (video.paused) {
        hoverStarted = true
        // play() 返回 Promise，浏览器可能拒绝（比如还没交互过）。
        // catch 掉，别让控制台报错；被拒绝就当作没开始过。
        const p = video.play()
        if (p && typeof p.catch === 'function') {
          p.catch(() => { hoverStarted = false })
        }
      }
    })

    card.addEventListener('mouseleave', () => {
      if (hoverStarted) {
        video.pause()
        video.currentTime = 0
      }
      hoverStarted = false
    })

    // 视频文件缺失或损坏时，不让卡片留一个打不开的黑框。
    // 注意：用了 <source> 标签时，加载失败事件发生在 source 元素上，
    // 而不是 video 上，所以要两边都听。
    const markUnavailable = () => {
      const player = video.closest('.ai-player')
      if (player) player.setAttribute('data-unavailable', 'true')
    }
    video.addEventListener('error', markUnavailable)
    video.querySelectorAll('source').forEach(s => {
      s.addEventListener('error', markUnavailable)
    })
  })
}
