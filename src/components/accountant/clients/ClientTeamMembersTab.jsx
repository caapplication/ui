import React, { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { User, Mail, Phone, Search } from 'lucide-react';

const ClientTeamMembersTab = ({ client, teamMembers = [] }) => {
    const [searchTerm, setSearchTerm] = useState('');

    // Filter team members based on search term
    const filteredTeamMembers = useMemo(() => {
        if (!searchTerm.trim()) {
            return teamMembers;
        }
        
        const term = searchTerm.toLowerCase();
        return teamMembers.filter(member => {
            const name = (member.name || '').toLowerCase();
            const email = (member.email || '').toLowerCase();
            const phone = (member.phone || '').toLowerCase();
            const role = (member.role || '').toLowerCase();
            
            return name.includes(term) || 
                   email.includes(term) || 
                   phone.includes(term) || 
                   role.includes(term);
        });
    }, [teamMembers, searchTerm]);

    // Show all team members, with indication of which one is assigned
    if (teamMembers.length === 0) {
        return (
            <div className="glass-pane p-8 rounded-lg text-center">
                <User className="mx-auto w-12 h-12 text-gray-400 mb-4" />
                <h3 className="text-xl font-semibold text-white mb-2">No Team Members</h3>
                <p className="text-gray-400">No team members available.</p>
            </div>
        );
    }

    return (
        <div className="space-y-4">
            <Card className="glass-pane border-none shadow-none">
                <CardHeader>
                    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                        <CardTitle className="text-white">Team Members</CardTitle>
                        <div className="relative w-full sm:w-auto sm:min-w-[300px]">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                            <Input 
                                placeholder="Search team members..."
                                className="glass-input pl-10 bg-gray-700/50 border-gray-600 text-white"
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                            />
                        </div>
                    </div>
                </CardHeader>
                <CardContent>
                    {filteredTeamMembers.length === 0 ? (
                        <div className="text-center py-8">
                            <p className="text-gray-400">No team members found matching "{searchTerm}"</p>
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                            {filteredTeamMembers.map((member) => {
                            const memberUserId = member.user_id || member.id;
                            const isAssigned = client.assigned_ca_user_id && 
                                             memberUserId && 
                                             String(memberUserId) === String(client.assigned_ca_user_id);
                            
                            return (
                                <Card 
                                    key={member.user_id || member.id} 
                                    className={`bg-white/5 border-white/10 ${isAssigned ? 'ring-2 ring-green-500/50' : ''}`}
                                >
                                    <CardContent className="pt-6">
                                        <div className="flex items-center gap-4">
                                            <Avatar className="w-16 h-16 border-2 border-white/20">
                                                <AvatarImage src={member.photo || member.photo_url} alt={member.name || member.email} />
                                                <AvatarFallback className="bg-gradient-to-br from-sky-500 to-indigo-600 text-white">
                                                    {(member.name || member.email || 'U').charAt(0).toUpperCase()}
                                                </AvatarFallback>
                                            </Avatar>
                                            <div className="flex-1">
                                                <div className="flex items-center gap-2">
                                                    <h4 className="font-semibold text-white">
                                                        {member.name || member.email || 'Unknown User'}
                                                    </h4>
                                                    {isAssigned && (
                                                        <Badge variant="success" className="text-xs">Assigned</Badge>
                                                    )}
                                                </div>
                                                <div className="flex flex-col gap-1 mt-1">
                                                    {member.email && (
                                                        <div className="flex items-center gap-2 text-sm text-gray-400">
                                                            <Mail className="w-4 h-4" />
                                                            <span>{member.email}</span>
                                                        </div>
                                                    )}
                                                    {member.phone && (
                                                        <div className="flex items-center gap-2 text-sm text-gray-400">
                                                            <Phone className="w-4 h-4" />
                                                            <span>{member.phone}</span>
                                                        </div>
                                                    )}
                                                    {member.role && (
                                                        <Badge variant="secondary" className="w-fit mt-1">
                                                            {member.role}
                                                        </Badge>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    </CardContent>
                                </Card>
                            );
                        })}
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    );
};

export default ClientTeamMembersTab;

