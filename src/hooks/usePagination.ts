import { useState, useMemo, useCallback } from 'react'

interface PaginationOptions {
  itemsPerPage?: number
  initialPage?: number
}

interface PaginationResult<T> {
  currentPage: number
  totalPages: number
  currentItems: T[]
  isFirstPage: boolean
  isLastPage: boolean
  nextPage: () => void
  previousPage: () => void
  goToPage: (page: number) => void
  setItemsPerPage: (count: number) => void
  itemsPerPage: number
  startIndex: number
  endIndex: number
}

export function usePagination<T>(
  items: T[],
  options: PaginationOptions = {}
): PaginationResult<T> {
  const { itemsPerPage: initialItemsPerPage = 10, initialPage = 1 } = options
  
  const [currentPage, setCurrentPage] = useState(initialPage)
  const [itemsPerPage, setItemsPerPage] = useState(initialItemsPerPage)
  
  const totalPages = Math.ceil(items.length / itemsPerPage)
  
  const currentItems = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage
    const endIndex = startIndex + itemsPerPage
    return items.slice(startIndex, endIndex)
  }, [items, currentPage, itemsPerPage])
  
  const startIndex = (currentPage - 1) * itemsPerPage
  const endIndex = Math.min(startIndex + itemsPerPage, items.length)
  
  const isFirstPage = currentPage === 1
  const isLastPage = currentPage === totalPages || totalPages === 0
  
  const nextPage = useCallback(() => {
    setCurrentPage(prev => Math.min(prev + 1, totalPages))
  }, [totalPages])
  
  const previousPage = useCallback(() => {
    setCurrentPage(prev => Math.max(prev - 1, 1))
  }, [])
  
  const goToPage = useCallback((page: number) => {
    setCurrentPage(Math.max(1, Math.min(page, totalPages)))
  }, [totalPages])
  
  const updateItemsPerPage = useCallback((count: number) => {
    setItemsPerPage(count)
    // Reset to first page when changing items per page
    setCurrentPage(1)
  }, [])
  
  // Reset to first page if current page is out of bounds
  if (currentPage > totalPages && totalPages > 0) {
    setCurrentPage(1)
  }
  
  return {
    currentPage,
    totalPages,
    currentItems,
    isFirstPage,
    isLastPage,
    nextPage,
    previousPage,
    goToPage,
    setItemsPerPage: updateItemsPerPage,
    itemsPerPage,
    startIndex,
    endIndex
  }
}