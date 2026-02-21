import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { LogOut, ArrowLeftRight } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth.jsx';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useMediaQuery } from '@/hooks/useMediaQuery.jsx';
import { Link, useLocation } from 'react-router-dom';
import { PanelLeftClose, PanelLeftOpen } from 'lucide-react';

const HandoverSidebar = ({ isCollapsed, setIsCollapsed, isOpen, setIsOpen }) => {
  const { user, logout } = useAuth();
  const isDesktop = useMediaQuery('(min-width: 1024px)');
  const location = useLocation();

  const menuItems = [
    { id: 'handover', path: '/handover', label: 'Handover', icon: ArrowLeftRight },
  ];

  return (
    <div className="h-full glass-pane flex flex-col p-3 sm:p-4">
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
              {!isCollapsed && (
                <div className="min-w-0 flex-1">
                  <p className="text-white font-semibold truncate">{user?.name}</p>
                  <p className="text-gray-400 text-sm truncate">{user?.email}</p>
                </div>
              )}
            </Link>
          </div>
        </div>

        <nav className="space-y-1">
          {menuItems.map((item) => {
            const Icon = item.icon;
            const isActive = location.pathname === item.path;
            return (
              <Link
                key={item.id}
                to={item.path}
                onClick={() => !isDesktop && setIsOpen(false)}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-lg transition ${
                  isActive ? 'bg-primary/20 text-primary' : 'text-gray-400 hover:bg-white/5 hover:text-white'
                }`}
              >
                <Icon className="w-5 h-5 flex-shrink-0" />
                {!isCollapsed && <span className="font-medium">{item.label}</span>}
              </Link>
            );
          })}
        </nav>
      </div>

      <div className="pt-4 border-t border-white/10">
        <Button
          variant="ghost"
          className="w-full justify-start gap-3 text-gray-400 hover:text-white hover:bg-white/5"
          onClick={logout}
        >
          <LogOut className="w-5 h-5" />
          {!isCollapsed && <span>Logout</span>}
        </Button>
      </div>
    </div>
  );
};

export default HandoverSidebar;
