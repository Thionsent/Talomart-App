import Link from "next/link";
import Image from "next/image";
import { businessInfo } from "@/lib/business-info";

export function SiteFooter() {
  return (
    <footer className="site-footer">
      <div className="container footer-main">
        <div className="footer-brand-column">
          <Link
            className="brand footer-brand"
            href="/"
            aria-label="Talomart Stores home"
          >
            <span className="brand-mark">
              <span />
            </span>
            <span className="brand-name">
              Talo<span>mart</span>
              <small>STORES</small>
            </span>
          </Link>
          <Image
            src="/talomart-logo.png"
            alt="Talomart Stores"
            width={112}
            height={112}
            className="mt-4 rounded-2xl"
          />
          <p>
            Genuine electrical accessories and mobile gear, backed by helpful
            local support from Talomart Stores.
          </p>
          <div className="footer-socials" aria-label="Social media">
            <a href={businessInfo.social.facebook} target="_blank" rel="noreferrer" aria-label="Talomart on Facebook">f</a>
            <a href={businessInfo.social.instagram} target="_blank" rel="noreferrer" aria-label="Talomart on Instagram">◎</a>
            <a href={businessInfo.social.x} target="_blank" rel="noreferrer" aria-label="Talomart on X">𝕏</a>
          </div>
        </div>

        <div className="footer-column">
          <h3>Customer Care</h3>
          <Link href="/help">Help Center</Link>
          <Link href="/returns">Returns &amp; Refunds</Link>
          <Link href="/shipping">Shipping Information</Link>
          <Link href="/warranty">Warranty Policy</Link>
        </div>

        <div className="footer-column">
          <h3>Quick Links</h3>
          <Link href="/track">Track Your Order</Link>
          <Link href="/payments">Secure Payment</Link>
          <Link href="/offers">Exclusive Offers</Link>
          <Link href="/about">About Talomart</Link>
        </div>

        <div className="footer-column contact-column">
          <h3>Talk to us</h3>
          <a href={`tel:${businessInfo.phone}`}>{businessInfo.phoneDisplay}</a>
          <a href={businessInfo.whatsappUrl} target="_blank" rel="noreferrer">WhatsApp us</a>
          <a href={`mailto:${businessInfo.supportEmail}`}>{businessInfo.supportEmail}</a>
          <p>{businessInfo.location}</p>
        </div>
      </div>

      <div className="footer-bottom">
        <div className="container footer-bottom-inner">
          <p>© {new Date().getFullYear()} Talomart Stores. All rights reserved.</p>
          <p className="footer-tagline">
            <span /> Powering your connections.
          </p>
          <div className="footer-legal">
            <Link href="/privacy">Privacy Policy</Link>
            <Link href="/terms">Terms of Use</Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
