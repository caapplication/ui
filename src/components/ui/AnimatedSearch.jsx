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
    const [isFocused, setIsFocused] = useState(false);
    const searchInputRef = useRef(null);

    return (
        <div
            className={`relative shrink-0 transition-all duration-300 ease-in-out flex items-center rounded-full h-11 ${isSearchExpanded || value || isFocused
                ? `w-full ${expandedWidth} bg-black/20 border border-white/10 shadow-[0_0_15px_rgba(0,0,0,0.2)]`
                : 'w-11 bg-black/20 border border-white/10 cursor-pointer text-gray-400'
                } ${className}`}
            onMouseEnter={() => setIsSearchExpanded(true)}
            onMouseLeave={() => {
                if (!isFocused && !value) {
                    setIsSearchExpanded(false);
                }
            }}
            onClick={() => {
                setIsSearchExpanded(true);
                setTimeout(() => searchInputRef.current?.focus(), 50);
            }}
        >
            <div
                className={`absolute left-1 w-9 h-9 flex items-center justify-center transition-all duration-300 z-10 bg-gradient-to-r from-purple-600 to-blue-600 shadow-lg shadow-purple-600/30 rounded-full ${isSearchExpanded || value ? 'translate-x-0' : 'translate-x-0'
                    }`}
            >
                <Search className="w-4 h-4 text-white" />
            </div>
            <input
                ref={searchInputRef}
                type="text"
                placeholder={placeholder}
                className={`h-full w-full bg-transparent border-none outline-none text-white text-sm pl-12 pr-4 transition-opacity duration-300 ${isSearchExpanded || value || isFocused ? 'opacity-100' : 'opacity-0 cursor-pointer pointer-events-none'
                    }`}
                value={value}
                onChange={onChange}
                onFocus={() => setIsFocused(true)}
                onBlur={() => {
                    setIsFocused(false);
                    if (!value) {
                        setIsSearchExpanded(false);
                    }
                }}
            />
        </div>
    );
}

export default AnimatedSearch;
