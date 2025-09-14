import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  LayoutDashboard, 
  FileText, 
  LogOut,
  Landmark,
  PanelLeftClose,
  PanelLeftOpen
} from 'lucide-react';
import { useAuth } from '@/hooks/useAuth.jsx';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useMediaQuery } from '@/hooks/useMediaQuery.jsx';

const EntitySidebar = ({ activeTab, setActiveTab, isCollapsed, setIsCollapsed, isOpen, setIsOpen }) => {
  const { user, logout } = useAuth();
  const isDesktop = useMediaQuery("(min-width: 1024px)");
  
  const menuItems = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'finance', label: 'Finance', icon: Landmark },
    { id: 'documents', label: 'Documents', icon: FileText },
  ];

  const variants = {
    expanded: { width: 240 },
    collapsed: { width: 80 },
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
                <div className="flex items-center space-x-4 cursor-pointer min-w-0" onClick={() => setActiveTab('profile')}>
                    <Avatar className="w-12 h-12 flex-shrink-0 border-2 border-white/20">
                        <AvatarImage src={user?.profilePictureUrl} alt={user?.name} />
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
                </div>
            </div>
        </div>

        <nav>
          <ul className="space-y-2">
            {menuItems.map((item) => {
              const Icon = item.icon;
              const isActive = activeTab === item.id;
              return (
                <li key={item.id}>
                  <Button
                    variant="ghost"
                    className={`w-full justify-start text-left h-12 relative ${isActive ? 'text-white' : 'text-gray-300'}`}
                    onClick={() => setActiveTab(item.id)}
                    title={isCollapsed ? item.label : ''}
                  >
                    <AnimatePresence>
                    {isActive && (
                      <motion.div
                        layoutId="active-nav-glow-entity"
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
                </li>
              );
            })}
          </ul>
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

export default EntitySidebar;