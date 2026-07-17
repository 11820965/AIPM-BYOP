import { reliabilityLog } from "@/lib/worker/data";

const COLORS = ["#2a3a55", "var(--teal)", "var(--amber)", "var(--coral)"];
const LABELS = ["No booking", "Completed", "Late", "No-show"];

export function ReliabilityTimeline({ seed = 7, label = "Last 30 days — tap any day for details." }: { seed?: number; label?: string }) {
  const log = reliabilityLog(seed);
  return (
    <div>
      <div className="flex gap-1">
        {log.map((v, i) => (
          <div
            key={i}
            title={`Day ${i + 1}: ${LABELS[v]}`}
            className="h-5 flex-1 rounded-sm"
            style={{ background: COLORS[v] }}
          />
        ))}
      </div>
      <div className="mt-2 flex items-center justify-between text-[11px] text-muted-foreground">
        <span>{label}</span>
        <div className="flex items-center gap-3">
          <Legend c="var(--teal)" l="On time" />
          <Legend c="var(--amber)" l="Late" />
          <Legend c="var(--coral)" l="No-show" />
        </div>
      </div>
    </div>
  );
}
function Legend({ c, l }: { c: string; l: string }) {
  return <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-sm" style={{ background: c }} />{l}</span>;
}
