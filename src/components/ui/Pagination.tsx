import { Button } from './Button'

interface PaginationProps {
  currentPage: number
  totalPages: number
  onPageChange: (page: number) => void
  isFirstPage: boolean
  isLastPage: boolean
  onNext: () => void
  onPrevious: () => void
  showPageNumbers?: boolean
  maxPageButtons?: number
}

export function Pagination({
  currentPage,
  totalPages,
  onPageChange,
  isFirstPage,
  isLastPage,
  onNext,
  onPrevious,
  showPageNumbers = true,
  maxPageButtons = 5
}: PaginationProps) {
  if (totalPages <= 1) return null
  
  const getPageNumbers = () => {
    const pages: (number | string)[] = []
    
    if (totalPages <= maxPageButtons) {
      // Show all pages if total is less than max
      for (let i = 1; i <= totalPages; i++) {
        pages.push(i)
      }
    } else {
      // Always show first page
      pages.push(1)
      
      const startPage = Math.max(2, currentPage - 1)
      const endPage = Math.min(totalPages - 1, currentPage + 1)
      
      // Add ellipsis if needed
      if (startPage > 2) {
        pages.push('...')
      }
      
      // Add middle pages
      for (let i = startPage; i <= endPage; i++) {
        pages.push(i)
      }
      
      // Add ellipsis if needed
      if (endPage < totalPages - 1) {
        pages.push('...')
      }
      
      // Always show last page
      pages.push(totalPages)
    }
    
    return pages
  }
  
  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      gap: '0.5rem',
      justifyContent: 'center',
      padding: '1rem 0'
    }}>
      <Button
        variant="ghost"
        size="small"
        onClick={onPrevious}
        disabled={isFirstPage}
        aria-label="Previous page"
      >
        ←
      </Button>
      
      {showPageNumbers && (
        <div style={{ display: 'flex', gap: '0.25rem' }}>
          {getPageNumbers().map((page, index) => (
            <div key={index}>
              {page === '...' ? (
                <span style={{ 
                  padding: '0.25rem 0.5rem',
                  color: 'var(--color-gray-500)'
                }}>
                  …
                </span>
              ) : (
                <Button
                  variant={page === currentPage ? 'primary' : 'ghost'}
                  size="small"
                  onClick={() => onPageChange(page as number)}
                  style={{
                    minWidth: '2rem',
                    padding: '0.25rem 0.5rem'
                  }}
                >
                  {page}
                </Button>
              )}
            </div>
          ))}
        </div>
      )}
      
      <Button
        variant="ghost"
        size="small"
        onClick={onNext}
        disabled={isLastPage}
        aria-label="Next page"
      >
        →
      </Button>
    </div>
  )
}

export function PaginationInfo({
  startIndex,
  endIndex,
  totalItems
}: {
  startIndex: number
  endIndex: number
  totalItems: number
}) {
  if (totalItems === 0) return null
  
  return (
    <p className="body-small text-secondary" style={{ textAlign: 'center' }}>
      Showing {startIndex + 1} to {endIndex} of {totalItems} items
    </p>
  )
}