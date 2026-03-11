"use client"

import Link from "next/link"
import Autoplay from "embla-carousel-autoplay"
import Image from "next/image"
import { useEffect, useRef, useState } from "react"
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from "@/components/ui/carousel"

export type Slide = { src: string; alt: string }

export default function HeroCarousel({ slides }: { slides: Slide[] }) {
  const autoplay = useRef(
    Autoplay({
      delay: 3000,
      stopOnInteraction: false, // Keep autoplay running even after manual navigation
      stopOnMouseEnter: false,  // Never pause, even when hovering
      stopOnLastSnap: false,    // Continue looping
    })
  )
  const [api, setApi] = useState<any>(null)
  const [current, setCurrent] = useState(0)
  const [count, setCount] = useState(0)

  useEffect(() => {
    if (!api) return

    setCount(api.scrollSnapList().length)
    setCurrent(api.selectedScrollSnap())

    api.on("select", () => setCurrent(api.selectedScrollSnap()))
    api.on("reInit", () => {
      setCount(api.scrollSnapList().length)
      setCurrent(api.selectedScrollSnap())
    })
  }, [api])

  return (
    <section className="relative">
      <Carousel
        opts={{ align: "start", loop: true }}
        setApi={setApi}
        plugins={[autoplay.current]}
        className="w-full"
      >
        <CarouselContent className="ml-0">
          {slides.map((s) => (
            <CarouselItem key={s.src} className="pl-0">
              <div className="relative  w-full sm:h-auto  lg:h-screen">
                <img src={s.src} alt={s.alt} className="md:h-full w-full " />
                <div className="absolute inset-0 bg-linear-to-t from-black/50 via-black/10 to-transparent" />
              </div>
            </CarouselItem>
          ))}
        </CarouselContent>

        {/* On-image arrow navigation */}
        <CarouselPrevious className="left-3 md:left-4 top-1/2 -translate-y-1/2 bg-black/30 text-white border-white/20 backdrop-blur-md hover:bg-black/40" />
        <CarouselNext className="right-3 md:right-4 top-1/2 -translate-y-1/2 bg-black/30 text-white border-white/20 backdrop-blur-md hover:bg-black/40" />

        {/* Dots / pagination */}
        {count > 1 && (
          <div className="pointer-events-auto absolute bottom-3 left-1/2 -translate-x-1/2 flex items-center gap-2 rounded-full bg-black/25 border border-white/15 px-3 py-2 backdrop-blur-md">
            {Array.from({ length: count }).map((_, i) => (
              <button
                key={i}
                type="button"
                aria-label={`Go to slide ${i + 1}`}
                aria-current={i === current}
                onClick={() => api?.scrollTo(i)}
                className={[
                  "h-2.5 w-2.5 rounded-full transition-all",
                  i === current ? "bg-white w-6" : "bg-white/50 hover:bg-white/70",
                ].join(" ")}
              />
            ))}
          </div>
        )}
      </Carousel>

      {/* Minimal overlay content */}
      <div className="pointer-events-none absolute inset-0 flex items-end">
        <div className="w-full px-3 pb-4 sm:px-4 sm:pb-6 md:px-8 md:pb-10">
          <div className="pointer-events-auto glass-card inline-flex flex-col gap-2 rounded-xl px-3 py-2.5 sm:gap-3 sm:rounded-2xl sm:px-4 sm:py-3 md:px-6 md:py-4">
            <div className="text-base font-semibold text-[#2A1F2D] sm:text-lg md:text-2xl">
              Pookiey
            </div>
            <div className="flex flex-col gap-2 sm:flex-row sm:gap-3">
              <Link
                href="https://play.google.com/store/apps/details?id=com.pookiey.pookiey"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center justify-center transition-opacity bg-[#1f314a] rounded-md p-1.5 hover:opacity-90"
              >
                <Image 
                  src="/google-play-store.png" 
                  alt="Get it on Google Play" 
                  width={110}
                  height={30}
                  className="h-auto w-[88px] sm:w-[104px] md:w-[128px]"
                  priority
                />
              </Link>
              <Link
                href="https://apps.apple.com/app/pookiey/id"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center justify-center bg-[#1f314a] transition-opacity hover:opacity-90 rounded-md p-1.5"
              >
                <Image 
                  src="/apple-app-store.png" 
                  alt="Download on the App Store" 
                  width={110}
                  height={30}
                  className="h-auto w-[88px] sm:w-[104px] md:w-[128px]"
                  priority
                />
              </Link>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}


