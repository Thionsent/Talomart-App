import Link from "next/link";

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
          <p>
            Your trusted source for genuine electrical accessories and mobile
            gear. Smart tech, fair prices, and reliable service since 2018.
          </p>
          <div className="footer-socials" aria-label="Social media">
            <a href="#facebook" aria-label="Facebook">
              f
            </a>
            <a href="#instagram" aria-label="Instagram">
              ◎
            </a>
            <a href="#x" aria-label="X">
              𝕏
            </a>
            <a href="#tiktok" aria-label="TikTok">
              ♪
            </a>
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
          <Link href="/admin">Admin Portal</Link>
        </div>

        <div className="footer-column app-column">
          <h3>Download Our App</h3>
          <p>Shop faster and get app-only deals.</p>
          <div className="app-buttons">
            <a href="#google-play" className="app-button">
              <span className="play-icon">▶</span>
              <span>
                <small>GET IT ON</small>
                <strong>Google Play</strong>
              </span>
            </a>
            <a href="#app-store" className="app-button">
              <span className="apple-icon">●</span>
              <span>
                <small>Download on the</small>
                <strong>App Store</strong>
              </span>
            </a>
          </div>
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
