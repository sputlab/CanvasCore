// "About CanvasCore" (the ⓘ next to the version in the sidebar footer): what the web app is, its version,
// and where to get help, report a bug or support the project.
import React, { useEffect, useRef } from 'react';
import { Info, Globe, MessageCircle, Mail, Heart, ExternalLink } from 'lucide-react';

const LINKS = [
  { icon: Globe, label: 'Website', text: 'sputlab.com', href: 'https://www.sputlab.com' },
  { icon: MessageCircle, label: 'Community', text: 'Join the Discord server', href: 'https://discord.gg/sD8KMc2kN' },
  { icon: Mail, label: 'Bugs & suggestions', text: 'bug@sputlab.com', href: 'mailto:bug@sputlab.com?subject=CanvasCore%20feedback' },
  { icon: Heart, label: 'Support the project', text: 'Make a donation', href: 'https://www.sputlab.com/donate' },
];

export default function AboutDialog({ version, build, onClose }) {
  const closeRef = useRef(null);
  useEffect(() => { if (closeRef.current) closeRef.current.focus(); }, []);
  return (
    <div className="ui-dialog-backdrop" onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="ui-dialog cc-about" role="dialog" aria-modal="true" aria-labelledby="cc-about-title"
        onKeyDown={(e) => { if (e.key === 'Escape') { e.preventDefault(); onClose(); } }}>
        <div className="ui-dialog__head">
          <span className="ui-dialog__icon" aria-hidden="true"><Info size={18} /></span>
          <h2 id="cc-about-title" className="ui-dialog__title">About CanvasCore</h2>
        </div>
        <p className="cc-about__version">Version {version}{build ? ` · build ${build}` : ''}</p>
        <p className="ui-dialog__msg" style={{ marginLeft: 0 }}>CanvasCore is a visual website builder: design pages with blocks, manage collections and media, and publish a fast static site. Made by Sputlab.</p>
        <ul className="cc-about__links">
          {LINKS.map(({ icon: Icon, label, text, href }) => {
            const external = href.startsWith('http');
            return (
              <li key={label}>
                <Icon size={16} aria-hidden="true" />
                <span className="cc-about__label">{label}</span>
                <a href={href} {...(external ? { target: '_blank', rel: 'noopener noreferrer' } : {})}>
                  {text}{external && <ExternalLink size={12} aria-hidden="true" />}
                </a>
              </li>
            );
          })}
        </ul>
        <div className="ui-dialog__actions">
          <button ref={closeRef} type="button" className="ui-btn ui-btn--primary" onClick={onClose}>Close</button>
        </div>
      </div>
    </div>
  );
}
