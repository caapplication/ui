import React, { useState, useEffect, useCallback } from 'react';
import { Loader2, History, Download, Folder } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth.jsx';
import { getActivityLog } from '@/lib/api';
import { useToast } from '@/components/ui/use-toast';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

// Helper functions for localStorage caching
const getCache = (key) => {
    try {
        const item = localStorage.getItem(key);
        return item ? JSON.parse(item) : null;
    } catch (e) {
        return null;
    }
};

const setCache = (key, data) => {
    try {
        localStorage.setItem(key, JSON.stringify(data));
    } catch (e) {
        // ignore
    }
};

const ActivityLog = ({ itemId, itemType, showFilter = true, excludeTypes = [] }) => {
    const [logs, setLogs] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [startDate, setStartDate] = useState('');
    const [endDate, setEndDate] = useState('');
    const { user } = useAuth();
    const { toast } = useToast();

    const fetchLogs = useCallback(async (signal) => {
        if (!itemId || !itemType || !user?.access_token) return;

        const CACHE_KEY = `fynivo_activity_log_${itemType}_${itemId}`;
        const cachedLogs = getCache(CACHE_KEY);

        // Use cache only if no date filters are applied (caching filtered results is complex)
        const canUseCache = !startDate && !endDate;

        if (canUseCache && cachedLogs) {
            // Apply excludeTypes filter to cached logs
            let filteredCachedLogs = cachedLogs;
            if (excludeTypes.length > 0) {
                filteredCachedLogs = cachedLogs.filter(log => {
                    if (excludeTypes.includes('document') && log.document_id) return false;
                    if (excludeTypes.includes('folder') && log.folder_id) return false;
                    return true;
                });
            }
            setLogs(filteredCachedLogs);
            setIsLoading(false);
        } else {
            setIsLoading(true);
        }

        try {
            // Convert date strings to ISO format for API
            const startDateISO = startDate ? new Date(startDate).toISOString() : null;
            const endDateISO = endDate ? new Date(endDate + 'T23:59:59').toISOString() : null; // Include time to cover entire day

            // Note: getActivityLog needs to be updated to accept signal if we want true network cancellation,
            // but for now we can at least preventing state updates from race conditions.
            // Since our api helpers don't support signal yet, we'll just handle the race condition here.
            const data = await getActivityLog(itemId, itemType, user.access_token, startDateISO, endDateISO);

            if (signal.aborted) return;

            // Apply excludeTypes filter
            let filteredData = data;
            if (excludeTypes.length > 0 && Array.isArray(data)) {
                filteredData = data.filter(log => {
                    if (excludeTypes.includes('document') && log.document_id) return false;
                    if (excludeTypes.includes('folder') && log.folder_id) return false;
                    return true;
                });
            }

            setLogs(filteredData);

            if (canUseCache) {
                setCache(CACHE_KEY, data);
            }
        } catch (error) {
            if (signal.aborted) return;
            // If cache exists and fetch fails, we still have data
            if (!canUseCache || !cachedLogs) {
                const errorMessage = error?.message || (typeof error === 'string' ? error : 'An unexpected error occurred');
                toast({
                    title: 'Error fetching activity log',
                    description: errorMessage,
                    variant: 'destructive',
                });
            }
        } finally {
            if (!signal.aborted) {
                setIsLoading(false);
            }
        }
    }, [itemId, itemType, user?.access_token, startDate, endDate]); // Removed toast

    useEffect(() => {
        const controller = new AbortController();
        fetchLogs(controller.signal);
        return () => controller.abort();
    }, [fetchLogs]);

    if (isLoading) {
        return (
            <div className="flex justify-center items-center h-40">
                <Loader2 className="w-6 h-6 animate-spin text-white" />
            </div>
        );
    }

    if (logs.length === 0) {
        return (
            <div className="text-center py-10 text-gray-400">
                <History className="mx-auto w-10 h-10 mb-2" />
                <p>No activity recorded yet.</p>
            </div>
        )
    }

    // Debug: print a sample log entry to the console
    if (logs.length > 0) {
        // Only print once per mount
        // eslint-disable-next-line no-console
        console.log('Sample activity log entry:', logs[0]);
    }

    const handleDownloadCSV = () => {
        if (logs.length === 0) {
            toast({
                title: 'No data to export',
                description: 'There are no activity logs to download.',
                variant: 'destructive',
            });
            return;
        }

        // Create CSV content
        const headers = ['Timestamp', 'User', 'Action', 'Details'];
        const csvRows = [
            headers.join(','),
            ...logs.map(log => {
                const userDisplay = log.name && log.email
                    ? `${log.name} (${log.email})`
                    : log.name || log.email || 'Unknown User';
                const timestamp = new Date(log.timestamp).toLocaleString();
                const action = log.action || '';
                const details = (log.details || '').replace(/"/g, '""'); // Escape quotes
                return `"${timestamp}","${userDisplay}","${action}","${details}"`;
            })
        ];

        const csvContent = csvRows.join('\n');
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        const url = URL.createObjectURL(blob);
        link.setAttribute('href', url);
        link.setAttribute('download', `activity_log_${itemType}_${itemId}_${new Date().toISOString().split('T')[0]}.csv`);
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);

        toast({
            title: 'Success',
            description: 'Activity log exported to CSV successfully.',
        });
    };

    return (
        <div className="space-y-4">
            {/* Filters and Download - Only show if showFilter is true */}
            {showFilter && (
                <div className="flex flex-col flex-wrap sm:flex-row gap-4 items-start sm:items-center justify-between p-4 bg-white/5 rounded-lg border border-white/10">
                    <div className="flex flex-col sm:flex-row gap-4 flex-1">
                        <div className="flex items-center gap-2">
                            <Label htmlFor="start-date" className="text-sm text-gray-400 whitespace-nowrap">From:</Label>
                            <Input
                                id="start-date"
                                type="date"
                                value={startDate}
                                onChange={(e) => setStartDate(e.target.value)}
                                className="w-auto"
                            />
                        </div>
                        <div className="flex items-center gap-2">
                            <Label htmlFor="end-date" className="text-sm text-gray-400 whitespace-nowrap">To:</Label>
                            <Input
                                id="end-date"
                                type="date"
                                value={endDate}
                                onChange={(e) => setEndDate(e.target.value)}
                                className="w-auto"
                            />
                        </div>
                        {(startDate || endDate) && (
                            <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => {
                                    setStartDate('');
                                    setEndDate('');
                                }}
                                className="text-gray-400 hover:text-white"
                            >
                                Clear Filters
                            </Button>
                        )}
                    </div>
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={handleDownloadCSV}
                        disabled={logs.length === 0}
                        className="flex items-center gap-2"
                    >
                        <Download className="w-4 h-4" />
                        Download CSV
                    </Button>
                </div>
            )}

            <div className="overflow-y-auto max-h-[500px] space-y-4 pr-2 custom-scrollbar">
                {logs.map(log => {
                    // Prefer top-level name/email if present (API returns these at top level)
                    let userDisplay = '';
                    if (log.name && log.email) {
                        userDisplay = `${log.name} (${log.email})`;
                    } else if (log.name) {
                        userDisplay = log.name;
                    } else if (log.email) {
                        userDisplay = log.email;
                    } else if (typeof log.user === 'object' && log.user !== null) {
                        if (log.user.name && log.user.email) {
                            userDisplay = `${log.user.name} (${log.user.email})`;
                        } else if (log.user.name) {
                            userDisplay = log.user.name;
                        } else if (log.user.email) {
                            userDisplay = log.user.email;
                        } else {
                            userDisplay = 'Unknown User';
                        }
                    } else if (typeof log.user === 'string') {
                        userDisplay = log.user;
                    } else {
                        userDisplay = 'Unknown User';
                    }

                    // Human-readable action
                    let actionDisplay = '';
                    if (log.action) {
                        if (log.action.toLowerCase().includes('create')) {
                            actionDisplay = 'has created';
                        } else if (log.action.toLowerCase().includes('update')) {
                            actionDisplay = 'has updated';
                        } else if (log.action.toLowerCase().includes('delete')) {
                            actionDisplay = 'has deleted';
                        } else if (log.action.toLowerCase().includes('upload')) {
                            actionDisplay = 'has uploaded';
                        } else {
                            actionDisplay = log.action.toLowerCase();
                        }
                    }

                    // Human-readable item type
                    let itemTypeDisplay = '';
                    if (log.folder_id) {
                        itemTypeDisplay = 'folder';
                    } else if (log.document_id) {
                        itemTypeDisplay = 'document';
                    } else if (itemType === 'invoice') {
                        itemTypeDisplay = 'invoice';
                    } else if (itemType === 'voucher') {
                        itemTypeDisplay = 'voucher';
                    } else if (itemType === 'client') {
                        itemTypeDisplay = 'client';
                    } else {
                        itemTypeDisplay = 'item';
                    }

                    return (
                        <div key={log.id} className="flex items-start space-x-3 p-3 rounded-lg bg-gray-800/50 border border-gray-700/50">
                            <div className="flex-shrink-0">
                                <div className="w-8 h-8 rounded-full bg-gray-600 flex items-center justify-center">
                                    <History className="w-4 h-4 text-gray-300" />
                                </div>
                            </div>
                            <div className="flex-1 min-w-0">
                                <p className="text-sm text-white">
                                    <span className="font-semibold">{userDisplay}</span> {actionDisplay} {itemTypeDisplay}.
                                </p>
                                {log.details &&
                                    log.details !== "Voucher created" &&
                                    log.details !== "Voucher updated" &&
                                    log.details !== "Invoice created" &&
                                    log.details !== "Invoice updated" && (
                                        <p className="text-xs text-gray-300 mt-1 ml-4 pl-2 border-l-2 border-gray-600">
                                            {renderLogDetails(log.details)}
                                        </p>
                                    )}
                                <p className="text-xs text-gray-400 mt-1">
                                    {new Date(log.timestamp).toLocaleString()}
                                </p>
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
};

// Helper function to format log details (e.g. replacing Role enums with friendly names)
const formatLogDetails = (details) => {
    if (!details) return '';
    return details
        .replace(/Role.CLIENT_MASTER_ADMIN/g, 'Client Admin')
        .replace(/Role.CLIENT_ADMIN/g, 'Organization Owner')
        .replace(/Role.ENTITY_ADMIN/g, 'Organization Owner')
        .replace(/Role.ENTITY_USER/g, 'Entity User')
        .replace(/Role.CLIENT_USER/g, 'Member')
        .replace(/Role.CA_ACCOUNTANT/g, 'Accountant')
        .replace(/Role.CA_ADMIN/g, 'Agency Admin');
};

const renderLogDetails = (details) => {
    if (!details) return null;

    // Check for "Uploaded document 'X' in Path" pattern
    // We look for the LAST occurrence of " in " to split the path
    const lastInIndex = details.lastIndexOf("' in ");

    // Ensure we found " in " AND it looks like it follows a quoted string (the file/folder name)
    if (lastInIndex !== -1) {
        const prefix = details.substring(0, lastInIndex + 1); // Include the closing quote of the name
        const path = details.substring(lastInIndex + 5); // Skip "' in " (5 chars)

        // Basic validation: Prefix should start with "Uploaded document" or "Created folder"
        const isUpload = prefix.startsWith("Uploaded document") || prefix.startsWith("Created folder");

        if (isUpload && path && path.trim().length > 0) {
            return (
                <div className="flex flex-col gap-1.5 items-start">
                    <span>{formatLogDetails(prefix)}</span>
                    <div className="flex items-center gap-1.5 px-2 py-1 rounded-md bg-blue-500/10 border border-blue-500/20 text-blue-400 w-fit max-w-full">
                        <Folder className="w-3.5 h-3.5 flex-shrink-0" />
                        <span className="font-medium truncate block max-w-[200px] sm:max-w-md" title={path}>
                            {path}
                        </span>
                    </div>
                </div>
            );
        }
    }

    return formatLogDetails(details);
};

export default ActivityLog;
