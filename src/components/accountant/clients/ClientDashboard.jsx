import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Edit, Trash2, Loader2 } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import ClientDashboardDetails from './ClientDashboardDetails';
import ClientServicesTab from './ClientServicesTab';
import ClientPasswordsTab from './ClientPasswordsTab';
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

const ClientDashboard = ({ client, onBack, onEdit, setActiveTab, allServices, onUpdateClient, onClientDeleted }) => {
    const [activeSubTab, setActiveSubTab] = useState('Details');
    const [isDeleting, setIsDeleting] = useState(false);
    const { toast } = useToast();
    const { user } = useAuth();

    const tabs = ['Details', 'Services', 'Passwords'];

    const handleTabClick = (tab) => {
        if(tab === 'Documents') {
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

    const renderTabContent = () => {
        switch(activeSubTab) {
            case 'Details':
                return <ClientDashboardDetails client={client} />;
            case 'Services':
                return <ClientServicesTab client={client} allServices={allServices} onUpdateClient={onUpdateClient} />;
            case 'Passwords':
                return <ClientPasswordsTab client={client} />;
            default:
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
                        <span className="text-gray-400 cursor-pointer hover:underline" onClick={onBack}>Clients / </span>
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
                                     {isDeleting ? <Loader2 className="w-4 h-4 mr-2 animate-spin"/> : null}
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
                            <Avatar className="w-24 h-24 mx-auto mb-4 border-4 border-white/20">
                                <AvatarImage src={client.photo} />
                                <AvatarFallback className="text-3xl">{client.name.charAt(0)}</AvatarFallback>
                            </Avatar>
                            <h2 className="text-xl font-semibold text-white">{client.name}</h2>
                            <p className="text-gray-400">File No.: {client.file_no || 'N/A'}</p>

                            <div className="text-left mt-6">
                                <h3 className="font-semibold text-white mb-2">Users</h3>
                                <div className="flex items-center gap-2">
                                    <Avatar className="w-10 h-10 border-2 border-background">
                                        <AvatarImage src="/avatars/01.png" />
                                        <AvatarFallback>U</AvatarFallback>
                                    </Avatar>
                                    <div>
                                        <p className="font-medium text-white">User Name</p>
                                        <p className="text-sm text-gray-400">user@example.com</p>
                                    </div>
                                </div>
                            </div>
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
                                        className={`${
                                            activeSubTab === tab
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