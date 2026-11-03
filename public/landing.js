// Quintave landing — progressive enhancement only. The page is fully readable
// without this file. Kept external (no inline JS) so the CSP can stay
// `script-src 'self'`.
(function () {
  'use strict'
  var doc = document.documentElement
  doc.classList.add('js')

  var reduceMotion = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches

  // ── Sticky nav shadow ──────────────────────────────────────────────────────
  var nav = document.getElementById('nav')
  function onScroll() { if (nav) nav.classList.toggle('scrolled', window.scrollY > 8) }
  window.addEventListener('scroll', onScroll, { passive: true })
  onScroll()

  // ── Hero: pause / play + pointer tilt ("Move to explore") ──────────────────
  var stage = document.getElementById('stage')
  var inner = document.getElementById('stageInner')
  var pauseBtn = document.getElementById('pauseBtn')
  var svg = stage ? stage.querySelector('svg.orbit') : null

  function setPaused(paused) {
    if (!stage || !pauseBtn) return
    stage.classList.toggle('paused', paused)
    pauseBtn.setAttribute('aria-pressed', String(paused))
    pauseBtn.setAttribute('aria-label', paused ? 'Play animation' : 'Pause animation')
    pauseBtn.textContent = paused ? '▶' : '❚❚'
    if (svg && svg.pauseAnimations) { paused ? svg.pauseAnimations() : svg.unpauseAnimations() }
  }
  if (pauseBtn) pauseBtn.addEventListener('click', function () {
    setPaused(pauseBtn.getAttribute('aria-pressed') !== 'true')
  })
  if (reduceMotion) setPaused(true)

  if (stage && inner && !reduceMotion && window.matchMedia('(hover: hover)').matches) {
    stage.addEventListener('pointermove', function (e) {
      var r = stage.getBoundingClientRect()
      var x = (e.clientX - r.left) / r.width - 0.5
      var y = (e.clientY - r.top) / r.height - 0.5
      inner.style.transform = 'rotateY(' + (x * 10).toFixed(2) + 'deg) rotateX(' + (-y * 10).toFixed(2) + 'deg)'
    })
    stage.addEventListener('pointerleave', function () { inner.style.transform = '' })
  }

  // ── Five dimensions tabs ───────────────────────────────────────────────────
  var DIMS = {
    source: { icon: '✦', kicker: 'Your foundation', title: 'Source. Your steady center.',
      body: 'The awareness beneath the noise. A connection to who you are beyond your thoughts, roles, and circumstances.',
      quote: 'When did I last feel fully present?' },
    form: { icon: '♡', kicker: 'Your vessel', title: 'Form. The body you live in.',
      body: 'Energy, sleep, movement, and recovery — the physical ground everything else stands on.',
      quote: 'What is my body asking for today?' },
    field: { icon: '∿', kicker: 'Your emotional field', title: 'Field. What you carry and feel.',
      body: 'Emotion, charge, and release — how feelings move through you instead of settling in and staying.',
      quote: 'What have I been holding instead of feeling?' },
    mind: { icon: '◈', kicker: 'Your director', title: 'Mind. Where your attention goes.',
      body: 'Intention, belief, and focus — the conscious choices that quietly set your direction.',
      quote: 'What am I choosing to give my attention to?' },
    code: { icon: '☽', kicker: 'Your deeper pattern', title: 'Code. The patterns beneath the surface.',
      body: 'Habits and automatic responses that run in the background — until you notice them, and choose again.',
      quote: 'Which old pattern showed up for me this week?' },
  }
  var tabs = Array.prototype.slice.call(document.querySelectorAll('.dim[role="tab"]'))
  var panel = document.getElementById('dimPanel')
  var left = document.getElementById('dimLeft')
  var right = document.getElementById('dimRight')
  function setText(id, text) { var el = document.getElementById(id); if (el) el.textContent = text }

  function select(tab, focus) {
    var d = DIMS[tab.getAttribute('data-dim')]
    if (!d) return
    tabs.forEach(function (t) {
      var on = t === tab
      t.setAttribute('aria-selected', String(on))
      t.tabIndex = on ? 0 : -1
    })
    if (panel) panel.setAttribute('aria-labelledby', tab.id)
    setText('dimIcon', d.icon)
    setText('dimKicker', d.kicker)
    setText('dimTitle', d.title)
    setText('dimBody', d.body)
    setText('dimQuote', '“' + d.quote + '”')
    ;[left, right].forEach(function (el) {
      if (!el || reduceMotion) return
      el.classList.remove('fade'); void el.offsetWidth; el.classList.add('fade')
    })
    if (focus) tab.focus()
  }
  tabs.forEach(function (tab, i) {
    tab.addEventListener('click', function () { select(tab, false) })
    tab.addEventListener('keydown', function (e) {
      var next = null
      if (e.key === 'ArrowRight' || e.key === 'ArrowDown') next = tabs[(i + 1) % tabs.length]
      else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') next = tabs[(i - 1 + tabs.length) % tabs.length]
      else if (e.key === 'Home') next = tabs[0]
      else if (e.key === 'End') next = tabs[tabs.length - 1]
      if (next) { e.preventDefault(); select(next, true) }
    })
  })

  // ── Reveal on scroll ───────────────────────────────────────────────────────
  var reveals = document.querySelectorAll('.reveal')
  if (!('IntersectionObserver' in window) || reduceMotion) {
    Array.prototype.forEach.call(reveals, function (el) { el.classList.add('in') })
  } else {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (en.isIntersecting) { en.target.classList.add('in'); io.unobserve(en.target) }
      })
    }, { rootMargin: '0px 0px -8% 0px', threshold: 0.08 })
    Array.prototype.forEach.call(reveals, function (el) { io.observe(el) })
  }
})()
