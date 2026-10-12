// The site's favicon as the admin logo (sign-in screen, sidebar); falls back to the default app icon.
import React, { useState } from 'react';
import { Layers } from 'lucide-react';
import { useStore } from '../store/useStore';
import { brandIconUrl } from './branding';

// The site's favicon, or the default app icon when there is none or it can't be loaded
export function BrandLogo({ size = 28, iconSize = 16, radius = 8, style }) {
  const url = brandIconUrl(useStore((s) => s.branding.faviconUrl));
  const [broken, setBroken] = useState('');
  if (url && broken !== url) {
    return (
      <span className="ui-brand__logo ui-brand__logo--image" style={{ width: size, height: size, borderRadius: radius, ...style }}>
        <img src={url} alt="" onError={() => setBroken(url)} />
      </span>
    );
  }
  return <span className="ui-brand__logo" style={{ width: size, height: size, borderRadius: radius, ...style }}><Layers size={iconSize} aria-hidden="true" /></span>;
}
