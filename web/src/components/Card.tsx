import { useId, type ReactNode } from "react";

interface CardProps {
  title: string;
  aside?: ReactNode;
  className?: string;
  children: ReactNode;
}

export function Card({ title, aside, className = "", children }: CardProps) {
  const titleId = useId();
  return (
    <section className={`card ${className}`} aria-labelledby={titleId}>
      <header className="card__header">
        <h2 id={titleId} className="card__title">
          {title}
        </h2>
        {aside && <span className="card__aside">{aside}</span>}
      </header>
      {children}
    </section>
  );
}
