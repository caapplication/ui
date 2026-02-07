import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Edit, Trash2, Loader2 } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import ClientDashboardDetails from './ClientDashboardDetails';
import ClientServicesTab from './ClientServicesTab';
import ClientPasswordsTab from './ClientPasswordsTab';
import ClientUsersTab from './ClientUsersTab';
import ClientTeamMembersTab from './ClientTeamMembersTab';
import ActivityLog from '@/components/finance/ActivityLog';
import { useToast } from '@/components/ui/use-toast';
import { useAuth } from '@/hooks/useAuth';
import { getClientTeamMembers } from '@/lib/api/clients';
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

const ClientDashboard = ({ client, onBack, onEdit, setActiveTab, allServices, onUpdateClient, onClientDeleted, teamMembers, onClientUserInvited, onClientUserDeleted }) => {
    const [activeSubTab, setActiveSubTab] = useState('Details');
    const [isDeleting, setIsDeleting] = useState(false);
    const { toast } = useToast();
    const { user } = useAuth();

    const [photoBlobUrl, setPhotoBlobUrl] = useState(null);
    const [photoKey, setPhotoKey] = useState(0);
    const [isPhotoLoading, setIsPhotoLoading] = useState(false);
    const [teamMemberCount, setTeamMemberCount] = useState(0);
    const [clientUserCount, setClientUserCount] = useState(0);
    const [isLoadingTeamCount, setIsLoadingTeamCount] = useState(false);
    const [isLoadingUserCount, setIsLoadingUserCount] = useState(false);

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

    const fetchTeamMemberCount = () => {
        if (client?.id && user?.access_token) {
            setIsLoadingTeamCount(true);
            getClientTeamMembers(client.id, user.agency_id, user.access_token)
                .then(result => {
                    setTeamMemberCount(result?.team_members?.length || 0);
                })
                .catch(err => {
                    console.error('Failed to fetch team members:', err);
                    setTeamMemberCount(0);
                })
                .finally(() => {
                    setIsLoadingTeamCount(false);
                });
        }
    };

    const fetchClientUserCount = () => {
        if (user?.access_token && (client.id || client.entity_id)) {
            const entityId = client.id || client.entity_id;
            setIsLoadingUserCount(true);
            // Imported dynamically or handled via prop if needed, but easier to use API directly since we need it on load
            import('@/lib/api/organisation').then(({ listEntityUsers }) => {
                listEntityUsers(entityId, user.access_token)
                    .then(data => {
                        const count = (data.invited_users?.length || 0) + (data.joined_users?.length || 0);
                        setClientUserCount(count);
                    })
                    .catch(err => {
                        console.error("Failed to fetch client users for count:", err);
                    })
                    .finally(() => {
                        setIsLoadingUserCount(false);
                    });
            });
        }
    };

    // Fetch counts on mount
    useEffect(() => {
        fetchTeamMemberCount();
        fetchClientUserCount();
    }, [client?.id, client?.entity_id, user?.access_token, user?.agency_id]);

    const handleClientUserInvited = () => {
        fetchClientUserCount();
        if (onClientUserInvited) onClientUserInvited();
    };

    const handleClientUserDeleted = () => {
        fetchClientUserCount();
        if (onClientUserDeleted) onClientUserDeleted();
    };

    const handleTeamMemberChanged = () => {
        fetchTeamMemberCount();
    };

    const tabs = [
        'Details',
        'Services',
        'Passwords',
        {
            key: 'Client User',
            label: (
                <>
                    Client User {isLoadingUserCount ? (
                        <Loader2 className="w-3 h-3 animate-spin inline-block" />
                    ) : (
                        `(${clientUserCount})`
                    )}
                </>
            )
        },
        {
            key: 'MyTeam',
            label: (
                <>
                    MyTeam {isLoadingTeamCount ? (
                        <Loader2 className="w-3 h-3 animate-spin inline-block" />
                    ) : (
                        `(${teamMemberCount})`
                    )}
                </>
            )
        },
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
            // Delegate deletion to parent component
            if (onClientDeleted) {
                await onClientDeleted(client.id);
            }
            onBack();
        } catch (error) {
            console.error("Error invoking delete callback:", error);
            // Parent handles its own errors, but we catch here just in case specific logic is needed
        } finally {
            setIsDeleting(false);
        }
    };


    if (!client) return null;

    if (!client) return null;


    const renderTabContent = () => {
        switch (activeSubTab) {
            case 'Details':
                return <ClientDashboardDetails client={client} teamMembers={teamMembers} onUpdateClient={onUpdateClient} />;
            case 'Services':
                return <ClientServicesTab client={client} allServices={allServices} onUpdateClient={onUpdateClient} />;
            case 'Passwords':
                return <ClientPasswordsTab client={client} />;
            case 'Activity Log':
                // Note: Activity logs for clients may need backend support
                // For now, we'll try to fetch them - if the backend doesn't support it, it will show an error
                return (
                    <div className="glass-pane p-6 rounded-lg">
                        <ActivityLog itemId={client.id} itemType="client" excludeTypes={['document', 'folder']} />
                    </div>
                );
            default:
                if (activeSubTab.startsWith('Client User')) {
                    return <ClientUsersTab client={client} onUserInvited={handleClientUserInvited} onUserDeleted={handleClientUserDeleted} />;
                }
                if (activeSubTab.startsWith('MyTeam')) {
                    return <ClientTeamMembersTab client={client} teamMembers={teamMembers} onTeamMemberChanged={handleTeamMemberChanged} />;
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
                                {tabs.map(tab => {
                                    const tabKey = typeof tab === 'string' ? tab : tab.key;
                                    const tabLabel = typeof tab === 'string' ? tab : tab.label;
                                    const isActive = activeSubTab === tabKey || activeSubTab.startsWith(tabKey.split(' ')[0]);

                                    return (
                                        <button
                                            key={tabKey}
                                            onClick={() => handleTabClick(tabKey)}
                                            className={`${isActive
                                                ? 'border-primary text-primary'
                                                : 'border-transparent text-gray-400 hover:text-white hover:border-gray-300'
                                                } whitespace-nowrap py-3 px-1 border-b-2 font-medium text-sm transition-colors flex items-center gap-2`}
                                        >
                                            {tabLabel}
                                        </button>
                                    );
                                })}
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
