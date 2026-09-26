import type { ReactNode } from 'react';
import { Icon } from './Icon';

interface SectionProps {
  title: ReactNode;
  /** Right side of the header: small actions or a hint. */
  aside?: ReactNode;
  /** Help text, shown in a tooltip on an info icon next to the title (keeps the panel light). */
  info?: string;
  children?: ReactNode;
  className?: string;
}

export function Section({ title, aside, info, children, className = '' }: SectionProps) {
  return (
    <section className={`section ${className}`}>
      <h2 className="section-title">
        <span className="section-name">{title}</span>
        {info && (
          <span className="section-info" data-tip={info} aria-label={info} role="img" tabIndex={0}>
            <Icon name="info" size={14} />
          </span>
        )}
        {aside}
      </h2>
      {children}
    </section>
  );
}

export function Row({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="row">
      <span className="row-label">{label}</span>
      <div className="row-control">{children}</div>
    </div>
  );
}
