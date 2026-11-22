import type { ReactNode } from "react";

interface PanelProps {
  number: string;
  title: string;
  aside?: ReactNode;
  className?: string;
  children: ReactNode;
}

export function Panel({ number, title, aside, className = "", children }: PanelProps) {
  const headingId = `panel-${number}`;
  return (
    <section className={`panel ${className}`} aria-labelledby={headingId}>
      <header className="panel__header">
        <h2 id={headingId}>
          <span className="panel__number">{number}</span>
          {title}
        </h2>
        {aside && <span className="panel__aside">{aside}</span>}
      </header>
      {children}
    </section>
  );
}
