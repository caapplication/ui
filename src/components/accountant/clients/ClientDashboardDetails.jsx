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

const ClientDashboardDetails = ({ client, teamMembers = [] }) => {
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
    
    const clientEmail = client.email;

    return (
        <div className="space-y-6">
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
                            {client.mobile || 'N/A'}
                            {client.mobile && <>
                                
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
                    <DetailItem label="City" value={client.city || 'N/A'} />
                    <DetailItem label="Pincode" value={client.postal_code || 'N/A'} />
                    <DetailItem label="State" value={client.state || 'N/A'} />
                </div>
                
                <div className="mt-6 pt-6 border-t border-white/10 grid grid-cols-1 md:grid-cols-3 gap-6">
                    <DetailItem label="Created By" value={teamMembers.find(m => m.user_id === client.created_by)?.name || 'Admin'} />
                    <DetailItem label="Created On" value={client.created_at ? format(new Date(client.created_at), 'dd MMM, yyyy') : 'N/A'} />
                </div>
            </div>
        </div>
    );
};

export default ClientDashboardDetails;
