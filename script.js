/* ============================================
   PRENDS TA PLACE — script.js
   ============================================ */

const SLIDES = Array.from(document.querySelectorAll('.slide'))
const TOTAL  = SLIDES.length
const AUTO_SCROLL_SPEED = 30

const STOP_SLIDES = [1, 3, 8, 10, 13]
const STOP_NAMES  = ['Entrée', "L'espace", 'La fuite', 'Le silence', 'Terminus']

const SLIDE_BG = {
  1: '#FAF6F6', 2: '#F6F2EF', 3: '#EEE7E2',
  4: '#FAF6F6',
  5: '#E3DAD4', 6: '#D5CCC5',
  7: '#000000',
  8: '#0a0a0e', 9: '#0a0a0e', 10: '#0a0a0e', 11: '#0a0a0e',
  12: '#FAF6F6', 13: '#FAF6F6',
}

// Shared mutable state — updated by the consolidated observer
let currentSlide   = 0
let activeSlideIdx = 0
let audioManager   = null

// ── Shared utilities ──────────────────────────
const clamp01       = v => Math.min(Math.max(v, 0), 1)
const easeOutCubic  = t => 1 - Math.pow(1 - t, 3)
const easeInOutCubic = t => t < 0.5 ? 4*t*t*t : 1 - Math.pow(-2*t + 2, 3) / 2
const easeInOut     = t => t < 0.5 ? 2*t*t : -1 + (4 - 2*t)*t
const getP = sl =>
  clamp01(-sl.getBoundingClientRect().top / Math.max(1, sl.offsetHeight - window.innerHeight))

// ── Metro nav ─────────────────────────────────
function buildMetroNav() {
  const container = document.getElementById('metro-stops')
  if (!container) return
  STOP_NAMES.forEach((name, s) => {
    const btn = document.createElement('button')
    btn.className = 'metro-stop-item'
    btn.dataset.stop = s
    if (s === 0 || s === STOP_NAMES.length - 1) btn.classList.add('terminus')
    btn.setAttribute('aria-label', `Séquence — ${name}`)
    btn.innerHTML = `<div class="stop-circle"></div><span class="stop-name">${name}</span>`
    btn.addEventListener('click', () => {
      const target = SLIDES.find(sl => parseInt(sl.dataset.slide, 10) === STOP_SLIDES[s])
      if (target) target.scrollIntoView({ behavior: 'smooth' })
    })
    container.appendChild(btn)
  })
  requestAnimationFrame(() => updateMetroFill(0))
  window.addEventListener('resize', () => {
    const activeStop = document.querySelector('.metro-stop-item.active')
    const stopIdx = activeStop ? parseInt(activeStop.dataset.stop, 10) : 0
    updateMetroFill(stopIdx)
  }, { passive: true })
}

function updateMetroFill(stopIdx) {
  const track  = document.querySelector('.metro-track-container')
  const fill   = document.getElementById('metro-fill')
  const bgLine = document.querySelector('.metro-bg-line')
  const stops  = document.querySelectorAll('.metro-stop-item')
  if (!track || !fill || !bgLine || !stops.length) return
  const trackRect   = track.getBoundingClientRect()
  const first       = stops[0].getBoundingClientRect()
  const last        = stops[stops.length - 1].getBoundingClientRect()
  const firstCenter = (first.left + first.width  / 2) - trackRect.left
  const lastCenter  = (last.left  + last.width   / 2) - trackRect.left
  const firstCenterY = (first.top + first.height / 2) - trackRect.top
  const lineHeight  = parseFloat(getComputedStyle(fill).height) || 5
  bgLine.style.left  = `${firstCenter}px`
  bgLine.style.width = `${Math.max(0, lastCenter - firstCenter)}px`
  bgLine.style.top   = `${firstCenterY - lineHeight / 2}px`
  fill.style.left    = `${firstCenter}px`
  fill.style.top     = `${firstCenterY - lineHeight / 2}px`
  if (stopIdx === 0) { fill.style.width = '0px'; return }
  const active       = stops[stopIdx].getBoundingClientRect()
  const activeCenter = (active.left + active.width / 2) - trackRect.left
  fill.style.width   = Math.max(0, activeCenter - firstCenter) + 'px'
}

function setActiveStop(slideIdx) {
  const foundSlide = SLIDES.find(sl => (parseInt(sl.dataset.slide, 10) - 1) === slideIdx)
  const currentDataSlide = foundSlide ? parseInt(foundSlide.dataset.slide, 10) : slideIdx + 1
  let stopIdx = 0
  for (let s = 0; s < STOP_SLIDES.length; s++) {
    if (currentDataSlide >= STOP_SLIDES[s]) stopIdx = s
  }
  const darkSet = new Set([7, 8, 9, 10, 11])
  document.body.classList.toggle('chapter-dark', darkSet.has(currentDataSlide))
  document.body.classList.remove('chapter-dim-1', 'chapter-dim-2', 'chapter-dim-3')
  if      (currentDataSlide === 3) document.body.classList.add('chapter-dim-1')
  else if (currentDataSlide === 5) document.body.classList.add('chapter-dim-2')
  else if (currentDataSlide === 6) document.body.classList.add('chapter-dim-3')
  const bg = SLIDE_BG[currentDataSlide]
  if (bg) document.body.style.backgroundColor = bg
  document.querySelectorAll('.metro-stop-item').forEach((s, i) => {
    s.classList.toggle('active',  i === stopIdx)
    s.classList.toggle('visited', i < stopIdx)
  })
  updateMetroFill(stopIdx)
  const nav = document.getElementById('metro-nav')
  if (nav) nav.style.backgroundColor = 'transparent'
}

// ── Counter animation ─────────────────────────
function animateCounter(el) {
  if (el.dataset.counted) return
  el.dataset.counted = '1'
  const target   = parseInt(el.dataset.target, 10)
  const grouped  = el.dataset.grouped === 'true'
  const formatter = grouped ? new Intl.NumberFormat('fr-FR') : null
  const dur = 1400, t0 = performance.now()
  ;(function step(now) {
    const p     = Math.min((now - t0) / dur, 1)
    const value = Math.round((1 - Math.pow(1 - p, 3)) * target)
    el.textContent = formatter ? formatter.format(value).replace(/[  ]/g, ' ') : String(value)
    if (p < 1) requestAnimationFrame(step)
    else el.textContent = formatter ? formatter.format(target).replace(/[  ]/g, ' ') : String(target)
  })(t0)
}

// ── Slide 1 — train arrival ───────────────────
function initFirstSceneMotion() {
  const slide = document.querySelector('.slide-immersive--train')
  if (!slide) return
  const motion       = slide.querySelector('.scene-motion')
  if (!motion) return
  const baseLayer    = slide.querySelector('.scene-layer--base')
  const overlayLayer = slide.querySelector('.scene-layer--overlay')
  let strip = motion.querySelector('.motion-layer--strip')
  if (!strip) {
    strip = document.createElement('img')
    strip.className = 'motion-layer motion-layer--strip'
    strip.src = 'images/seq1/IMG_8757.png'
    strip.alt = ''
    strip.setAttribute('aria-hidden', 'true')
    motion.appendChild(strip)
  }
  let ticking = false

  function updateMotion() {
    ticking = false
    const rect     = slide.getBoundingClientRect()
    const travel   = Math.max(1, slide.offsetHeight - window.innerHeight)
    const progress = clamp01(-rect.top / travel)
    const ARRIVAL_END = 0.70, HOLD_END = 0.78, PARALLAX_END = 0.98
    const BLUR_MAX = 100, BLUR_END = 0.62
    const baseHeight = Math.round(baseLayer?.getBoundingClientRect().height || window.innerHeight)
    strip.style.height = `${baseHeight}px`
    strip.style.width  = 'auto'
    strip.style.top    = `${Math.round((window.innerHeight - baseHeight) / 2)}px`
    const START_X = -30640
    const x = progress <= ARRIVAL_END
      ? START_X + (-START_X) * easeOutCubic(clamp01(progress / ARRIVAL_END))
      : 0
    const blurT        = clamp01(progress / BLUR_END)
    const blurPx       = progress < BLUR_END ? BLUR_MAX * (1 - easeOutCubic(blurT)) : 0
    const arrivalT     = clamp01(progress / ARRIVAL_END)
    const speedFactor  = progress < ARRIVAL_END ? 1 - easeOutCubic(arrivalT) : 0
    const stretchX     = 1 + 0.22 * speedFactor
    const squashY      = 1 - 0.04 * speedFactor
    const contrastBoost  = 1 + 0.28 * speedFactor
    const saturateBoost  = 1 + 0.18 * speedFactor
    let parallaxT = 0
    if (progress > HOLD_END) parallaxT = clamp01((progress - HOLD_END) / (PARALLAX_END - HOLD_END))
    const p            = easeInOutCubic(parallaxT)
    const baseScale    = 1 + 0.06 * p
    const stripScale   = 1 + 0.03 * p
    const overlayScale = 1 + 0.34 * p
    const overlayOpacity = 1 - p
    motion.style.transform = 'translate3d(0, 0, 0)'
    strip.style.transformOrigin = 'left center'
    strip.style.transform = `translate3d(${x}px, 0, 0) scaleX(${(stripScale * stretchX).toFixed(4)}) scaleY(${(stripScale * squashY).toFixed(4)})`
    strip.style.filter    = `blur(${blurPx.toFixed(2)}px) contrast(${contrastBoost.toFixed(3)}) saturate(${saturateBoost.toFixed(3)})`
    if (baseLayer) baseLayer.style.transform = `translateY(-50%) scale(${baseScale})`
    if (overlayLayer) {
      overlayLayer.style.transform = `translateY(-50%) scale(${overlayScale})`
      overlayLayer.style.opacity   = overlayOpacity.toFixed(3)
    }
  }

  function requestUpdate() {
    if (ticking) return; ticking = true; requestAnimationFrame(updateMotion)
  }
  window.addEventListener('scroll', requestUpdate, { passive: true })
  window.addEventListener('resize', requestUpdate, { passive: true })
  strip.addEventListener('load', requestUpdate, { once: true })
  requestUpdate()
}

// ── Slide 2 — wagon fills ─────────────────────
function initSecondSceneReveal() {
  const slide = document.querySelector('.slide-seq2')
  if (!slide) return
  const layers = Array.from(slide.querySelectorAll('.seq2-reveal')).reverse()
  if (!layers.length) return
  let ticking = false

  function updateReveal() {
    ticking = false
    const rect     = slide.getBoundingClientRect()
    const travel   = Math.max(1, slide.offsetHeight - window.innerHeight)
    const progress = clamp01(-rect.top / travel)
    const REVEAL_START = 0.10, REVEAL_END = 0.90, holdEnd = 0.98
    const layerStep = Math.max(0.001, REVEAL_END - REVEAL_START) / layers.length
    layers.forEach((layer, i) => {
      const start = REVEAL_START + i * layerStep
      const end   = start + layerStep
      const local = clamp01((progress - start) / Math.max(0.001, end - start))
      layer.style.opacity = (progress >= holdEnd ? 1 : 1 - Math.pow(1 - local, 2)).toFixed(3)
    })
  }

  function requestUpdate() {
    if (ticking) return; ticking = true; requestAnimationFrame(updateReveal)
  }
  window.addEventListener('scroll', requestUpdate, { passive: true })
  window.addEventListener('resize', requestUpdate, { passive: true })
  requestUpdate()
}

// ── Slides 3-4-5 — chained + facts ───────────
function initSeq345Chain() {
  const seq3 = document.querySelector('.slide-seq3')
  const seq4 = document.querySelector('.slide-seq4')
  const seq5 = document.querySelector('.slide-seq5')
  if (!seq3 || !seq4 || !seq5) return
  const seq3Base      = seq3.querySelector('.seq3-layer--base')
  const seq3Swap      = seq3.querySelector('.seq3-layer--swap')
  const seq3Stack     = seq3.querySelector('.scene-stack--seq3')
  const seq4Look      = seq4.querySelector('.seq4-layer--look')
  const seq5Stack     = seq5.querySelector('.scene-stack--seq5')
  const seq5Base      = seq5.querySelector('.seq5-layer--base')
  const seq5Swap      = seq5.querySelector('.seq5-layer--swap')
  const seq5Next      = seq5.querySelector('.seq5-layer--next')
  const seq5TextA     = seq5.querySelector('.seq5-text-a')
  const seq5TextB     = seq5.querySelector('.seq5-text-b')
  const seq4Fact      = document.getElementById('fact-seq4')
  const seq4FactTrack = document.getElementById('fact-seq4-track')
  if (!seq3Base || !seq3Swap || !seq3Stack || !seq4Look || !seq5Stack || !seq5Base || !seq5Swap || !seq5Next) return

  let ticking = false, seq4FactStage = -1

  function updateChain() {
    ticking = false
    const p3 = getP(seq3), p4 = getP(seq4), p5 = getP(seq5)

    // seq3
    const swapP = easeOutCubic(clamp01((p3 - 0.14) / 0.36))
    const out3P = easeOutCubic(clamp01((p3 - 0.64) / 0.28))
    seq3Base.style.opacity          = (1 - swapP).toFixed(3)
    seq3Swap.style.opacity          = swapP.toFixed(3)
    seq3Swap.style.transform        = 'translateY(0%) scale(1)'
    seq3Stack.style.opacity         = (1 - out3P).toFixed(3)
    seq3Stack.style.transform       = `translateY(${(-5 * out3P).toFixed(2)}%)`

    // seq4
    const in4P  = easeOutCubic(clamp01((p4 - 0.04) / 0.14))
    const out4P = easeOutCubic(clamp01((p4 - 0.82) / 0.14))
    seq4Look.style.opacity   = (in4P * (1 - out4P)).toFixed(3)
    seq4Look.style.transform = `translateY(${(-4 * (1 - in4P) - 4 * out4P).toFixed(2)}%) scale(${(0.990 + 0.010 * in4P).toFixed(4)})`

    if (seq4Fact) {
      const fact4Show = easeOutCubic(clamp01((p4 - 0.06) / 0.10))
      const fact4Hide = easeOutCubic(clamp01((p4 - 0.92) / 0.06))
      seq4Fact.style.opacity   = (fact4Show * (1 - fact4Hide)).toFixed(3)
      seq4Fact.style.transform = `translateY(${(14 * (1 - fact4Show)).toFixed(2)}px)`
      if (seq4FactTrack) {
        const nextStage = p4 >= 0.72 ? 2 : p4 >= 0.42 ? 1 : 0
        if (nextStage !== seq4FactStage) {
          seq4FactStage = nextStage
          seq4FactTrack.style.transition = 'transform 1.1s cubic-bezier(0.22, 0.61, 0.36, 1)'
          seq4FactTrack.style.transform  = `translateY(-${((100 / 3) * nextStage).toFixed(4)}%)`
        }
      }
    }

    // seq5
    const swap5P     = easeOutCubic(clamp01((p5 - 0.10) / 0.34))
    const handoff56P = easeOutCubic(clamp01((p5 - 0.50) / 0.28))
    audioManager?.onSeq6Zoom(handoff56P)
    const zoom56P    = easeOutCubic(clamp01((p5 - 0.60) / 0.15))

    seq5Base.style.opacity   = ((1 - swap5P) * (1 - handoff56P)).toFixed(3)
    seq5Base.style.transform = `translateX(${(-120 * handoff56P).toFixed(2)}%) scale(${(1 - 0.03 * handoff56P).toFixed(4)})`
    seq5Swap.style.opacity   = (swap5P * (1 - handoff56P)).toFixed(3)
    seq5Swap.style.transform = `translateX(${(-120 * handoff56P).toFixed(2)}%) scale(${(1 - 0.03 * handoff56P).toFixed(4)})`

    seq5Next.style.opacity         = handoff56P.toFixed(3)
    seq5Next.style.transformOrigin = '50% 50%'
    if (seq5TextA) seq5TextA.style.opacity = (1 - handoff56P).toFixed(3)
    if (seq5TextB) seq5TextB.style.opacity = handoff56P.toFixed(3)
    const objPosY = 50 - 40 * zoom56P
    seq5Next.style.objectPosition  = `center ${objPosY.toFixed(1)}%`
    seq5Next.style.transform       = `translateX(${(120 * (1 - handoff56P)).toFixed(2)}%) scale(${(1 + 0.75 * zoom56P).toFixed(4)})`
    seq5Next.style.filter          = 'none'

    const darkness = easeOutCubic(clamp01((p5 - 0.992) / 0.008))
    seq5Stack.style.setProperty('--seq5-darkness', darkness.toFixed(3))

    const seq5Rect  = seq5.getBoundingClientRect()
    const seq5InView = seq5Rect.bottom > 0 && seq5Rect.top < window.innerHeight
    document.body.classList.toggle('mask-off-8778',   seq5InView && p5 > 0.48 && darkness < 0.05)
    document.body.classList.toggle('mask-dark-lock',  seq5InView && darkness > 0.02)
  }

  function requestUpdate() {
    if (ticking) return; ticking = true; requestAnimationFrame(updateChain)
  }
  window.addEventListener('scroll', requestUpdate, { passive: true })
  window.addEventListener('resize', requestUpdate, { passive: true })
  requestUpdate()
}

// ── Slides 9 + 11 — handoffs + speech bubble ──
function initSeq9Fade() {
  const slide9  = document.querySelector('.slide-seq9')
  const slide11 = document.querySelector('.slide-seq11')
  if (!slide9 || !slide11) return
  const baseLayer   = slide9.querySelector('.seq9-layer--look')
  const fadeLayer   = slide9.querySelector('.seq9-layer--fade')
  const nextLayer   = slide9.querySelector('.seq9-layer--next')
  const backFrom    = slide11.querySelector('.seq11-layer--from')
  const backTo      = slide11.querySelector('.seq11-layer--to')
  const speechBubble = document.getElementById('speech-bubble-11')
  if (!baseLayer || !fadeLayer || !nextLayer || !backFrom || !backTo) return

  let ticking = false

  function updateFade() {
    ticking = false
    const p9 = getP(slide9), p11 = getP(slide11)

    const fadeP   = easeOutCubic(clamp01((p9 - 0.18) / 0.28))
    const handoffP = easeOutCubic(clamp01((p9 - 0.64) / 0.26))
    baseLayer.style.opacity   = (1 - fadeP).toFixed(3)
    fadeLayer.style.opacity   = (fadeP * (1 - handoffP)).toFixed(3)
    fadeLayer.style.transform = `translateX(${(-120 * handoffP).toFixed(2)}%)`
    nextLayer.style.opacity   = handoffP.toFixed(3)
    nextLayer.style.transform = `translateX(${(120 - 120 * handoffP).toFixed(2)}%)`

    const backP = easeOutCubic(clamp01((p11 - 0.14) / 0.58))
    backFrom.style.opacity   = (1 - backP).toFixed(3)
    backFrom.style.transform = `translateX(${(120 * backP).toFixed(2)}%)`
    backTo.style.opacity     = backP.toFixed(3)
    backTo.style.transform   = `translateX(${(-120 + 120 * backP).toFixed(2)}%)`

    if (speechBubble) {
      const bubbleIn  = easeOutCubic(clamp01((backP - 0.38) / 0.22))
      const bubbleOut = easeOutCubic(clamp01((backP - 0.94) / 0.06))
      speechBubble.style.opacity   = (bubbleIn * (1 - bubbleOut)).toFixed(3)
      speechBubble.style.transform = `rotate(-2.5deg) scale(${(0.78 + 0.22 * bubbleIn).toFixed(3)})`
    }
  }

  function requestUpdate() {
    if (ticking) return; ticking = true; requestAnimationFrame(updateFade)
  }
  window.addEventListener('scroll', requestUpdate, { passive: true })
  window.addEventListener('resize', requestUpdate, { passive: true })
  requestUpdate()
}

// ── Slide 13 — credits hold + Sarah POV exit ──
function initFinalSequence() {
  const slideFinal = document.querySelector('.slide-final-image')
  if (!slideFinal) return
  const frontLayer = slideFinal.querySelector('.final-layer--look')
  const backLayer  = slideFinal.querySelector('.final-layer--back')
  const textWindow = slideFinal.querySelector('.final-text-window')
  const credits    = document.getElementById('final-credits')
  const endTitle   = document.getElementById('final-end-title')
  const povExit    = slideFinal.querySelector('.final-pov-exit')
  if (!frontLayer || !backLayer || !textWindow || !credits || !endTitle) return

  credits.style.opacity  = '1'
  credits.style.transform = 'none'
  endTitle.style.opacity  = '1'
  endTitle.style.transform = 'none'

  let ticking = false

  function updateFinal() {
    ticking = false
    const p = getP(slideFinal)

    const cameraP = easeInOutCubic(clamp01((p - 0.58) / 0.36))
    frontLayer.style.transform = `scale(${(1.0 + 0.06 * Math.max(0, 1 - cameraP)).toFixed(4)})`
    frontLayer.style.opacity   = '1'

    const backP = easeOutCubic(clamp01((p - 0.22) / 0.28))
    backLayer.style.transform = `translateY(${(-130 * backP).toFixed(2)}%)`
    backLayer.style.opacity   = (1 - easeOutCubic(clamp01((p - 0.32) / 0.22))).toFixed(3)

    const TEXT_LOCK = 0.48
    const rollP = easeInOut(clamp01((p - 0.04) / (TEXT_LOCK - 0.04)))
    const textY = 60 - 60 * Math.min(rollP, 1)
    textWindow.style.transform = `translate(-50%, calc(-50% + ${textY.toFixed(1)}vh))`
    textWindow.style.opacity   = (1 - easeOutCubic(clamp01((p - 0.62) / 0.22))).toFixed(3)

    if (povExit) {
      const exitT = easeInOutCubic(clamp01((p - 0.60) / 0.34))
      povExit.style.opacity   = exitT.toFixed(3)
      povExit.style.transform = `translateY(-50%) scale(${(2.2 - 1.2 * exitT).toFixed(4)})`
    }
  }

  function requestUpdate() {
    if (ticking) return; ticking = true; requestAnimationFrame(updateFinal)
  }
  window.addEventListener('scroll', requestUpdate, { passive: true })
  window.addEventListener('resize', requestUpdate, { passive: true })
  requestUpdate()
}

// ── Word-by-word scroll reveal ─────────────────
function initWordReveals() {
  document.querySelectorAll('.slide-dark-reveal').forEach(slide => {
    const words = Array.from(slide.querySelectorAll('.word-reveal'))
    if (!words.length) return
    let ticking = false

    function update() {
      ticking = false
      const rect   = slide.getBoundingClientRect()
      const travel = Math.max(1, slide.offsetHeight - window.innerHeight)
      const p      = clamp01(-rect.top / travel)
      const REVEAL_START = 0.10, REVEAL_END = 0.60
      const step = Math.max(0.001, (REVEAL_END - REVEAL_START) / words.length)
      words.forEach((word, i) => {
        const threshold = REVEAL_START + i * step
        const ease      = easeOutCubic(clamp01((p - threshold) / Math.max(0.001, step)))
        word.style.opacity   = ease.toFixed(3)
        word.style.transform = `translateY(${(16 - 16 * ease).toFixed(1)}px)`
      })
    }

    function requestUpdate() {
      if (ticking) return; ticking = true; requestAnimationFrame(update)
    }
    window.addEventListener('scroll', requestUpdate, { passive: true })
    window.addEventListener('resize', requestUpdate, { passive: true })
    update()
  })
}

// ── Grain canvas ──────────────────────────────
function initGrain() {
  const canvas = document.getElementById('grain-canvas')
  if (!canvas) return { setLevel: () => {} }
  const ctx = canvas.getContext('2d')
  const LEVELS = [
    [0.05, 245], [0.07, 232], [0.09, 218], [0.11, 205], [0.14, 188],
    [0.17, 168], [0.19, 152], [0.22, 128], [0.20, 140], [0.21, 134],
    [0.19, 148], [0.15, 172], [0.10, 202], [0.05, 245],
  ]
  const W = 256, H = 256
  const tile = document.createElement('canvas')
  tile.width = W; tile.height = H
  const tCtx = tile.getContext('2d')
  let currentMaxVal = LEVELS[0][1]

  function resizeCanvas() {
    canvas.width  = window.innerWidth
    canvas.height = window.innerHeight
  }

  function drawGrain(maxVal) {
    ctx.clearRect(0, 0, canvas.width, canvas.height)
    const imgData = tCtx.createImageData(W, H)
    const d = imgData.data
    for (let i = 0; i < d.length; i += 4) {
      const v = (Math.random() * maxVal) | 0
      d[i] = d[i+1] = d[i+2] = v; d[i+3] = 255
    }
    tCtx.putImageData(imgData, 0, 0)
    const ox = (Math.random() * W) | 0, oy = (Math.random() * H) | 0
    for (let x = -ox; x < canvas.width; x += W)
      for (let y = -oy; y < canvas.height; y += H)
        ctx.drawImage(tile, x, y)
  }

  resizeCanvas()
  drawGrain(currentMaxVal)
  window.addEventListener('resize', () => { resizeCanvas(); drawGrain(currentMaxVal) }, { passive: true })

  return {
    setLevel(idx) {
      const level = Math.min(idx, LEVELS.length - 1)
      const [op, targetMv] = LEVELS[level]
      canvas.style.opacity = op
      const startMv = currentMaxVal
      for (let i = 1; i <= 8; i++) {
        setTimeout(() => {
          const t = i / 8, e = 1 - Math.pow(1 - t, 2)
          currentMaxVal = Math.round(startMv + (targetMv - startMv) * e)
          drawGrain(currentMaxVal)
        }, i * 150)
      }
    }
  }
}

// ── Audio ─────────────────────────────────────
function initAudio() {
  // Note: MetroNoise .wav has a literal space before the extension — URL-encode it
  const snd = {
    metroNoise : new Audio('sounds/MetroNoise%20.wav'),
    metroBg    : new Audio('sounds/MetroBackground.wav'),
    openDoor   : new Audio('sounds/OpenDoor.wav'),
    drone      : new Audio('sounds/Drone.mp3'),
    heartbeat  : new Audio('sounds/Hearbeat.mp3'),
  }
  snd.metroNoise.loop = false
  snd.metroBg.loop    = true
  snd.openDoor.loop   = false
  snd.drone.loop      = true
  snd.heartbeat.loop  = true
  Object.values(snd).forEach(s => { s.preload = 'auto'; s.volume = 0 })

  function fadeTo(audio, target, ms, cb) {
    const from = audio.volume, t0 = performance.now()
    ;(function step(now) {
      const p = Math.min((now - t0) / ms, 1)
      audio.volume = from + (target - from) * (1 - Math.pow(1 - p, 2))
      if (p < 1) requestAnimationFrame(step)
      else { audio.volume = target; cb?.() }
    })(t0)
  }

  // Browsers block audio.play() until a trusted user gesture (click/keydown).
  // Queue sounds that arrive before unlock; drain on first click.
  let unlocked = false
  const queue = []  // each entry: { audio, onPlay? }

  function playWhenReady(audio, onPlay) {
    if (unlocked) {
      audio.play().catch(() => {})
      onPlay?.()
    } else {
      queue.push({ audio, onPlay })
    }
  }

  function unlock() {
    if (unlocked) return
    unlocked = true
    while (queue.length) {
      const { audio, onPlay } = queue.shift()
      audio.play().catch(() => {})
      onPlay?.()
    }
  }

  // Unlock on any trusted gesture — click is the reliable one for Firefox
  ;['click', 'keydown', 'touchend'].forEach(ev =>
    document.addEventListener(ev, unlock, { once: true, passive: true })
  )

  let seq1Active = false, metroBgStarted = false, droneStarted = false, seq12Handled = false

  return {
    // Called from cutToSlide1 (inside user gesture), not from the observer
    onSeq1Start() {
      if (seq1Active) return
      seq1Active = true
      snd.metroNoise.volume = 1
      snd.metroNoise.currentTime = 0
      playWhenReady(snd.metroNoise)
    },
    onSeq1End() {
      seq1Active = false
      snd.metroNoise.pause()
      if (metroBgStarted) return
      metroBgStarted = true
      snd.metroBg.volume = 0
      snd.metroBg.currentTime = 0
      playWhenReady(snd.metroBg, () => fadeTo(snd.metroBg, 1, 2000))
    },
    onSeq6Zoom(handoff56P) {
      if (droneStarted || handoff56P < 0.05) return
      droneStarted = true
      snd.drone.volume = 0
      snd.heartbeat.volume = 0
      snd.drone.currentTime = 0
      snd.heartbeat.currentTime = 0
      playWhenReady(snd.drone,     () => fadeTo(snd.drone, 1, 2500))
      playWhenReady(snd.heartbeat, () => fadeTo(snd.heartbeat, 0.75, 2500))
    },
    onSeq12Start() {
      if (seq12Handled) return
      seq12Handled = true
      fadeTo(snd.metroBg,   0, 2500, () => snd.metroBg.pause())
      fadeTo(snd.drone,     0, 2500, () => snd.drone.pause())
      fadeTo(snd.heartbeat, 0, 2500, () => snd.heartbeat.pause())
      setTimeout(() => {
        snd.openDoor.volume = 1
        snd.openDoor.currentTime = 0
        playWhenReady(snd.openDoor)
      }, 800)
    },
    setMuted(muted) {
      Object.values(snd).forEach(s => { s.muted = muted })
    },
    unlock,
  }
}

// ── Consolidated IntersectionObserver ─────────
// Single observer with two thresholds replaces the three separate per-slide
// observer sets that the old code used (one for active state, two for current
// slide tracking in keyboard nav and footer).
function initObserver(grain) {
  const obs = new IntersectionObserver(entries => {
    entries.forEach(entry => {
      const slide = entry.target
      const idx   = parseInt(slide.dataset.slide, 10) - 1
      const isPinnedTrain = slide.classList.contains('slide-immersive--train')
      const rect  = entry.boundingClientRect

      // 60% threshold: track which slide is "current" for keyboard + footer
      if (entry.intersectionRatio >= 0.6) {
        currentSlide   = idx
        activeSlideIdx = idx
      }

      if (entry.isIntersecting) {
        slide.classList.add('active'); slide.classList.remove('past')
        setActiveStop(idx); grain.setLevel(idx)
        slide.querySelectorAll('.stat-number[data-target]:not([data-count-trigger="manual"])').forEach(animateCounter)
        if (idx === 1)  audioManager?.onSeq1End()    // slide 2 visible = train section done
        if (idx === 11) audioManager?.onSeq12Start()
      } else {
        if (isPinnedTrain && rect.bottom > 0) {
          slide.classList.add('active'); slide.classList.remove('past')
          setActiveStop(idx); grain.setLevel(idx)
          slide.querySelectorAll('.stat-number[data-target]:not([data-count-trigger="manual"])').forEach(animateCounter)
          return
        }
        slide.classList.remove('active')
        if (rect.top < 0) slide.classList.add('past')
        else slide.classList.remove('past')
      }
    })
  }, { threshold: [0.15, 0.6] })
  SLIDES.forEach(s => obs.observe(s))
}

// ── Keyboard navigation ───────────────────────
function initKeyboard() {
  document.addEventListener('keydown', e => {
    if (e.key === 'ArrowDown' || e.key === 'PageDown')
      SLIDES[Math.min(currentSlide + 1, TOTAL - 1)]?.scrollIntoView({ behavior: 'smooth' })
    if (e.key === 'ArrowUp' || e.key === 'PageUp')
      SLIDES[Math.max(currentSlide - 1, 0)]?.scrollIntoView({ behavior: 'smooth' })
  })
}

// ── Intro ─────────────────────────────────────
function initIntro() {
  const introEl   = document.getElementById('intro')
  if (!introEl) return
  const introCopy = introEl.querySelector('.intro-copy')
  const introGif  = introEl.querySelector('.intro-gif')
  const introHint = document.getElementById('intro-hint')

  // Intro is a fixed overlay — slide 1 is underneath from the start
  document.body.classList.add('intro-active')

  // Step 1: after 3s, text fades out and GIF fades in simultaneously
  setTimeout(() => {
    if (introCopy) {
      introCopy.style.transition = 'opacity 0.8s ease'
      introCopy.style.opacity    = '0'
    }
    if (introGif) {
      introGif.style.transition = 'opacity 0.8s ease'
      introGif.style.opacity    = '1'
    }
  }, 3000)

  // Step 2: hint appears on the GIF once the fade is complete (~3.8s)
  setTimeout(() => { if (introHint) introHint.classList.add('visible') }, 3900)

  // Step 3: click on the intro hard-cuts to slide 1 and unlocks audio
  let cut = false
  function cutToSlide1() {
    if (cut) return
    cut = true
    audioManager?.unlock()
    audioManager?.onSeq1Start()
    introEl.style.display = 'none'
    document.body.classList.remove('intro-active')
    if (SLIDES[0]) SLIDES[0].classList.add('active')
    setActiveStop(0)
  }
  introEl.addEventListener('click', cutToSlide1, { once: true })
}

// ── Footer ────────────────────────────────────
function initFooter() {
  const hint = document.getElementById('slide-hint')
  if (!hint) return
  let timer = null, autoScrollEnabled = false, autoScrollFrame = null

  function show() {
    if (document.body.classList.contains('intro-active')) return
    if (activeSlideIdx >= TOTAL - 1) return
    if (window.innerHeight + window.scrollY >= document.documentElement.scrollHeight - window.innerHeight * 0.8) return
    hint.classList.add('visible')
  }
  function reset() {
    hint.classList.remove('visible')
    clearTimeout(timer)
    timer = setTimeout(show, 5000)
  }
  ;['scroll', 'mousemove', 'keydown', 'touchstart', 'click'].forEach(ev => {
    document.addEventListener(ev, reset, { passive: true })
  })

  const btnMotion = document.getElementById('btn-motion')
  btnMotion?.addEventListener('click', () => {
    const off = document.body.classList.toggle('reduce-motion')
    btnMotion.classList.toggle('off', off)
    btnMotion.setAttribute('aria-pressed', String(off))
  })

  const btnAutoScroll = document.getElementById('btn-autoscroll')
  if (btnAutoScroll) {
    btnAutoScroll.classList.add('off')
    btnAutoScroll.addEventListener('click', () => {
      if (autoScrollEnabled) {
        autoScrollEnabled = false
        if (autoScrollFrame) { cancelAnimationFrame(autoScrollFrame); autoScrollFrame = null }
        btnAutoScroll.classList.add('off')
        btnAutoScroll.setAttribute('aria-pressed', 'false')
      } else {
        autoScrollEnabled = true
        btnAutoScroll.classList.remove('off')
        btnAutoScroll.setAttribute('aria-pressed', 'true')
        const tick = () => {
          if (!autoScrollEnabled) return
          const nearEnd = window.innerHeight + window.scrollY >= document.documentElement.scrollHeight - 3
          if (document.body.classList.contains('intro-active') || nearEnd || activeSlideIdx >= TOTAL - 1) {
            autoScrollEnabled = false; btnAutoScroll.classList.add('off'); return
          }
          window.scrollBy({ top: AUTO_SCROLL_SPEED, left: 0, behavior: 'auto' })
          autoScrollFrame = requestAnimationFrame(tick)
        }
        autoScrollFrame = requestAnimationFrame(tick)
      }
    })
  }

  const btnSound = document.getElementById('btn-sound')
  btnSound?.addEventListener('click', () => {
    const muted = document.body.classList.toggle('muted')
    btnSound.classList.toggle('off', muted)
    btnSound.setAttribute('aria-pressed', String(muted))
    audioManager?.setMuted(muted)
  })
  reset()
}

// ── Memorials ─────────────────────────────────
function initMemorials() {
  document.querySelectorAll('[data-memorial]').forEach(cross => {
    const id       = cross.dataset.memorial
    const memorial = document.getElementById(`memorial-${id}`)
    if (!memorial) return
    const ZONE_SIZE = 64
    const zone = document.createElement('div')
    zone.className = 'memorial-zone'
    document.body.appendChild(zone)

    function placeZone() {
      const r = cross.getBoundingClientRect()
      zone.style.left = (r.left + r.width  / 2 - ZONE_SIZE / 2) + 'px'
      zone.style.top  = (r.top  + r.height / 2 - ZONE_SIZE / 2) + 'px'
    }

    function positionMemorial() {
      const r  = cross.getBoundingClientRect()
      const cx = r.left + r.width / 2, cy = r.top + r.height / 2
      memorial.style.top = cy + 'px'
      if (cx > window.innerWidth / 2) {
        memorial.style.left      = (cx - 12) + 'px'
        memorial.style.transform = 'translateX(-100%) translateY(-50%)'
      } else {
        memorial.style.left      = (cx + 12) + 'px'
        memorial.style.transform = 'translateY(-50%)'
      }
    }

    placeZone()
    window.addEventListener('scroll', placeZone, { passive: true })
    window.addEventListener('resize', placeZone, { passive: true })

    // Desktop: hover
    zone.addEventListener('mouseenter', () => { positionMemorial(); memorial.classList.add('show') })
    zone.addEventListener('mouseleave', () => memorial.classList.remove('show'))

    // Mobile/touch: tap to toggle
    zone.addEventListener('click', e => {
      e.stopPropagation()
      if (memorial.classList.contains('show')) {
        memorial.classList.remove('show')
      } else {
        positionMemorial()
        memorial.classList.add('show')
        document.addEventListener('click', () => memorial.classList.remove('show'), { once: true })
      }
    })
  })
}

// ── Isolated stat counters ────────────────────
function initStatCounters() {
  document.querySelectorAll('[data-count-trigger="manual"][data-target]').forEach(el => {
    if (el.dataset.counted) return
    new IntersectionObserver(entries => {
      if (!entries[0].isIntersecting) return
      setTimeout(() => animateCounter(el), 600)
    }, { threshold: 0.3 }).observe(el)
  })
}

// ── Init ──────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  audioManager = initAudio()
  initIntro()
  buildMetroNav()
  initMemorials()
  const grain = initGrain()
  initObserver(grain)
  initKeyboard()
  initFooter()
  initFirstSceneMotion()
  initSecondSceneReveal()
  initSeq345Chain()
  initSeq9Fade()
  initFinalSequence()
  initWordReveals()
  initStatCounters()
  if (SLIDES[0]) SLIDES[0].classList.add('active')
  setActiveStop(0)
})
