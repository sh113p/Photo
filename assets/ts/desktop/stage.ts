import { Power3, gsap } from 'gsap'
import { container } from '../container'
import { ImageJSON } from '../resources'
import { incIndex, state } from '../state'
import { Watchable } from '../utils'

/**
 * types
 */

export type HistoryItem = { i: number; x: number; y: number }

/**
 * variables
 */

let imgs: HTMLImageElement[] = []
let last = { x: 0, y: 0 }
export const cordHist = new Watchable<HistoryItem[]>([])
export const isOpen = new Watchable<boolean>(false)
export const isAnimating = new Watchable<boolean>(false)
export const active = new Watchable<boolean>(false)

/**
 * getter
 */

function getElTrail(): HTMLImageElement[] {
  return cordHist.get().map((item) => imgs[item.i])
}

function getElTrailCurrent(): HTMLImageElement[] {
  return getElTrail().slice(-state.get().trailLength)
}

function getElTrailInactive(): HTMLImageElement[] {
  const elTrailCurrent = getElTrailCurrent()
  return elTrailCurrent.slice(0, elTrailCurrent.length - 1)
}

function getElCurrent(): HTMLImageElement {
  const elTrail = getElTrail()
  return elTrail[elTrail.length - 1]
}

function getElNextFive(): HTMLImageElement[] {
  return state.get().nextFive.map((i) => imgs[i])
}

/**
 * main functions
 */

// on mouse
function onMouse(e: MouseEvent): void {
  if (isOpen.get() || isAnimating.get()) return
  const cord = { x: e.clientX, y: e.clientY }
  const travelDist = Math.hypot(cord.x - last.x, cord.y - last.y)

  if (travelDist > state.get().threshold) {
    last = cord
    incIndex()

    const newHist = { i: state.get().index, ...cord }
    cordHist.set([...cordHist.get(), newHist].slice(-state.get().length))
  }
}

// set image position with gsap
function setPositions(): void {
  const elTrail = getElTrail()
  if (!elTrail.length) return

  // preload
  lores(getElNextFive())

  gsap.set(elTrail, {
    x: (i: number) => cordHist.get()[i].x - window.innerWidth / 2,
    y: (i: number) => cordHist.get()[i].y - window.innerHeight / 2,
    opacity: (i: number) =>
      i + 1 + state.get().trailLength <= cordHist.get().length ? 0 : 1,
    zIndex: (i: number) => i,
    scale: 0.6
  })

  if (isOpen.get()) {
    lores(getElTrail())
    hires([getElCurrent()])
    gsap.set(imgs, { opacity: 0 })
    gsap.set(getElCurrent(), { opacity: 1, x: 0, y: 0, scale: 1 })
  }
}

// open image into navigation
function expandImage(): void {
  if (isAnimating.get()) return

  isOpen.set(true)
  isAnimating.set(true)

  hires([getElCurrent()])

  const tl = gsap.timeline()
  // move down and hide trail inactive
  tl.to(getElTrailInactive(), {
    y: '+=20',
    ease: Power3.easeIn,
    stagger: 0.075,
    duration: 0.3,
    delay: 0.1,
    opacity: 0
  })
  // current move to center
  tl.to(getElCurrent(), {
    x: 0,
    y: 0,
    ease: Power3.easeInOut,
    duration: 0.7,
    delay: 0.3
  })
  // current expand
  tl.to(getElCurrent(), {
    delay: 0.1,
    scale: 1,
    ease: Power3.easeInOut
  })
  // finished
  tl.then(() => {
    isAnimating.set(false)
  })
}

// close navigation and back to stage
export function minimizeImage(): void {
  if (isAnimating.get()) return

  isOpen.set(false)
  isAnimating.set(true)

  const tl = gsap.timeline()
  // shrink current
  tl.to(getElCurrent(), {
    scale: 0.6,
    duration: 0.6,
    ease: Power3.easeInOut
  })
  // move current to original position
  tl.to(getElCurrent(), {
    delay: 0.3,
    duration: 0.7,
    ease: Power3.easeInOut,
    x: cordHist.get()[cordHist.get().length - 1].x - window.innerWidth / 2,
    y: cordHist.get()[cordHist.get().length - 1].y - window.innerHeight / 2
  })
  // show trail inactive
  tl.to(getElTrailInactive(), {
    y: '-=20',
    ease: Power3.easeOut,
    stagger: -0.1,
    duration: 0.3,
    opacity: 1
  })
  // finished
  tl.then(() => {
    isAnimating.set(false)
  })
}

/**
 * init
 */

export function initStage(ijs: ImageJSON[]): void {
  // create stage element
  createStage(ijs)
  // get stage
  const stage = document.getElementsByClassName('stage').item(0) as HTMLDivElement
  // get image elements
  imgs = Array.from(stage.getElementsByTagName('img'))
  // event listeners
  stage.addEventListener('click', () => expandImage())
  stage.addEventListener('keydown', () => expandImage())
  window.addEventListener('mousemove', onMouse)
  // watchers
  isOpen.addWatcher(() => active.set(isOpen.get() && !isAnimating.get()))
  isAnimating.addWatcher(() => active.set(isOpen.get() && !isAnimating.get()))
  cordHist.addWatcher(() => setPositions())
  // preload
  lores(getElNextFive())
}

/**
 * hepler
 */

function createStage(ijs: ImageJSON[]): void {
  // create container for images
  const stage: HTMLDivElement = document.createElement('div')
  stage.className = 'stage'
  // append images to container
  for (let ij of ijs) {
    const e = document.createElement('img')
    e.height = ij.loImgH
    e.width = ij.loImgW
    // set data attributes
    e.dataset.hiUrl = ij.hiUrl
    e.dataset.hiImgH = ij.hiImgH.toString()
    e.dataset.hiImgW = ij.hiImgW.toString()
    e.dataset.loUrl = ij.loUrl
    e.dataset.loImgH = ij.loImgH.toString()
    e.dataset.loImgW = ij.loImgW.toString()
    e.alt = 'image'
    stage.append(e)
  }
  container.append(stage)
}

function hires(imgs: HTMLImageElement[]): void {
  imgs.forEach((img) => {
    img.src = img.dataset.hiUrl!
    img.height = parseInt(img.dataset.hiImgH!)
    img.width = parseInt(img.dataset.hiImgW!)
  })
}

function lores(imgs: HTMLImageElement[]): void {
  imgs.forEach((img) => {
    img.src = img.dataset.loUrl!
    img.height = parseInt(img.dataset.loImgH!)
    img.width = parseInt(img.dataset.loImgW!)
  })
}
