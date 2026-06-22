import { useEffect } from "react"
import "../imports/style.css"

const imageModules = import.meta.glob<{ default: string }>(
  "/src/imports/images/**/*.{png,jpg,jpeg,PNG,JPG,JPEG,webp,WEBP}",
  { eager: true }
)

function img(path: string): string {
  const mod = imageModules[`/src/imports/images/${path}`]
  return mod?.default ?? ""
}

export default function App() {
  useEffect(() => {
    const SLIDES = Array.from(document.querySelectorAll<HTMLElement>(".slide"))
    const TOTAL = SLIDES.length
    const AUTO_SCROLL_SPEED = 30
    const STOP_SLIDES = [1, 3, 8, 10, 13]
    const STOP_NAMES = ["Entrée", "L'espace", "La fuite", "Le silence", "Terminus"]

    const SLIDE_BG: Record<number, string> = {
      1: "#FAF6F6", 2: "#F6F2EF", 3: "#EEE7E2",
      4: "#FAF6F6",
      5: "#E3DAD4", 6: "#D5CCC5",
      7: "#000000",
      8: "#0a0a0e", 9: "#0a0a0e", 10: "#0a0a0e", 11: "#0a0a0e",
      12: "#FAF6F6", 13: "#FAF6F6",
    }

    // Shared mutable state — updated by the consolidated observer
    let currentSlide = 0
    let activeSlideIdx = 0

    // ── Shared utilities ──────────────────────────
    const clamp01 = (v: number) => Math.min(Math.max(v, 0), 1)
    const easeOutCubic = (t: number) => 1 - Math.pow(1 - t, 3)
    const easeInOutCubic = (t: number) =>
      t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2
    const easeInOut = (t: number) => t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t
    const getP = (sl: HTMLElement) =>
      clamp01(-sl.getBoundingClientRect().top / Math.max(1, sl.offsetHeight - window.innerHeight))

    // ── Listener registry for cleanup on unmount ───
    const cleanups: Array<() => void> = []
    function reg(
      target: EventTarget,
      type: string,
      fn: EventListener,
      opts?: boolean | AddEventListenerOptions
    ) {
      target.addEventListener(type, fn, opts)
      cleanups.push(() => target.removeEventListener(type, fn, opts))
    }

    // ── Metro nav ─────────────────────────────────
    function buildMetroNav() {
      const container = document.getElementById("metro-stops")
      if (!container) return
      STOP_NAMES.forEach((name, s) => {
        const btn = document.createElement("button")
        btn.className = "metro-stop-item"
        btn.dataset.stop = String(s)
        if (s === 0 || s === STOP_NAMES.length - 1) btn.classList.add("terminus")
        btn.setAttribute("aria-label", `Séquence — ${name}`)
        btn.innerHTML = `<div class="stop-circle"></div><span class="stop-name">${name}</span>`
        btn.addEventListener("click", () => {
          const target = SLIDES.find(sl => parseInt(sl.dataset.slide ?? "0", 10) === STOP_SLIDES[s])
          if (target) target.scrollIntoView({ behavior: "smooth" })
        })
        container.appendChild(btn)
      })
      requestAnimationFrame(() => updateMetroFill(0))
      reg(window, "resize", () => {
        const activeStop = document.querySelector<HTMLElement>(".metro-stop-item.active")
        const stopIdx = activeStop ? parseInt(activeStop.dataset.stop ?? "0", 10) : 0
        updateMetroFill(stopIdx)
      }, { passive: true })
    }

    function updateMetroFill(stopIdx: number) {
      const track = document.querySelector<HTMLElement>(".metro-track-container")
      const fill = document.getElementById("metro-fill")
      const bgLine = document.querySelector<HTMLElement>(".metro-bg-line")
      const stops = document.querySelectorAll<HTMLElement>(".metro-stop-item")
      if (!track || !fill || !bgLine || !stops.length) return
      const trackRect = track.getBoundingClientRect()
      const first = stops[0].getBoundingClientRect()
      const last = stops[stops.length - 1].getBoundingClientRect()
      const firstCenter = (first.left + first.width / 2) - trackRect.left
      const lastCenter = (last.left + last.width / 2) - trackRect.left
      const firstCenterY = (first.top + first.height / 2) - trackRect.top
      const lineHeight = parseFloat(getComputedStyle(fill).height) || 5
      bgLine.style.left = `${firstCenter}px`
      bgLine.style.width = `${Math.max(0, lastCenter - firstCenter)}px`
      bgLine.style.top = `${firstCenterY - lineHeight / 2}px`
      fill.style.left = `${firstCenter}px`
      fill.style.top = `${firstCenterY - lineHeight / 2}px`
      if (stopIdx === 0) { fill.style.width = "0px"; return }
      const active = stops[stopIdx].getBoundingClientRect()
      const activeCenter = (active.left + active.width / 2) - trackRect.left
      fill.style.width = Math.max(0, activeCenter - firstCenter) + "px"
    }

    function setActiveStop(slideIdx: number) {
      const foundSlide = SLIDES.find(sl => (parseInt(sl.dataset.slide ?? "0", 10) - 1) === slideIdx)
      const currentDataSlide = foundSlide
        ? parseInt(foundSlide.dataset.slide ?? "0", 10)
        : slideIdx + 1
      let stopIdx = 0
      for (let s = 0; s < STOP_SLIDES.length; s++) {
        if (currentDataSlide >= STOP_SLIDES[s]) stopIdx = s
      }
      const darkSet = new Set([7, 8, 9, 10, 11])
      document.body.classList.toggle("chapter-dark", darkSet.has(currentDataSlide))
      document.body.classList.remove("chapter-dim-1", "chapter-dim-2", "chapter-dim-3")
      if (currentDataSlide === 3) document.body.classList.add("chapter-dim-1")
      else if (currentDataSlide === 5) document.body.classList.add("chapter-dim-2")
      else if (currentDataSlide === 6) document.body.classList.add("chapter-dim-3")
      const bg = SLIDE_BG[currentDataSlide]
      if (bg) document.body.style.backgroundColor = bg
      document.querySelectorAll<HTMLElement>(".metro-stop-item").forEach((s, i) => {
        s.classList.toggle("active", i === stopIdx)
        s.classList.toggle("visited", i < stopIdx)
      })
      updateMetroFill(stopIdx)
      const nav = document.getElementById("metro-nav")
      if (nav) nav.style.backgroundColor = "transparent"
    }

    // ── Counter animation ─────────────────────────
    function animateCounter(el: HTMLElement) {
      if (el.dataset.counted) return
      el.dataset.counted = "1"
      const target = parseInt(el.dataset.target ?? "0", 10)
      const grouped = el.dataset.grouped === "true"
      const formatter = grouped ? new Intl.NumberFormat("fr-FR") : null
      const dur = 1400, t0 = performance.now();
      (function step(now: number) {
        const p = Math.min((now - t0) / dur, 1)
        const value = Math.round((1 - Math.pow(1 - p, 3)) * target)
        const displayValue = formatter
          ? formatter.format(value).replace(/[  ]/g, " ")
          : String(value)
        el.textContent = displayValue
        if (p < 1) requestAnimationFrame(step)
        else el.textContent = formatter
          ? formatter.format(target).replace(/[  ]/g, " ")
          : String(target)
      })(t0)
    }

    // ── Slide 1 — train arrival ───────────────────
    function initFirstSceneMotion() {
      const slide = document.querySelector<HTMLElement>(".slide-immersive--train")
      if (!slide) return
      const motion = slide.querySelector<HTMLElement>(".scene-motion")
      if (!motion) return
      const baseLayer = slide.querySelector<HTMLImageElement>(".scene-layer--base")
      const overlayLayer = slide.querySelector<HTMLImageElement>(".scene-layer--overlay")
      let strip = motion.querySelector<HTMLImageElement>(".motion-layer--strip")
      if (!strip) {
        strip = document.createElement("img")
        strip.className = "motion-layer motion-layer--strip"
        strip.src = img("seq1/IMG_8757.png")
        strip.alt = ""
        strip.setAttribute("aria-hidden", "true")
        motion.appendChild(strip)
      }
      const stripEl = strip
      let ticking = false

      function updateMotion() {
        ticking = false
        const rect = slide.getBoundingClientRect()
        const travel = Math.max(1, slide.offsetHeight - window.innerHeight)
        const progress = clamp01(-rect.top / travel)
        const ARRIVAL_END = 0.70, HOLD_END = 0.78, PARALLAX_END = 0.98
        const BLUR_MAX = 100, BLUR_END = 0.62
        const baseHeight = Math.round(baseLayer?.getBoundingClientRect().height || window.innerHeight)
        stripEl.style.height = `${baseHeight}px`
        stripEl.style.width = "auto"
        stripEl.style.top = `${Math.round((window.innerHeight - baseHeight) / 2)}px`
        const START_X = -30640
        const x = progress <= ARRIVAL_END
          ? START_X + (-START_X) * easeOutCubic(clamp01(progress / ARRIVAL_END))
          : 0
        const blurT = clamp01(progress / BLUR_END)
        const blurPx = progress < BLUR_END ? BLUR_MAX * (1 - easeOutCubic(blurT)) : 0
        const arrivalT = clamp01(progress / ARRIVAL_END)
        const speedFactor = progress < ARRIVAL_END ? 1 - easeOutCubic(arrivalT) : 0
        const stretchX = 1 + 0.22 * speedFactor
        const squashY = 1 - 0.04 * speedFactor
        const contrastBoost = 1 + 0.28 * speedFactor
        const saturateBoost = 1 + 0.18 * speedFactor
        let parallaxT = 0
        if (progress > HOLD_END) parallaxT = clamp01((progress - HOLD_END) / (PARALLAX_END - HOLD_END))
        const p = easeInOutCubic(parallaxT)
        const baseScale = 1 + 0.06 * p
        const stripScale = 1 + 0.03 * p
        const overlayScale = 1 + 0.34 * p
        const overlayOpacity = 1 - p
        motion.style.transform = "translate3d(0, 0, 0)"
        stripEl.style.transformOrigin = "left center"
        stripEl.style.transform = `translate3d(${x}px, 0, 0) scaleX(${(stripScale * stretchX).toFixed(4)}) scaleY(${(stripScale * squashY).toFixed(4)})`
        stripEl.style.filter = `blur(${blurPx.toFixed(2)}px) contrast(${contrastBoost.toFixed(3)}) saturate(${saturateBoost.toFixed(3)})`
        if (baseLayer) baseLayer.style.transform = `translateY(-50%) scale(${baseScale})`
        if (overlayLayer) {
          overlayLayer.style.transform = `translateY(-50%) scale(${overlayScale})`
          overlayLayer.style.opacity = overlayOpacity.toFixed(3)
        }
      }

      function requestUpdate() {
        if (ticking) return; ticking = true; requestAnimationFrame(updateMotion)
      }
      reg(window, "scroll", requestUpdate, { passive: true })
      reg(window, "resize", requestUpdate, { passive: true })
      reg(stripEl, "load", requestUpdate, { once: true })
      requestUpdate()
    }

    // ── Slide 2 — wagon fills ─────────────────────
    function initSecondSceneReveal() {
      const slide = document.querySelector<HTMLElement>(".slide-seq2")
      if (!slide) return
      const layers = Array.from(slide.querySelectorAll<HTMLElement>(".seq2-reveal")).reverse()
      if (!layers.length) return
      let ticking = false

      function updateReveal() {
        ticking = false
        const rect = slide.getBoundingClientRect()
        const travel = Math.max(1, slide.offsetHeight - window.innerHeight)
        const progress = clamp01(-rect.top / travel)
        const REVEAL_START = 0.10, REVEAL_END = 0.90, holdEnd = 0.98
        const layerStep = Math.max(0.001, REVEAL_END - REVEAL_START) / layers.length
        layers.forEach((layer, i) => {
          const start = REVEAL_START + i * layerStep
          const end = start + layerStep
          const local = clamp01((progress - start) / Math.max(0.001, end - start))
          layer.style.opacity = (progress >= holdEnd ? 1 : 1 - Math.pow(1 - local, 2)).toFixed(3)
        })
      }

      function requestUpdate() {
        if (ticking) return; ticking = true; requestAnimationFrame(updateReveal)
      }
      reg(window, "scroll", requestUpdate, { passive: true })
      reg(window, "resize", requestUpdate, { passive: true })
      requestUpdate()
    }

    // ── Slides 3-4-5 — chained + facts ───────────
    function initSeq345Chain() {
      const seq3 = document.querySelector<HTMLElement>(".slide-seq3")
      const seq4 = document.querySelector<HTMLElement>(".slide-seq4")
      const seq5 = document.querySelector<HTMLElement>(".slide-seq5")
      if (!seq3 || !seq4 || !seq5) return
      const seq3Base = seq3.querySelector<HTMLElement>(".seq3-layer--base")
      const seq3Swap = seq3.querySelector<HTMLElement>(".seq3-layer--swap")
      const seq3Stack = seq3.querySelector<HTMLElement>(".scene-stack--seq3")
      const seq4Look = seq4.querySelector<HTMLElement>(".seq4-layer--look")
      const seq5Stack = seq5.querySelector<HTMLElement>(".scene-stack--seq5")
      const seq5Base = seq5.querySelector<HTMLElement>(".seq5-layer--base")
      const seq5Swap = seq5.querySelector<HTMLElement>(".seq5-layer--swap")
      const seq5Next = seq5.querySelector<HTMLElement>(".seq5-layer--next")
      const seq4Fact = document.getElementById("fact-seq4")
      const seq4FactTrack = document.getElementById("fact-seq4-track") as HTMLElement | null
      if (!seq3Base || !seq3Swap || !seq3Stack || !seq4Look || !seq5Stack || !seq5Base || !seq5Swap || !seq5Next) return

      let ticking = false, seq4FactStage = -1

      function updateChain() {
        ticking = false
        const p3 = getP(seq3), p4 = getP(seq4), p5 = getP(seq5)

        // seq3
        const swapP = easeOutCubic(clamp01((p3 - 0.14) / 0.36))
        const out3P = easeOutCubic(clamp01((p3 - 0.64) / 0.28))
        seq3Base.style.opacity = (1 - swapP).toFixed(3)
        seq3Swap.style.opacity = swapP.toFixed(3)
        seq3Swap.style.transform = "translateY(0%) scale(1)"
        seq3Stack.style.opacity = (1 - out3P).toFixed(3)
        seq3Stack.style.transform = `translateY(${(-5 * out3P).toFixed(2)}%)`

        // seq4
        const in4P = easeOutCubic(clamp01((p4 - 0.04) / 0.14))
        const out4P = easeOutCubic(clamp01((p4 - 0.82) / 0.14))
        seq4Look.style.opacity = (in4P * (1 - out4P)).toFixed(3)
        seq4Look.style.transform = `translateY(${(-4 * (1 - in4P) - 4 * out4P).toFixed(2)}%) scale(${(0.990 + 0.010 * in4P).toFixed(4)})`

        if (seq4Fact) {
          const fact4Show = easeOutCubic(clamp01((p4 - 0.06) / 0.10))
          const fact4Hide = easeOutCubic(clamp01((p4 - 0.92) / 0.06))
          seq4Fact.style.opacity = (fact4Show * (1 - fact4Hide)).toFixed(3)
          seq4Fact.style.transform = `translateY(${(14 * (1 - fact4Show)).toFixed(2)}px)`

          if (seq4FactTrack) {
            const nextStage = p4 >= 0.72 ? 2 : p4 >= 0.42 ? 1 : 0
            if (nextStage !== seq4FactStage) {
              seq4FactStage = nextStage
              seq4FactTrack.style.transition = "transform 1.1s cubic-bezier(0.22, 0.61, 0.36, 1)"
              seq4FactTrack.style.transform = `translateY(-${((100 / 3) * nextStage).toFixed(4)}%)`
            }
          }
        }

        // seq5
        const swap5P = easeOutCubic(clamp01((p5 - 0.10) / 0.34))
        const handoff56P = easeOutCubic(clamp01((p5 - 0.50) / 0.28))
        const zoom56P = easeOutCubic(clamp01((p5 - 0.60) / 0.15))

        seq5Base.style.opacity = ((1 - swap5P) * (1 - handoff56P)).toFixed(3)
        seq5Base.style.transform = `translateX(${(-120 * handoff56P).toFixed(2)}%) scale(${(1 - 0.03 * handoff56P).toFixed(4)})`
        seq5Swap.style.opacity = (swap5P * (1 - handoff56P)).toFixed(3)
        seq5Swap.style.transform = `translateX(${(-120 * handoff56P).toFixed(2)}%) scale(${(1 - 0.03 * handoff56P).toFixed(4)})`

        seq5Next.style.opacity = handoff56P.toFixed(3)
        seq5Next.style.transformOrigin = "50% 50%"
        const objPosY = 50 - 40 * zoom56P
        seq5Next.style.objectPosition = `center ${objPosY.toFixed(1)}%`
        seq5Next.style.transform = `translateX(${(120 * (1 - handoff56P)).toFixed(2)}%) scale(${(1 + 0.75 * zoom56P).toFixed(4)})`
        seq5Next.style.filter = "none"

        const darkness = easeOutCubic(clamp01((p5 - 0.992) / 0.008))
        seq5Stack.style.setProperty("--seq5-darkness", darkness.toFixed(3))

        const seq5Rect = seq5.getBoundingClientRect()
        const seq5InView = seq5Rect.bottom > 0 && seq5Rect.top < window.innerHeight
        const maskOff = seq5InView && p5 > 0.48 && darkness < 0.05
        document.body.classList.toggle("mask-off-8778", maskOff)
        document.body.classList.toggle("mask-dark-lock", seq5InView && darkness > 0.02)
      }

      function requestUpdate() {
        if (ticking) return; ticking = true; requestAnimationFrame(updateChain)
      }
      reg(window, "scroll", requestUpdate, { passive: true })
      reg(window, "resize", requestUpdate, { passive: true })
      requestUpdate()
    }

    // ── Slides 9 + 11 — handoffs + speech bubble ──
    function initSeq9Fade() {
      const slide9 = document.querySelector<HTMLElement>(".slide-seq9")
      const slide11 = document.querySelector<HTMLElement>(".slide-seq11")
      if (!slide9 || !slide11) return
      const baseLayer = slide9.querySelector<HTMLElement>(".seq9-layer--look")
      const fadeLayer = slide9.querySelector<HTMLElement>(".seq9-layer--fade")
      const nextLayer = slide9.querySelector<HTMLElement>(".seq9-layer--next")
      const backFrom = slide11.querySelector<HTMLElement>(".seq11-layer--from")
      const backTo = slide11.querySelector<HTMLElement>(".seq11-layer--to")
      const speechBubble = document.getElementById("speech-bubble-11") as HTMLElement | null
      if (!baseLayer || !fadeLayer || !nextLayer || !backFrom || !backTo) return

      let ticking = false

      function updateFade() {
        ticking = false
        const p9 = getP(slide9), p11 = getP(slide11)

        const fadeP = easeOutCubic(clamp01((p9 - 0.18) / 0.28))
        const handoffP = easeOutCubic(clamp01((p9 - 0.64) / 0.26))
        baseLayer.style.opacity = (1 - fadeP).toFixed(3)
        fadeLayer.style.opacity = (fadeP * (1 - handoffP)).toFixed(3)
        fadeLayer.style.transform = `translateX(${(-120 * handoffP).toFixed(2)}%)`
        nextLayer.style.opacity = handoffP.toFixed(3)
        nextLayer.style.transform = `translateX(${(120 - 120 * handoffP).toFixed(2)}%)`

        const backP = easeOutCubic(clamp01((p11 - 0.14) / 0.58))
        backFrom.style.opacity = (1 - backP).toFixed(3)
        backFrom.style.transform = `translateX(${(120 * backP).toFixed(2)}%)`
        backTo.style.opacity = backP.toFixed(3)
        backTo.style.transform = `translateX(${(-120 + 120 * backP).toFixed(2)}%)`

        if (speechBubble) {
          const bubbleIn = easeOutCubic(clamp01((backP - 0.38) / 0.22))
          const bubbleOut = easeOutCubic(clamp01((backP - 0.94) / 0.06))
          speechBubble.style.opacity = (bubbleIn * (1 - bubbleOut)).toFixed(3)
          speechBubble.style.transform = `rotate(-2.5deg) scale(${(0.78 + 0.22 * bubbleIn).toFixed(3)})`
        }
      }

      function requestUpdate() {
        if (ticking) return; ticking = true; requestAnimationFrame(updateFade)
      }
      reg(window, "scroll", requestUpdate, { passive: true })
      reg(window, "resize", requestUpdate, { passive: true })
      requestUpdate()
    }

    // ── Slide 13 — credits hold + Sarah POV exit ──
    function initFinalSequence() {
      const slideFinal = document.querySelector<HTMLElement>(".slide-final-image")
      if (!slideFinal) return
      const frontLayer = slideFinal.querySelector<HTMLElement>(".final-layer--look")
      const backLayer = slideFinal.querySelector<HTMLElement>(".final-layer--back")
      const textWindow = slideFinal.querySelector<HTMLElement>(".final-text-window")
      const credits = document.getElementById("final-credits") as HTMLElement | null
      const endTitle = document.getElementById("final-end-title") as HTMLElement | null
      const povExit = slideFinal.querySelector<HTMLElement>(".final-pov-exit")
      if (!frontLayer || !backLayer || !textWindow || !credits || !endTitle) return

      credits.style.opacity = "1"
      credits.style.transform = "none"
      endTitle.style.opacity = "1"
      endTitle.style.transform = "none"

      let ticking = false

      function updateFinal() {
        ticking = false
        const p = getP(slideFinal)

        const cameraP = easeInOutCubic(clamp01((p - 0.58) / 0.36))
        frontLayer.style.transform = `scale(${(1.0 + 0.06 * Math.max(0, 1 - cameraP)).toFixed(4)})`
        frontLayer.style.opacity = "1"

        const backP = easeOutCubic(clamp01((p - 0.22) / 0.28))
        backLayer.style.transform = `translateY(${(-130 * backP).toFixed(2)}%)`
        backLayer.style.opacity = (1 - easeOutCubic(clamp01((p - 0.32) / 0.22))).toFixed(3)

        const TEXT_LOCK = 0.48
        const rollP = easeInOut(clamp01((p - 0.04) / (TEXT_LOCK - 0.04)))
        const textY = 60 - 60 * Math.min(rollP, 1)
        textWindow.style.transform = `translate(-50%, calc(-50% + ${textY.toFixed(1)}vh))`
        textWindow.style.opacity = (1 - easeOutCubic(clamp01((p - 0.62) / 0.22))).toFixed(3)

        if (povExit) {
          const exitT = easeInOutCubic(clamp01((p - 0.60) / 0.34))
          povExit.style.opacity = exitT.toFixed(3)
          povExit.style.transform = `translateY(-50%) scale(${(2.2 - 1.2 * exitT).toFixed(4)})`
        }
      }

      function requestUpdate() {
        if (ticking) return; ticking = true; requestAnimationFrame(updateFinal)
      }
      reg(window, "scroll", requestUpdate, { passive: true })
      reg(window, "resize", requestUpdate, { passive: true })
      requestUpdate()
    }

    // ── Word-by-word scroll reveal ─────────────────
    function initWordReveals() {
      document.querySelectorAll<HTMLElement>(".slide-dark-reveal").forEach(slide => {
        const words = Array.from(slide.querySelectorAll<HTMLElement>(".word-reveal"))
        if (!words.length) return
        let ticking = false

        function update() {
          ticking = false
          const rect = slide.getBoundingClientRect()
          const travel = Math.max(1, slide.offsetHeight - window.innerHeight)
          const p = clamp01(-rect.top / travel)
          const REVEAL_START = 0.10, REVEAL_END = 0.60
          const step = Math.max(0.001, (REVEAL_END - REVEAL_START) / words.length)
          words.forEach((word, i) => {
            const threshold = REVEAL_START + i * step
            const ease = easeOutCubic(clamp01((p - threshold) / Math.max(0.001, step)))
            word.style.opacity = ease.toFixed(3)
            word.style.transform = `translateY(${(16 - 16 * ease).toFixed(1)}px)`
          })
        }

        function requestUpdate() {
          if (ticking) return; ticking = true; requestAnimationFrame(update)
        }
        reg(window, "scroll", requestUpdate, { passive: true })
        reg(window, "resize", requestUpdate, { passive: true })
        update()
      })
    }

    // ── Grain canvas ──────────────────────────────
    function initGrain() {
      const canvas = document.getElementById("grain-canvas") as HTMLCanvasElement | null
      if (!canvas) return { setLevel: (_: number) => {} }
      const ctx = canvas.getContext("2d")!
      const LEVELS = [
        [0.05, 245], [0.07, 232], [0.09, 218], [0.11, 205], [0.14, 188],
        [0.17, 168], [0.19, 152], [0.22, 128], [0.20, 140], [0.21, 134],
        [0.19, 148], [0.15, 172], [0.10, 202], [0.05, 245],
      ]
      const W = 256, H = 256
      const tile = document.createElement("canvas")
      tile.width = W; tile.height = H
      const tCtx = tile.getContext("2d")!
      let currentMaxVal = LEVELS[0][1]

      function resizeCanvas() {
        canvas.width = window.innerWidth
        canvas.height = window.innerHeight
      }

      function drawGrain(maxVal: number) {
        ctx.clearRect(0, 0, canvas.width, canvas.height)
        const imgData = tCtx.createImageData(W, H)
        const d = imgData.data
        for (let i = 0; i < d.length; i += 4) {
          const v = (Math.random() * maxVal) | 0
          d[i] = d[i + 1] = d[i + 2] = v; d[i + 3] = 255
        }
        tCtx.putImageData(imgData, 0, 0)
        const ox = (Math.random() * W) | 0, oy = (Math.random() * H) | 0
        for (let x = -ox; x < canvas.width; x += W)
          for (let y = -oy; y < canvas.height; y += H)
            ctx.drawImage(tile, x, y)
      }

      resizeCanvas()
      drawGrain(currentMaxVal)
      reg(window, "resize", () => { resizeCanvas(); drawGrain(currentMaxVal) }, { passive: true })

      return {
        setLevel(idx: number) {
          const level = Math.min(idx, LEVELS.length - 1)
          const [op, targetMv] = LEVELS[level]
          canvas.style.opacity = String(op)
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

    // ── Consolidated IntersectionObserver ─────────
    // Single observer with two thresholds replaces the three separate observer
    // sets that initObserver, initKeyboard, and initFooter previously created.
    function initObserver(grain: { setLevel: (idx: number) => void }) {
      const obs = new IntersectionObserver(entries => {
        entries.forEach(entry => {
          const slide = entry.target as HTMLElement
          const idx = parseInt(slide.dataset.slide ?? "0", 10) - 1
          const isPinnedTrain = slide.classList.contains("slide-immersive--train")
          const rect = entry.boundingClientRect

          // 60% threshold: track which slide is "current" for keyboard + footer
          if (entry.intersectionRatio >= 0.6) {
            currentSlide = idx
            activeSlideIdx = idx
          }

          if (entry.isIntersecting) {
            slide.classList.add("active"); slide.classList.remove("past")
            setActiveStop(idx); grain.setLevel(idx)
            slide.querySelectorAll<HTMLElement>(".stat-number[data-target]:not([data-count-trigger='manual'])").forEach(animateCounter)
          } else {
            if (isPinnedTrain && rect.bottom > 0) {
              slide.classList.add("active"); slide.classList.remove("past")
              setActiveStop(idx); grain.setLevel(idx)
              slide.querySelectorAll<HTMLElement>(".stat-number[data-target]:not([data-count-trigger='manual'])").forEach(animateCounter)
              return
            }
            slide.classList.remove("active")
            if (rect.top < 0) slide.classList.add("past")
            else slide.classList.remove("past")
          }
        })
      }, { threshold: [0.15, 0.6] })
      SLIDES.forEach(s => obs.observe(s))
      cleanups.push(() => obs.disconnect())
    }

    // ── Keyboard navigation ───────────────────────
    function initKeyboard() {
      reg(document, "keydown", (e: Event) => {
        const ke = e as KeyboardEvent
        if (ke.key === "ArrowDown" || ke.key === "PageDown")
          SLIDES[Math.min(currentSlide + 1, TOTAL - 1)]?.scrollIntoView({ behavior: "smooth" })
        if (ke.key === "ArrowUp" || ke.key === "PageUp")
          SLIDES[Math.max(currentSlide - 1, 0)]?.scrollIntoView({ behavior: "smooth" })
      })
    }

    // ── Intro ─────────────────────────────────────
    function initIntro() {
      const introEl = document.getElementById("intro")
      if (!introEl) return
      document.body.classList.add("intro-active")
      const introObserver = new IntersectionObserver(entries => {
        const visible = entries[0].isIntersecting
        document.body.classList.toggle("intro-active", visible)
        if (!visible && SLIDES[0]) { SLIDES[0].classList.add("active"); setActiveStop(0) }
      }, { threshold: 0.15 })
      introObserver.observe(introEl)
      cleanups.push(() => introObserver.disconnect())
      setTimeout(() => {
        const hint = document.getElementById("intro-hint")
        if (hint) hint.classList.add("visible")
      }, 900)
    }

    // ── Footer ────────────────────────────────────
    function initFooter() {
      const hint = document.getElementById("slide-hint")
      if (!hint) return
      let timer: ReturnType<typeof setTimeout> | null = null
      let autoScrollEnabled = false
      let autoScrollFrame: number | null = null

      function show() {
        if (document.body.classList.contains("intro-active")) return
        if (activeSlideIdx >= TOTAL - 1) return
        if (window.innerHeight + window.scrollY >= document.documentElement.scrollHeight - window.innerHeight * 0.8) return
        hint.classList.add("visible")
      }
      function reset() {
        hint.classList.remove("visible")
        if (timer) clearTimeout(timer)
        timer = setTimeout(show, 5000)
      }
      ;["scroll", "mousemove", "keydown", "touchstart", "click"].forEach(ev => {
        reg(document, ev, reset as EventListener, { passive: true })
      })

      const btnMotion = document.getElementById("btn-motion")
      btnMotion?.addEventListener("click", () => {
        const off = document.body.classList.toggle("reduce-motion")
        btnMotion.classList.toggle("off", off)
        btnMotion.setAttribute("aria-pressed", String(off))
      })

      const btnAutoScroll = document.getElementById("btn-autoscroll")
      if (btnAutoScroll) {
        btnAutoScroll.classList.add("off")
        btnAutoScroll.addEventListener("click", () => {
          if (autoScrollEnabled) {
            autoScrollEnabled = false
            if (autoScrollFrame) { cancelAnimationFrame(autoScrollFrame); autoScrollFrame = null }
            btnAutoScroll.classList.add("off")
            btnAutoScroll.setAttribute("aria-pressed", "false")
          } else {
            autoScrollEnabled = true
            btnAutoScroll.classList.remove("off")
            btnAutoScroll.setAttribute("aria-pressed", "true")
            const tick = () => {
              if (!autoScrollEnabled) return
              const nearEnd = window.innerHeight + window.scrollY >= document.documentElement.scrollHeight - 3
              if (document.body.classList.contains("intro-active") || nearEnd || activeSlideIdx >= TOTAL - 1) {
                autoScrollEnabled = false; btnAutoScroll.classList.add("off"); return
              }
              window.scrollBy({ top: AUTO_SCROLL_SPEED, left: 0, behavior: "auto" })
              autoScrollFrame = requestAnimationFrame(tick)
            }
            autoScrollFrame = requestAnimationFrame(tick)
          }
        })
      }

      const btnSound = document.getElementById("btn-sound")
      btnSound?.addEventListener("click", () => {
        const muted = document.body.classList.toggle("muted")
        btnSound.classList.toggle("off", muted)
        btnSound.setAttribute("aria-pressed", String(muted))
      })
      reset()
    }

    // ── Memorials ─────────────────────────────────
    function initMemorials() {
      document.querySelectorAll<HTMLElement>("[data-memorial]").forEach(cross => {
        const id = cross.dataset.memorial
        const memorial = document.getElementById(`memorial-${id}`)
        if (!memorial) return
        const ZONE_SIZE = 64
        const zone = document.createElement("div")
        zone.className = "memorial-zone"
        document.body.appendChild(zone)

        function placeZone() {
          const r = cross.getBoundingClientRect()
          zone.style.left = (r.left + r.width / 2 - ZONE_SIZE / 2) + "px"
          zone.style.top = (r.top + r.height / 2 - ZONE_SIZE / 2) + "px"
        }

        function positionMemorial() {
          const r = cross.getBoundingClientRect()
          const cx = r.left + r.width / 2, cy = r.top + r.height / 2
          memorial.style.top = cy + "px"
          if (cx > window.innerWidth / 2) {
            memorial.style.left = (cx - 12) + "px"
            memorial.style.transform = "translateX(-100%) translateY(-50%)"
          } else {
            memorial.style.left = (cx + 12) + "px"
            memorial.style.transform = "translateY(-50%)"
          }
        }

        placeZone()
        reg(window, "scroll", placeZone as EventListener, { passive: true })
        reg(window, "resize", placeZone as EventListener, { passive: true })

        // Desktop: hover
        zone.addEventListener("mouseenter", () => { positionMemorial(); memorial.classList.add("show") })
        zone.addEventListener("mouseleave", () => memorial.classList.remove("show"))

        // Mobile/touch: tap to toggle
        zone.addEventListener("click", e => {
          e.stopPropagation()
          if (memorial.classList.contains("show")) {
            memorial.classList.remove("show")
          } else {
            positionMemorial()
            memorial.classList.add("show")
            document.addEventListener("click", () => memorial.classList.remove("show"), { once: true })
          }
        })
      })
    }

    // ── Isolated stat counters ────────────────────
    function initStatCounters() {
      document.querySelectorAll<HTMLElement>("[data-count-trigger='manual'][data-target]").forEach(el => {
        if (el.dataset.counted) return
        const obs = new IntersectionObserver(entries => {
          if (!entries[0].isIntersecting) return
          obs.unobserve(el)
          setTimeout(() => animateCounter(el), 600)
        }, { threshold: 0.3 })
        obs.observe(el)
        cleanups.push(() => obs.disconnect())
      })
    }

    // ── Init all ──────────────────────────────────
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
    if (SLIDES[0]) SLIDES[0].classList.add("active")
    setActiveStop(0)

    return () => cleanups.forEach(fn => fn())
  }, [])

  return (
    <>
      {/* ── Metro nav ── */}
      <nav id="metro-nav" aria-label="Navigation — Ligne RER B">
        <div className="metro-track-container">
          <div className="metro-bg-line" />
          <div className="metro-fill-line" id="metro-fill" />
          <div className="metro-stops" id="metro-stops" />
        </div>
      </nav>
      <div id="metro-mask" aria-hidden="true" />

      {/* ── Intro ── */}
      <section id="intro">
        <div className="intro-copy">
          <h1 id="intro-title">Prends ta place</h1>
          <p className="intro-subtitle">Une histoire dans le RER B</p>
        </div>
        <div id="intro-hint">
          <span className="hint-arrow">▼</span>&nbsp;Défiler pour commencer
        </div>
      </section>

      {/* ── Slide 1 — Quai ── */}
      <section className="slide slide-immersive slide-immersive--train" data-slide="1">
        <div className="slide-inner">
          <div className="illustration-pane">
            <div className="scene-stack" aria-label="Sarah sur le quai, face au RER B">
              <img className="scene-layer scene-layer--base" src={img("seq1/IMG_8752.png")} alt="Quai du RER B" />
              <div className="scene-motion" aria-hidden="true">
                <img className="motion-layer motion-layer--strip" src={img("seq1/IMG_8757.png")} alt="" aria-hidden="true" />
              </div>
              <img className="scene-layer scene-layer--overlay" src={img("seq1/IMG_8751.png")} alt="Sarah de dos devant le train" aria-hidden="true" />
            </div>
          </div>
          <div className="content-pane content-pane--hero">
            <p className="narrative">7h52. Sarah monte dans le RER B.</p>
          </div>
        </div>
      </section>

      {/* ── Bridge 1 ── */}
      <section id="seq1-seq2-bridge" aria-label="Transition vers la séquence 2">
        <div className="bridge-inner">
          <p className="bridge-title">Le wagon se remplit</p>
        </div>
      </section>

      {/* ── Slide 2 ── */}
      <section className="slide slide-seq2" data-slide="2">
        <div className="slide-inner">
          <div className="illustration-pane">
            <div className="scene-stack scene-stack--seq2" aria-label="Le wagon se remplit">
              <img className="seq2-layer seq2-layer--back" src={img("seq2/IMG_8758.png")} alt="Fond du wagon" aria-hidden="true" />
              <img className="seq2-layer seq2-reveal" data-seq2-layer="1" src={img("seq2/IMG_8763.png")} alt="" aria-hidden="true" />
              <img className="seq2-layer seq2-reveal" data-seq2-layer="2" src={img("seq2/IMG_8760.png")} alt="" aria-hidden="true" />
              <img className="seq2-layer seq2-reveal" data-seq2-layer="3" src={img("seq2/IMG_8764.png")} alt="" aria-hidden="true" />
              <img className="seq2-layer seq2-reveal" data-seq2-layer="4" src={img("seq2/IMG_8765.png")} alt="" aria-hidden="true" />
              <img className="seq2-layer seq2-reveal" data-seq2-layer="5" src={img("seq2/IMG_8762.png")} alt="" aria-hidden="true" />
              <img className="seq2-layer seq2-reveal" data-seq2-layer="6" src={img("seq2/IMG_8761.png")} alt="" aria-hidden="true" />
              <img className="seq2-layer seq2-layer--front" src={img("seq2/IMG_8759.png")} alt="Sarah au premier plan" aria-hidden="true" />
            </div>
          </div>
          <div className="content-pane content-pane--caption">
            <p className="narrative">Les corps se rapprochent.<br/>L'espace devient rare.</p>
          </div>
        </div>
      </section>

      {/* ── Bridge 2 ── */}
      <section id="seq2-seq3-bridge" aria-label="Transition vers la séquence 3">
        <div className="bridge-inner">
          <p className="bridge-title">Sarah s'assoit</p>
        </div>
      </section>

      {/* ── Slide 3 ── */}
      <section className="slide slide-seq3" data-slide="3">
        <div className="slide-inner">
          <div className="illustration-pane">
            <div className="scene-stack scene-stack--seq3" aria-label="Sarah trouve une place assise">
              <img className="seq3-layer seq3-layer--base" src={img("seq3/IMG_8768.png")} alt="Sarah trouve une place" aria-hidden="true" />
              <img className="seq3-layer seq3-layer--swap" src={img("seq3/IMG_8769.png")} alt="" aria-hidden="true" />
            </div>
          </div>
          <div className="content-pane content-pane--caption">
            <p className="narrative">Elle s'assoit. Respire.<br/>L'espace autour d'elle rétrécit.</p>
          </div>
        </div>
      </section>

      {/* ── Slide 4 — Stat 3 374 victimes ── */}
      <section className="slide" data-slide="4">
        <div className="slide-inner">
          <div className="content-pane content-pane--full">
            <div className="isolated-stat isolated-stat--light">
              <p className="isolated-stat__number">
                <span className="stat-number" data-target="3374" data-grouped="true" id="stat-3374">0</span>
              </p>
              <p className="isolated-stat__label">victimes de violences sexuelles dans les transports</p>
              <p className="isolated-stat__sublabel">France — 2024</p>
            </div>
          </div>
        </div>
      </section>

      {/* ── Slide 5 ── */}
      <section className="slide slide-seq4" data-slide="5">
        <div className="slide-inner">
          <div className="fact-overlay fact-overlay--seq4" id="fact-seq4" aria-live="polite">
            <div className="fact-carousel" id="fact-seq4-carousel">
              <div className="fact-carousel-track" id="fact-seq4-track">
                <div className="fact-carousel-item">
                  <p className="fact-line fact-line--red">Marie-Louise, 30 ans</p>
                  <p className="fact-line fact-line--red">poignardée sur la ligne 4, 2010.</p>
                </div>
                <div className="fact-carousel-item">
                  <p className="fact-line fact-line--red">Une femme de 31 ans poussée sur les rails du RER B.</p>
                  <p className="fact-line fact-line--red">Massy-Palaiseau, 2025.</p>
                </div>
                <div className="fact-carousel-item">
                  <p className="fact-line fact-line--red">3 femmes poignardées</p>
                  <p className="fact-line fact-line--red">Paris, 2025.</p>
                </div>
              </div>
            </div>
          </div>
          <div className="illustration-pane">
            <div className="scene-stack scene-stack--seq4" aria-label="Sarah lève la tête">
              <img className="seq4-layer seq4-layer--look" src={img("seq4/IMG_8772.png")} alt="Sarah lève la tête" aria-hidden="true" />
            </div>
          </div>
          <div className="content-pane content-pane--caption">
            <p className="narrative">Un regard qui s'attarde un peu trop longtemps.</p>
          </div>
        </div>
      </section>

      {/* ── Slide 6 ── */}
      <section className="slide slide-seq5" data-slide="6">
        <div className="slide-inner">
          <div className="illustration-pane">
            <div className="scene-stack scene-stack--seq5" aria-label="Sarah baisse la tête">
              <img className="seq5-layer seq5-layer--base" src={img("seq3/IMG_8769.png")} alt="Sarah assise" aria-hidden="true" />
              <img className="seq5-layer seq5-layer--swap" src={img("seq5/IMG_8774.png")} alt="Sarah baisse la tête" aria-hidden="true" />
              <img className="seq5-layer seq5-layer--next" src={img("seq6/IMG_8778.png")} alt="" aria-hidden="true" />
            </div>
          </div>
          <div className="content-pane content-pane--caption">
            <p className="narrative">Elle regarde ailleurs.<br/>Fait semblant de ne pas voir.</p>
          </div>
        </div>
      </section>

      {/* ── Slide 7 — Stat +86% ── */}
      <section className="slide slide-dark" data-slide="7">
        <div className="slide-inner">
          <div className="content-pane content-pane--full">
            <div className="isolated-stat">
              <p className="isolated-stat__number">
                +<span className="stat-number" data-target="86" data-count-trigger="manual" id="stat-86">0</span>%
              </p>
              <p className="isolated-stat__label">d'agressions dans les transports en commun</p>
              <p className="isolated-stat__sublabel">France — 2016 à 2024</p>
            </div>
          </div>
        </div>
      </section>

      {/* ── Slide 8 — word reveal ── */}
      <section className="slide slide-dark slide-dark-reveal" data-slide="8">
        <div className="slide-inner">
          <div className="content-pane content-pane--full">
            <p className="narrative narrative--hero">
              <span className="word-reveal">Sarah</span>{" "}
              <span className="word-reveal">se</span>{" "}
              <span className="word-reveal">lève.</span>
            </p>
          </div>
        </div>
      </section>

      {/* ── Slide 9 ── */}
      <section className="slide slide-seq9" data-slide="9">
        <div className="slide-inner">
          <div className="illustration-pane">
            <div className="scene-stack scene-stack--seq9" aria-label="Sarah debout dans le wagon">
              <img className="seq9-layer seq9-layer--look seq-image-negative" src={img("seq9-10/IMG_8783.png")} alt="Sarah debout" aria-hidden="true" />
              <img className="seq9-layer seq9-layer--fade seq-image-negative" src={img("seq9-10/IMG_8786.png")} alt="" aria-hidden="true" />
              <img className="seq9-layer seq9-layer--next seq-image-negative" src={img("seq11/IMG_8790.png")} alt="" aria-hidden="true" />
            </div>
          </div>
          <div className="content-pane content-pane--caption content-pane--dark">
            <p className="narrative">Le wagon continue.<br/>Elle reste debout.</p>
          </div>
        </div>
      </section>

      {/* ── Slide 10 — word reveal ── */}
      <section className="slide slide-dark slide-no-intervene slide-dark-reveal" data-slide="10">
        <div className="slide-inner">
          <div className="content-pane content-pane--full">
            <p className="narrative narrative--hero">
              <span className="word-reveal">Personne</span>{" "}
              <span className="word-reveal">n'intervient</span>
            </p>
            <p className="fact-line fact-line--red fact-line--center word-reveal">
              Dans une enquête relayée en Île-de-France,{" "}
              <span className="stat-number" data-target="89">0</span>% des témoins n'étaient pas intervenus.
            </p>
          </div>
        </div>
      </section>

      {/* ── Slide 11 — speech bubble ── */}
      <section className="slide slide-seq11" data-slide="11">
        <div className="slide-inner">
          <div className="illustration-pane">
            <div className="scene-stack scene-stack--seq11" aria-label="Retour de scène">
              <img className="seq11-layer seq11-layer--from seq-image-negative" src={img("seq11/IMG_8790.png")} alt="" aria-hidden="true" />
              <img className="seq11-layer seq11-layer--to seq-image-negative" src={img("seq9-10/IMG_8788.png")} alt="" aria-hidden="true" />
            </div>
          </div>
          <div id="speech-bubble-11" className="speech-bubble" aria-hidden="true">
            Laisse-la&nbsp;!
          </div>
          <div className="content-pane content-pane--caption content-pane--dark">
            <p className="narrative">Dix minutes de trajet qui ne finissent pas.</p>
          </div>
        </div>
      </section>

      {/* ── Slide 12 — Sortie ── */}
      <section className="slide slide-cream-return" data-slide="12">
        <div className="slide-inner">
          <div className="content-pane content-pane--full">
            <p className="narrative narrative--hero narrative--cream">Les portes s'ouvrent.<br/>Sarah sort.</p>
          </div>
        </div>
      </section>

      {/* ── Slide 13 — credits + POV exit dezoom ── */}
      <section className="slide slide-final-image" data-slide="13">
        <div className="slide-inner">
          <div className="illustration-pane">
            <div className="scene-stack scene-stack--final" aria-label="Image finale de Sarah">
              <img className="final-layer final-layer--back" src={img("seq12/IMG_8794.png")} alt="" aria-hidden="true" />
              <img className="final-layer final-layer--look" src={img("seq12/IMG_8793.png")} alt="Sarah sort" aria-hidden="true" />
              <div className="final-text-window" aria-live="polite">
                <div className="final-credits" id="final-credits">
                  <p className="final-credit-line">Par</p>
                  <p className="final-credit-line">Lou-Anne Cartigny</p>
                  <p className="final-credit-line">Alix Labonne</p>
                </div>
                <h2 className="final-end-title" id="final-end-title">Prends ta place</h2>
              </div>
              <img
                className="final-pov-exit"
                src={img("seq1/IMG_8751.png")}
                alt=""
                aria-hidden="true"
              />
            </div>
          </div>
        </div>
      </section>

      {/* ── Floating hint ── */}
      <div id="slide-hint">
        <span className="hint-arrow">▼</span>&nbsp;Défiler pour continuer
      </div>

      {/* ── Footer ── */}
      <div id="slide-footer">
        <div id="footer-panel">
          <button className="footer-btn" id="btn-sound" aria-pressed="false" title="Activer/désactiver le son">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" />
              <path d="M15.54 8.46a5 5 0 0 1 0 7.07" />
            </svg>
            Son
          </button>
          <button className="footer-btn" id="btn-motion" aria-pressed="false" title="Activer/désactiver les mouvements">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
              <path d="M2 12 C5 7 8 17 12 12 C16 7 19 17 22 12" />
            </svg>
            Mouvements
          </button>
          <button className="footer-btn" id="btn-autoscroll" aria-pressed="false" title="Activer/désactiver le défilement automatique">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 4v14" />
              <path d="M7 13l5 5 5-5" />
            </svg>
            Auto scroll
          </button>
          <span id="footer-gear">⚙</span>
        </div>
      </div>

      <canvas id="grain-canvas" />

      {/* ── Mémoriaux ── */}
      <div className="memorial" id="memorial-1">
        <div className="memorial-info">
          <p className="memorial-name">Marie-Louise, 30 ans</p>
          <p className="memorial-detail">Poignardée dans le métro ligne 4, Paris — 2010</p>
        </div>
      </div>
      <div className="memorial" id="memorial-2">
        <div className="memorial-info">
          <p className="memorial-name">Femme, 31 ans — Massy-Palaiseau</p>
          <p className="memorial-detail">Poussée sur les rails du RER B — 2025</p>
        </div>
      </div>
      <div className="memorial" id="memorial-3">
        <div className="memorial-info">
          <p className="memorial-name">3 femmes — Paris</p>
          <p className="memorial-detail">Poignardées dans le métro parisien — décembre 2025</p>
        </div>
      </div>
      <div className="memorial" id="memorial-4">
        <div className="memorial-info">
          <p className="memorial-name">Femme — Station Bel-Air</p>
          <p className="memorial-detail">Happée par la fermeture d'une porte, métro Paris — 2023</p>
        </div>
      </div>
    </>
  )
}
