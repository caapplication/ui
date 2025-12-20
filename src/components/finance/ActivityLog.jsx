import React, { useState, useEffect, useCallback } from 'react';
import { Loader2, History } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth.jsx';
import { getActivityLog } from '@/lib/api';
import { useToast } from '@/components/ui/use-toast';

const ActivityLog = ({ itemId, itemType }) => {
    const [logs, setLogs] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const { user } = useAuth();
    const { toast } = useToast();

    const fetchLogs = useCallback(async () => {
        if (!itemId || !itemType || !user?.access_token) return;
        setIsLoading(true);
        try {
            const data = await getActivityLog(itemId, itemType, user.access_token);
            setLogs(data);
        } catch (error) {
            toast({
                title: 'Error fetching activity log',
                description: error.message,
                variant: 'destructive',
            });
        } finally {
            setIsLoading(false);
        }
    }, [itemId, itemType, user?.access_token, toast]);

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

    return (
        <div className="space-y-4">
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
    );
};

export default ActivityLog;
