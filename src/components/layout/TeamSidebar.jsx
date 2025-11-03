import React, { useMemo } from 'react';
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
  ChevronDown
} from 'lucide-react';
import { useAuth } from '@/hooks/useAuth.jsx';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useMediaQuery } from '@/hooks/useMediaQuery.jsx';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useState } from 'react';
import { Dialog as InfoDialog } from '@/components/ui/dialog';

const TeamSidebar = ({ isCollapsed, setIsCollapsed, isOpen, setIsOpen }) => {
  const { user, logout } = useAuth();
  const isDesktop = useMediaQuery("(min-width: 1024px)");
  const location = useLocation();

  // Remove "organisation" and "team-members"
  const menuItems = [
    { id: 'dashboard', path: '/', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'clients', path: '/clients', label: 'Clients', icon: Users },
    { id: 'finance', path: '/finance', label: 'Finance', icon: Landmark },
    { id: 'settings', path: '/settings', label: 'Settings', icon: Settings },
  ];

  // Upcoming section items
  const upcomingItems = [
    { id: 'documents', path: '/documents', label: 'Documents', icon: FileText },
    { id: 'task', path: '/tasks', label: 'Task', icon: ListTodo },
    { id: 'services', path: '/services', label: 'Services', icon: Briefcase },
  ];

  const isActive = (path) => {
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

  // Upcoming dropdown state
  const [upcomingOpen, setUpcomingOpen] = useState(false);

  // Info for each upcoming item
  const upcomingInfo = {
    documents: "Access and manage your important documents here.",
    task: "View and manage your tasks and to-dos.",
    services: "Browse and manage available services."
  };

  const handleUpcomingInfo = (item) => {
    setInfoContent(upcomingInfo[item.id] || "More information coming soon.");
    setInfoOpen(true);
  };

  const navigate = useNavigate();
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
                            <motion.span variants={textVariants} initial="collapsed" animate="expanded" exit="collapsed" className="flex-1 font-medium z-10">{item.label}</motion.span>
                          )}
                        </AnimatePresence>
                    </Button>
                  </Link>
                </li>
              );
            })}
          </ul>
          {/* Upcoming section */}
          <div className="mt-6">
            {!isCollapsed && (
              <button
                className="flex items-center w-full px-2 pb-2 text-xs font-semibold text-gray-400 uppercase tracking-wider focus:outline-none select-none"
                onClick={() => setUpcomingOpen((v) => !v)}
                aria-expanded={upcomingOpen}
                aria-controls="upcoming-section"
                type="button"
              >
                Upcoming
                <ChevronDown
                  className={`ml-1 transition-transform duration-200 ${upcomingOpen ? 'rotate-0' : '-rotate-90'}`}
                  size={16}
                  aria-hidden="true"
                />
              </button>
            )}
            {upcomingOpen && (
              <ul className="space-y-2" id="upcoming-section">
                {upcomingItems.map((item) => {
                  const Icon = item.icon;
                  const active = isActive(item.path);
                  return (
                    <li key={item.id} className="group relative">
                      <div>
                        <div className="flex">
                          <Button
                            variant="ghost"
                            className={`flex-1 w-full justify-start text-left h-12 relative ${active ? 'text-white' : 'text-gray-300'}`}
                            title={isCollapsed ? item.label : ''}
                            onClick={(e) => {
                              e.preventDefault();
                              if (item.id === "documents") {
                                navigate('/upcoming/documents');
                              } else if (item.id === "task") {
                                navigate('/upcoming/task');
                              } else if (item.id === "services") {
                                navigate('/upcoming/services');
                              }
                            }}
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
                                <motion.span variants={textVariants} initial="collapsed" animate="expanded" exit="collapsed" className="flex-1 font-medium z-10">{item.label}</motion.span>
                              )}
                            </AnimatePresence>
                          </Button>
                        {/* Info icon with hover to show message */}
                        {!isCollapsed && (
                          <div className="relative flex items-center ml-2 group/info">
                            <button
                              type="button"
                              className="text-gray-400 hover:text-blue-400 focus:outline-none flex items-center"
                              tabIndex={-1}
                              aria-label={`Info about ${item.label}`}
                            >
                              <svg width="18" height="18" fill="none" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2"/><rect x="11" y="10" width="2" height="6" rx="1" fill="currentColor"/><rect x="11" y="7" width="2" height="2" rx="1" fill="currentColor"/></svg>
                            </button>
                            {/* Inline info message on hover */}
                            <div className="absolute left-1/2 z-50 -translate-x-1/2 mt-2 w-56 rounded bg-gray-900/90 text-xs text-gray-200 border border-white/10 shadow opacity-0 group-hover/info:opacity-100 pointer-events-none transition-opacity duration-200">
                              {upcomingInfo[item.id] || "More information coming soon."}
                            </div>
                          </div>
                        )}
                      </div>
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        </nav>
      </div>

      <div className="mt-auto pt-4 border-t border-white/10 space-y-2">
          {isDesktop && (
            <Button
              variant="ghost"
              className="w-full justify-start text-gray-300 hover:text-white h-12"
              onClick={handleToggleCollapse}
            >
              <div className={isCollapsed ? "mx-auto" : "mr-4"}>
                {isCollapsed ? <PanelLeftOpen className="w-6 h-6" /> : <PanelLeftClose className="w-6 h-6"/>}
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
    </div>
  );

  if (!isDesktop) {
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

export default TeamSidebar;
