import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { useToast } from '@/components/ui/use-toast';
import { Phone, MessageSquare, ExternalLink } from 'lucide-react';
import AllowLoginDialog from './AllowLoginDialog';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';

const StatCard = ({ title, value, valueClassName }) => (
    <Card className="bg-white/5 border-white/10 text-white">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-gray-400">{title}</CardTitle>
        </CardHeader>
        <CardContent>
            <div className={cn("text-2xl font-bold", valueClassName)}>{value}</div>
        </CardContent>
    </Card>
);

const DetailItem = ({ label, value, children }) => (
    <div>
        <p className="text-sm text-gray-400">{label}</p>
        <div className="font-medium text-white">{children || value}</div>
    </div>
);

const ClientDashboardDetails = ({ client }) => {
    const { toast } = useToast();
    const [showLoginDialog, setShowLoginDialog] = useState(false);

    const handleNotImplemented = () => {
        toast({
            title: "🚧 Feature Not Implemented",
            description: "This feature isn't implemented yet—but don't worry! You can request it in your next prompt! 🚀",
        });
    };

    const formatCurrency = (amount) => {
        return new Intl.NumberFormat('en-IN', {
            style: 'currency',
            currency: 'INR',
        }).format(amount);
    };

    const ledgerBalance = client.opening_balance?.amount || client.opening_balance_amount || 0;
    const ledgerBalanceType = client.opening_balance?.opening_balance_type || client.opening_balance_type;
    const balanceColor = ledgerBalanceType === 'credit' ? 'text-green-400' : ledgerBalanceType === 'debit' ? 'text-red-400' : 'text-white';
    
    const clientEmail = client.contact?.email || client.email;

    return (
        <div className="space-y-6">
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                <StatCard 
                    title="Ledger Balance" 
                    value={formatCurrency(ledgerBalance)} 
                    valueClassName={balanceColor}
                />
            </div>

            <div className="glass-pane p-6 rounded-lg">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    <DetailItem label="Status">
                        <Badge variant={client.is_active ? 'success' : 'destructive'}>{client.is_active ? 'Active' : 'Inactive'}</Badge>
                    </DetailItem>
                    <DetailItem label="Type" value={client.client_type} />
                    <DetailItem label="Contact Person" value={client.contact_person_name || 'N/A'} />
                    <DetailItem label="Date of Birth" value={client.dob || client.date_of_birth ? format(new Date(client.dob || client.date_of_birth), 'dd-MM-yyyy') : 'N/A'} />
                    <DetailItem label="PAN" value={client.pan || 'N/A'} />
                    <DetailItem label="Mobile No.">
                        <div className="flex items-center gap-2">
                            {client.contact?.mobile || client.mobile || 'N/A'}
                            {(client.contact?.mobile || client.mobile) && <>
                                <Phone className="w-3 h-3 text-green-400 cursor-pointer" onClick={handleNotImplemented} />
                                <MessageSquare className="w-3 h-3 text-blue-400 cursor-pointer" onClick={handleNotImplemented} />
                            </>}
                        </div>
                    </DetailItem>
                    <DetailItem label="Email">
                         {clientEmail ? (
                            <a href={`mailto:${clientEmail}`} className="flex items-center gap-1 text-blue-400 hover:underline">
                                {clientEmail}
                                <ExternalLink className="w-3 h-3" />
                            </a>
                         ) : 'N/A'}
                    </DetailItem>
                    <DetailItem label="City" value={client.contact?.city || client.city || 'N/A'} />
                    <DetailItem label="Pincode" value={client.contact?.postal_code || client.postal_code || 'N/A'} />
                    <DetailItem label="State" value={client.contact?.state || client.state || 'N/A'} />
                </div>
                
                <div className="mt-6 pt-6 border-t border-white/10 grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                        <div className="flex items-center justify-between">
                            <Label htmlFor="allow-login" className="font-medium text-white">Allow Login</Label>
                            <Button onClick={() => setShowLoginDialog(true)} disabled={!clientEmail}>Send Invite</Button>
                        </div>
                        <p className="text-sm text-gray-400 mt-2">Send an email notification to the client to configure their password and access their dashboard.</p>
                    </div>
                    <div>
                         <DetailItem label="Created By" value={client.created_by_name || 'Admin'} />
                         <DetailItem label="Created On" value={client.created_at ? format(new Date(client.created_at), 'dd MMM, yyyy') : 'N/A'} />
                    </div>
                </div>
            </div>
            
            <AllowLoginDialog 
                isOpen={showLoginDialog} 
                onClose={() => setShowLoginDialog(false)}
                client={{...client, email: clientEmail}}
            />
        </div>
    );
};

export default ClientDashboardDetails;