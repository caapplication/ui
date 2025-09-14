import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { ChevronLeft, Tag, Settings as SettingsIcon, Users, Globe, Briefcase } from 'lucide-react';
import TagsContent from './TagsContent';
import ClientSettingsContent from './ClientSettingsContent';
import PortalsContent from './PortalsContent';
import BusinessTypesContent from './BusinessTypesContent';

const settingsNav = [
  { id: 'tags', name: 'Tags', icon: Tag, component: TagsContent },
  { id: 'client-settings', name: 'Client Settings', icon: Users, component: ClientSettingsContent },
  { id: 'portals', name: 'Portals', icon: Globe, component: PortalsContent },
  { id: 'business-types', name: 'Business Types', icon: Briefcase, component: BusinessTypesContent },
];

const Settings = () => {
    const [activeSetting, setActiveSetting] = useState(null);

    const renderContent = () => {
        if (!activeSetting) return null;
        const ActiveComponent = activeSetting.component;
        return <ActiveComponent />;
    };

    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="p-4 sm:p-6 lg:p-8"
        >
            <div className="max-w-7xl mx-auto">
                {activeSetting ? (
                     <div>
                        <Button variant="ghost" onClick={() => setActiveSetting(null)} className="mb-4 text-white hover:bg-white/10">
                            <ChevronLeft className="mr-2 h-4 w-4" />
                            Back to Settings
                        </Button>
                        <h1 className="text-3xl font-bold text-white mb-6 flex items-center gap-3">
                            <activeSetting.icon className="h-8 w-8" />
                            {activeSetting.name}
                        </h1>
                        {renderContent()}
                    </div>
                ) : (
                    <div>
                        <h1 className="text-3xl font-bold text-white mb-6 flex items-center gap-3"><SettingsIcon /> Settings</h1>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                            {settingsNav.map(item => {
                                const Icon = item.icon;
                                return (
                                <motion.div
                                    key={item.id}
                                    className="glass-card card-hover p-6 rounded-2xl cursor-pointer"
                                    whileHover={{ y: -5 }}
                                    onClick={() => setActiveSetting(item)}
                                >
                                    <div className="flex items-center gap-4">
                                        <div className="p-3 bg-primary/20 rounded-lg">
                                            <Icon className="h-6 w-6 text-primary" />
                                        </div>
                                        <h2 className="text-xl font-semibold text-white">{item.name}</h2>
                                    </div>
                                </motion.div>
                                )
                            })}
                        </div>
                    </div>
                )}
            </div>
        </motion.div>
    );
};

export default Settings;