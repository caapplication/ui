import React, { createContext, useContext, useEffect, useState, useRef } from 'react';
import { io } from 'socket.io-client';
import { useAuth } from '@/hooks/useAuth';

const SocketContext = createContext(null);

export const useSocket = () => {
    const context = useContext(SocketContext);
    if (!context) {
        throw new Error('useSocket must be used within SocketProvider');
    }
    return context;
};

export const SocketProvider = ({ children }) => {
    const { user } = useAuth();
    const [socket, setSocket] = useState(null);
    const [isConnected, setIsConnected] = useState(false);
    const socketRef = useRef(null);

    useEffect(() => {
        if (!user?.access_token || !user?.id) {
            return;
        }

        // Get Socket.IO server URL from environment or default
        const socketUrl = import.meta.env.VITE_TASK_API_URL?.replace('/tasks', '') || 
                         import.meta.env.VITE_TASK_API_URL || 
                         'http://localhost:8005';

        // Create Socket.IO connection with authentication
        const newSocket = io(socketUrl, {
            auth: {
                user_id: user.id,
                token: user.access_token
            },
            transports: ['websocket', 'polling'],
            reconnection: true,
            reconnectionDelay: 1000,
            reconnectionAttempts: 5,
        });

        newSocket.on('connect', () => {
            console.log('Socket.IO connected');
            setIsConnected(true);
            
            // Join task rooms if needed
            // This will be called from components that need to listen to specific tasks
        });

        newSocket.on('disconnect', () => {
            console.log('Socket.IO disconnected');
            setIsConnected(false);
        });

        newSocket.on('connect_error', (error) => {
            console.error('Socket.IO connection error:', error);
            setIsConnected(false);
        });

        socketRef.current = newSocket;
        setSocket(newSocket);

        return () => {
            if (newSocket) {
                newSocket.disconnect();
            }
        };
    }, [user?.id, user?.access_token]);

    const joinTaskRoom = (taskId) => {
        if (socket && user?.id) {
            socket.emit('join_task', {
                task_id: taskId,
                user_id: user.id
            });
        }
    };

    const leaveTaskRoom = (taskId) => {
        if (socket && user?.id) {
            socket.emit('leave_task', {
                task_id: taskId,
                user_id: user.id
            });
        }
    };

    const value = {
        socket,
        isConnected,
        joinTaskRoom,
        leaveTaskRoom,
    };

    return (
        <SocketContext.Provider value={value}>
            {children}
        </SocketContext.Provider>
    );
};

