import React, { useMemo, useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  LayoutDashboard,
  Users,
  FileText,
  Briefcase,
  Landmark,
  Banknote,
  Settings,
  UserPlus,
  LogOut,
  PanelLeftClose,
  PanelLeftOpen,
  ListTodo,
  ListChecks,
  Bell,
} from 'lucide-react';
import { useAuth } from '@/hooks/useAuth.jsx';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useMediaQuery } from '@/hooks/useMediaQuery.jsx';
import { Link, useLocation } from 'react-router-dom';
import { useSocket } from '@/contexts/SocketContext.jsx';
import { getUnreadNotificationCount } from '@/lib/api';
import { useToast } from '@/components/ui/use-toast';
import { Badge } from '@/components/ui/badge';

const AccountantSidebar = ({ isCollapsed, setIsCollapsed, isOpen, setIsOpen }) => {
  const { user, logout } = useAuth();
  const { toast } = useToast();
  const isMobile = useMediaQuery("(max-width: 768px)"); // Changed from isDesktop to isMobile and media query updated
  const location = useLocation();
  const { socket } = useSocket();
  const [unreadCount, setUnreadCount] = useState(0);
  const [isBlinking, setIsBlinking] = useState(false); // Added isBlinking state

  // Fetch initial unread count
  useEffect(() => {
    const fetchUnreadCount = async () => {
      if (user?.access_token) {
        try {
          const count = await getUnreadNotificationCount(user.agency_id, user.access_token);
          setUnreadCount(count);
        } catch (error) {
          console.error("Failed to fetch unread notification count:", error);
        }
      }
    };

    fetchUnreadCount();
  }, [user]);

  // Listen for socket updates
  useEffect(() => {
    if (socket) {
      const handleUnreadUpdate = (data) => {
        if (typeof data.count === 'number') {
          // Trigger blink if count increased
          if (data.count > unreadCount) {
            setIsBlinking(true);
            setTimeout(() => setIsBlinking(false), 3000);
          }
          setUnreadCount(data.count);
        }
      };

      socket.on('global_unread_update', handleUnreadUpdate);

      return () => {
        socket.off('global_unread_update', handleUnreadUpdate);
      };
    }
  }, [socket]);

  const menuItems = [
    { id: 'dashboard', path: '/', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'clients', path: '/clients', label: 'Clients', icon: Users },
    { id: 'finance', path: '/finance', label: 'Finance', icon: Landmark },
    { id: 'team-members', path: '/team-members', label: 'Team Members', icon: UserPlus },
    {
      id: 'tasks',
      path: '/tasks',
      label: 'Tasks',
      icon: ListTodo,
      badge: unreadCount > 0 ? unreadCount : null // Add badge prop
    },
    { id: 'documents', path: '/documents', label: 'Documents', icon: FileText },
    { id: 'notices', path: '/notices', label: 'Notices', icon: Bell },
    { id: 'services', path: '/services', label: 'Services', icon: Briefcase },
    { id: 'settings', path: '/settings', label: 'Settings', icon: Settings },
  ];

  const isActive = (path) => {
    if (path === '/') {
      return location.pathname === '/';
    }
    return location.pathname.startsWith(path);
  }

  const variants = {
    expanded: { width: 280 },
    collapsed: { width: 120 },
  };

  const mobileVariants = {
    open: { x: 0 },
    closed: { x: '-100%' }
  }

  const textVariants = {
    expanded: { opacity: 1, x: 0, transition: { delay: 0.2, duration: 0.3 } },
    collapsed: { opacity: 0, x: -10, transition: { duration: 0.2 } }
  }

  const handleToggleCollapse = () => setIsCollapsed(!isCollapsed);
  const sidebarContent = (
    <div className={`h-full glass-pane flex flex-col p-4`}>
      <div className="flex-1 overflow-y-auto overflow-x-hidden no-scrollbar">
        <div className="mb-8">
          <div className={`flex items-center mb-4 ${isCollapsed ? 'justify-center' : 'justify-between'}`}>
            <Link to="/profile" className="flex items-center space-x-4 cursor-pointer min-w-0">
              <Avatar className="w-12 h-12 flex-shrink-0 border-2 border-white/20">
                <AvatarImage src={user?.photo_url} alt={user?.name} />
                <AvatarFallback className="bg-gradient-to-br from-blue-500 to-indigo-600 text-white">
                  {user?.name?.charAt(0).toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <AnimatePresence>
                {!isCollapsed && (
                  <motion.div variants={textVariants} initial="collapsed" animate="expanded" exit="collapsed" className="min-w-0 flex-1">
                    <p className="text-white font-semibold truncate">{user?.name}</p>
                    <p className="text-gray-400 text-sm truncate">{user?.sub}</p>
                  </motion.div>
                )}
              </AnimatePresence>
            </Link>
          </div>
        </div>

        <nav>
          <ul className="space-y-2">
            {menuItems.map((item) => {
              const Icon = item.icon;
              const active = isActive(item.path);
              return (
                <li key={item.id}>
                  <Link to={item.path}>
                    <Button
                      variant="ghost"
                      className={`w-full justify-start text-left h-12 relative ${active ? 'text-white' : 'text-gray-300'}`}
                      title={isCollapsed ? item.label : ''}
                    >
                      <AnimatePresence>
                        {active && (
                          <motion.div
                            layoutId="active-nav-glow-accountant"
                            className="absolute inset-0 bg-white/10 rounded-lg shadow-glow-secondary"
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                          ></motion.div>
                        )}
                      </AnimatePresence>
                      <Icon className={`w-6 h-6 flex-shrink-0 z-10 ${isCollapsed ? 'mx-auto' : 'mr-4'}`} />
                      <AnimatePresence>
                        {!isCollapsed && (
                          <motion.span variants={textVariants} initial="collapsed" animate="expanded" exit="collapsed" className="flex-1 font-medium z-10 flex items-center justify-between">
                            {item.label}
                            {item.badge && (
                              <span className="bg-red-500 text-white text-xs font-bold px-2 py-0.5 rounded-full ml-2">
                                {item.badge > 99 ? '99+' : item.badge}
                              </span>
                            )}
                          </motion.span>
                        )}
                      </AnimatePresence>
                      {/* Badge for collapsed state */}
                      {isCollapsed && item.badge && (
                        <div className="absolute top-2 right-2 w-3 h-3 bg-red-500 rounded-full border-2 border-[#1e293b] z-20"></div>
                      )}
                    </Button>
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>
      </div>

      <div className="mt-auto pt-4 border-t border-white/10 space-y-2">
        {!isMobile && (
          <Button
            variant="ghost"
            className="w-full justify-start text-gray-300 hover:text-white h-12"
            onClick={handleToggleCollapse}
          >
            <div className={isCollapsed ? "mx-auto" : "mr-4"}>
              {isCollapsed ? <PanelLeftOpen className="w-6 h-6" /> : <PanelLeftClose className="w-6 h-6" />}
            </div>
            <AnimatePresence>
              {!isCollapsed && (
                <motion.span variants={textVariants} initial="collapsed" animate="expanded" exit="collapsed" className="font-medium">Collapse</motion.span>
              )}
            </AnimatePresence>
          </Button>
        )}
        <Button
          variant="ghost"
          className="w-full justify-start text-gray-300 hover:text-white hover:bg-red-500/20 h-12"
          onClick={logout}
        >
          <LogOut className={`w-6 h-6 flex-shrink-0 ${isCollapsed ? 'mx-auto' : 'mr-4'}`} />
          <AnimatePresence>
            {!isCollapsed && (
              <motion.span variants={textVariants} initial="collapsed" animate="expanded" exit="collapsed" className="font-medium">Sign Out</motion.span>
            )}
          </AnimatePresence>
        </Button>
      </div>
      {/* Info dialog for upcoming sidebar items removed as per user request */}
    </div>
  );

  if (isMobile) {
    return (
      <AnimatePresence>
        {isOpen && (
          <>
            <motion.div
              className="fixed inset-0 bg-black/60 z-30"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsOpen(false)}
            />
            <motion.div
              className="fixed top-0 left-0 bottom-0 z-40 w-72"
              variants={mobileVariants}
              initial="closed"
              animate="open"
              exit="closed"
              transition={{ type: 'spring', stiffness: 300, damping: 30 }}
            >
              {sidebarContent}
            </motion.div>
          </>
        )}
      </AnimatePresence>
    )
  }

  return (
    <motion.aside
      animate={isCollapsed ? "collapsed" : "expanded"}
      variants={variants}
      transition={{ duration: 0.5, ease: [0.4, 0, 0.2, 1] }}
      className="relative z-20 h-screen flex-shrink-0 p-2"
    >
      <div className="h-full rounded-3xl overflow-hidden">
        {sidebarContent}
      </div>
    </motion.aside>
  );
};

export default AccountantSidebar;
