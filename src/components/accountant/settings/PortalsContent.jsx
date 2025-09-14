import React, { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { 
    Dialog, 
    DialogContent, 
    DialogHeader, 
    DialogTitle, 
    DialogFooter
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { useToast } from '@/components/ui/use-toast';
import { Plus, Search, Trash2, Loader2, ExternalLink } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth.jsx';
import { getPortals, createPortal, deletePortal } from '@/lib/api/settings';

const PortalsContent = () => {
    const { toast } = useToast();
    const { user } = useAuth();
    const [openNewPortal, setOpenNewPortal] = useState(false);
    const [portalName, setPortalName] = useState("");
    const [portalUrl, setPortalUrl] = useState("");
    const [searchTerm, setSearchTerm] = useState("");
    const [portals, setPortals] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isMutating, setIsMutating] = useState(false);

    const fetchPortals = useCallback(async () => {
        if (!user) return;
        setIsLoading(true);
        try {
            const fetchedPortals = await getPortals(user.agency_id, user.access_token);
            setPortals(fetchedPortals || []);
        } catch (error) {
            toast({ variant: "destructive", title: "Error", description: "Could not fetch portals." });
        } finally {
            setIsLoading(false);
        }
    }, [user, toast]);

    useEffect(() => {
        fetchPortals();
    }, [fetchPortals]);

    const handleSavePortal = async () => {
        if (!portalName || !portalUrl) {
            toast({ variant: "destructive", title: "Validation Error", description: "Portal name and URL cannot be empty." });
            return;
        }
        setIsMutating(true);
        try {
            await createPortal({ name: portalName, login_url: portalUrl }, user.agency_id, user.access_token);
            toast({ title: "Success", description: "Portal created successfully." });
            await fetchPortals();
            setOpenNewPortal(false);
            setPortalName("");
            setPortalUrl("");
        } catch (error) {
            toast({ variant: "destructive", title: "Error", description: error.message || "Failed to create portal." });
        } finally {
            setIsMutating(false);
        }
    };

    const handleDeletePortal = async (portalId) => {
        setIsMutating(portalId);
        try {
            await deletePortal(portalId, user.agency_id, user.access_token);
            toast({ title: "Success", description: "Portal deleted successfully." });
            await fetchPortals();
        } catch (error) {
            toast({ variant: "destructive", title: "Error", description: error.message || "Failed to delete portal." });
        } finally {
            setIsMutating(false);
        }
    };

    const filteredPortals = portals.filter(portal => portal.name.toLowerCase().includes(searchTerm.toLowerCase()));

    return (
        <div className='text-white'>
            <div className="flex justify-between items-center mb-6">
                 <div className="relative w-full max-w-xs">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
                    <Input placeholder="Search portals..." className="pl-10 glass-input" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
                </div>
                <Button onClick={() => setOpenNewPortal(true)} className="bg-primary hover:bg-primary/90 text-white">
                    <Plus className="mr-2 h-4 w-4" /> New Portal
                </Button>
            </div>
            <div className="glass-card p-4 rounded-lg">
                <div className="grid grid-cols-[1fr,1fr,auto] gap-4 px-4 py-2 border-b border-white/10 font-bold uppercase text-sm text-gray-400">
                    <span>Portal Name</span>
                    <span>URL</span>
                    <span className="text-right">Actions</span>
                </div>
                {isLoading ? (
                    <div className="flex justify-center items-center py-10"><Loader2 className="animate-spin h-8 w-8 text-primary" /></div>
                ) : filteredPortals.map((portal) => (
                    <div key={portal.id} className="grid grid-cols-[1fr,1fr,auto] gap-4 items-center px-4 py-3 border-b border-white/10 last:border-b-0">
                        <span className="truncate">{portal.name}</span>
                        <a href={portal.login_url} target="_blank" rel="noopener noreferrer" className="text-blue-400 hover:underline truncate flex items-center gap-2">
                            {portal.login_url}
                            <ExternalLink className="h-4 w-4" />
                        </a>
                        <div className="text-right">
                            <AlertDialog>
                                <AlertDialogTrigger asChild>
                                    <Button variant="ghost" size="icon" disabled={isMutating === portal.id} className="text-red-400 hover:text-red-500 hover:bg-red-500/10">
                                        {isMutating === portal.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
                                    </Button>
                                </AlertDialogTrigger>
                                <AlertDialogContent>
                                    <AlertDialogHeader>
                                        <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                                        <AlertDialogDescription>
                                            This action cannot be undone. This will permanently delete the <span className="font-bold text-white">{portal.name}</span> portal.
                                        </AlertDialogDescription>
                                    </AlertDialogHeader>
                                    <AlertDialogFooter>
                                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                                        <AlertDialogAction onClick={() => handleDeletePortal(portal.id)} className="bg-red-600 hover:bg-red-700">Delete</AlertDialogAction>
                                    </AlertDialogFooter>
                                </AlertDialogContent>
                            </AlertDialog>
                        </div>
                    </div>
                ))}
                 {!isLoading && filteredPortals.length === 0 && (
                    <div className="text-center py-10 text-gray-400">No portals found.</div>
                )}
            </div>

            <Dialog open={openNewPortal} onOpenChange={setOpenNewPortal}>
                <DialogContent className="glass-pane text-white">
                    <DialogHeader>
                        <DialogTitle>New Portal</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                        <div className="space-y-2">
                            <Label htmlFor="portal-name">Portal Name <span className="text-red-500">*</span></Label>
                            <Input id="portal-name" placeholder="E.g. Income Tax" className="glass-input" value={portalName} onChange={(e) => setPortalName(e.target.value)} />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="portal-url">Portal Login Link (URL) <span className="text-red-500">*</span></Label>
                            <Input id="portal-url" placeholder="https://..." className="glass-input" value={portalUrl} onChange={(e) => setPortalUrl(e.target.value)} />
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setOpenNewPortal(false)} disabled={isMutating}>Cancel</Button>
                        <Button onClick={handleSavePortal} className="bg-primary hover:bg-primary/90" disabled={isMutating}>
                            {isMutating && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            Save
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
};

export default PortalsContent;