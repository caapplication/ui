import React, { useState, useEffect, useCallback } from 'react';
    import ClientList from '@/components/accountant/clients/ClientList';
    import NewClientForm from '@/components/accountant/clients/NewClientForm';
    import ClientDashboard from '@/components/accountant/clients/ClientDashboard';
    import { AnimatePresence, motion } from 'framer-motion';
    import { useAuth } from '@/hooks/useAuth';
    import { listClients, createClient, updateClient, listServices as fetchAllServices, deleteClient as apiDeleteClient, listOrganisations, getBusinessTypes, listClientServices, listTeamMembers, getTags, uploadClientPhoto, listOrgUsers, listEntities } from '@/lib/api';
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
    
        const fetchClientsAndServices = useCallback(async () => {
            setIsLoading(true);
            try {
                if (!user?.agency_id || !user?.access_token) {
                     throw new Error("User information is not available.");
                }
                const [clientsData, servicesData, orgsData, businessTypesData, teamMembersData, tagsData] = await Promise.all([
                    listClients(user.agency_id, user.access_token),
                    fetchAllServices(user.agency_id, user.access_token),
                    listOrganisations(user.access_token),
                    getBusinessTypes(user.agency_id, user.access_token),
                    listTeamMembers(user.access_token),
                    getTags(user.agency_id, user.access_token)
                ]);
                
                const orgsMap = (orgsData || []).reduce((acc, org) => {
                    acc[org.id] = org.name;
                    return acc;
                }, {});
    
                const clientsWithData = (clientsData || []).map(client => ({
                    ...client,
                    organization_name: orgsMap[client.organization_id] || null,
                }));
    
                const clientsWithServices = await Promise.all(
                    clientsWithData.map(async (client) => {
                        let orgUsers = [];
                        let entities = [];
                        try {
                            const clientServices = await listClientServices(client.id, user.agency_id, user.access_token);
                            const users = await listOrgUsers(client.organization_id, user.access_token);
                            if (users && (users.invited_users || users.joined_users)) {
                                orgUsers = users;
                            } else {
                                orgUsers = { invited_users: [], joined_users: [] };
                            }
                            const entityData = await listEntities(client.organization_id, user.access_token);
                            if (Array.isArray(entityData)) {
                                entities = entityData;
                            }
                            return { ...client, availedServices: Array.isArray(clientServices) ? clientServices : [], orgUsers, entities };
                        } catch (e) {
                            if (e.message.includes('404')) {
                                return { ...client, availedServices: [], orgUsers: [], entities: [] };
                            }
                            console.error(`Failed to fetch services, users, or entities for client ${client.id}`, e);
                            return { ...client, availedServices: [], orgUsers: [], entities: [] };
                        }
                    })
                );
    
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
            }
        }, [user?.agency_id, user?.access_token, toast]);
    
        useEffect(() => {
            fetchClientsAndServices();
        }, [fetchClientsAndServices]);
    
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
            fetchClientsAndServices();
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
                    let finalClient = updatedClient;
                    if (photoFile) {
                        const photoRes = await uploadClientPhoto(editingClient.id, photoFile, user.agency_id, user.access_token);
                        finalClient = { ...updatedClient, photo: photoRes.photo_url };
                    }
                    toast({ title: "✅ Client Updated", description: `Client ${updatedClient.name} has been updated.` });
                    setClients(clients.map(c => c.id === editingClient.id ? finalClient : c));
                } else {
                    const newClient = await createClient(clientData, user.agency_id, user.access_token);
                    let finalClient = newClient;
                    if (photoFile) {
                        const photoRes = await uploadClientPhoto(newClient.id, photoFile, user.agency_id, user.access_token);
                        finalClient = { ...newClient, photo: photoRes.photo_url };
                    }
                    toast({ title: "✅ Client Created", description: `Client ${newClient.name} has been added.` });
                    setClients(prev => [{ ...finalClient, availedServices: [] }, ...prev]);
                }
                setView('list');
                fetchClientsAndServices();
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
                                onBack={handleBackToList} 
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
