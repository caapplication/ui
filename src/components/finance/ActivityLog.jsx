import React, { useState, useEffect, useCallback } from 'react';
import { Loader2, History, Download } from 'lucide-react';
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

const ActivityLog = ({ itemId, itemType, showFilter = true }) => {
    const [logs, setLogs] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [startDate, setStartDate] = useState('');
    const [endDate, setEndDate] = useState('');
    const { user } = useAuth();
    const { toast } = useToast();

    const fetchLogs = useCallback(async () => {
        if (!itemId || !itemType || !user?.access_token) return;

        const CACHE_KEY = `fynivo_activity_log_${itemType}_${itemId}`;
        const cachedLogs = getCache(CACHE_KEY);

        // Use cache only if no date filters are applied (caching filtered results is complex)
        const canUseCache = !startDate && !endDate;

        if (canUseCache && cachedLogs) {
            setLogs(cachedLogs);
            setIsLoading(false);
        } else {
            setIsLoading(true);
        }

        try {
            // Convert date strings to ISO format for API
            const startDateISO = startDate ? new Date(startDate).toISOString() : null;
            const endDateISO = endDate ? new Date(endDate + 'T23:59:59').toISOString() : null; // Include time to cover entire day
            const data = await getActivityLog(itemId, itemType, user.access_token, startDateISO, endDateISO);
            setLogs(data);

            if (canUseCache) {
                setCache(CACHE_KEY, data);
            }
        } catch (error) {
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
            setIsLoading(false);
        }
    }, [itemId, itemType, user?.access_token, toast, startDate, endDate]);

    useEffect(() => {
        fetchLogs();
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
                <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between p-4 bg-white/5 rounded-lg border border-white/10">
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
                        } else {
                            actionDisplay = log.action.toLowerCase();
                        }
                    }

                    // Human-readable item type
                    let itemTypeDisplay = '';
                    if (itemType === 'invoice') {
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
                                            {log.details}
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

export default ActivityLog;
