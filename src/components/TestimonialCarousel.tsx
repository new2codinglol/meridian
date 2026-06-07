import React, { useCallback, useRef, useState } from 'react'
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion'

type Item = { quote: string; name: string; role: string }

const ITEMS: Item[] = [
  {
    quote:
      "We used to rely on senior partners' memory to know who knew who at any given client. Meridian made that institutional knowledge available to the whole team, including people who joined last month.",
    name: 'Sarah Tan',
    role: 'Managing Partner, Perdana Advisory',
  },
  {
    quote:
      "The first time a new associate walked into a pitch already knowing every prior touchpoint, I realised we'd stopped losing years of context whenever someone changed firms.",
    name: 'Aisha Karim',
    role: 'Head of Client Strategy, Ampang Partners',
  },
  {
    quote:
      'Renewals used to surprise us. Now the accounts at risk surface weeks ahead, and we reach out before a client ever feels neglected.',
    name: 'Wei Chen',
    role: 'Partner, Menara & Co',
  },
  {
    quote:
      'It pays for itself the first time you avoid walking into a meeting blind. For us, that happened in the first week.',
    name: 'Daniel Yeoh',
    role: 'Managing Director, Klang Capital',
  },
]

const EASE = [0.16, 1, 0.3, 1] as const

const variants = {
  enter: (d: number) => ({ opacity: 0, x: d * 28 }),
  center: { opacity: 1, x: 0 },
  exit: (d: number) => ({ opacity: 0, x: -d * 28 }),
}

const Arrow = ({ dir }: { dir: 'left' | 'right' }) => (
  <svg width="15" height="15" viewBox="0 0 15 15" fill="none" aria-hidden="true">
    <path
      d={dir === 'left' ? 'M9 3 L5 7.5 L9 12' : 'M6 3 L10 7.5 L6 12'}
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
)

export default function TestimonialCarousel() {
  const reduced = useReducedMotion() ?? false
  const [state, setState] = useState<{ index: number; dir: number }>({ index: 0, dir: 0 })
  const { index, dir } = state

  const go = useCallback((d: number) => {
    setState((s) => ({
      index: (s.index + d + ITEMS.length) % ITEMS.length,
      dir: d,
    }))
  }, [])

  const rootRef = useRef<HTMLDivElement>(null)
  const onKey = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowLeft') { e.preventDefault(); go(-1) }
    if (e.key === 'ArrowRight') { e.preventDefault(); go(1) }
  }

  const item = ITEMS[index]
  const animated = !reduced ? variants : {
    enter: { opacity: 0, x: 0 },
    center: { opacity: 1, x: 0 },
    exit: { opacity: 0, x: 0 },
  }

  return (
    <div
      className="tc"
      ref={rootRef}
      role="group"
      aria-roledescription="carousel"
      aria-label="Customer testimonials"
      onKeyDown={onKey}
    >
      <div className="tc-stage" aria-live="polite">
        <AnimatePresence custom={dir} mode="wait" initial={false}>
          <motion.figure
            key={index}
            className="tc-figure"
            custom={dir}
            variants={animated as never}
            initial="enter"
            animate="center"
            exit="exit"
            transition={{ duration: reduced ? 0.16 : 0.42, ease: EASE }}
          >
            <blockquote className="tc-quote">{`"${item.quote}"`}</blockquote>
            <figcaption className="tc-cap">
              <span className="tc-name">{item.name}</span>
              <span className="tc-role">{item.role}</span>
            </figcaption>
          </motion.figure>
        </AnimatePresence>
      </div>

      <div className="tc-controls">
        <span className="tc-count" aria-hidden="true">
          {String(index + 1).padStart(2, '0')}
          <span className="tc-count-sep"> / </span>
          {String(ITEMS.length).padStart(2, '0')}
        </span>
        <div className="tc-nav">
          <button type="button" className="tc-btn" onClick={() => go(-1)} aria-label="Previous testimonial">
            <Arrow dir="left" />
          </button>
          <button type="button" className="tc-btn" onClick={() => go(1)} aria-label="Next testimonial">
            <Arrow dir="right" />
          </button>
        </div>
      </div>
    </div>
  )
}
