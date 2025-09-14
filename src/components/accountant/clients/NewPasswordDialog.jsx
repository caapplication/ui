import React, { useState, useEffect, useCallback } from 'react';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Loader2, ChevronsUpDown, Check, PlusCircle } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import NewPortalDialog from './NewPortalDialog';
import { cn } from '@/lib/utils';
import { useAuth } from '@/hooks/useAuth';
import { getPortals, createPortal } from '@/lib/api';

const usePortals = (agencyId, token) => {
    const [portals, setPortals] = useState([]);
    const { toast } = useToast();

    const fetchPortals = useCallback(async () => {
        if (!agencyId || !token) return;
        try {
            const data = await getPortals(agencyId, token);
            setPortals(data || []);
        } catch (error) {
             toast({ title: "Error fetching portals", description: error.message, variant: "destructive" });
        }
    }, [agencyId, token, toast]);

    useEffect(() => {
        fetchPortals();
    }, [fetchPortals]);

    const addPortal = async (newPortalData) => {
        try {
            const newPortal = await createPortal(newPortalData, agencyId, token);
            setPortals(prev => [...prev, newPortal]);
            toast({ title: "Portal Added", description: `${newPortal.name} has been added.` });
            return newPortal;
        } catch (error) {
            toast({ title: "Error adding portal", description: error.message, variant: "destructive" });
            return null;
        }
    };

    return { portals, addPortal };
};


const NewPasswordDialog = ({ isOpen, onClose, onSave, isMutating, passwordData }) => {
    const { user } = useAuth();
    const { toast } = useToast();
    const { portals, addPortal } = usePortals(user?.agency_id, user?.access_token);

    const [open, setOpen] = useState(false);
    const [selectedPortalId, setSelectedPortalId] = useState('');
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [notes, setNotes] = useState('');
    const [isNewPortalOpen, setIsNewPortalOpen] = useState(false);

    useEffect(() => {
        if(isOpen) {
            if (passwordData) {
                setSelectedPortalId(passwordData.portal_id || '');
                setUsername(passwordData.username || '');
                setPassword(''); // Don't pre-fill password for security
                setNotes(passwordData.notes || '');
            } else {
                setSelectedPortalId('');
                setUsername('');
                setPassword('');
                setNotes('');
            }
        }
    }, [isOpen, passwordData]);

    const handleSave = () => {
        if (!selectedPortalId || !username) {
            toast({title: "Missing Fields", description: "Portal and Username are required.", variant: "destructive"});
            return;
        }
        if (!passwordData && !password) {
            toast({title: "Missing Fields", description: "Password is required for new entries.", variant: "destructive"});
            return;
        }
        
        const dataToSave = {
            portal_id: selectedPortalId,
            username,
            notes
        };
        // Only include password if it's being set or changed
        if (password) {
            dataToSave.password = password;
        }

        onSave(dataToSave);
    };
    
    const handleAddNewPortal = () => {
        setOpen(false); // Close the popover
        setIsNewPortalOpen(true);
    };

    const handleSaveNewPortal = async (newPortalData) => {
        const newPortal = await addPortal(newPortalData);
        if (newPortal) {
            setSelectedPortalId(newPortal.id);
            setIsNewPortalOpen(false);
        }
    };
    
    const selectedPortal = portals.find(p => p.id === selectedPortalId);

    return (
        <>
            <Dialog open={isOpen} onOpenChange={onClose}>
                <DialogContent className="glass-pane">
                    <DialogHeader>
                        <DialogTitle>{passwordData ? 'Edit Password' : 'New Password'}</DialogTitle>
                    </DialogHeader>
                    <div className="grid gap-4 py-4">
                        <div className="grid grid-cols-4 items-center gap-4">
                            <Label htmlFor="portal-name" className="text-right">
                                Portal <span className="text-red-500">*</span>
                            </Label>
                            <Popover open={open} onOpenChange={setOpen}>
                                <PopoverTrigger asChild>
                                    <Button
                                    variant="outline"
                                    role="combobox"
                                    aria-expanded={open}
                                    className="col-span-3 justify-between glass-input"
                                    >
                                    {selectedPortal
                                        ? selectedPortal.name
                                        : "Select portal..."}
                                    <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                                    </Button>
                                </PopoverTrigger>
                                <PopoverContent className="w-[300px] p-0">
                                    <Command>
                                        <CommandInput placeholder="Search portal..." />
                                        <CommandList>
                                            <CommandEmpty>No portal found.</CommandEmpty>
                                            <CommandGroup>
                                                {portals.map((portal) => (
                                                <CommandItem
                                                    key={portal.id}
                                                    value={portal.name}
                                                    onSelect={() => {
                                                        setSelectedPortalId(portal.id)
                                                        setOpen(false)
                                                    }}
                                                >
                                                    <Check
                                                    className={cn(
                                                        "mr-2 h-4 w-4",
                                                        selectedPortalId === portal.id ? "opacity-100" : "opacity-0"
                                                    )}
                                                    />
                                                    {portal.name}
                                                </CommandItem>
                                                ))}
                                                <CommandItem onSelect={handleAddNewPortal} className="text-primary cursor-pointer">
                                                    <PlusCircle className="mr-2 h-4 w-4" />
                                                    Add New Portal
                                                </CommandItem>
                                            </CommandGroup>
                                        </CommandList>
                                    </Command>
                                </PopoverContent>
                            </Popover>
                        </div>
                        <div className="grid grid-cols-4 items-center gap-4">
                            <Label htmlFor="username" className="text-right">
                                Username <span className="text-red-500">*</span>
                            </Label>
                            <Input
                                id="username"
                                value={username}
                                onChange={(e) => setUsername(e.target.value)}
                                className="col-span-3 glass-input"
                                disabled={isMutating}
                            />
                        </div>
                        <div className="grid grid-cols-4 items-center gap-4">
                            <Label htmlFor="password" className="text-right">
                                Password { !passwordData && <span className="text-red-500">*</span> }
                            </Label>
                            <Input
                                id="password"
                                type="password"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                className="col-span-3 glass-input"
                                placeholder={passwordData ? 'Leave blank to keep unchanged' : ''}
                                disabled={isMutating}
                            />
                        </div>
                         <div className="grid grid-cols-4 items-center gap-4">
                            <Label htmlFor="notes" className="text-right">
                                Notes
                            </Label>
                            <Input
                                id="notes"
                                value={notes}
                                onChange={(e) => setNotes(e.target.value)}
                                className="col-span-3 glass-input"
                                disabled={isMutating}
                            />
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={onClose} disabled={isMutating}>Cancel</Button>
                        <Button onClick={handleSave} disabled={isMutating}>
                            {isMutating && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                            Save
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
            <NewPortalDialog 
                isOpen={isNewPortalOpen}
                onClose={() => setIsNewPortalOpen(false)}
                onSave={handleSaveNewPortal}
            />
        </>
    );
};

export default NewPasswordDialog;