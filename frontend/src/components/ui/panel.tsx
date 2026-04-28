import { cn } from "@/lib/utils";

type PanelProps = React.HTMLAttributes<HTMLDivElement>;

export function Panel({ children, className, ...props }: PanelProps) {
  return (
    <div
      className={cn(
        "rounded-[1.75rem] border border-border bg-surface/92 p-6 shadow-[0_18px_50px_rgba(16,32,51,0.12)] backdrop-blur",
        className,
      )}
      {...props}
    >
      {children}
    </div>
  );
}
