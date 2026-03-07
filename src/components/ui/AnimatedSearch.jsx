import React, { useState, useRef } from 'react';
import { Search } from 'lucide-react';

export function AnimatedSearch({
    value,
    onChange,
    placeholder = "Search...",
    expandedWidth = "sm:w-[250px]",
    className = ""
}) {
    const [isSearchExpanded, setIsSearchExpanded] = useState(false);
    const searchInputRef = useRef(null);

    return (
        <div
            className={`relative shrink-0 transition-all duration-300 ease-in-out flex items-center rounded-full h-9 ${isSearchExpanded || value
                ? `w-full ${expandedWidth} bg-white/5 border border-white/10 shadow-sm`
                : 'w-9 bg-transparent hover:bg-white/10 cursor-pointer'
                } ${className}`}
            onClick={() => {
                if (!isSearchExpanded) {
                    setIsSearchExpanded(true);
                    setTimeout(() => searchInputRef.current?.focus(), 50);
                }
            }}
        >
            <button
                type="button"
                className={`absolute left-0 w-9 h-full flex items-center justify-center transition-colors z-10 bg-gradient-to-r from-purple-600 to-blue-600 text-white shadow-sm ${isSearchExpanded || value ? 'rounded-l-full rounded-r-none' : 'rounded-full'
                    }`}
                onClick={(e) => {
                    if (isSearchExpanded && !value) {
                        e.stopPropagation();
                        setIsSearchExpanded(false);
                    }
                }}
            >
                <Search className="w-4 h-4 cursor-pointer" />
            </button>
            <input
                ref={searchInputRef}
                type="text"
                placeholder={placeholder}
                className={`h-full w-full bg-transparent border-none outline-none text-white text-sm pl-11 pr-3 transition-opacity duration-300 ${isSearchExpanded || value ? 'opacity-100' : 'opacity-0 cursor-pointer pointer-events-none'
                    }`}
                value={value}
                onChange={onChange}
                onBlur={() => {
                    if (!value) {
                        setTimeout(() => setIsSearchExpanded(false), 150);
                    }
                }}
            />
        </div>
    );
}

export default AnimatedSearch;
