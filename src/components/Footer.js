"use client";

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import styles from './Footer.module.css';
import { PLATFORM_VERSION } from '@/config/platform';

const footerSections = [
  {
    title: 'Platform',
    links: [
      { label: 'Home', href: '/' },
      { label: 'About Us', href: '/about-us' },
      { label: 'Our Mission', href: '/mission' },
      { label: 'Our Vision', href: '/vision' },
      { label: 'Our Team', href: '/team' },
      { label: 'Partners', href: '/partners' },
      { label: 'Careers', href: '/careers' }
    ]
  },
  {
    title: 'Resources',
    links: [
      { label: 'Blog / News', href: '/blog' },
      { label: 'FAQ', href: '/faq' },
      { label: 'Documentation', href: '/documentation' },
      { label: 'Changelog', href: '/changelog' },
      { label: 'API', href: '/api' }
    ]
  },
  {
    title: 'Legal',
    links: [
      { label: 'Privacy Policy', href: '/privacy-policy' },
      { label: 'Terms of Service', href: '/terms-of-service' },
      { label: 'Legal Notice', href: '/legal-notice' },
      { label: 'Cookie Policy', href: '/cookie-policy' },
      { label: 'Data Protection Policy', href: '/data-protection-policy' }
    ]
  },
  {
    title: 'Support',
    links: [
      { label: 'Help Center', href: '/help-center' },
      { label: 'Contact', href: '/contact' },
      { label: 'Report an Issue', href: '/report-issue' },
      { label: 'System Status', href: '/system-status' }
    ]
  }
];

const socialLinks = [
  {
    name: 'LinkedIn',
    href: 'https://www.linkedin.com',
    icon: (
      <svg viewBox="0 0 24 24" aria-hidden="true" className={styles.socialIcon}>
        <path fill="currentColor" d="M6.94 8.5H3.56V20h3.38V8.5ZM5.25 3A2.1 2.1 0 1 0 5.2 7.2 2.1 2.1 0 0 0 5.25 3ZM20.44 13.54c0-3.46-1.84-5.07-4.3-5.07-1.98 0-2.87 1.1-3.37 1.87V8.5H9.4V20h3.37v-5.69c0-1.5.28-2.95 2.15-2.95 1.85 0 1.87 1.73 1.87 3.05V20h3.38l.27-6.46Z" />
      </svg>
    )
  },
  {
    name: 'Facebook',
    href: 'https://www.facebook.com',
    icon: (
      <svg viewBox="0 0 24 24" aria-hidden="true" className={styles.socialIcon}>
        <path fill="currentColor" d="M13.5 21v-7h2.35l.35-2.7H13.5V9.57c0-.78.22-1.3 1.34-1.3h1.43V5.86A19.6 19.6 0 0 0 14.2 5c-2.16 0-3.64 1.32-3.64 3.75v2.1H8.1V14h2.45v7h2.95Z" />
      </svg>
    )
  },
  {
    name: 'Twitter',
    href: 'https://x.com',
    icon: (
      <svg viewBox="0 0 24 24" aria-hidden="true" className={styles.socialIcon}>
        <path fill="currentColor" d="M18.9 3H22l-6.77 7.74L23 21h-6.12l-4.8-6.28L6.6 21H3.5l7.24-8.3L1 3h6.26l4.34 5.74L18.9 3Zm-1.07 16.2h1.7L6.35 4.7H4.53L17.83 19.2Z" />
      </svg>
    )
  }
];

export default function Footer() {
  const [email, setEmail] = useState('');
  const [newsletterMessage, setNewsletterMessage] = useState('');
  const [newsletterError, setNewsletterError] = useState('');
  const [visible, setVisible] = useState(false);
  const year = useMemo(() => new Date().getFullYear(), []);

  useEffect(() => {
    const target = document.getElementById('site-footer');
    if (!target) return undefined;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) {
          setVisible(true);
          observer.disconnect();
        }
      },
      { threshold: 0.15 }
    );

    observer.observe(target);
    return () => observer.disconnect();
  }, []);

  function onSubmitNewsletter(event) {
    event.preventDefault();
    setNewsletterError('');
    setNewsletterMessage('');

    const normalized = email.trim();
    const validEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalized);

    if (!validEmail) {
      setNewsletterError('Veuillez saisir une adresse email valide.');
      return;
    }

    setNewsletterMessage('Merci. Vous serez informé des nouveautés LinkEduPro.');
    setEmail('');
  }

  return (
    <footer id="site-footer" className={`${styles.footer} ${visible ? styles.visible : ''}`} aria-label="Pied de page LinkEduPro">
      <div className={styles.inner}>
        <div className={styles.grid}>
          {footerSections.map((section) => (
            <nav key={section.title} aria-label={section.title}>
              <h3 className={styles.title}>{section.title}</h3>
              <ul className={styles.list}>
                {section.links.map((link) => (
                  <li key={link.href}>
                    <Link href={link.href} className={styles.link}>{link.label}</Link>
                  </li>
                ))}
              </ul>
            </nav>
          ))}

          <section aria-label="Contact">
            <h3 className={styles.title}>Contact</h3>
            <ul className={styles.list}>
              <li><a className={styles.link} href="mailto:infolinkedupro@gmail.com">infolinkedupro@gmail.com</a></li>
              <li>
                <a className={`${styles.link} ${styles.whatsappLink}`} href="https://wa.me/50938378375" target="_blank" rel="noreferrer noopener">
                  <svg viewBox="0 0 24 24" aria-hidden="true" className={styles.whatsappIcon}>
                    <path fill="currentColor" d="M20.5 3.5A11 11 0 0 0 3.3 17.1L2 22l5.1-1.3A11 11 0 1 0 20.5 3.5Zm-8.52 17a9.05 9.05 0 0 1-4.6-1.26l-.33-.2-3.03.78.8-2.95-.22-.35a9 9 0 1 1 7.38 3.98Zm4.95-6.77c-.27-.13-1.58-.78-1.83-.87-.24-.09-.42-.13-.6.14-.18.26-.69.87-.84 1.05-.15.17-.31.2-.58.07-.27-.14-1.12-.41-2.14-1.3-.8-.71-1.34-1.58-1.5-1.84-.16-.26-.02-.4.12-.53.12-.12.27-.31.4-.47.13-.16.18-.27.27-.44.09-.18.04-.33-.02-.47-.07-.13-.6-1.46-.83-2-.22-.53-.44-.46-.6-.46h-.5c-.18 0-.47.07-.71.33-.24.27-.93.9-.93 2.2 0 1.29.95 2.54 1.08 2.71.13.18 1.86 2.84 4.51 3.98.63.27 1.13.43 1.52.55.64.2 1.22.17 1.68.1.51-.08 1.58-.65 1.8-1.27.22-.62.22-1.15.15-1.27-.07-.11-.24-.17-.51-.31Z" />
                  </svg>
                  +50938378375
                </a>
              </li>
              <li><span className={styles.contactText}>Port-au-Prince, Haiti</span></li>
            </ul>

            <div className={styles.socialRow} aria-label="Réseaux sociaux">
              {socialLinks.map((social) => (
                <a
                  key={social.name}
                  href={social.href}
                  target="_blank"
                  rel="noreferrer noopener"
                  aria-label={social.name}
                  className={styles.socialLink}
                >
                  {social.icon}
                </a>
              ))}
            </div>

            <form className={styles.newsletter} onSubmit={onSubmitNewsletter} noValidate>
              <label htmlFor="newsletter-email" className={styles.smallTitle}>Newsletter</label>
              <div className={styles.newsletterRow}>
                <input
                  id="newsletter-email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="Votre email"
                  className={styles.input}
                  aria-label="Email newsletter"
                />
                <button type="submit" className={styles.button}>S’abonner</button>
              </div>
              {newsletterError ? <p className={styles.error}>{newsletterError}</p> : null}
              {newsletterMessage ? <p className={styles.success}>{newsletterMessage}</p> : null}
            </form>

            <div className={styles.langPlaceholder}>
              <label htmlFor="lang-select" className={styles.smallTitle}>Langue</label>
              <select id="lang-select" className={styles.select} aria-label="Sélecteur de langue">
                <option>Français (placeholder)</option>
                <option>English (placeholder)</option>
              </select>
            </div>
          </section>
        </div>
      </div>

      <div className={styles.bottomBar}>
        <div className={styles.bottomInner}>
          <p className={styles.bottomText}>© {year} LinkEduPro — All rights reserved</p>
          <p className={styles.bottomText}>Version {PLATFORM_VERSION}</p>
          <div className={styles.bottomLinks}>
            <Link href="/system-status" className={styles.bottomLink}>System Status</Link>
            <Link href="/changelog" className={styles.bottomLink}>Changelog</Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
