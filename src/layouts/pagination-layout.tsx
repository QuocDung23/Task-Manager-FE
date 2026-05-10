import {
    Pagination,
    PaginationEllipsis,
    PaginationLink,
    PaginationContent,
    PaginationItem,
    PaginationPrevious,
    PaginationNext,
  } from "@/components/ui/pagination";
  
  interface PaginationProps {
    currentPage: number;
    totalPage: number;
    onChangePage: (page: number) => void;
  }
  
  export function PaginationLayout({
    currentPage,
    totalPage,
    onChangePage,
  }: PaginationProps) {
    if (totalPage <= 1) return null;
  
    const paginationRange = () => {
      const range = [];
      const delta = 1;
  
      for (let i = 1; i <= totalPage; i++) {
        if (
          i === 1 ||
          i === totalPage ||
          (i >= currentPage - delta && i <= currentPage + delta)
        ) {
          range.push(i);
        } else if (i === 2 && currentPage - delta > 2) {
          range.push("left-ellipsis");
        } else if (i === totalPage - 1 && currentPage + delta < totalPage - 1) {
          range.push("right-ellipsis");
        }
      }
      return range.filter((item, idx, arr) => !(item === arr[idx - 1]));
    };
  
    const pages = paginationRange();
  
    return (
      <Pagination>
        <PaginationContent>
          <PaginationItem>
            <PaginationPrevious
              href="#"
              onClick={(e) => {
                e.preventDefault();
                if (currentPage > 1) onChangePage(currentPage - 1);
              }}
              aria-disabled={currentPage === 1}
            />
          </PaginationItem>
          {pages.map((page, idx) =>
            page === "left-ellipsis" || page === "right-ellipsis" ? (
              <PaginationItem key={`ellipsis-${idx}`}>
                <PaginationEllipsis />
              </PaginationItem>
            ) : (
              <PaginationItem key={page}>
                <PaginationLink
                  href="#"
                  isActive={page === currentPage}
                  aria-current={page === currentPage ? "page" : undefined}
                  onClick={(e) => {
                    e.preventDefault();
                    if (typeof page === "number" && page !== currentPage)
                      onChangePage(page);
                  }}
                >
                  {page}
                </PaginationLink>
              </PaginationItem>
            ),
          )}
          <PaginationItem>
            <PaginationNext
              href="#"
              onClick={(e) => {
                e.preventDefault();
                if (currentPage < totalPage) onChangePage(currentPage + 1);
              }}
              aria-disabled={currentPage === totalPage}
            />
          </PaginationItem>
        </PaginationContent>
      </Pagination>
    );
  }
  