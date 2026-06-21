"use client"

import { useState, useRef, useEffect } from "react"
import { Search } from "lucide-react"

export interface Product {
  id: string;
  name: string;
  unit: string;
  category: string;
  type: string;
  mrp?: number;
}

interface ProductComboboxProps {
  value: string;
  onChange: (name: string, unit?: string, mrp?: number) => void;
  products: Product[];
}

export function ProductCombobox({ value, onChange, products }: ProductComboboxProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [searchTerm, setSearchTerm] = useState(value)
  const wrapperRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const [dropdownStyle, setDropdownStyle] = useState<React.CSSProperties>({})

  useEffect(() => {
    setSearchTerm(value)
  }, [value])

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }
    document.addEventListener("mousedown", handleClickOutside)
    return () => document.removeEventListener("mousedown", handleClickOutside)
  }, [])

  useEffect(() => {
    if (isOpen && inputRef.current) {
      const rect = inputRef.current.getBoundingClientRect()
      setDropdownStyle({
        position: 'fixed',
        zIndex: 9999,
        top: rect.bottom + 4,
        left: rect.left,
        width: rect.width
      })
    }
  }, [isOpen, searchTerm])

  const filtered = products.filter(p => p.name.toLowerCase().includes(searchTerm.toLowerCase()))

  return (
    <div className="relative w-full" ref={wrapperRef}>
      <div className="relative">
        <input
          ref={inputRef}
          type="text"
          value={searchTerm}
          onChange={(e) => {
            setSearchTerm(e.target.value)
            setIsOpen(true)
            onChange(e.target.value) 
          }}
          onClick={() => setIsOpen(true)}
          className="h-9 w-full px-2 pl-7 text-sm rounded border border-border-default focus:border-primary focus:ring-1 outline-none"
          placeholder="Search product..."
        />
        <Search className="absolute left-2 top-2.5 h-4 w-4 text-text-muted pointer-events-none" />
      </div>
      
      {isOpen && (
        <div className="product-dropdown" style={dropdownStyle}>
          {filtered.length > 0 ? (
            <ul className="py-1">
              {filtered.map(p => (
                <li
                  key={p.id}
                  onClick={() => {
                    setSearchTerm(p.name)
                    onChange(p.name, p.unit, p.mrp)
                    setIsOpen(false)
                  }}
                  className="cursor-pointer px-3 py-2 hover:bg-surface-container border-b border-border-default last:border-0"
                >
                  <div className="font-medium text-sm text-text-main">{p.name}</div>
                  <div className="text-xs text-text-muted">
                    {p.category || 'Uncategorized'} • {p.unit}
                    {p.mrp !== undefined && p.mrp !== null ? ` • MRP: ₹${p.mrp}` : ''}
                  </div>
                </li>
              ))}
              {searchTerm && !filtered.find(p => p.name.toLowerCase() === searchTerm.toLowerCase()) && (
                <li 
                  className="cursor-pointer px-3 py-3 text-sm text-primary hover:bg-surface-container font-medium"
                  onClick={() => {
                    onChange(searchTerm)
                    setIsOpen(false)
                  }}
                >
                  + Add custom: "{searchTerm}"
                </li>
              )}
            </ul>
          ) : (
            <div 
              className="cursor-pointer px-3 py-3 text-sm text-primary hover:bg-surface-container font-medium"
              onClick={() => {
                onChange(searchTerm)
                setIsOpen(false)
              }}
            >
              + Add custom: "{searchTerm}"
            </div>
          )}
        </div>
      )}
    </div>
  )
}
