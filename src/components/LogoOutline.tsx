import type {ReactNode} from 'react';
import useBaseUrl from '@docusaurus/useBaseUrl';
import OutlineDefault from '@site/static/img/logo-outline.svg';
import OutlineHero    from '@site/static/img/logo-hero-outline.svg';
import styles from './LogoOutline.module.css';

type Variant = 'default' | 'hero';

type Props = {
  size?:     number;
  variant?:  Variant;
  showFill?: boolean;
  className?: string;
};

const FILL_SRC: Record<Variant, string> = {
  default: '/img/logo.png',
  hero:    '/img/logo-hero.png',
};

const OUTLINES: Record<Variant, typeof OutlineDefault> = {
  default: OutlineDefault,
  hero:    OutlineHero,
};

export default function LogoOutline({
  size = 96,
  variant = 'default',
  showFill = true,
  className,
}: Props): ReactNode {
  const fillSrc = useBaseUrl(FILL_SRC[variant]);
  const Outline = OUTLINES[variant];
  const variantClass = variant === 'hero' ? styles.wrapHero : styles.wrapDefault;
  return (
    <div
      className={`${styles.wrap} ${variantClass} ${className ?? ''}`}
      style={{width: size, height: size}}
    >
      {showFill && (
        <img
          src={fillSrc}
          alt=""
          className={styles.fill}
          width={size}
          height={size}
        />
      )}
      <Outline className={styles.outline} role="img" aria-label="Serotonin" />
    </div>
  );
}
