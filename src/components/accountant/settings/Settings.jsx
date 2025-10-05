
import React, { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { ChevronLeft, Tag, Settings as SettingsIcon, Users, Globe, Briefcase, FileText } from 'lucide-react';
import { Link, Route, Routes, useNavigate } from 'react-router-dom';
import { useToast } from '@/components/ui/use-toast';
import { useAuth } from '@/hooks/useAuth.jsx';
import { getGeneralSettings } from '@/lib/api';
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
    const { toast } = useToast();
    const { user } = useAuth();
    const [settingsData, setSettingsData] = useState({ clientSettings: null });
    const [isLoading, setIsLoading] = useState(true);

    const fetchAllSettings = useCallback(async () => {
        if (!user) return;
        setIsLoading(true);
        try {
            const clientSettings = await getGeneralSettings(user.agency_id, user.access_token);
            setSettingsData({ clientSettings });
        } catch (error) {
            toast({ variant: "destructive", title: "Error", description: "Failed to fetch settings." });
        } finally {
            setIsLoading(false);
        }
    }, [user, toast]);

    useEffect(() => {
        fetchAllSettings();
    }, [fetchAllSettings]);

    if (isLoading) {
        return <div className="flex justify-center items-center h-full"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div></div>;
    }

    return (
        <Routes>
            <Route path="/" element={<SettingsDashboard />} />
            {settingsNav.map(item => (
                <Route 
                    key={item.path} 
                    path={`${item.path}`} 
                    element={<SettingsPageWrapper item={item} settingsData={settingsData} />} 
                />
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

const SettingsPageWrapper = ({ item, settingsData }) => {
    const navigate = useNavigate();
    const Icon = item.icon;
    const ContentComponent = item.component;

    const contentProps = {
        'client-settings': { initialSettings: settingsData.clientSettings },
    };

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
                <ContentComponent {...contentProps[item.path]} />
            </div>
        </motion.div>
    );
};

export default Settings;
