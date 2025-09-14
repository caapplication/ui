import React, { useState } from 'react';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogFooter,
    DialogOverlay
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

const NewPortalDialog = ({ isOpen, onClose, onSave }) => {
    const [name, setName] = useState('');
    const [url, setUrl] = useState('');

    const handleSave = () => {
        if (!name || !url) return;
        onSave({ name, login_url: url });
        setName('');
        setUrl('');
    };

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogOverlay className="bg-black/60 backdrop-blur-sm" />
            <DialogContent className="glass-pane sm:max-w-[425px]">
                <DialogHeader>
                    <DialogTitle>New Portal</DialogTitle>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                    <div className="grid grid-cols-4 items-center gap-4">
                        <Label htmlFor="portal-name" className="text-right">
                            Portal Name <span className="text-red-500">*</span>
                        </Label>
                        <Input
                            id="portal-name"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            className="col-span-3 glass-input"
                        />
                    </div>
                    <div className="grid grid-cols-4 items-center gap-4">
                        <Label htmlFor="portal-url" className="text-right">
                            Portal URL <span className="text-red-500">*</span>
                        </Label>
                        <Input
                            id="portal-url"
                            value={url}
                            onChange={(e) => setUrl(e.target.value)}
                            className="col-span-3 glass-input"
                            placeholder="https://example.com"
                        />
                    </div>
                </div>
                <DialogFooter>
                    <Button variant="outline" onClick={onClose}>Cancel</Button>
                    <Button onClick={handleSave}>Save</Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
};

export default NewPortalDialog;