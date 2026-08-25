import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import { NotificationBell } from "@/components/notifications/notification-bell";

interface HeaderLayoutProps {
  eyebrow?: string;
  description?: string;
  className?: string;
  children?: React.ReactNode;
}

export function HeaderLayout({
  eyebrow,
  description,
  className,
  children,
}: HeaderLayoutProps) {
  return (
    <section className="w-full">
      <div className="flex flex-col gap-3">
        {eyebrow ? (
          <motion.span
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, ease: [0.32, 0.72, 0, 1] }}
            className="inline-flex w-fit items-center gap-2 rounded-full border border-border bg-card px-3 py-1 text-[10.5px] font-medium uppercase tracking-[0.22em] text-muted-foreground"
          >
            <span className="size-1.5 rounded-full bg-accent" />
            {eyebrow}
          </motion.span>
        ) : null}

        <div className="flex items-end justify-between gap-4">
          <motion.h2
            initial={{ opacity: 0, y: 16, filter: "blur(8px)" }}
            animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
            transition={{
              duration: 0.7,
              delay: 0.05,
              ease: [0.32, 0.72, 0, 1],
            }}
            className={cn(
              "font-heading text-[40px] font-semibold leading-[1.05] tracking-[-0.025em] text-foreground md:text-[52px]",
              className,
            )}
          >
            {children}
          </motion.h2>

          <div className="flex items-end justify-end gap-4">
            {description ? (
              <motion.p
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{
                  duration: 0.6,
                  delay: 0.18,
                  ease: [0.32, 0.72, 0, 1],
                }}
                className="hidden max-w-[28ch] text-balance text-end text-[13.5px] leading-relaxed text-muted-foreground md:block"
              >
                {description}
              </motion.p>
            ) : null}
            <div className="flex items-center">
              <NotificationBell />
            </div>
          </div>
        </div>

        <motion.div
          initial={{ scaleX: 0 }}
          animate={{ scaleX: 1 }}
          transition={{ duration: 0.9, delay: 0.1, ease: [0.32, 0.72, 0, 1] }}
          style={{ transformOrigin: "left center" }}
          className="mt-1 h-px w-full bg-linear-to-r from-foreground/20 via-foreground/10 to-transparent"
        />
      </div>
    </section>
  );
}
