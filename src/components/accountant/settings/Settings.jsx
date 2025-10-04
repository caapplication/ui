
import React from 'react';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { ChevronLeft, Tag, Settings as SettingsIcon, Users, Globe, Briefcase, FileText } from 'lucide-react';
import { Link, Route, Routes, useParams, useNavigate } from 'react-router-dom';
import TagsContent from './TagsContent';
import ClientSettingsContent from './ClientSettingsContent';
import PortalsContent from './PortalsContent';
import BusinessTypesContent from './BusinessTypesContent';
import FinanceHeadersContent from './FinanceHeadersContent';

const settingsNav = [
  { path: 'tags', name: 'Tags', icon: Tag, component: TagsContent },
  { path: 'client-settings', name: 'Client Settings', icon: Users, component: ClientSettingsContent },
  { path: 'portals', name: 'Portals', icon: Globe, component: PortalsContent },
  { path: 'business-types', name: 'Business Types', icon: Briefcase, component: BusinessTypesContent },
  { path: 'finance-headers', name: 'Finance Headers', icon: FileText, component: FinanceHeadersContent },
];

const Settings = () => {
    return (
        <Routes>
            <Route path="/" element={<SettingsDashboard />} />
            {settingsNav.map(item => (
                <Route key={item.path} path={`${item.path}`} element={<SettingsPageWrapper item={item} />} />
            ))}
        </Routes>
    );
};

const SettingsDashboard = () => (
    <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="p-4 sm:p-6 lg:p-8"
    >
        <div className="max-w-7xl mx-auto">
            <h1 className="text-3xl font-bold text-white mb-6 flex items-center gap-3"><SettingsIcon /> Settings</h1>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {settingsNav.map(item => {
                    const Icon = item.icon;
                    return (
                        <Link to={item.path} key={item.path}>
                            <motion.div
                                className="glass-card card-hover p-6 rounded-2xl cursor-pointer h-full"
                                whileHover={{ y: -5 }}
                            >
                                <div className="flex items-center gap-4">
                                    <div className="p-3 bg-primary/20 rounded-lg">
                                        <Icon className="h-6 w-6 text-primary" />
                                    </div>
                                    <h2 className="text-xl font-semibold text-white">{item.name}</h2>
                                </div>
                            </motion.div>
                        </Link>
                    )
                })}
            </div>
        </div>
    </motion.div>
);

const SettingsPageWrapper = ({ item }) => {
    const navigate = useNavigate();
    const Icon = item.icon;
    const ContentComponent = item.component;

    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="p-4 sm:p-6 lg:p-8"
        >
            <div className="max-w-7xl mx-auto">
                <Button variant="ghost" onClick={() => navigate('/settings')} className="mb-4 text-white hover:bg-white/10">
                    <ChevronLeft className="mr-2 h-4 w-4" />
                    Back to Settings
                </Button>
                <h1 className="text-3xl font-bold text-white mb-6 flex items-center gap-3">
                    <Icon className="h-8 w-8" />
                    {item.name}
                </h1>
                <ContentComponent />
            </div>
        </motion.div>
    );
};

export default Settings;
