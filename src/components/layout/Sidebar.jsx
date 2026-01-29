import React, { useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  LayoutDashboard,
  FileText,
  LogOut,
  Landmark,
  Banknote,
  Users,
  Building,
  PanelLeftClose,
  PanelLeftOpen,
  ListTodo,
  UserCog
} from 'lucide-react';
import { useAuth } from '@/hooks/useAuth.jsx';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/components/ui/select';
import { useMediaQuery } from '@/hooks/useMediaQuery.jsx';
import { Link, useLocation } from 'react-router-dom';

import { listClients, listClientsByOrganization } from '@/lib/api/clients';

const Sidebar = ({ currentEntity, setCurrentEntity, isCollapsed, setIsCollapsed, isOpen, setIsOpen }) => {
  const { user, logout } = useAuth();
  const isDesktop = useMediaQuery("(min-width: 1024px)");
  const location = useLocation();
  const [clients, setClients] = React.useState([]);

  const menuItems = [
    { id: 'dashboard', path: '/', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'finance', path: '/finance', label: 'Finance', icon: Landmark },
    { id: 'documents', path: '/documents', label: 'Documents', icon: FileText },
    { id: 'users', path: '/users', label: 'Manage Team', icon: UserCog },
    { id: 'beneficiaries', path: '/beneficiaries', label: 'Beneficiaries', icon: Users },
    { id: 'organisation-bank', path: '/organisation-bank', label: 'Organisation Bank', icon: Banknote },
    { id: 'tasks', path: '/tasks', label: 'Tasks', icon: ListTodo },
  ];

  // Fetch clients from Clients table (NOT entities table)
  React.useEffect(() => {
    const fetchClients = async () => {
      console.log('🔍 Sidebar fetchClients - User data:', {
        role: user?.role,
        agency_id: user?.agency_id,
        organization_id: user?.organization_id,
        hasToken: !!user?.access_token,
        fullUser: user
      });

      try {
        let fetchedClients = [];

        if (user?.role === 'AGENCY_ADMIN' && user?.agency_id && user?.access_token) {
          console.log('📞 Calling listClients for AGENCY_ADMIN');
          fetchedClients = await listClients(user.agency_id, user.access_token);
        } else {
          console.log('⚠️ No API call - relying on user.entities or conditions not met');
        }

        console.log('✅ Fetched clients:', fetchedClients);
        setClients(fetchedClients || []);
      } catch (error) {
        console.error("❌ Failed to fetch clients for sidebar:", error);
      }
    };

    fetchClients();
  }, [user]);

  const entitiesToDisplay = useMemo(() => {
    if (!user) return [];

    // Use clients from Clients table for AGENCY_ADMIN and CLIENT_USER
    if (user.role === 'AGENCY_ADMIN' || user.role === 'CLIENT_USER' || user.role === 'CLIENT_MASTER_ADMIN') {
      const filteredClients = clients.filter(c => c.id && c.name);
      if (filteredClients.length > 0) return filteredClients;
    }

    // Fallback to user.entities for other roles or if clients is empty
    return (user.entities || []).filter(e => e.id && e.name);
  }, [user, clients]);

  // Auto-select first entity if none selected OR if current selection is not in the list
  React.useEffect(() => {
    if (entitiesToDisplay.length > 0) {
      const isCurrentValid = currentEntity && entitiesToDisplay.some(e => String(e.id) === String(currentEntity));

      if (!currentEntity || !isCurrentValid) {
        setCurrentEntity(entitiesToDisplay[0].id);
      }
    }
  }, [currentEntity, entitiesToDisplay, setCurrentEntity]);

  const variants = {
    expanded: { width: 300 },
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

  const handleEntityChange = (entityId) => {
    setCurrentEntity(entityId);
  };

  const handleToggleCollapse = () => setIsCollapsed(!isCollapsed);

  const sidebarContent = (
    <div className={`h-full glass-pane flex flex-col p-3 sm:p-4`}>
      <div className="flex-1 overflow-y-auto overflow-x-hidden no-scrollbar">
        <div className="mb-6 sm:mb-8">
          <div className={`flex items-center mb-3 sm:mb-4 ${isCollapsed ? 'justify-center' : 'justify-between'}`}>
            <Link
              to="/profile"
              className="flex items-center space-x-4 cursor-pointer min-w-0"
              onClick={() => !isDesktop && setIsOpen(false)}
            >
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

        <AnimatePresence>
          {!isCollapsed && (
            <motion.div
              variants={textVariants}
              initial="collapsed" animate="expanded" exit="collapsed"
              className="mb-4 sm:mb-6"
            >
              {entitiesToDisplay.length > 0 && (
                <Select onValueChange={handleEntityChange} value={currentEntity ? String(currentEntity) : ''}>
                  <SelectTrigger className="w-full text-sm sm:text-base glass-input">
                    <div className="flex items-center gap-2 sm:gap-3 truncate">
                      <Building className="h-4 w-4 sm:h-5 sm:w-5 text-gray-400 flex-shrink-0" />
                      <SelectValue placeholder="Select Entity..." />
                    </div>
                  </SelectTrigger>
                  <SelectContent>
                    {entitiesToDisplay.map((entity) => (
                      <SelectItem key={entity.id} value={String(entity.id)}>
                        {entity.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </motion.div>
          )}
        </AnimatePresence>

        <nav>
          <ul className="space-y-2">
            {menuItems.filter(item => !item.hidden).map((item) => {
              const Icon = item.icon;
              const isActive = location.pathname === item.path;
              return (
                <li key={item.id}>
                  <Link
                    to={item.path}
                    onClick={() => !isDesktop && setIsOpen(false)}
                  >
                    <Button
                      variant="ghost"
                      className={`w-full justify-start text-left h-11 sm:h-12 relative ${isActive ? 'text-white' : 'text-gray-300'} text-sm sm:text-base`}
                      title={isCollapsed ? item.label : ''}
                    >
                      <AnimatePresence>
                        {isActive && (
                          <motion.div
                            layoutId="active-nav-glow-client"
                            className="absolute inset-0 bg-white/10 rounded-lg shadow-glow-secondary"
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                          ></motion.div>
                        )}
                      </AnimatePresence>
                      <Icon className={`w-5 h-5 sm:w-6 sm:h-6 flex-shrink-0 z-10 ${isCollapsed ? 'mx-auto' : 'mr-3 sm:mr-4'}`} />
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
        </nav>
      </div>

      <div className="mt-auto pt-3 sm:pt-4 border-t border-white/10 space-y-2">
        {isDesktop && (
          <Button
            variant="ghost"
            className="w-full justify-start text-gray-300 hover:text-white h-11 sm:h-12 text-sm sm:text-base"
            onClick={handleToggleCollapse}
          >
            <div className={isCollapsed ? "mx-auto" : "mr-3 sm:mr-4"}>
              {isCollapsed ? <PanelLeftOpen className="w-5 h-5 sm:w-6 sm:h-6" /> : <PanelLeftClose className="w-5 h-5 sm:w-6 sm:h-6" />}
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
          className="w-full justify-start text-gray-300 hover:text-white hover:bg-red-500/20 h-11 sm:h-12 text-sm sm:text-base"
          onClick={logout}
        >
          <LogOut className={`w-5 h-5 sm:w-6 sm:h-6 flex-shrink-0 ${isCollapsed ? 'mx-auto' : 'mr-3 sm:mr-4'}`} />
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
              className="fixed top-0 left-0 bottom-0 z-40 w-72 sm:w-80"
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

export default Sidebar;
