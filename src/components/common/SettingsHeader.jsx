import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';

const SettingsHeader = ({ title, backPath = '/settings', onClick, children }) => {
    const navigate = useNavigate();

    const handleBack = () => {
        if (onClick) {
            onClick();
        } else {
            navigate(backPath);
        }
    };

    return (
        <div className="flex items-center justify-between mb-6 pb-4">
            <div className="flex items-center gap-3">
                <Button
                    variant="ghost"
                    size="icon"
                    onClick={handleBack}
                    className="text-white hover:bg-white/10"
                >
                    <ArrowLeft className="h-5 w-5" />
                </Button>

                <h1 className="text-3xl font-bold text-white tracking-tight">
                    {title}
                </h1>
            </div>

            {children && (
                <div className="flex items-center gap-4">
                    {children}
                </div>
            )}
        </div>
    );
};

export default SettingsHeader;
