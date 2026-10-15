"use client";

import { ArrowRight, ChevronLeft, ChevronRight } from "lucide-react";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";

import type { HomepageBanner } from "@/lib/homepage-banner";

export function HomepageBannerCarousel({ banners }: { banners: HomepageBanner[] }) {
  const [activeIndex, setActiveIndex] = useState(0);
  const [paused, setPaused] = useState(false);
  const touchStartX = useRef<number | null>(null);

  useEffect(() => {
    if (banners.length < 2 || paused) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    const timer = window.setInterval(() => {
      setActiveIndex((current) => (current + 1) % banners.length);
    }, 2500);

    return () => window.clearInterval(timer);
  }, [banners.length, paused]);

  if (!banners.length) return null;

  const currentIndex = activeIndex % banners.length;

  const showPrevious = () =>
    setActiveIndex((current) => (current - 1 + banners.length) % banners.length);
  const showNext = () =>
    setActiveIndex((current) => (current + 1) % banners.length);
  const finishSwipe = (clientX: number) => {
    if (touchStartX.current === null) return;
    const distance = clientX - touchStartX.current;
    touchStartX.current = null;
    if (Math.abs(distance) < 48) return;
    if (distance > 0) showPrevious();
    else showNext();
  };

  return (
    <section
      className="homepage-banners section"
      aria-roledescription="carousel"
      aria-label="Talomart promotions"
      aria-live="off"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onFocusCapture={() => setPaused(true)}
      onBlurCapture={() => setPaused(false)}
    >
      <div className="container">
        <div
          className="homepage-banner-stage"
          onTouchStart={(event) => {
            touchStartX.current = event.touches[0]?.clientX ?? null;
            setPaused(true);
          }}
          onTouchEnd={(event) => {
            finishSwipe(event.changedTouches[0]?.clientX ?? 0);
            setPaused(false);
          }}
          onTouchCancel={() => {
            touchStartX.current = null;
            setPaused(false);
          }}
        >
          {banners.map((banner, index) => (
            <article
              key={banner.id}
              className={`homepage-banner homepage-banner-${banner.tone} ${index === currentIndex ? "active" : ""}`}
              aria-hidden={index !== currentIndex}
              aria-roledescription="slide"
              aria-label={`${index + 1} of ${banners.length}: ${banner.title}`}
            >
              <picture>
                {banner.mobileImageUrl && (
                  <source media="(max-width: 720px)" srcSet={banner.mobileImageUrl} />
                )}
                <img
                  src={banner.imageUrl}
                  alt={banner.altText}
                  style={{ objectPosition: `${banner.focalPointX}% ${banner.focalPointY}%` }}
                  loading={index === 0 ? "eager" : "lazy"}
                  fetchPriority={index === 0 ? "high" : "auto"}
                  decoding="async"
                />
              </picture>
              <div className="homepage-banner-shade" />
              <div className="homepage-banner-copy">
                {banner.eyebrow && <span>{banner.eyebrow}</span>}
                {index === 0 ? <h1>{banner.title}</h1> : <h2>{banner.title}</h2>}
                {banner.body && <p>{banner.body}</p>}
                {banner.ctaLabel && banner.ctaHref && (
                  <Link href={banner.ctaHref} tabIndex={index === currentIndex ? 0 : -1}>
                    {banner.ctaLabel} <ArrowRight />
                  </Link>
                )}
              </div>
            </article>
          ))}

          {banners.length > 1 && (
            <>
              <button type="button" className="homepage-banner-arrow previous" onClick={showPrevious} aria-label="Previous promotion">
                <ChevronLeft />
              </button>
              <button type="button" className="homepage-banner-arrow next" onClick={showNext} aria-label="Next promotion">
                <ChevronRight />
              </button>
              <div className="homepage-banner-dots" aria-label="Choose promotion">
                {banners.map((banner, index) => (
                  <button
                    key={banner.id}
                    type="button"
                    aria-label={`Show promotion ${index + 1}`}
                    aria-current={index === currentIndex ? "true" : undefined}
                    onClick={() => setActiveIndex(index)}
                  />
                ))}
              </div>
              <span className="sr-only" aria-live="polite">
                Promotion {currentIndex + 1} of {banners.length}
              </span>
            </>
          )}
        </div>
      </div>
    </section>
  );
}
