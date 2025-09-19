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

    return (
        <div className="space-y-4">
            {logs.map(log => (
                <div key={log.id} className="flex items-start space-x-3">
                    <div className="flex-shrink-0">
                        <div className="w-8 h-8 rounded-full bg-gray-600 flex items-center justify-center">
                            <History className="w-4 h-4 text-gray-300" />
                        </div>
                    </div>
                    <div>
                        <p className="text-sm text-white">
                            <span className="font-semibold">{log.user}</span> {log.action.toLowerCase()} this item.
                        </p>
                        <p className="text-xs text-gray-400">
                            {new Date(log.timestamp).toLocaleString()}
                        </p>
                    </div>
                </div>
            ))}
        </div>
    );
};

export default ActivityLog;