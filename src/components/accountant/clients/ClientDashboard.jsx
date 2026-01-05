import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Edit, Trash2, Loader2 } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import ClientDashboardDetails from './ClientDashboardDetails';
import ClientServicesTab from './ClientServicesTab';
import ClientPasswordsTab from './ClientPasswordsTab';
import ClientUsersTab from './ClientUsersTab';
import ClientEntitiesTab from './ClientEntitiesTab';
import ClientTeamMembersTab from './ClientTeamMembersTab';
import ActivityLog from '@/components/finance/ActivityLog';
import { useToast } from '@/components/ui/use-toast';
import { useAuth } from '@/hooks/useAuth';
import { deleteClient } from '@/lib/api';
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

import { updateEntity, deleteEntity, createEntity } from '@/lib/api/organisation';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
    DialogFooter
} from '@/components/ui/dialog';

const ClientDashboard = ({ client, onBack, onEdit, setActiveTab, allServices, onUpdateClient, onClientDeleted, teamMembers, onTeamMemberInvited, onClientUserInvited }) => {
    const [activeSubTab, setActiveSubTab] = useState('Details');
    const [isDeleting, setIsDeleting] = useState(false);
    const [isEntityMutating, setIsEntityMutating] = useState(false);
    const [editEntityDialogOpen, setEditEntityDialogOpen] = useState(false);
    const [entityToEdit, setEntityToEdit] = useState(null);
    const [editEntityName, setEditEntityName] = useState('');
    const [deleteEntityDialogOpen, setDeleteEntityDialogOpen] = useState(false);
    const [entityToDelete, setEntityToDelete] = useState(null);
    const { toast } = useToast();
    const { user } = useAuth();

    const [photoBlobUrl, setPhotoBlobUrl] = useState(null);
    const [photoKey, setPhotoKey] = useState(0);
    const [isPhotoLoading, setIsPhotoLoading] = useState(false);

    // Helper function to get the correct photo URL with cache-busting
    const getClientPhotoUrl = (client) => {
        if (!client || !client.id) return null;
        const clientApiUrl = import.meta.env.VITE_CLIENT_API_URL || 'http://127.0.0.1:8002';
        // Always use proxy endpoint for authenticated access
        return `${clientApiUrl}/clients/${client.id}/photo`;
    };

    // Cleanup blob URL on unmount
    useEffect(() => {
        return () => {
            if (photoBlobUrl && photoBlobUrl.startsWith('blob:')) {
                URL.revokeObjectURL(photoBlobUrl);
            }
        };
    }, [photoBlobUrl]);

    // Fetch photo as blob with authentication (same approach as edit form)
    useEffect(() => {
        // Cleanup previous blob URL
        if (photoBlobUrl && photoBlobUrl.startsWith('blob:')) {
            URL.revokeObjectURL(photoBlobUrl);
            setPhotoBlobUrl(null);
        }

        if (client?.id && user?.access_token) {
            setIsPhotoLoading(true);
            const clientApiUrl = import.meta.env.VITE_CLIENT_API_URL || 'http://127.0.0.1:8002';
            // Create cache-busting URL to ensure fresh image
            const updateTimestamp = client.updated_at ? new Date(client.updated_at).getTime() : Date.now();
            const timestamp = Date.now();
            const photoEndpoint = `${clientApiUrl}/clients/${client.id}/photo?t=${timestamp}&u=${updateTimestamp}`;
            
            // Fetch with authentication headers
            fetch(photoEndpoint, {
                headers: {
                    'Authorization': `Bearer ${user.access_token}`,
                    'x-agency-id': user.agency_id || ''
                }
            })
            .then(response => {
                if (response.ok) {
                    return response.blob();
                }
                throw new Error('Failed to fetch photo');
            })
            .then(blob => {
                const url = URL.createObjectURL(blob);
                setPhotoBlobUrl(url);
                // Update key to force React to reload the image component
                setPhotoKey(`${client.id}-${timestamp}-${updateTimestamp}`);
                setIsPhotoLoading(false);
            })
            .catch(err => {
                console.error('Error loading client photo:', err);
                setPhotoBlobUrl(null);
                setPhotoKey(`${client.id}-error-${Date.now()}`);
                setIsPhotoLoading(false);
            });
        } else {
            setPhotoBlobUrl(null);
            setPhotoKey(0);
            setIsPhotoLoading(false);
        }
    }, [client?.id, client?.photo_url, client?.updated_at, user?.access_token, user?.agency_id]);

    const tabs = [
        'Details',
        'Services',
        'Passwords',
        `Client User (${(client.orgUsers?.invited_users?.length || 0) + (client.orgUsers?.joined_users?.length || 0)})`,
        `MyTeam (${client.assigned_ca_user_id ? teamMembers.filter(m => String(m.user_id || m.id) === String(client.assigned_ca_user_id)).length : 0})`,
        `Entities (${client.entities?.length || 0})`,
        'Activity Log'
    ];

    const handleTabClick = (tab) => {
        if (tab === 'Documents') {
            setActiveTab('documents');
        } else {
            setActiveSubTab(tab);
        }
    }

    const handleDeleteClient = async () => {
        setIsDeleting(true);
        try {
            if (!user?.agency_id || !user?.access_token) {
                throw new Error("User information is not available.");
            }
            await deleteClient(client.id, user.agency_id, user.access_token);
            toast({
                title: '✅ Client Deleted',
                description: `${client.name} has been successfully deleted.`,
            });
            onClientDeleted(client.id);
            onBack();
        } catch (error) {
            toast({
                title: 'Error deleting client',
                description: error.message,
                variant: 'destructive',
            });
        } finally {
            setIsDeleting(false);
        }
    };


    if (!client) return null;

    // Helper to check for duplicate entity names
    const checkForDuplicate = (name, excludeId = null) => {
        if (!client.entities) return false;
        return client.entities.some(e =>
            e.name.trim().toLowerCase() === name.trim().toLowerCase() &&
            (excludeId ? (e.id || e.entity_id) !== excludeId : true)
        );
    };

    // Entity Edit/Delete Handlers
    const handleAddEntity = async (entityData) => {
        if (!client.organization_id) {
            toast({ title: "Error", description: "Client does not have an organization assigned.", variant: "destructive" });
            return;
        }

        if (checkForDuplicate(entityData.name)) {
            toast({ title: "Duplicate Entity", description: "An entity with this name already exists.", variant: "destructive" });
            return;
        }

        setIsEntityMutating(true);
        try {
            const newEntity = await createEntity({ name: entityData.name, organization_id: client.organization_id }, user.access_token);
            toast({ title: "Entity created", description: "Entity created successfully." });

            // Update state locally to avoid reload
            const updatedEntities = [...(client.entities || []), newEntity];
            onUpdateClient({ entities: updatedEntities });
        } catch (error) {
            toast({ title: "Error creating entity", description: error.message, variant: "destructive" });
        } finally {
            setIsEntityMutating(false);
        }
    };

    const handleEditEntity = (entity) => {
        setEntityToEdit(entity);
        setEditEntityName(entity.name);
        setEditEntityDialogOpen(true);
    };

    const handleEditEntityDialogSave = async () => {
        if (!editEntityName || editEntityName === entityToEdit.name) {
            setEditEntityDialogOpen(false);
            return;
        }

        const entityId = entityToEdit.id || entityToEdit.entity_id;

        if (checkForDuplicate(editEntityName, entityId)) {
            toast({ title: "Duplicate Entity", description: "An entity with this name already exists.", variant: "destructive" });
            return;
        }

        setIsEntityMutating(true);
        try {
            const updatedEntity = await updateEntity(entityId, { name: editEntityName }, user.access_token);
            toast({ title: "Entity updated", description: "Entity name updated successfully." });
            setEditEntityDialogOpen(false);

            // Update state locally
            const updatedEntities = (client.entities || []).map(e =>
                (e.id || e.entity_id) === entityId ? { ...e, name: editEntityName, ...updatedEntity } : e
            );
            onUpdateClient({ entities: updatedEntities });
        } catch (error) {
            toast({ title: "Error updating entity", description: error.message, variant: "destructive" });
        } finally {
            setIsEntityMutating(false);
        }
    };

    const handleDeleteEntity = (entity) => {
        setEntityToDelete(entity);
        setDeleteEntityDialogOpen(true);
    };

    const handleDeleteEntityDialogConfirm = async () => {
        if (!entityToDelete) return;
        setIsEntityMutating(true);
        try {
            const entityId = entityToDelete.id || entityToDelete.entity_id;
            await deleteEntity(entityId, user.access_token);
            toast({ title: "Entity deleted", description: "Entity deleted successfully." });
            setDeleteEntityDialogOpen(false);
            setEntityToDelete(null);

            // Update state locally
            const updatedEntities = (client.entities || []).filter(e => (e.id || e.entity_id) !== entityId);
            onUpdateClient({ entities: updatedEntities });
        } catch (error) {
            toast({ title: "Error deleting entity", description: error.message, variant: "destructive" });
        } finally {
            setIsEntityMutating(false);
        }
    };


    const renderTabContent = () => {
        switch (activeSubTab) {
            case 'Details':
                return <ClientDashboardDetails client={client} teamMembers={teamMembers} onUpdateClient={onUpdateClient} onTeamMemberInvited={onTeamMemberInvited} />;
            case 'Services':
                return <ClientServicesTab client={client} allServices={allServices} onUpdateClient={onUpdateClient} />;
            case 'Passwords':
                return <ClientPasswordsTab client={client} />;
            case 'Activity Log':
                // Note: Activity logs for clients may need backend support
                // For now, we'll try to fetch them - if the backend doesn't support it, it will show an error
                return (
                    <div className="glass-pane p-6 rounded-lg">
                        <ActivityLog itemId={client.id} itemType="client" />
                    </div>
                );
            default:
                if (activeSubTab.startsWith('Client User')) {
                    return <ClientUsersTab client={client} onUserInvited={onClientUserInvited} />;
                }
                if (activeSubTab.startsWith('MyTeam')) {
                    return <ClientTeamMembersTab client={client} teamMembers={teamMembers} />;
                }
                if (activeSubTab.startsWith('Entities')) {
                    return (
                        <ClientEntitiesTab
                            entities={client.entities || []}
                            onEditEntity={handleEditEntity}
                            onDeleteEntity={handleDeleteEntity}
                            onAddEntity={handleAddEntity}
                            isMutating={isEntityMutating}
                        />
                    );
                }
                return (
                    <div className="glass-pane p-8 rounded-lg text-center">
                        <h3 className="text-xl font-semibold text-white">Coming Soon!</h3>
                        <p className="text-gray-400 mt-2">The "{activeSubTab}" tab is under construction.</p>
                    </div>
                );
        }
    }

    return (
        <div className="h-full flex flex-col">
            {/* Edit Entity Dialog */}
            <Dialog open={editEntityDialogOpen} onOpenChange={setEditEntityDialogOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Edit Entity</DialogTitle>
                        <DialogDescription>Update the entity name below.</DialogDescription>
                    </DialogHeader>
                    <form
                        onSubmit={e => {
                            e.preventDefault();
                            handleEditEntityDialogSave();
                        }}
                        className="space-y-4"
                    >
                        <div>
                            <label className="block text-gray-300 mb-1">Entity Name</label>
                            <input
                                className="w-full rounded px-3 py-2 bg-gray-800 text-white border border-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500"
                                value={editEntityName}
                                onChange={e => setEditEntityName(e.target.value)}
                                disabled={isEntityMutating}
                                autoFocus
                            />
                        </div>
                        <DialogFooter>
                            <Button
                                type="button"
                                variant="ghost"
                                onClick={() => setEditEntityDialogOpen(false)}
                                disabled={isEntityMutating}
                            >
                                Cancel
                            </Button>
                            <Button
                                type="submit"
                                className="bg-blue-600 hover:bg-blue-700 text-white"
                                disabled={isEntityMutating}
                            >
                                {isEntityMutating ? "Saving..." : "Save"}
                            </Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>
            {/* Delete Entity Dialog */}
            <AlertDialog open={deleteEntityDialogOpen} onOpenChange={setDeleteEntityDialogOpen}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>
                            Are you sure you want to delete entity "{entityToDelete?.name}"?
                        </AlertDialogTitle>
                        <AlertDialogDescription>
                            This action cannot be undone. This will permanently delete the entity and all associated data.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel
                            disabled={isEntityMutating}
                            onClick={() => setDeleteEntityDialogOpen(false)}
                        >
                            Cancel
                        </AlertDialogCancel>
                        <AlertDialogAction
                            onClick={handleDeleteEntityDialogConfirm}
                            disabled={isEntityMutating}
                            className="bg-red-600 hover:bg-red-700"
                        >
                            {isEntityMutating ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
                            Delete
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
            <header className="flex justify-between items-center mb-4 flex-shrink-0">
                <div className="flex items-center gap-2">
                    <Button variant="ghost" size="icon" onClick={onBack}>
                        <ArrowLeft className="w-5 h-5" />
                    </Button>
                    <h1 className="text-2xl font-bold text-white">
                        {client.name}
                    </h1>
                </div>
                <div className="flex items-center gap-2">
                    <Button variant="outline" onClick={() => onEdit(client)}>
                        <Edit className="w-4 h-4 mr-2" />
                        Edit
                    </Button>
                    <AlertDialog>
                        <AlertDialogTrigger asChild>
                            <Button variant="destructive">
                                <Trash2 className="w-4 h-4 mr-2" />
                                Delete
                            </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                            <AlertDialogHeader>
                                <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                                <AlertDialogDescription>
                                    This action cannot be undone. This will permanently delete the client <span className="font-bold text-white">{client.name}</span> and all associated data.
                                </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                                <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
                                <AlertDialogAction onClick={handleDeleteClient} disabled={isDeleting} className="bg-red-600 hover:bg-red-700">
                                    {isDeleting ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
                                    Yes, delete client
                                </AlertDialogAction>
                            </AlertDialogFooter>
                        </AlertDialogContent>
                    </AlertDialog>
                </div>
            </header>

            <div className="flex-grow overflow-y-auto no-scrollbar pr-2 space-y-6">
                <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
                    {/* Left Panel */}
                    <div className="lg:col-span-1">
                        <div className="glass-pane p-6 rounded-lg text-center">
                            <div className="relative mb-4 inline-block">
                                <Avatar className="w-24 h-24 mx-auto border-4 border-white/20">
                                    <AvatarImage
                                        src={photoBlobUrl || getClientPhotoUrl(client)}
                                        alt={client.name}
                                        key={`client-photo-${photoKey}`}
                                        loading="eager"
                                        onError={(e) => {
                                            console.error('Failed to load client photo:', e);
                                            // Cleanup blob URL on error
                                            if (photoBlobUrl && photoBlobUrl.startsWith('blob:')) {
                                                URL.revokeObjectURL(photoBlobUrl);
                                            }
                                            setPhotoBlobUrl(null);
                                            setIsPhotoLoading(false);
                                        }}
                                        onLoad={() => {
                                            console.log('Client photo loaded successfully');
                                            setIsPhotoLoading(false);
                                        }}
                                    />
                                    <AvatarFallback className="text-3xl bg-gradient-to-br from-sky-500 to-indigo-600 text-white">
                                        {client.name.charAt(0).toUpperCase()}
                                    </AvatarFallback>
                                </Avatar>
                                {/* Loading overlay */}
                                {isPhotoLoading && (
                                    <div className="absolute inset-0 flex items-center justify-center bg-black/30 rounded-full">
                                        <Loader2 className="w-8 h-8 text-white animate-spin" />
                                    </div>
                                )}
                            </div>
                            <h2 className="text-xl font-semibold text-white">{client.name}</h2>
                            <p className="text-gray-400">Customer No.: {client.customer_id || 'N/A'}</p>

                            {/* Users section removed as per user request */}
                        </div>
                    </div>

                    {/* Right Panel */}
                    <div className="lg:col-span-3">
                        <div className="border-b border-white/10 mb-4">
                            <nav className="-mb-px flex space-x-6 overflow-x-auto">
                                {tabs.map(tab => (
                                    <button
                                        key={tab}
                                        onClick={() => handleTabClick(tab)}
                                        className={`${activeSubTab === tab
                                            ? 'border-primary text-primary'
                                            : 'border-transparent text-gray-400 hover:text-white hover:border-gray-300'
                                            } whitespace-nowrap py-3 px-1 border-b-2 font-medium text-sm transition-colors`}
                                    >
                                        {tab}
                                    </button>
                                ))}
                            </nav>
                        </div>

                        <div>
                            {renderTabContent()}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ClientDashboard;
