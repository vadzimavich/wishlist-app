'use client'

import { useEffect, useRef } from 'react'
import { motion } from 'framer-motion'
import { format } from 'date-fns'
import { ru } from 'date-fns/locale'
import { RsvpStatus } from '@/types'

interface Props {
  eventTitle: string
  eventDate: string
  eventLocation: string | null
  coverImageUrl: string | null
  hostName: string
  guestName: string
  guestCount: number
  rsvpStatus: RsvpStatus
}

function getRsvpBadge(rsvpStatus: RsvpStatus, guestCount: number) {
  if (rsvpStatus === 'Pending') return null
  if (rsvpStatus === 'Attending') {
    return {
      text: guestCount > 1 ? 'Вы идёте! 🎉' : 'Ты идёшь! 🎉',
      cls: 'text-success border-success/30 bg-success/10',
    }
  }
  return {
    text: guestCount > 1 ? 'Вы не придёте' : 'Ты не придёшь',
    cls: 'text-admin-muted border-admin-muted/30 bg-admin-muted/10',
  }
}

const container = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: { staggerChildren: 0.12, delayChildren: 0.2 },
  },
}

const item = {
  hidden: { opacity: 0, y: 32 },
  show: { opacity: 1, y: 0, transition: { duration: 0.7, ease: [0.25, 0.4, 0.25, 1] } },
}

export function InviteHero({
  eventTitle, eventDate, eventLocation, coverImageUrl,
  hostName, guestName, guestCount, rsvpStatus,
}: Props) {
  const heroRef = useRef<HTMLDivElement>(null)
  const coverRef = useRef<HTMLDivElement>(null)
  const particlesRef = useRef<HTMLCanvasElement>(null)

  // GSAP parallax on scroll
  useEffect(() => {
    let gsap: any, ScrollTrigger: any

    const initGsap = async () => {
      const { gsap: g } = await import('gsap')
      const { ScrollTrigger: ST } = await import('gsap/ScrollTrigger')
      g.registerPlugin(ST)
      gsap = g
      ScrollTrigger = ST

      if (coverRef.current) {
        gsap.to(coverRef.current, {
          yPercent: 30,
          ease: 'none',
          scrollTrigger: {
            trigger: heroRef.current,
            start: 'top top',
            end: 'bottom top',
            scrub: 1.5,
          },
        })
      }

      // Floating particles
      gsap.to('.hero-orb-1', {
        y: -40,
        x: 20,
        duration: 6,
        ease: 'sine.inOut',
        yoyo: true,
        repeat: -1,
      })

      gsap.to('.hero-orb-2', {
        y: 30,
        x: -25,
        duration: 8,
        ease: 'sine.inOut',
        yoyo: true,
        repeat: -1,
        delay: 1,
      })
    }

    initGsap()

    return () => {
      ScrollTrigger?.getAll().forEach((t: any) => t.kill())
    }
  }, [])

  // Canvas confetti dots (lightweight, performant)
  useEffect(() => {
    const canvas = particlesRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const resize = () => {
      canvas.width = canvas.offsetWidth
      canvas.height = canvas.offsetHeight
    }
    resize()
    window.addEventListener('resize', resize)

    const particles: Array<{
      x: number; y: number; vx: number; vy: number;
      r: number; opacity: number; color: string
    }> = []

    const colors = ['#9B59F5', '#F5D88A', '#E8E4FF', '#6B2FE0']

    for (let i = 0; i < 35; i++) {
      particles.push({
        x: Math.random() * canvas.width,
        y: Math.random() * canvas.height,
        vx: (Math.random() - 0.5) * 0.3,
        vy: -Math.random() * 0.5 - 0.1,
        r: Math.random() * 2.5 + 1,
        opacity: Math.random() * 0.4 + 0.1,
        color: colors[Math.floor(Math.random() * colors.length)],
      })
    }

    let animId: number
    let frame = 0

    const draw = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height)
      frame++

      particles.forEach(p => {
        p.x += p.vx
        p.y += p.vy

        // Wrap around
        if (p.y < -10) p.y = canvas.height + 10
        if (p.x < -10) p.x = canvas.width + 10
        if (p.x > canvas.width + 10) p.x = -10

        ctx.beginPath()
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2)
        ctx.fillStyle = p.color
        ctx.globalAlpha = p.opacity * (0.7 + 0.3 * Math.sin(frame * 0.02 + p.x))
        ctx.fill()
      })

      ctx.globalAlpha = 1
      animId = requestAnimationFrame(draw)
    }

    draw()

    return () => {
      cancelAnimationFrame(animId)
      window.removeEventListener('resize', resize)
    }
  }, [])

  const formattedDate = format(new Date(eventDate), "d MMMM yyyy", { locale: ru })
  const formattedTime = format(new Date(eventDate), "HH:mm", { locale: ru })
  const badge = getRsvpBadge(rsvpStatus, guestCount)

  return (
    <section
      ref={heroRef}
      className="relative min-h-screen flex flex-col items-center justify-center overflow-hidden px-4"
    >
      {/* Cover image parallax layer */}
      {coverImageUrl && (
        <div ref={coverRef} className="absolute inset-0 z-0">
          <img
            src={coverImageUrl}
            alt={eventTitle}
            className="w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-b from-brand-midnight/60 via-brand-midnight/70 to-brand-midnight" />
        </div>
      )}

      {/* Animated orbs */}
      <div className="hero-orb-1 orb orb-purple absolute w-80 h-80 top-10 -left-20 z-0" />
      <div className="hero-orb-2 orb orb-violet absolute w-60 h-60 bottom-20 right-0 z-0" />

      {/* Canvas particles */}
      <canvas
        ref={particlesRef}
        className="absolute inset-0 w-full h-full z-0 pointer-events-none"
      />

      {/* Content */}
      <motion.div
        variants={container}
        initial="hidden"
        animate="show"
        className="relative z-10 text-center max-w-2xl mx-auto py-6"
      >
        {/* From host */}
        <motion.div variants={item} className="mb-6">
          <span className="inline-flex items-center gap-2 px-4 py-2 rounded-full glass text-sm text-brand-pearl/70">
            <span className="w-1.5 h-1.5 rounded-full bg-brand-violet animate-pulse-slow" />
            {hostName} приглашает {guestCount > 1 ? 'вас' : 'тебя'}
          </span>
        </motion.div>

        {/* Guest name */}
        <motion.p
          variants={item}
          className="text-brand-champagne/80 text-lg md:text-xl mb-6 font-body"
        >
          {guestCount > 1 ? 'Здравствуйте' : 'Привет'}, {guestName}!
        </motion.p>

        {/* Event title — главный заголовок */}
        <motion.h1
          variants={item}
          className="font-display font-extrabold text-4xl sm:text-5xl md:text-6xl lg:text-7xl
                     leading-[1.05] tracking-tight mb-6"
        >
          <span className="gradient-text-sweep">{eventTitle}</span>
        </motion.h1>

        {/* Date, time & location — построчно */}
        <motion.div variants={item} className="space-y-1 mb-6 text-brand-pearl/70 text-lg">
          <p>{formattedDate}</p>
          <p>{formattedTime}</p>
          {eventLocation && <p>{eventLocation}</p>}
        </motion.div>

        {/* RSVP status badge */}
        {badge && (
          <motion.div
            key={rsvpStatus}
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: [1, 1.15, 1] }}
            transition={{
              duration: 0.7,
              ease: [0.25, 0.4, 0.25, 1],
              scale: { type: 'spring', stiffness: 300, damping: 10, delay: 0.3 },
            }}
          >
            <span className={`inline-block px-4 py-2 rounded-full border text-sm font-medium ${badge.cls} ${rsvpStatus === 'Attending' ? 'glow-pulse' : ''}`}>
              {badge.text}
            </span>
          </motion.div>
        )}

      </motion.div>
    </section>
  )
}
