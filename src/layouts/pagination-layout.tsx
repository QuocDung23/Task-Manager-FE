import { motion, AnimatePresence } from "framer-motion";
import {
  Pagination,
  PaginationContent,
  PaginationItem,
} from "@/components/ui/pagination";
import { CaretLeft, CaretRight, DotsThree } from "@phosphor-icons/react";
import { cn } from "@/lib/utils";

interface PaginationLayoutProps {
  currentPage: number;
  totalPage: number;
  onChangePage: (page: number) => void;
}

const buildRange = (
  totalPage: number,
  currentPage: number,
): (number | "ellipsis")[] => {
  if (totalPage <= 7) {
    return Array.from({ length: totalPage }, (_, i) => i + 1);
  }

  const range: (number | "ellipsis")[] = [1];
  const start = Math.max(2, currentPage - 1);
  const end = Math.min(totalPage - 1, currentPage + 1);

  if (start > 2) range.push("ellipsis");
  for (let i = start; i <= end; i++) range.push(i);
  if (end < totalPage - 1) range.push("ellipsis");

  range.push(totalPage);
  return range;
};

export function PaginationLayout({
  currentPage,
  totalPage,
  onChangePage,
}: PaginationLayoutProps) {
  if (totalPage <= 1) return null;

  const pages = buildRange(totalPage, currentPage);
  const isFirst = currentPage === 1;
  const isLast = currentPage === totalPage;

  return (
    <Pagination className="mt-12">
      <PaginationContent
        className={cn(
          "relative isolate gap-1 rounded-full border border-border bg-card p-1.5 text-card-foreground",
        )}
      >
        <PaginationItem>
          <NavPill
            label="Previous"
            disabled={isFirst}
            onClick={() => !isFirst && onChangePage(currentPage - 1)}
            side="left"
          >
            <CaretLeft weight="bold" className="size-3.5" />
          </NavPill>
        </PaginationItem>

        <span className="mx-3 hidden h-4 w-px bg-border sm:block" />

        <AnimatePresence mode="popLayout" initial={false}>
          {pages.map((page, idx) =>
            page === "ellipsis" ? (
              <PaginationItem key={`ellipsis-${idx}`}>
                <span className="grid size-9 place-items-center text-muted-foreground">
                  <DotsThree weight="bold" className="size-4" />
                </span>
              </PaginationItem>
            ) : (
              <PaginationItem key={page}>
                <PagePill
                  page={page}
                  isActive={page === currentPage}
                  onClick={() => onChangePage(page)}
                />
              </PaginationItem>
            ),
          )}
        </AnimatePresence>

        <span className="mx-3 hidden h-4 w-px bg-border sm:block" />

        <PaginationItem>
          <NavPill
            label="Next"
            disabled={isLast}
            onClick={() => !isLast && onChangePage(currentPage + 1)}
            side="right"
          >
            <span className="text-[13px] font-medium">Next</span>
            <CaretRight weight="bold" className="size-3.5" />
          </NavPill>
        </PaginationItem>
      </PaginationContent>
    </Pagination>
  );
}

function NavPill({
  children,
  label,
  disabled,
  onClick,
  side,
}: {
  children: React.ReactNode;
  label: string;
  disabled?: boolean;
  onClick: () => void;
  side: "left" | "right";
}) {
  return (
    <motion.button
      whileHover={!disabled ? { scale: 1.02 } : {}}
      whileTap={!disabled ? { scale: 0.97 } : {}}
      transition={{ type: "spring", stiffness: 400, damping: 26 }}
      onClick={onClick}
      aria-label={label}
      disabled={disabled}
      className={cn(
        "group/nav inline-flex items-center gap-2 rounded-full px-4 py-2 text-[13px] font-medium",
        "transition-colors duration-500 ease-[cubic-bezier(0.32,0.72,0,1)]",
        disabled
          ? "cursor-not-allowed text-muted-foreground/40"
          : "text-muted-foreground hover:bg-muted hover:text-foreground active:bg-muted",
      )}
    >
      <motion.span
        className="inline-flex items-center"
        animate={{ x: 0 }}
        whileHover={!disabled ? { x: side === "left" ? -2 : 2 } : {}}
        transition={{ type: "spring", stiffness: 500, damping: 28 }}
      >
        {children}
      </motion.span>
    </motion.button>
  );
}

function PagePill({
  page,
  isActive,
  onClick,
}: {
  page: number;
  isActive: boolean;
  onClick: () => void;
}) {
  return (
    <motion.button
      onClick={onClick}
      whileHover={!isActive ? { scale: 1.05 } : {}}
      whileTap={{ scale: 0.94 }}
      transition={{ type: "spring", stiffness: 420, damping: 28 }}
      aria-current={isActive ? "page" : undefined}
      className={cn(
        "relative grid size-9 place-items-center rounded-full text-[13px] font-medium tabular-nums",
        "transition-colors duration-500 ease-[cubic-bezier(0.32,0.72,0,1)]",
        isActive
          ? "text-accent-foreground"
          : "text-muted-foreground hover:bg-muted hover:text-foreground",
      )}
    >
      {isActive && (
        <motion.span
          layoutId="pagination-active-pill"
          className="absolute inset-0 -z-10 rounded-full bg-accent"
          transition={{ type: "spring", stiffness: 380, damping: 30 }}
        >
          <span className="grid size-full place-items-center text-accent-foreground">
            {page}
          </span>
        </motion.span>
      )}
      {!isActive && page}
    </motion.button>
  );
}
