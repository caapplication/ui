import React, { useState, useEffect, useCallback, useRef } from 'react';
import ClientList from '@/components/accountant/clients/ClientList';
import NewClientForm from '@/components/accountant/clients/NewClientForm';
import ClientDashboard from '@/components/accountant/clients/ClientDashboard';
import { AnimatePresence, motion } from 'framer-motion';
import { useAuth } from '@/hooks/useAuth';
import { listClients, createClient, updateClient, listServices as fetchAllServices, deleteClient as apiDeleteClient, listOrganisations, getBusinessTypes, listClientServices, listTeamMembers, getTags, uploadClientPhoto, listOrgUsers, listEntities, createEntity, listAllEntityUsers } from '@/lib/api';
import { useToast } from '@/components/ui/use-toast';
import { Loader2 } from 'lucide-react';

const Clients = ({ setActiveTab }) => {
    const { user } = useAuth();
    const { toast } = useToast();

    const [view, setView] = useState('list'); // 'list', 'new', 'dashboard'
    const [clients, setClients] = useState([]);
    const [allServices, setAllServices] = useState([]);
    const [organisations, setOrganisations] = useState([]);
    const [businessTypes, setBusinessTypes] = useState([]);
    const [teamMembers, setTeamMembers] = useState([]);
    const [tags, setTags] = useState([]);
    const [selectedClient, setSelectedClient] = useState(null);
    const [editingClient, setEditingClient] = useState(null);
    const [isLoading, setIsLoading] = useState(true);
    const [organizationUsers, setOrganizationUsers] = useState([]);

    // Cache for organization data to avoid duplicate API calls
    const orgDataCache = useRef(new Map());
    const isFetchingRef = useRef(false);

    const fetchClientsAndServices = useCallback(async () => {
        // Prevent concurrent calls
        if (isFetchingRef.current) {
            return;
        }

        isFetchingRef.current = true;
        setIsLoading(true);
        try {
            if (!user?.agency_id || !user?.access_token) {
                throw new Error("User information is not available.");
            }

            // Use Promise.allSettled to handle partial failures gracefully
            const results = await Promise.allSettled([
                listClients(user.agency_id, user.access_token),
                fetchAllServices(user.agency_id, user.access_token),
                listOrganisations(user.access_token),
                getBusinessTypes(user.agency_id, user.access_token),
                listTeamMembers(user.access_token, 'joined'),
                getTags(user.agency_id, user.access_token)
            ]);

            // Extract results, using empty arrays/objects for failed requests
            const clientsData = results[0].status === 'fulfilled' ? results[0].value : [];
            const servicesData = results[1].status === 'fulfilled' ? results[1].value : [];
            const orgsData = results[2].status === 'fulfilled' ? results[2].value : [];
            const businessTypesData = results[3].status === 'fulfilled' ? results[3].value : [];
            const teamMembersData = results[4].status === 'fulfilled' ? results[4].value : [];
            const tagsData = results[5].status === 'fulfilled' ? results[5].value : [];

            // Log any failures
            results.forEach((result, index) => {
                if (result.status === 'rejected') {
                    const names = ['clients', 'services', 'organisations', 'businessTypes', 'teamMembers', 'tags'];
                    console.error(`Failed to fetch ${names[index]}:`, result.reason);
                }
            });

            const orgsMap = (orgsData || []).reduce((acc, org) => {
                acc[org.id] = org.name;
                return acc;
            }, {});

            const clientsWithData = (clientsData || []).map(client => {
                // Convert S3 photo URLs to proxy endpoint URLs
                // Never store blob URLs - always use proxy endpoint
                const clientApiUrl = import.meta.env.VITE_CLIENT_API_URL || 'http://127.0.0.1:8002';
                let photoUrl = client.photo_url || client.photo;

                // If it's a blob URL, ignore it and use proxy endpoint
                if (photoUrl && photoUrl.startsWith('blob:')) {
                    photoUrl = null;
                }

                // Convert S3 URLs to proxy endpoint
                // Convert S3 URLs to proxy endpoint
                if (photoUrl && photoUrl.includes('.s3.amazonaws.com/')) {
                    const version = client.updated_at ? new Date(client.updated_at).getTime() : 0;
                    photoUrl = `${clientApiUrl}/clients/${client.id}/photo?token=${user.access_token}&v=${version}`;
                } else if (!photoUrl || !photoUrl.includes('/clients/')) {
                    // If no photo_url or it's not a proxy URL, use proxy endpoint (might not exist, but that's OK)
                    const version = client.updated_at ? new Date(client.updated_at).getTime() : 0;
                    photoUrl = client.id ? `${clientApiUrl}/clients/${client.id}/photo?token=${user.access_token}&v=${version}` : null;
                } else if (photoUrl && photoUrl.includes('/clients/') && !photoUrl.includes('token=')) {
                    // If it is a proxy URL but missing the token, append it
                    const separator = photoUrl.includes('?') ? '&' : '?';
                    const version = client.updated_at ? new Date(client.updated_at).getTime() : 0;
                    photoUrl = `${photoUrl}${separator}token=${user.access_token}&v=${version}`;
                }

                return {
                    ...client,
                    organization_name: orgsMap[client.organization_id] || null,
                    photo_url: photoUrl,
                    photo: photoUrl, // Also set photo for backward compatibility
                };
            });

            // Get unique organization IDs to batch fetch organization data
            const uniqueOrgIds = [...new Set(clientsWithData.map(c => c.organization_id).filter(Boolean))];

            // Batch fetch organization users and entities
            const orgDataPromises = uniqueOrgIds.map(async (orgId) => {
                // Check cache first
                const cacheKey = `org-${orgId}`;
                if (orgDataCache.current.has(cacheKey)) {
                    return { orgId, data: orgDataCache.current.get(cacheKey) };
                }

                try {
                    const [usersMapResult, entities] = await Promise.allSettled([
                        listAllEntityUsers(orgId, user.access_token),
                        listEntities(orgId, user.access_token)
                    ]);

                    const entityUsersMap = usersMapResult.status === 'fulfilled' && usersMapResult.value
                        ? usersMapResult.value
                        : {};

                    const orgEntities = entities.status === 'fulfilled' && Array.isArray(entities.value)
                        ? entities.value
                        : [];

                    const data = { entityUsersMap, entities: orgEntities };
                    orgDataCache.current.set(cacheKey, data);
                    return { orgId, data };
                } catch (e) {
                    console.error(`Failed to fetch org data for ${orgId}:`, e);
                    const data = { entityUsersMap: {}, entities: [] };
                    orgDataCache.current.set(cacheKey, data);
                    return { orgId, data };
                }
            });

            const orgDataResults = await Promise.all(orgDataPromises);
            const orgDataMap = new Map(orgDataResults.map(r => [r.orgId, r.data]));

            // Batch fetch client services
            const clientServicesPromises = clientsWithData.map(async (client) => {
                try {
                    const clientServices = await listClientServices(client.id, user.agency_id, user.access_token);
                    return { clientId: client.id, services: Array.isArray(clientServices) ? clientServices : [] };
                } catch (e) {
                    if (e.message.includes('404')) {
                        return { clientId: client.id, services: [] };
                    }
                    console.error(`Failed to fetch services for client ${client.id}`, e);
                    return { clientId: client.id, services: [] };
                }
            });

            const clientServicesResults = await Promise.all(clientServicesPromises);
            const clientServicesMap = new Map(clientServicesResults.map(r => [r.clientId, r.services]));

            // Combine all data
            const clientsWithServices = clientsWithData.map(client => {
                const orgData = orgDataMap.get(client.organization_id) || { entityUsersMap: {}, entities: [] };
                const services = clientServicesMap.get(client.id) || [];

                // Use entity-specific users if available, otherwise empty
                const clientUsers = (orgData.entityUsersMap && orgData.entityUsersMap[client.id])
                    ? orgData.entityUsersMap[client.id]
                    : { invited_users: [], joined_users: [] };

                return {
                    ...client,
                    availedServices: services,
                    orgUsers: clientUsers, // Populate orgUsers prop with entity-specific users
                    entities: orgData.entities
                };
            });

            setClients(clientsWithServices);
            setAllServices(servicesData || []);
            setOrganisations(orgsData || []);
            setBusinessTypes(businessTypesData || []);
            setTeamMembers(teamMembersData || []);
            setTags(tagsData || []);
        } catch (error) {
            toast({
                title: 'Error fetching data',
                description: error.message,
                variant: 'destructive',
            });
        } finally {
            setIsLoading(false);
            isFetchingRef.current = false;
        }
    }, [user?.agency_id, user?.access_token]);

    useEffect(() => {
        if (user?.agency_id && user?.access_token) {
            fetchClientsAndServices();
        }
    }, [user?.agency_id, user?.access_token]);

    const handleAddNew = () => {
        setEditingClient(null);
        setView('new');
    };

    const handleViewClient = (client) => {
        setSelectedClient(client);
        setView('dashboard');
    }

    const handleBackToList = () => {
        setView('list');
        setSelectedClient(null);
        setEditingClient(null);
        // Don't refetch - data is already up to date
    };

    const handleCancelForm = () => {
        if (editingClient && selectedClient && editingClient.id === selectedClient.id) {
            // We were editing the selected client (likely came from dashboard)
            setView('dashboard');
            setEditingClient(null);
            // keep selectedClient as is
        } else {
            // New client or came from list
            setView('list');
            setSelectedClient(null);
            setEditingClient(null);
        }
    };

    const handleEditClient = (client) => {
        setEditingClient(client);
        setView('new');
    }

    const handleDeleteClient = async (clientId) => {
        try {
            if (!user?.agency_id || !user?.access_token) {
                throw new Error("User information is not available.");
            }
            await apiDeleteClient(clientId, user.agency_id, user.access_token);
            toast({ title: "✅ Client Deleted", description: `Client has been removed.` });
            setClients(prev => prev.filter(c => c.id !== clientId));
        } catch (error) {
            toast({
                title: 'Error deleting client',
                description: error.message,
                variant: 'destructive',
            });
        }
    };

    const handleBulkDelete = async (clientIds) => {
        try {
            if (!user?.agency_id || !user?.access_token) {
                throw new Error("User information is not available.");
            }
            await Promise.all(
                clientIds.map(id => apiDeleteClient(id, user.agency_id, user.access_token))
            );
            toast({ title: `✅ ${clientIds.length} Clients Deleted`, description: `The selected clients have been removed.` });
            setClients(prev => prev.filter(c => !clientIds.includes(c.id)));
        } catch (error) {
            toast({
                title: 'Error deleting clients',
                description: error.message,
                variant: 'destructive',
            });
        }
    };

    const handleSaveClient = async (clientData, photoFile) => {
        try {
            if (!user?.agency_id || !user?.access_token) {
                throw new Error("User information is not available.");
            }
            if (editingClient) {
                const updatedClient = await updateClient(editingClient.id, clientData, user.agency_id, user.access_token);
                const clientApiUrl = import.meta.env.VITE_CLIENT_API_URL || 'http://127.0.0.1:8002';
                let finalClient = updatedClient;

                if (photoFile) {
                    // Upload new photo
                    await uploadClientPhoto(editingClient.id, photoFile, user.agency_id, user.access_token);
                    // Always use proxy endpoint URL with cache-busting after photo upload
                    const timestamp = Date.now();
                    const photoUrl = `${clientApiUrl}/clients/${editingClient.id}/photo?t=${timestamp}&token=${user.access_token}`;
                    finalClient = { ...updatedClient, photo: photoUrl, photo_url: photoUrl };
                } else {
                    // No new photo uploaded, but ensure existing photo_url is in proxy format
                    if (updatedClient.photo_url) {
                        if (updatedClient.photo_url.startsWith('blob:')) {
                            // Replace blob URL with proxy endpoint
                            const timestamp = Date.now();
                            finalClient = { ...updatedClient, photo: `${clientApiUrl}/clients/${editingClient.id}/photo?t=${timestamp}&token=${user.access_token}`, photo_url: `${clientApiUrl}/clients/${editingClient.id}/photo?t=${timestamp}&token=${user.access_token}` };
                        } else if (updatedClient.photo_url.includes('.s3.amazonaws.com/')) {
                            // Convert S3 URL to proxy endpoint
                            const timestamp = Date.now();
                            finalClient = { ...updatedClient, photo: `${clientApiUrl}/clients/${editingClient.id}/photo?t=${timestamp}&token=${user.access_token}`, photo_url: `${clientApiUrl}/clients/${editingClient.id}/photo?t=${timestamp}&token=${user.access_token}` };
                        } else if (!updatedClient.photo_url.includes('/clients/')) {
                            // If it's not a proxy URL, convert it
                            const timestamp = Date.now();
                            finalClient = { ...updatedClient, photo: `${clientApiUrl}/clients/${editingClient.id}/photo?t=${timestamp}&token=${user.access_token}`, photo_url: `${clientApiUrl}/clients/${editingClient.id}/photo?t=${timestamp}&token=${user.access_token}` };
                        }
                    }
                }
                toast({ title: "✅ Client Updated", description: `Client ${updatedClient.name} has been updated.` });

                // Update clients list
                const updatedClients = clients.map(c => c.id === editingClient.id ? finalClient : c);
                setClients(updatedClients);

                // Update selectedClient if it's the same client
                // Force a fresh fetch by ensuring photo_url is always the proxy URL with cache-busting
                if (selectedClient && selectedClient.id === editingClient.id) {
                    // Create a completely new client object to force React to detect the change
                    // Use a fresh timestamp to ensure the photo reloads
                    const timestamp = Date.now();
                    const refreshedClient = {
                        ...finalClient,
                        // Force photo_url to be proxy URL with fresh cache-busting
                        photo_url: `${clientApiUrl}/clients/${editingClient.id}/photo?t=${timestamp}&token=${user.access_token}`,
                        photo: `${clientApiUrl}/clients/${editingClient.id}/photo?t=${timestamp}&token=${user.access_token}`
                    };
                    setSelectedClient(refreshedClient);
                }

                // Go to dashboard if we have a selected client (which we should if editing)
                if (selectedClient) {
                    setView('dashboard');
                    setEditingClient(null); // Clear editing state
                } else {
                    setView('list'); // Fallback
                    setEditingClient(null);
                }
            } else {
                const newClient = await createClient(clientData, user.agency_id, user.access_token);
                let finalClient = newClient;

                // Automatically create entity for the new client
                if (newClient.organization_id) {
                    try {
                        const newEntity = await createEntity({
                            name: newClient.name,
                            organization_id: newClient.organization_id
                        }, user.access_token);

                        // Update organization cache with new entity
                        const cacheKey = `org-${newClient.organization_id}`;
                        if (orgDataCache.current.has(cacheKey)) {
                            const cachedData = orgDataCache.current.get(cacheKey);
                            const updatedEntities = [...(cachedData.entities || []), newEntity];
                            orgDataCache.current.set(cacheKey, { ...cachedData, entities: updatedEntities });
                        }
                    } catch (entityError) {
                        console.error("Failed to auto-create entity:", entityError);
                        toast({
                            title: "Entity Creation Failed",
                            description: "Client created, but failed to create corresponding entity.",
                            variant: "warning"
                        });
                    }
                }

                if (photoFile) {
                    const photoRes = await uploadClientPhoto(newClient.id, photoFile, user.agency_id, user.access_token);
                    // Convert S3 URL to proxy endpoint URL
                    const photoUrl = photoRes.photo_url && photoRes.photo_url.includes('.s3.amazonaws.com/')
                        ? `${import.meta.env.VITE_CLIENT_API_URL || 'http://127.0.0.1:8002'}/clients/${newClient.id}/photo`
                        : photoRes.photo_url;
                    finalClient = { ...newClient, photo: photoUrl, photo_url: photoUrl };
                }
                toast({ title: "✅ Client Created", description: `Client ${newClient.name} has been added.` });
                setClients(prev => [{ ...finalClient, availedServices: [], orgUsers: { invited_users: [], joined_users: [] }, entities: [] }, ...prev]);
                setView('list');
            }
            // Don't refetch - we already updated the state
        } catch (error) {
            toast({
                title: 'Error saving client',
                description: error.message,
                variant: 'destructive',
            });
        }
    };

    const handleUpdateClient = (updatedClientData) => {
        const updatedClient = { ...selectedClient, ...updatedClientData };
        setSelectedClient(updatedClient);
        setClients(prevClients => prevClients.map(c => c.id === updatedClient.id ? updatedClient : c));
    };

    const handleTeamMemberInvited = async () => {
        // Refresh team members list after inviting
        if (user?.access_token) {
            try {
                const members = await listTeamMembers(user.access_token, 'joined');
                setTeamMembers(members || []);
            } catch (error) {
                console.error('Failed to refresh team members:', error);
            }
        }
    };

    const handleClientUserInvited = async () => {
        // Refresh users for the current client entity
        if (selectedClient?.id && user?.access_token) {
            try {
                const entityUsers = await listEntityUsers(selectedClient.id, user.access_token);
                const updatedClient = {
                    ...selectedClient,
                    orgUsers: entityUsers || { invited_users: [], joined_users: [] }
                };
                setSelectedClient(updatedClient);
                setClients(prevClients => prevClients.map(c =>
                    c.id === selectedClient.id ? updatedClient : c
                ));

                // Update cache if possible (optional, but good for consistency)
                if (selectedClient.organization_id) {
                    const cacheKey = `org-${selectedClient.organization_id}`;
                    if (orgDataCache.current.has(cacheKey)) {
                        const currentData = orgDataCache.current.get(cacheKey);
                        // Deep update the specific client in the map
                        const newMap = { ...(currentData.entityUsersMap || {}) };
                        newMap[selectedClient.id] = entityUsers;

                        orgDataCache.current.set(cacheKey, { ...currentData, entityUsersMap: newMap });
                    }
                }
            } catch (error) {
                console.error('Failed to refresh client users:', error);
            }
        }
    };

    const renderContent = () => {
        const currentClient = clients.find(c => c.id === selectedClient?.id) || selectedClient;

        if (isLoading) {
            return (
                <div className="flex items-center justify-center h-full">
                    <Loader2 className="w-12 h-12 animate-spin text-primary" />
                </div>
            )
        }

        switch (view) {
            case 'list':
                return (
                    <motion.div
                        key="list"
                        initial={{ opacity: 0, x: -300 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: 300 }}
                        transition={{ duration: 0.3, ease: 'easeInOut' }}
                        className="h-full"
                    >
                        <ClientList
                            clients={clients}
                            onAddNew={handleAddNew}
                            onViewClient={handleViewClient}
                            onEditClient={handleEditClient}
                            allServices={allServices}
                            onDeleteClient={handleDeleteClient}
                            onBulkDelete={handleBulkDelete}
                            onRefresh={fetchClientsAndServices}
                            businessTypes={businessTypes}
                            teamMembers={teamMembers}
                        />
                    </motion.div>
                );
            case 'new':
                return (
                    <motion.div
                        key="form"
                        initial={{ opacity: 0, x: 300 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: -300 }}
                        transition={{ duration: 0.3, ease: 'easeInOut' }}
                        className="h-full"
                    >
                        <NewClientForm
                            onBack={handleCancelForm}
                            onSave={handleSaveClient}
                            client={editingClient}
                            allServices={allServices}
                            organisations={organisations}
                            businessTypes={businessTypes}
                            teamMembers={teamMembers}
                            tags={tags}
                        />
                    </motion.div>
                );
            case 'dashboard':
                return (
                    <motion.div
                        key="dashboard"
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.95 }}
                        transition={{ duration: 0.3, ease: 'easeInOut' }}
                        className="h-full"
                    >
                        <ClientDashboard
                            client={currentClient}
                            onBack={handleBackToList}
                            onEdit={handleEditClient}
                            setActiveTab={setActiveTab}
                            allServices={allServices}
                            onUpdateClient={handleUpdateClient}
                            onClientDeleted={handleDeleteClient}
                            teamMembers={teamMembers}
                            onTeamMemberInvited={handleTeamMemberInvited}
                            onClientUserInvited={handleClientUserInvited}
                        />
                    </motion.div>
                );
            default:
                return null;
        }
    }


    return (
        <div className="p-4 md:p-8 text-white relative overflow-hidden h-full">
            <AnimatePresence mode="wait">
                {renderContent()}
            </AnimatePresence>
        </div>
    );
};

export default Clients;
