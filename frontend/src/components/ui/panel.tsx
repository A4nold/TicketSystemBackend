import { cn } from "@/lib/utils";

type PanelProps = React.HTMLAttributes<HTMLDivElement>;

export function Panel({ children, className, ...props }: PanelProps) {
  return (
    <div
      className={cn(
        "rounded-[1.75rem] border border-border bg-surface/85 p-6 shadow-[0_18px_60px_rgba(2,8,20,0.24)] backdrop-blur",
        className,
      )}
      {...props}
    >
      {children}
    </div>
  );
}
