interface PaginationControlsProps {
  currentPage: number;
  pageCount: number;
  onPageChange: (page: number) => void;
}

export function PaginationControls({
  currentPage,
  pageCount,
  onPageChange,
}: PaginationControlsProps): JSX.Element | null {
  if (pageCount <= 1) {
    return null;
  }

  const pages = Array.from({ length: pageCount }, (_, index) => index + 1);

  return (
    <nav className="pagination-controls" aria-label="Pagination">
      {pages.map((page) => (
        <button
          key={page}
          type="button"
          className={
            page === currentPage
              ? 'pagination-page pagination-page--selected'
              : 'pagination-page'
          }
          aria-current={page === currentPage ? 'page' : undefined}
          onClick={() => onPageChange(page)}
        >
          {page}
        </button>
      ))}
    </nav>
  );
}
