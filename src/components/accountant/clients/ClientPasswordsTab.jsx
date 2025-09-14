import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Search, Plus, Copy, Trash2, MoreVertical, ExternalLink, Eye, EyeOff, Loader2, Edit } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';
import NewPasswordDialog from './NewPasswordDialog';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useAuth } from '@/hooks/useAuth';
import { listClientPortals, createClientPortal, deleteClientPortal, revealClientPortalSecret, updateClientPortal } from '@/lib/api';
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

const ClientPasswordsTab = ({ client }) => {
    const { toast } = useToast();
    const { user } = useAuth();
    const [searchTerm, setSearchTerm] = useState('');
    const [isPasswordDialogOpen, setIsPasswordDialogOpen] = useState(false);
    const [editingPassword, setEditingPassword] = useState(null);
    const [passwords, setPasswords] = useState([]);
    const [revealedPasswords, setRevealedPasswords] = useState({});
    const [isLoading, setIsLoading] = useState(true);
    const [isMutating, setIsMutating] = useState(false);
    
    const fetchPasswords = useCallback(async () => {
        setIsLoading(true);
        try {
            if (!user?.agency_id || !user?.access_token || !client?.id) return;
            const data = await listClientPortals(client.id, user.agency_id, user.access_token);
            setPasswords(data || []);
        } catch (error) {
            toast({ title: "Error fetching passwords", description: error.message, variant: "destructive" });
        } finally {
            setIsLoading(false);
        }
    }, [client.id, user?.agency_id, user?.access_token, toast]);

    useEffect(() => {
        fetchPasswords();
    }, [fetchPasswords]);

    const handleCopy = (text, isPassword = false) => {
        if (!text) return;
        navigator.clipboard.writeText(text);
        if (isPassword) {
            toast({ title: 'Password copied to clipboard!' });
        } else {
            toast({ title: 'Copied to clipboard!', description: `${text.substring(0,20)}...` });
        }
    };

    const handleRevealPassword = (portalId, password) => {
        if (revealedPasswords[portalId]) {
            setRevealedPasswords(prev => ({ ...prev, [portalId]: undefined }));
        } else {
            setRevealedPasswords(prev => ({ ...prev, [portalId]: password }));
            setTimeout(() => {
                setRevealedPasswords(prev => ({ ...prev, [portalId]: undefined }));
            }, 30000); // Hide after 30 seconds
        }
    };
    
    const handleDelete = async (portalId) => {
        setIsMutating(portalId);
        try {
            await deleteClientPortal(client.id, portalId, user.agency_id, user.access_token);
            toast({ title: "🗑️ Password deleted" });
            fetchPasswords();
        } catch (error) {
            toast({ title: "Error deleting password", description: error.message, variant: "destructive" });
        } finally {
            setIsMutating(false);
        }
    };

    const handleSavePassword = async (passwordData) => {
        setIsMutating(true);
        try {
            if (editingPassword) {
                await updateClientPortal(client.id, editingPassword.id, passwordData, user.agency_id, user.access_token);
                toast({ title: `✅ Password updated!` });
            } else {
                await createClientPortal(client.id, passwordData, user.agency_id, user.access_token);
                toast({ title: `✅ Password saved!` });
            }
            fetchPasswords();
            setIsPasswordDialogOpen(false);
            setEditingPassword(null);
        } catch (error) {
            toast({ title: "Error saving password", description: error.message, variant: "destructive" });
        } finally {
            setIsMutating(false);
        }
    };
    
    const openNewPasswordDialog = () => {
        setEditingPassword(null);
        setIsPasswordDialogOpen(true);
    };

    const openEditPasswordDialog = (password) => {
        setEditingPassword(password);
        setIsPasswordDialogOpen(true);
    };

    const filteredPasswords = useMemo(() => {
        if (!Array.isArray(passwords)) return [];
        return passwords.filter(p => {
            const portalName = p.portal?.name?.toLowerCase() || '';
            const username = p.username?.toLowerCase() || '';
            const term = searchTerm.toLowerCase();
            return portalName.includes(term) || username.includes(term);
        });
    }, [passwords, searchTerm]);

    return (
        <div className="glass-pane p-6 rounded-lg">
            <div className="flex justify-between items-center mb-4">
                <div className="relative w-full max-w-sm">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <Input 
                        placeholder="Search passwords..."
                        className="glass-input pl-10"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </div>
                <Button onClick={openNewPasswordDialog} disabled={isMutating}>
                    <Plus className="w-4 h-4 mr-2" />
                    New
                </Button>
            </div>

            <div className="overflow-x-auto">
                 {isLoading ? (
                    <div className="flex items-center justify-center h-48"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>
                ) : (
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>LOGIN PORTAL</TableHead>
                            <TableHead>USERNAME</TableHead>
                            <TableHead>PASSWORD</TableHead>
                            <TableHead className="text-right">ACTIONS</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {filteredPasswords.map(p => {
                            const isRevealed = !!revealedPasswords[p.id];
                            return (
                                <TableRow key={p.id}>
                                    <TableCell>
                                        <span className="flex items-center gap-2">
                                            {p.portal?.name || 'N/A'}
                                            {p.portal?.login_url && (
                                                <a href={p.portal.login_url} target="_blank" rel="noopener noreferrer">
                                                    <ExternalLink className="w-4 h-4 text-blue-400 hover:text-blue-300" />
                                                </a>
                                            )}
                                        </span>
                                    </TableCell>
                                    <TableCell>
                                        <div className="flex items-center gap-2">
                                            {p.username}
                                            <Copy className="w-4 h-4 cursor-pointer text-gray-400 hover:text-white" onClick={() => handleCopy(p.username)} />
                                        </div>
                                    </TableCell>
                                    <TableCell>
                                        <div className="flex items-center gap-2">
                                            <span className="font-mono">{isRevealed ? revealedPasswords[p.id] : '••••••••••'}</span>
                                            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => handleRevealPassword(p.id, p.password)}>
                                                {isRevealed ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                                            </Button>
                                            {isRevealed && <Copy className="w-4 h-4 cursor-pointer text-gray-400 hover:text-white" onClick={() => handleCopy(revealedPasswords[p.id], true)} />}
                                        </div>
                                    </TableCell>
                                    <TableCell className="text-right">
                                        <DropdownMenu>
                                            <DropdownMenuTrigger asChild>
                                                <Button variant="ghost" className="h-8 w-8 p-0" disabled={isMutating === p.id}>
                                                    {isMutating === p.id ? <Loader2 className="h-4 w-4 animate-spin"/> : <MoreVertical className="h-4 w-4" />}
                                                </Button>
                                            </DropdownMenuTrigger>
                                            <DropdownMenuContent align="end">
                                                <DropdownMenuItem onClick={() => openEditPasswordDialog(p)}>
                                                    <Edit className="w-4 h-4 mr-2" />
                                                    Edit
                                                </DropdownMenuItem>
                                                {isRevealed && <DropdownMenuItem onClick={() => handleCopy(revealedPasswords[p.id], true)}>Copy Password</DropdownMenuItem>}
                                                <AlertDialog>
                                                    <AlertDialogTrigger asChild>
                                                        <DropdownMenuItem onSelect={e => e.preventDefault()} className="text-red-500 focus:text-red-400">
                                                            <Trash2 className="w-4 h-4 mr-2" />
                                                            Delete
                                                        </DropdownMenuItem>
                                                    </AlertDialogTrigger>
                                                    <AlertDialogContent>
                                                        <AlertDialogHeader>
                                                            <AlertDialogTitle>Delete this password?</AlertDialogTitle>
                                                            <AlertDialogDescription>
                                                                This will permanently delete the password for <span className="font-bold text-white">{p.portal?.name}</span>.
                                                            </AlertDialogDescription>
                                                        </AlertDialogHeader>
                                                        <AlertDialogFooter>
                                                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                                                            <AlertDialogAction onClick={() => handleDelete(p.id)} className="bg-red-600 hover:bg-red-700">Delete</AlertDialogAction>
                                                        </AlertDialogFooter>
                                                    </AlertDialogContent>
                                                </AlertDialog>
                                            </DropdownMenuContent>
                                        </DropdownMenu>
                                    </TableCell>
                                </TableRow>
                            );
                        })}
                    </TableBody>
                </Table>
                )}
                {!isLoading && filteredPasswords.length === 0 && (
                     <div className="text-center py-10 text-gray-500">
                        No passwords found. Click "New" to add one.
                    </div>
                )}
            </div>

            <NewPasswordDialog 
                isOpen={isPasswordDialogOpen}
                onClose={() => setIsPasswordDialogOpen(false)}
                onSave={handleSavePassword}
                isMutating={isMutating}
                passwordData={editingPassword}
                client={client}
            />
        </div>
    );
};

export default ClientPasswordsTab;