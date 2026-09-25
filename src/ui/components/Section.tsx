import type { ReactNode } from 'react';

interface SectionProps {
  title: ReactNode;
  /** Right side of the header: small actions or a hint. */
  aside?: ReactNode;
  children?: ReactNode;
  className?: string;
}

export function Section({ title, aside, children, className = '' }: SectionProps) {
  return (
    <section className={`section ${className}`}>
      <h2 className="section-title">
        <span className="section-name">{title}</span>
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
