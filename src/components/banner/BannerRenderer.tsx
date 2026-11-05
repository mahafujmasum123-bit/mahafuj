import React from 'react';
import { GradientStop, BannerLayer } from '../../../server/models/Banner';

export interface BannerData {
  id?: string;
  name?: string;
  placement?: string;
  bgType?: 'solid' | 'gradient' | 'image' | 'image-overlay' | 'image-gradient' | 'multi-layer';
  backgroundColor?: string;
  textColor?: string;
  gradient?: {
    type?: 'linear' | 'radial';
    angle?: number;
    stops?: GradientStop[];
  };
  bgImage?: {
    url?: string;
    positionX?: number;
    positionY?: number;
    alignment?: 'center' | 'top' | 'bottom' | 'left' | 'right' | 'custom';
    objectFit?: 'cover' | 'contain' | 'fill' | 'scale-down' | 'none';
    scale?: number;
    rotation?: number;
    zoom?: number;
    opacity?: number;
    blur?: number;
  };
  overlay?: {
    enabled?: boolean;
    type?: 'solid' | 'gradient';
    color?: string;
    opacity?: number;
    blendMode?: string;
    direction?: string;
    gradientStops?: GradientStop[];
  };
  layers?: BannerLayer[];
  tag?: string;
  headline?: string;
  subheadline?: string;
  buttonText?: string;
  buttonLink?: string;
  textAlign?: 'left' | 'center' | 'right';
  contentPosition?: 'left' | 'center' | 'right' | 'top-left' | 'bottom-left' | 'top-right' | 'bottom-right';
  maxContentWidth?: number;
  destinationLink?: string;
  openInNewTab?: boolean;
  responsive?: {
    desktopHeight?: number;
    tabletHeight?: number;
    mobileHeight?: number;
    hideOnMobile?: boolean;
  };
  imageUrl?: string; // fallback legacy property
}

interface BannerRendererProps {
  banner: BannerData;
  viewport?: 'desktop' | 'tablet' | 'mobile';
  className?: string;
  onNavigate?: (path: string) => void;
  isEditorPreview?: boolean;
}

/**
 * Generates a valid, sanitized CSS gradient string from structured stops
 */
export function buildCssGradient(
  type: 'linear' | 'radial' = 'linear',
  angle: number = 135,
  stops?: GradientStop[]
): string {
  if (!stops || stops.length === 0) {
    return 'linear-gradient(135deg, #051b14 0%, #0d3829 100%)';
  }

  const sortedStops = [...stops].sort((a, b) => a.position - b.position);

  if (sortedStops.length === 1) {
    const s = sortedStops[0];
    return type === 'radial'
      ? `radial-gradient(circle at center, ${s.color} 0%, ${s.color} 100%)`
      : `linear-gradient(${angle}deg, ${s.color} 0%, ${s.color} 100%)`;
  }
  const stopStrings = sortedStops.map((stop) => {
    let color = stop.color;
    if (stop.opacity !== undefined && stop.opacity < 1 && color.startsWith('#')) {
      const hex = color.replace('#', '');
      const r = parseInt(hex.substring(0, 2), 16) || 0;
      const g = parseInt(hex.substring(2, 4), 16) || 0;
      const b = parseInt(hex.substring(4, 6), 16) || 0;
      color = `rgba(${r}, ${g}, ${b}, ${stop.opacity})`;
    }
    return `${color} ${stop.position}%`;
  });

  if (type === 'radial') {
    return `radial-gradient(circle at center, ${stopStrings.join(', ')})`;
  }
  return `linear-gradient(${angle}deg, ${stopStrings.join(', ')})`;
}

export function buildGradientCss(gradient?: {
  type?: 'linear' | 'radial';
  angle?: number;
  stops?: GradientStop[];
}): string {
  return buildCssGradient(gradient?.type || 'linear', gradient?.angle ?? 135, gradient?.stops);
}

/**
 * Validates and converts safe navigation links
 */
export function sanitizeBannerLink(link?: string): { safeUrl: string; isExternal: boolean } | null {
  if (!link || typeof link !== 'string' || link.trim() === '') return null;
  const trimmed = link.trim();

  // Block dangerous schemes
  if (trimmed.toLowerCase().startsWith('javascript:') || trimmed.toLowerCase().startsWith('data:')) {
    return null;
  }

  if (trimmed.startsWith('/') || trimmed.startsWith('#')) {
    return { safeUrl: trimmed, isExternal: false };
  }

  try {
    const url = new URL(trimmed);
    if (['http:', 'https:'].includes(url.protocol)) {
      return { safeUrl: trimmed, isExternal: true };
    }
  } catch {
    // Relative path without leading slash
    return { safeUrl: `/${trimmed}`, isExternal: false };
  }

  return null;
}

export const BannerRenderer: React.FC<BannerRendererProps> = ({
  banner,
  viewport = 'desktop',
  className = '',
  onNavigate,
  isEditorPreview = false,
}) => {
  const bgType = banner.bgType || (banner.imageUrl ? 'image-overlay' : 'solid');
  const imageUrl = banner.bgImage?.url || banner.imageUrl || '';
  const bgColor = banner.backgroundColor || '#0c261e';
  const textColor = banner.textColor || '#ffffff';

  // Responsive height determination
  const height =
    viewport === 'mobile'
      ? banner.responsive?.mobileHeight || 260
      : viewport === 'tablet'
      ? banner.responsive?.tabletHeight || 340
      : banner.responsive?.desktopHeight || 440;

  // Background style computation
  let backgroundStyle: React.CSSProperties = {
    backgroundColor: bgColor,
    minHeight: `${height}px`,
  };

  if (bgType === 'gradient' && banner.gradient) {
    backgroundStyle.background = buildCssGradient(
      banner.gradient.type || 'linear',
      banner.gradient.angle || 135,
      banner.gradient.stops
    );
  }

  // Image transformation style
  const bgImageConfig = banner.bgImage || {
    positionX: 50,
    positionY: 50,
    alignment: 'center',
    objectFit: 'cover',
    scale: 1,
    rotation: 0,
    zoom: 1,
    opacity: 1,
    blur: 0,
  };

  const posX =
    bgImageConfig.alignment === 'left'
      ? 0
      : bgImageConfig.alignment === 'right'
      ? 100
      : bgImageConfig.alignment === 'top'
      ? 50
      : bgImageConfig.alignment === 'bottom'
      ? 50
      : bgImageConfig.positionX ?? 50;

  const posY =
    bgImageConfig.alignment === 'top'
      ? 0
      : bgImageConfig.alignment === 'bottom'
      ? 100
      : bgImageConfig.alignment === 'left'
      ? 50
      : bgImageConfig.alignment === 'right'
      ? 50
      : bgImageConfig.positionY ?? 50;

  const effectiveScale = (bgImageConfig.scale || 1) * (bgImageConfig.zoom || 1);
  const transform = `scale(${effectiveScale}) rotate(${bgImageConfig.rotation || 0}deg)`;
  const filter = bgImageConfig.blur ? `blur(${bgImageConfig.blur}px)` : 'none';

  // Overlay style computation
  const overlayConfig = banner.overlay;
  const showOverlay =
    (bgType === 'image-overlay' || bgType === 'image-gradient' || bgType === 'multi-layer') &&
    overlayConfig?.enabled !== false;

  let overlayStyle: React.CSSProperties = {
    position: 'absolute',
    inset: 0,
    pointerEvents: 'none',
    opacity: overlayConfig?.opacity ?? 0.45,
    mixBlendMode: (overlayConfig?.blendMode as any) || 'normal',
    zIndex: 2,
  };

  if (overlayConfig?.type === 'gradient' && overlayConfig.gradientStops?.length) {
    overlayStyle.background = buildCssGradient('linear', 135, overlayConfig.gradientStops);
  } else {
    overlayStyle.backgroundColor = overlayConfig?.color || '#000000';
  }

  // Content alignment and positioning
  const textAlign = banner.textAlign || 'left';
  const contentPosition = banner.contentPosition || 'left';

  const positionClasses: Record<string, string> = {
    left: 'items-center justify-start text-left',
    center: 'items-center justify-center text-center',
    right: 'items-center justify-end text-right',
    'top-left': 'items-start justify-start text-left pt-8',
    'bottom-left': 'items-end justify-start text-left pb-8',
    'top-right': 'items-start justify-end text-right pt-8',
    'bottom-right': 'items-end justify-end text-right pb-8',
  };

  const linkTarget = sanitizeBannerLink(banner.destinationLink || banner.buttonLink);

  const handleBannerClick = (e: React.MouseEvent) => {
    if (isEditorPreview) {
      e.preventDefault();
      return;
    }
    if (!linkTarget) return;

    if (linkTarget.isExternal) {
      if (banner.openInNewTab) {
        window.open(linkTarget.safeUrl, '_blank', 'noopener,noreferrer');
      } else {
        window.location.href = linkTarget.safeUrl;
      }
    } else {
      if (onNavigate) {
        onNavigate(linkTarget.safeUrl.replace(/^\//, '') || 'shop');
      } else {
        window.location.href = linkTarget.safeUrl;
      }
    }
  };

  const hasContent = Boolean(
    (banner.tag && banner.tag.trim()) ||
    (banner.headline && banner.headline.trim()) ||
    (banner.subheadline && banner.subheadline.trim()) ||
    (banner.buttonText && banner.buttonText.trim())
  );

  return (
    <div
      onClick={linkTarget ? handleBannerClick : undefined}
      style={backgroundStyle}
      className={`relative w-full overflow-hidden rounded-3xl transition-all select-none shadow-md ${
        linkTarget ? 'cursor-pointer group' : ''
      } ${banner.responsive?.hideOnMobile && viewport === 'mobile' ? 'hidden' : ''} ${className}`}
    >
      {/* Background Image Layer */}
      {imageUrl && (bgType === 'image' || bgType === 'image-overlay' || bgType === 'image-gradient' || bgType === 'multi-layer') && (
        <div
          className="absolute inset-0 overflow-hidden pointer-events-none"
          style={{ zIndex: 1 }}
        >
          <img
            src={imageUrl}
            alt={banner.name || banner.headline || 'Banner'}
            style={{
              width: '100%',
              height: '100%',
              objectFit: bgImageConfig.objectFit || 'cover',
              objectPosition: `${posX}% ${posY}%`,
              transform,
              filter,
              opacity: bgImageConfig.opacity ?? 1,
              transformOrigin: `${posX}% ${posY}%`,
              transition: 'transform 0.4s ease-out, filter 0.4s ease-out',
            }}
          />
        </div>
      )}

      {/* Overlay Layer */}
      {showOverlay && <div style={overlayStyle} />}

      {/* Custom Configured Layers (if multi-layer mode) */}
      {bgType === 'multi-layer' && banner.layers && banner.layers.length > 0 && (
        <div className="absolute inset-0 pointer-events-none" style={{ zIndex: 3 }}>
          {banner.layers
            .filter((layer) => layer.visible)
            .sort((a, b) => a.zIndex - b.zIndex)
            .map((layer) => (
              <div
                key={layer.id}
                style={{
                  position: 'absolute',
                  inset: 0,
                  opacity: layer.opacity ?? 1,
                  zIndex: layer.zIndex,
                  ...(layer.type === 'gradient' && layer.config?.stops
                    ? { background: buildCssGradient('linear', layer.config.angle || 135, layer.config.stops) }
                    : layer.type === 'overlay'
                    ? { backgroundColor: layer.config?.color || 'rgba(0,0,0,0.4)' }
                    : {}),
                }}
              />
            ))}
        </div>
      )}

      {/* Structured Content Area (Only rendered if actual content exists) */}
      {hasContent && (
        <div
          className={`relative z-10 w-full h-full min-h-[inherit] flex p-5 sm:p-8 lg:p-12 ${
            positionClasses[contentPosition] || positionClasses.left
          }`}
        >
          <div
            style={{
              maxWidth: banner.maxContentWidth ? `${banner.maxContentWidth}px` : '620px',
              color: textColor,
            }}
            className={`space-y-2.5 sm:space-y-4 ${
              textAlign === 'center' ? 'mx-auto text-center' : textAlign === 'right' ? 'ml-auto text-right' : 'text-left'
            }`}
          >
            {banner.tag && banner.tag.trim() && (
              <span className="inline-block px-3 py-1 rounded-full text-[10px] sm:text-[11px] font-extrabold uppercase tracking-widest bg-white/20 backdrop-blur-md shadow-xs">
                {banner.tag}
              </span>
            )}

            {banner.headline && banner.headline.trim() && (
              <h2 className="text-xl sm:text-3xl lg:text-5xl font-black tracking-tight leading-tight whitespace-pre-line drop-shadow-sm">
                {banner.headline}
              </h2>
            )}

            {banner.subheadline && banner.subheadline.trim() && (
              <p className="text-xs sm:text-base font-medium opacity-90 leading-relaxed max-w-xl drop-shadow-xs">
                {banner.subheadline}
              </p>
            )}

            {banner.buttonText && banner.buttonText.trim() && (
              <div className="pt-2">
                <span
                  className="inline-flex items-center gap-2 px-6 py-2.5 rounded-full text-xs sm:text-sm font-bold bg-white text-gray-900 shadow-lg group-hover:scale-105 group-hover:bg-emerald-50 transition cursor-pointer"
                >
                  <span>{banner.buttonText}</span>
                  <svg
                    className="w-4 h-4 transition-transform group-hover:translate-x-1"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M14 5l7 7m0 0l-7 7m7-7H3"
                    />
                  </svg>
                </span>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
