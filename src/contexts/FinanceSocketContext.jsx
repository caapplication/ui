
import React, { createContext, useContext, useEffect, useState, useRef } from 'react';
import { io } from 'socket.io-client';
import { useAuth } from '@/hooks/useAuth';

const FinanceSocketContext = createContext(null);

export const useFinanceSocket = () => {
  const context = useContext(FinanceSocketContext);
  if (!context) {
    throw new Error('useFinanceSocket must be used within FinanceSocketProvider');
  }
  return context;
};

export const FinanceSocketProvider = ({ children }) => {
  const { user } = useAuth();
  const [socket, setSocket] = useState(null);
  const [isConnected, setIsConnected] = useState(false);
  const socketRef = useRef(null);

  useEffect(() => {
    if (!user?.access_token || !user?.id) {
      return;
    }

    // Get Finance Socket URL
    const socketUrl = import.meta.env.VITE_FINANCE_API_URL || 'http://localhost:8003';

    // Create Socket.IO connection
    const newSocket = io(socketUrl, {
      path: '/socket.io', // Matches mount path in backend
      auth: {
        user_id: user.id,
        token: user.access_token
      },
      transports: ['polling', 'websocket'],
      secure: socketUrl.startsWith('https'),
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionAttempts: 20,
    });

    newSocket.on('connect', () => {
      console.log('✅ Finance Socket.IO connected');
      setIsConnected(true);
    });

    newSocket.on('disconnect', () => {
      setIsConnected(false);
    });

    newSocket.on('connect_error', (error) => {
      console.error('❌ Finance Socket.IO connection error:', error);
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

  const joinNoticeRoom = (noticeId) => {
    if (socket && isConnected) {
      socket.emit('join_room', { room: `notice_${noticeId}` });
    }
  };

  const leaveNoticeRoom = (noticeId) => {
    if (socket && isConnected) {
      socket.emit('leave_room', { room: `notice_${noticeId}` });
    }
  };

  const value = {
    socket,
    isConnected,
    joinNoticeRoom,
    leaveNoticeRoom,
  };

  return (
    <FinanceSocketContext.Provider value={value}>
      {children}
    </FinanceSocketContext.Provider>
  );
};
