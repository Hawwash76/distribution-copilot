"use client";

import { type AggregatedPainPoint } from "@distribution-copilot/shared";

const INTENSITY_STYLES = {
  low: "bg-muted text-muted-foreground",
  medium: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300",
  high: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300",
};

interface PainPointCardProps {
  painPoint: AggregatedPainPoint;
}

export function PainPointCard({ painPoint }: PainPointCardProps) {
  return (
    <div className="border-border rounded-lg border p-4">
      <div className="mb-3 flex items-start justify-between gap-3">
        <h3 className="text-sm font-medium leading-snug">{painPoint.theme}</h3>
        <div className="flex shrink-0 items-center gap-2">
          <span
            className={`rounded-full px-2 py-0.5 text-xs font-medium capitalize ${INTENSITY_STYLES[painPoint.intensity]}`}
          >
            {painPoint.intensity}
          </span>
          <span className="bg-muted text-muted-foreground rounded-full px-2 py-0.5 text-xs font-medium">
            {painPoint.count}×
          </span>
        </div>
      </div>

      {painPoint.quotes.length > 0 && (
        <ul className="space-y-2.5">
          {painPoint.quotes.map((evidence, i) => (
            <li key={i} className="space-y-1">
              <blockquote className="text-muted-foreground border-l-2 pl-3 text-xs italic leading-relaxed">
                &ldquo;{evidence.quote}&rdquo;
              </blockquote>
              <p className="pl-3 text-xs">
                <span className="text-muted-foreground">{evidence.source} · </span>
                <a
                  href={evidence.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-primary hover:underline"
                >
                  View discussion
                </a>
              </p>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
