import React, { useState, useEffect, useCallback, useRef } from 'react';
import ClientList from '@/components/accountant/clients/ClientList';
import NewClientForm from '@/components/accountant/clients/NewClientForm';
import ClientDashboard from '@/components/accountant/clients/ClientDashboard';
import { AnimatePresence, motion } from 'framer-motion';
import { useAuth } from '@/hooks/useAuth';
import {
    listClients,
    createClient,
    updateClient,
    listServices as fetchAllServices,
    deleteClient as apiDeleteClient,
    listOrganisations,
    getBusinessTypes,
    listClientServices,
    listTeamMembers,
    getTags,
    uploadClientPhoto,
    listEntities,
    createEntity,
    listAllEntityUsers,
} from '@/lib/api';
import { useToast } from '@/components/ui/use-toast';
import { Loader2 } from 'lucide-react';
import Organisation from '@/components/accountant/organisation/Organisation.jsx';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

const CLIENTS_CACHE_TTL = 5 * 60 * 1000; // 5 minutes
const clientsDataCache = {
    snapshot: null,
    timestamp: 0,
};
const orgDataCacheStore = new Map();
const clientServicesCacheStore = new Map();

const isCacheValid = (timestamp = 0) => Date.now() - timestamp < CLIENTS_CACHE_TTL;

const Clients = ({ setActiveTab }) => {
    const { user } = useAuth();
    const { toast } = useToast();

    const [view, setView] = useState('list'); // 'list', 'new', 'dashboard'
    const [internalTab, setInternalTab] = useState('clients');
    const [clients, setClients] = useState([]);
    const [allServices, setAllServices] = useState([]);
    const [organisations, setOrganisations] = useState([]);
    const [businessTypes, setBusinessTypes] = useState([]);
    const [teamMembers, setTeamMembers] = useState([]);
    const [tags, setTags] = useState([]);
    const [selectedClient, setSelectedClient] = useState(null);
    const [editingClient, setEditingClient] = useState(null);
    const [isLoading, setIsLoading] = useState(true);

    const orgDataCache = useRef(orgDataCacheStore);
    const clientServicesCache = useRef(clientServicesCacheStore);
    const isFetchingRef = useRef(false);

    const applySnapshot = useCallback(
        (snapshot) => {
            if (!snapshot) return false;

            setClients(snapshot.clients ? [...snapshot.clients] : []);
            setAllServices(snapshot.services ? [...snapshot.services] : []);
            setOrganisations(snapshot.organisations ? [...snapshot.organisations] : []);
            setBusinessTypes(snapshot.businessTypes ? [...snapshot.businessTypes] : []);
            setTeamMembers(snapshot.teamMembers ? [...snapshot.teamMembers] : []);
            setTags(snapshot.tags ? [...snapshot.tags] : []);

            if (snapshot.orgDataEntries) {
                const cacheMap = orgDataCache.current;
                cacheMap.clear();
                snapshot.orgDataEntries.forEach(([key, value]) => cacheMap.set(key, value));
            }

            if (snapshot.clientServicesEntries) {
                const servicesCache = clientServicesCache.current;
                servicesCache.clear();
                snapshot.clientServicesEntries.forEach(([key, value]) => servicesCache.set(key, value));
            }

            return true;
        },
        [orgDataCache, clientServicesCache]
    );

    const syncSnapshot = useCallback(
        (updates = {}) => {
            if (!clientsDataCache.snapshot) return;

            clientsDataCache.snapshot = {
                ...clientsDataCache.snapshot,
                ...updates,
            };
            clientsDataCache.snapshot.orgDataEntries = Array.from(orgDataCache.current.entries());
            clientsDataCache.snapshot.clientServicesEntries = Array.from(clientServicesCache.current.entries());
            clientsDataCache.timestamp = Date.now();
        },
        [orgDataCache, clientServicesCache]
    );

    const fetchClientsAndServices = useCallback(
        async (forceRefresh = false) => {
            if (isFetchingRef.current) {
                return;
            }

            const canServeFromCache =
                !forceRefresh && isCacheValid(clientsDataCache.timestamp) && clientsDataCache.snapshot;
            if (canServeFromCache) {
                applySnapshot(clientsDataCache.snapshot);
                setIsLoading(false);
                return;
            }

            isFetchingRef.current = true;
            setIsLoading(true);

            const bypassEntryCaches = forceRefresh || !isCacheValid(clientsDataCache.timestamp);

            try {
                if (!user?.agency_id || !user?.access_token) {
                    throw new Error('User information is not available.');
                }

                let clientsPromise;
                if (user.organizations && user.organizations.length > 0) {
                    clientsPromise = Promise.all(
                        user.organizations.map(org =>
                            listClientsByOrganization(org.id, user.access_token)
                                .catch(err => {
                                    console.error(`Failed to fetch clients for org ${org.id}`, err);
                                    return [];
                                })
                        )
                    ).then(results => results.flat());
                } else if (user.agency_id) {
                    clientsPromise = listClients(user.agency_id, user.access_token);
                } else if (user.organization_id) {
                    clientsPromise = listClientsByOrganization(user.organization_id, user.access_token);
                } else {
                    clientsPromise = Promise.resolve([]);
                }

                const results = await Promise.allSettled([
                    clientsPromise,
                    fetchAllServices(user.agency_id, user.access_token),
                    listOrganisations(user.access_token),
                    getBusinessTypes(user.agency_id, user.access_token),
                    listTeamMembers(user.access_token, 'joined'),
                    getTags(user.agency_id, user.access_token),
                ]);

                const clientsData = results[0].status === 'fulfilled' ? results[0].value : [];
                const servicesData = results[1].status === 'fulfilled' ? results[1].value : [];
                const orgsData = results[2].status === 'fulfilled' ? results[2].value : [];
                const businessTypesData = results[3].status === 'fulfilled' ? results[3].value : [];
                const teamMembersData = results[4].status === 'fulfilled' ? results[4].value : [];
                const tagsData = results[5].status === 'fulfilled' ? results[5].value : [];

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

                const clientsWithData = (clientsData || []).map((client) => {
                    const clientApiUrl = import.meta.env.VITE_CLIENT_API_URL || 'http://127.0.0.1:8002';
                    let photoUrl = client.photo_url || client.photo;

                    if (photoUrl && photoUrl.startsWith('blob:')) {
                        photoUrl = null;
                    }

                    if (photoUrl && photoUrl.includes('.s3.amazonaws.com/')) {
                        const version = client.updated_at ? new Date(client.updated_at).getTime() : 0;
                        photoUrl = `${clientApiUrl}/clients/${client.id}/photo?token=${user.access_token}&v=${version}`;
                    } else if (!photoUrl || !photoUrl.includes('/clients/')) {
                        const version = client.updated_at ? new Date(client.updated_at).getTime() : 0;
                        photoUrl = client.id
                            ? `${clientApiUrl}/clients/${client.id}/photo?token=${user.access_token}&v=${version}`
                            : null;
                    } else if (photoUrl && photoUrl.includes('/clients/') && !photoUrl.includes('token=')) {
                        const separator = photoUrl.includes('?') ? '&' : '?';
                        const version = client.updated_at ? new Date(client.updated_at).getTime() : 0;
                        photoUrl = `${photoUrl}${separator}token=${user.access_token}&v=${version}`;
                    }

                    return {
                        ...client,
                        organization_name: orgsMap[client.organization_id] || null,
                        photo_url: photoUrl,
                        photo: photoUrl,
                    };
                });

                const uniqueOrgIds = [...new Set(clientsWithData.map((c) => c.organization_id).filter(Boolean))];

                const orgDataPromises = uniqueOrgIds.map(async (orgId) => {
                    const cacheKey = `org-${orgId}`;
                    if (!bypassEntryCaches && orgDataCache.current.has(cacheKey)) {
                        return { orgId, data: orgDataCache.current.get(cacheKey) };
                    }

                    try {
                        const [usersMapResult, entities] = await Promise.allSettled([
                            listAllEntityUsers(orgId, user.access_token),
                            listEntities(orgId, user.access_token),
                        ]);

                        const entityUsersMap =
                            usersMapResult.status === 'fulfilled' && usersMapResult.value
                                ? usersMapResult.value
                                : {};

                        const orgEntities =
                            entities.status === 'fulfilled' && Array.isArray(entities.value) ? entities.value : [];

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
                const orgDataMap = new Map(orgDataResults.map((r) => [r.orgId, r.data]));

                const clientServicesPromises = clientsWithData.map(async (client) => {
                    const cacheKey = `client-services-${client.id}`;
                    if (!bypassEntryCaches && clientServicesCache.current.has(cacheKey)) {
                        return { clientId: client.id, services: clientServicesCache.current.get(cacheKey) };
                    }

                    try {
                        const clientServices = await listClientServices(
                            client.id,
                            user.agency_id,
                            user.access_token
                        );
                        const servicesList = Array.isArray(clientServices) ? clientServices : [];
                        clientServicesCache.current.set(cacheKey, servicesList);
                        return { clientId: client.id, services: servicesList };
                    } catch (e) {
                        if (typeof e?.message === 'string' && e.message.includes('404')) {
                            clientServicesCache.current.set(cacheKey, []);
                            return { clientId: client.id, services: [] };
                        }
                        console.error(`Failed to fetch services for client ${client.id}`, e);
                        clientServicesCache.current.set(cacheKey, []);
                        return { clientId: client.id, services: [] };
                    }
                });

                const clientServicesResults = await Promise.all(clientServicesPromises);
                const clientServicesMap = new Map(clientServicesResults.map((r) => [r.clientId, r.services]));

                const clientsWithServices = clientsWithData.map((client) => {
                    const orgData = orgDataMap.get(client.organization_id) || { entityUsersMap: {}, entities: [] };
                    const services = clientServicesMap.get(client.id) || [];
                    const clientUsers =
                        orgData.entityUsersMap && orgData.entityUsersMap[client.id]
                            ? orgData.entityUsersMap[client.id]
                            : { invited_users: [], joined_users: [] };

                    return {
                        ...client,
                        availedServices: services,
                        orgUsers: clientUsers,
                        entities: orgData.entities,
                    };
                });

                const snapshot = {
                    clients: clientsWithServices,
                    services: servicesData || [],
                    organisations: orgsData || [],
                    businessTypes: businessTypesData || [],
                    teamMembers: teamMembersData || [],
                    tags: tagsData || [],
                    orgDataEntries: Array.from(orgDataCache.current.entries()),
                    clientServicesEntries: Array.from(clientServicesCache.current.entries()),
                };

                clientsDataCache.snapshot = snapshot;
                clientsDataCache.timestamp = Date.now();

                applySnapshot(snapshot);
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
        },
        [applySnapshot, toast, user?.agency_id, user?.access_token]
    );

    useEffect(() => {
        if (user?.agency_id && user?.access_token) {
            fetchClientsAndServices();
        }
    }, [user?.agency_id, user?.access_token, fetchClientsAndServices]);

    const handleAddNew = () => {
        setEditingClient(null);
        setView('new');
    };

    const handleViewClient = (client) => {
        setSelectedClient(client);
        setView('dashboard');
    };

    const handleBackToList = () => {
        setView('list');
        setSelectedClient(null);
        setEditingClient(null);
    };

    const handleCancelForm = () => {
        if (editingClient && selectedClient && editingClient.id === selectedClient.id) {
            setView('dashboard');
            setEditingClient(null);
        } else {
            setView('list');
            setSelectedClient(null);
            setEditingClient(null);
        }
    };

    const handleEditClient = (client) => {
        setEditingClient(client);
        setView('new');
    };

    const handleDeleteClient = async (clientId) => {
        try {
            if (!user?.agency_id || !user?.access_token) {
                throw new Error('User information is not available.');
            }
            await apiDeleteClient(clientId, user.agency_id, user.access_token);
            toast({ title: '✅ Client Deleted', description: `Client has been removed.` });
            setClients((prev) => {
                const next = prev.filter((c) => c.id !== clientId);
                syncSnapshot({ clients: next });
                return next;
            });
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
                throw new Error('User information is not available.');
            }
            await Promise.all(clientIds.map((id) => apiDeleteClient(id, user.agency_id, user.access_token)));
            toast({
                title: `✅ ${clientIds.length} Clients Deleted`,
                description: `The selected clients have been removed.`,
            });
            setClients((prev) => {
                const next = prev.filter((c) => !clientIds.includes(c.id));
                syncSnapshot({ clients: next });
                return next;
            });
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
                throw new Error('User information is not available.');
            }

            const { organization_name: providedOrgName, ...apiClientData } = clientData;

            if (editingClient) {
                const updatedClient = await updateClient(
                    editingClient.id,
                    apiClientData,
                    user.agency_id,
                    user.access_token
                );
                const clientApiUrl = import.meta.env.VITE_CLIENT_API_URL || 'http://127.0.0.1:8002';
                let finalClient = updatedClient;

                if (photoFile) {
                    await uploadClientPhoto(editingClient.id, photoFile, user.agency_id, user.access_token);
                    const timestamp = Date.now();
                    const photoUrl = `${clientApiUrl}/clients/${editingClient.id}/photo?t=${timestamp}&token=${user.access_token}`;
                    finalClient = { ...updatedClient, photo: photoUrl, photo_url: photoUrl };
                } else if (updatedClient.photo_url) {
                    const timestamp = Date.now();
                    if (updatedClient.photo_url.startsWith('blob:') ||
                        updatedClient.photo_url.includes('.s3.amazonaws.com/') ||
                        !updatedClient.photo_url.includes('/clients/')) {
                        const photoUrl = `${clientApiUrl}/clients/${editingClient.id}/photo?t=${timestamp}&token=${user.access_token}`;
                        finalClient = { ...updatedClient, photo: photoUrl, photo_url: photoUrl };
                    }
                }

                let orgName = null;
                if (updatedClient.organization_id) {
                    const org = organisations.find((o) => String(o.id) === String(updatedClient.organization_id));
                    if (org) {
                        orgName = org.name;
                    } else if (updatedClient.organization_name) {
                        orgName = updatedClient.organization_name;
                    }
                }
                if (!orgName && providedOrgName) {
                    orgName = providedOrgName;
                }

                finalClient = { ...finalClient, organization_name: orgName };
                toast({ title: '✅ Client Updated', description: `Client ${updatedClient.name} has been updated.` });

                const updatedClients = clients.map((c) => (c.id === editingClient.id ? finalClient : c));
                setClients(updatedClients);
                syncSnapshot({ clients: updatedClients });

                if (selectedClient && selectedClient.id === editingClient.id) {
                    const timestamp = Date.now();
                    const refreshedClient = {
                        ...finalClient,
                        photo_url: `${clientApiUrl}/clients/${editingClient.id}/photo?t=${timestamp}&token=${user.access_token}`,
                        photo: `${clientApiUrl}/clients/${editingClient.id}/photo?t=${timestamp}&token=${user.access_token}`,
                    };
                    setSelectedClient(refreshedClient);
                }

                if (selectedClient) {
                    setView('dashboard');
                    setEditingClient(null);
                } else {
                    setView('list');
                    setEditingClient(null);
                }
            } else {
                const newClient = await createClient(apiClientData, user.agency_id, user.access_token);
                let finalClient = newClient;

                if (newClient.organization_id) {
                    try {
                        const newEntity = await createEntity(
                            {
                                name: newClient.name,
                                organization_id: newClient.organization_id,
                            },
                            user.access_token
                        );
                        const cacheKey = `org-${newClient.organization_id}`;
                        if (orgDataCache.current.has(cacheKey)) {
                            const cachedData = orgDataCache.current.get(cacheKey);
                            const updatedEntities = [...(cachedData.entities || []), newEntity];
                            orgDataCache.current.set(cacheKey, { ...cachedData, entities: updatedEntities });
                        }
                    } catch (entityError) {
                        console.error('Failed to auto-create entity:', entityError);
                        toast({
                            title: 'Entity Creation Failed',
                            description: 'Client created, but failed to create corresponding entity.',
                            variant: 'warning',
                        });
                    }
                }

                if (photoFile) {
                    const photoRes = await uploadClientPhoto(
                        newClient.id,
                        photoFile,
                        user.agency_id,
                        user.access_token
                    );
                    const photoUrl =
                        photoRes.photo_url && photoRes.photo_url.includes('.s3.amazonaws.com/')
                            ? `${import.meta.env.VITE_CLIENT_API_URL || 'http://127.0.0.1:8002'}/clients/${newClient.id}/photo`
                            : photoRes.photo_url;
                    finalClient = { ...newClient, photo: photoUrl, photo_url: photoUrl };
                }

                let orgName = null;
                if (newClient.organization_id) {
                    const org = organisations.find((o) => String(o.id) === String(newClient.organization_id));
                    if (org) orgName = org.name;
                }

                toast({ title: '✅ Client Created', description: `Client ${newClient.name} has been added.` });
                setClients((prev) => {
                    const next = [
                        {
                            ...finalClient,
                            organization_name: orgName,
                            availedServices: [],
                            orgUsers: { invited_users: [], joined_users: [] },
                            entities: [],
                        },
                        ...prev,
                    ];
                    syncSnapshot({ clients: next });
                    return next;
                });
                setView('list');
            }
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
        setClients((prevClients) => {
            const next = prevClients.map((c) => (c.id === updatedClient.id ? updatedClient : c));
            syncSnapshot({ clients: next });
            return next;
        });
    };

    const handleTeamMemberInvited = async () => {
        if (user?.access_token) {
            try {
                const members = await listTeamMembers(user.access_token, 'joined');
                const safeMembers = members || [];
                setTeamMembers(safeMembers);
                syncSnapshot({ teamMembers: safeMembers });
            } catch (error) {
                console.error('Failed to refresh team members:', error);
            }
        }
    };

    const handleClientUserInvited = async () => {
        if (selectedClient?.id && user?.access_token) {
            try {
                const { listEntityUsers } = await import('@/lib/api/organisation');
                const entityUsers = await listEntityUsers(selectedClient.id, user.access_token);
                const updatedClient = {
                    ...selectedClient,
                    orgUsers: entityUsers || { invited_users: [], joined_users: [] },
                };
                setSelectedClient(updatedClient);
                setClients((prevClients) => {
                    const next = prevClients.map((c) => (c.id === selectedClient.id ? updatedClient : c));
                    syncSnapshot({ clients: next });
                    return next;
                });

                if (selectedClient.organization_id) {
                    const cacheKey = `org-${selectedClient.organization_id}`;
                    if (orgDataCache.current.has(cacheKey)) {
                        const currentData = orgDataCache.current.get(cacheKey);
                        const newMap = { ...(currentData.entityUsersMap || {}) };
                        newMap[selectedClient.id] = entityUsers;
                        orgDataCache.current.set(cacheKey, { ...currentData, entityUsersMap: newMap });
                        syncSnapshot();
                    }
                }
            } catch (error) {
                console.error('Failed to refresh client users:', error);
            }
        }
    };

    const handleClientUserDeleted = async () => {
        // Reuse the logic from handleClientUserInvited as it refreshes the same data
        await handleClientUserInvited();
    };

    const renderContent = () => {
        const currentClient = clients.find((c) => c.id === selectedClient?.id) || selectedClient;

        if (isLoading) {
            return (
                <div className="flex items-center justify-center h-full">
                    <Loader2 className="w-12 h-12 animate-spin text-primary" />
                </div>
            );
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
                        <Tabs value={internalTab} onValueChange={setInternalTab} className="h-full flex flex-col">
                            <TabsList className="w-fit mb-4">
                                <TabsTrigger value="clients">Clients</TabsTrigger>
                                <TabsTrigger value="organisations">Organisations</TabsTrigger>
                            </TabsList>
                            <TabsContent value="clients" className="flex-1 mt-0 h-full overflow-hidden">
                                <ClientList
                                    clients={clients}
                                    onAddNew={handleAddNew}
                                    onViewClient={handleViewClient}
                                    onEditClient={handleEditClient}
                                    allServices={allServices}
                                    onDeleteClient={handleDeleteClient}
                                    onBulkDelete={handleBulkDelete}
                                    onRefresh={() => fetchClientsAndServices(true)}
                                    businessTypes={businessTypes}
                                    teamMembers={teamMembers}
                                />
                            </TabsContent>
                            <TabsContent value="organisations" className="flex-1 mt-0 h-full overflow-hidden">
                                <Organisation className="p-0" />
                            </TabsContent>
                        </Tabs>
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
                            onAddOrganisation={(newOrg) => {
                                setOrganisations((prev) => {
                                    const next = [...prev, newOrg];
                                    syncSnapshot({ organisations: next });
                                    return next;
                                });
                            }}
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
                            onClientUserDeleted={handleClientUserDeleted}
                        />
                    </motion.div>
                );
            default:
                return null;
        }
    };

    return (
        <div className="p-4 md:p-8 text-white relative overflow-hidden h-full">
            <AnimatePresence mode="wait">{renderContent()}</AnimatePresence>
        </div>
    );
};

export default Clients;
