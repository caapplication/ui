import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { useToast } from '@/components/ui/use-toast';
import { useAuth } from '@/hooks/useAuth.jsx';
import { updateGeneralSettings } from '@/lib/api';

const ClientSettingsContent = ({ initialSettings }) => {
    const { toast } = useToast();
    const { user } = useAuth();
    const [settings, setSettings] = useState(null);
    const [allowDuplicates, setAllowDuplicates] = useState(false);

    useEffect(() => {
        if (initialSettings && initialSettings.length > 0) {
            setSettings(initialSettings[0]);
            setAllowDuplicates(initialSettings[0].allow_duplicates);
        }
    }, [initialSettings]);
    
    const handleSave = async () => {
        if (!settings) {
             toast({ variant: "destructive", title: "Error", description: "Settings not loaded yet." });
             return;
        }
        try {
            await updateGeneralSettings(settings.id, { allow_duplicates: allowDuplicates }, user.agency_id, user.access_token);
            toast({ title: "Success", description: "Settings saved successfully." });
        } catch (error) {
             toast({ variant: "destructive", title: "Error", description: "Failed to save settings." });
        }
    };

    return (
        <div className="text-white space-y-6">
            <div className="glass-card p-6">
                <h3 className="text-lg font-semibold mb-4">General Settings</h3>
                <div className="flex items-center justify-between p-4 bg-black/20 rounded-lg">
                    <Label htmlFor="allow-duplicates" className="text-base">Allow duplicates for client name</Label>
                    <Switch id="allow-duplicates" checked={allowDuplicates} onCheckedChange={setAllowDuplicates} />
                </div>
            </div>
            <div className="flex justify-end">
                <Button onClick={handleSave} className="bg-primary hover:bg-primary/90">Save</Button>
            </div>
        </div>
    );
};

export default ClientSettingsContent;
