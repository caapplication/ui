import React, { useState, useEffect, useRef } from 'react';
    import { Button } from '@/components/ui/button';
    import { Input } from '@/components/ui/input';
    import { Label } from '@/components/ui/label';
    import { Switch } from '@/components/ui/switch';
    import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
    import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
    import { Calendar } from '@/components/ui/calendar';
    import { DatePicker } from '@/components/ui/date-picker';
    import { ArrowLeft, CalendarPlus as CalendarIcon, Loader2, UploadCloud, User, X, Check } from 'lucide-react';
    import { format } from 'date-fns';
    import { cn } from '@/lib/utils';
    import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
    import { Textarea } from '@/components/ui/textarea.jsx';
    import { useToast } from '@/components/ui/use-toast';
    import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
    import { Badge } from '@/components/ui/badge';
    import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogClose } from '@/components/ui/dialog';
    import { createOrganisation } from '@/lib/api/organisation';
    import { useAuth } from '@/hooks/useAuth';
    
    
    const NewClientForm = ({ onBack, onSave, client, allServices, organisations, businessTypes, teamMembers, tags }) => {
        const { toast } = useToast();
        const { user } = useAuth();
        const [formData, setFormData] = useState({
            is_active: true,
            name: '',
            client_type: '',
            organization_id: '',
            pan: '',
            gstin: '',
            date_of_birth: null,
            contact_person_name: '',
            mobile: '',
            secondary_phone: '',
            email: '',
            address_line1: '',
            address_line2: '',
            city: '',
            state: '',
            postal_code: '',
            opening_balance_amount: '',
            opening_balance_type: 'credit',
            opening_balance_date: null,
            assigned_ca_user_id: '',
            tag_ids: [],
        });
    
    const [isSaving, setIsSaving] = useState(false);

    // State for Add Organisation dialog
    const [showAddOrgDialog, setShowAddOrgDialog] = useState(false);
    const [newOrgName, setNewOrgName] = useState('');
    const [isAddingOrg, setIsAddingOrg] = useState(false);

    // State for org popover open/close
    const [orgPopoverOpen, setOrgPopoverOpen] = useState(false);

    // Local org list update if onAddOrganisation not provided
    const [localOrgs, setLocalOrgs] = useState(organisations || []);
    const orgList = typeof onAddOrganisation === 'function' ? organisations : localOrgs;
    const addOrganisation = (org) => {
        if (typeof onAddOrganisation === 'function') {
            onAddOrganisation(org);
        } else {
            setLocalOrgs(prev => [...prev, org]);
        }
    };
    
        useEffect(() => {
            if (client) {
                setFormData({
                    is_active: client.is_active ?? true,
                    name: client.name || '',
                    client_type: client.client_type || '',
                    organization_id: client.organization_id || '',
                    pan: client.pan || '',
                    gstin: client.gstin || '',
                    date_of_birth: client.date_of_birth || client.dob ? new Date(client.date_of_birth || client.dob) : null,
                    contact_person_name: client.contact_person_name || '',
                    mobile: client.contact?.mobile || client.mobile || '',
                    secondary_phone: client.contact?.secondary_phone || '',
                    email: client.contact?.email || client.email || '',
                    address_line1: client.contact?.address_line1 || '',
                    address_line2: client.contact?.address_line2 || '',
                    city: client.contact?.city || client.city || '',
                    state: client.contact?.state || client.state || '',
                    postal_code: client.contact?.postal_code || client.postal_code || '',
                    opening_balance_amount: client.opening_balance?.amount || client.opening_balance_amount || '',
                    opening_balance_type: client.opening_balance?.opening_balance_type || client.opening_balance_type || 'credit',
                    opening_balance_date: client.opening_balance?.opening_balance_date || client.opening_balance_date ? new Date(client.opening_balance?.opening_balance_date || client.opening_balance_date) : null,
                    assigned_ca_user_id: client.assigned_ca_user_id || '',
                    tag_ids: Array.isArray(client.tags) ? client.tags.map(t => t.id) : (client.tag_ids || []),
                });
            }
        }, [client]);
    
        const handleChange = (e) => {
            const { name, value } = e.target;
            setFormData(prev => ({ ...prev, [name]: value }));
        };
    
        const handleSelectChange = (name, value) => {
            setFormData(prev => ({ ...prev, [name]: value }));
        };
        
        const handleMultiSelectChange = (name, value) => {
            setFormData(prev => {
                const newValues = prev[name].includes(value)
                    ? prev[name].filter(item => item !== value)
                    : [...prev[name], value];
                return { ...prev, [name]: newValues };
            });
        };
    
        const handleDateChange = (name, date) => {
            setFormData(prev => ({ ...prev, [name]: date }));
        };
    
        const handleSwitchChange = (name, checked) => {
            setFormData(prev => ({ ...prev, [name]: checked }));
        };
    
        const handleSubmit = async (e) => {
            e.preventDefault();
            setIsSaving(true);
            
            const dataToSave = {
                name: formData.name,
                client_type: formData.client_type,
                organization_id: formData.organization_id,
                pan: formData.pan,
                gstin: formData.gstin,
                dob: formData.date_of_birth ? format(formData.date_of_birth, 'yyyy-MM-dd') : null,
                assigned_ca_user_id: formData.assigned_ca_user_id || null,
                tag_ids: formData.tag_ids,
                is_active: formData.is_active,
                contact_person_name: formData.contact_person_name,
                date_of_birth: formData.date_of_birth ? format(formData.date_of_birth, 'yyyy-MM-dd') : null,
                contact: {
                    mobile: formData.mobile,
                    secondary_phone: formData.secondary_phone,
                    email: formData.email,
                    address_line1: formData.address_line1,
                    address_line2: formData.address_line2,
                    city: formData.city,
                    state: formData.state,
                    postal_code: formData.postal_code,
                },
                opening_balance: {
                    amount: formData.opening_balance_amount ? parseFloat(formData.opening_balance_amount) : 0,
                    opening_balance_type: formData.opening_balance_type,
                    opening_balance_date: formData.opening_balance_date ? format(formData.opening_balance_date, 'yyyy-MM-dd') : null,
                },
            };
    
            await onSave(dataToSave);
            setIsSaving(false);
        };
    
        const states = ["Andhra Pradesh", "Arunachal Pradesh", "Assam", "Bihar", "Chhattisgarh", "Goa", "Gujarat", "Haryana", "Himachal Pradesh", "Jharkhand", "Karnataka", "Kerala", "Madhya Pradesh", "Maharashtra", "Manipur", "Meghalaya", "Mizoram", "Nagaland", "Odisha", "Punjab", "Rajasthan", "Sikkim", "Tamil Nadu", "Telangana", "Tripura", "Uttar Pradesh", "Uttarakhand", "West Bengal", "Andaman and Nicobar Islands", "Chandigarh", "Dadra and Nagar Haveli and Daman and Diu", "Delhi", "Jammu and Kashmir", "Ladakh", "Lakshadweep", "Puducherry"];
    
        return (
            <div className="h-full flex flex-col">
                <header className="flex justify-between items-center mb-4 flex-shrink-0">
                    <div className="flex items-center gap-2">
                        <Button variant="ghost" size="icon" onClick={onBack}>
                            <ArrowLeft className="w-5 h-5" />
                        </Button>
                        <h1 className="text-2xl font-bold text-white">
                            <span className="text-gray-400 cursor-pointer hover:underline" onClick={onBack}>Clients / </span>
                            {client ? 'Edit Client' : 'New Client'}
                        </h1>
                    </div>
                    <div className="flex items-center gap-2">
                        <Button variant="outline" onClick={onBack}>Cancel</Button>
                        <Button onClick={handleSubmit} disabled={isSaving}>
                            {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            {client ? 'Save Changes' : 'Create Client'}
                        </Button>
                    </div>
                </header>
    
                <div className="flex-grow overflow-y-auto no-scrollbar pr-2">
                    <form onSubmit={handleSubmit} className="space-y-6">
                        
                        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                            <div className="lg:col-span-1 glass-pane p-6 rounded-lg flex flex-col items-center">
                                <h2 className="text-xl font-semibold mb-4 w-full">Client Status</h2>
                                 <div className="flex items-center space-x-2 pt-6 w-full justify-center">
                                    <Switch id="is_active" name="is_active" checked={formData.is_active} onCheckedChange={(c) => handleSwitchChange('is_active', c)} />
                                    <Label htmlFor="is_active">Client is Active</Label>
                                </div>
                            </div>
    
                            <div className="lg:col-span-2 glass-pane p-6 rounded-lg">
                                 <h2 className="text-xl font-semibold mb-4">Business Details</h2>
                                 <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <div>
                                        <Label htmlFor="name">Client Name*</Label>
                                        <Input id="name" name="name" value={formData.name} onChange={handleChange} required />
                                    </div>
                                    <div>
                                        <Label htmlFor="client_type">Client Type*</Label>
                                        <Select name="client_type" onValueChange={(v) => handleSelectChange('client_type', v)} value={formData.client_type} required>
                                            <SelectTrigger><SelectValue placeholder="Select type" /></SelectTrigger>
                                            <SelectContent>
                                                {businessTypes.map(type => <SelectItem key={type.id} value={type.name}>{type.name}</SelectItem>)}
                                            </SelectContent>
                                        </Select>
                                    </div>
                                    <div className="md:col-span-2">
                                        <Label htmlFor="organization_id">Group (Organisation)*</Label>
                                        <Popover open={orgPopoverOpen} onOpenChange={setOrgPopoverOpen}>
                                            <PopoverTrigger asChild>
                                                <Button variant="outline" className="w-full justify-start text-left font-normal">
                                                    {orgList.find(org => org.id === formData.organization_id)?.name || "Select organization"}
                                                </Button>
                                            </PopoverTrigger>
                                            <PopoverContent className="w-[--radix-popover-trigger-width] p-0 bg-glass/90 backdrop-blur border border-white/10 rounded-lg shadow-lg" align="start">
                                                <div className="p-2 border-b border-gray-700 flex items-center justify-between">
                                                    <span className="font-semibold">Select organisation</span>
                                                    <Button
                                                        size="sm"
                                                        variant="secondary"
                                                        onClick={() => setShowAddOrgDialog(true)}
                                                    >
                                                        + Add
                                                    </Button>
                                                </div>
                                                <Command>
                                                    <CommandInput placeholder="Search organizations..." />
                                                    <CommandList>
                                                        <CommandEmpty>No organizations found.</CommandEmpty>
                                                        <CommandGroup>
                                                            {orgList.map(org => (
                                                            <CommandItem
                                                                key={org.id}
                                                                onSelect={() => {
                                                                    handleSelectChange('organization_id', org.id);
                                                                    setOrgPopoverOpen(false);
                                                                }}
                                                            >
                                                                {org.name}
                                                            </CommandItem>
                                                            ))}
                                                        </CommandGroup>
                                                    </CommandList>
                                                </Command>
                                            </PopoverContent>
                                        </Popover>
                                        {/* Add Organisation Dialog */}
                                        <Dialog open={showAddOrgDialog} onOpenChange={setShowAddOrgDialog}>
                                            <DialogContent>
                                                <DialogHeader>
                                                    <DialogTitle>Add Organisation</DialogTitle>
                                                </DialogHeader>
                                                <div className="py-4">
                                                    <Label htmlFor="new_org_name">Organisation Name</Label>
                                                    <Input
                                                        id="new_org_name"
                                                        value={newOrgName}
                                                        onChange={e => setNewOrgName(e.target.value)}
                                                        className="mb-4 mt-2"
                                                        autoFocus
                                                    />
                                                </div>
                                                <DialogFooter>
                                                    <DialogClose asChild>
                                                        <Button variant="outline" onClick={() => setShowAddOrgDialog(false)}>Cancel</Button>
                                                    </DialogClose>
                                                    <Button
                                                        onClick={async () => {
                                                            if (!newOrgName.trim()) return;
                                                            setIsAddingOrg(true);
                                                            try {
                                                                // Call API to create org
                                                                const newOrg = await createOrganisation({ name: newOrgName }, user?.access_token);
                                                                toast({ title: "Organisation added", description: newOrg.name });
                                                                // Update org list and select new org
                                                                addOrganisation(newOrg);
                                                                handleSelectChange('organization_id', newOrg.id);
                                                                setShowAddOrgDialog(false);
                                                                setNewOrgName('');
                                                            } catch (err) {
                                                                toast({ title: "Error", description: err.message, variant: "destructive" });
                                                            } finally {
                                                                setIsAddingOrg(false);
                                                            }
                                                        }}
                                                        disabled={isAddingOrg}
                                                    >
                                                        {isAddingOrg ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                                                        Save
                                                    </Button>
                                                </DialogFooter>
                                            </DialogContent>
                                        </Dialog>
                                    </div>
                                     <div>
                                        <Label htmlFor="pan">PAN</Label>
                                        <Input id="pan" name="pan" value={formData.pan} onChange={handleChange} />
                                    </div>
                                    <div>
                                        <Label htmlFor="gstin">GSTIN</Label>
                                        <Input id="gstin" name="gstin" value={formData.gstin} onChange={handleChange} />
                                    </div>
                                    <div>
                                        <Label htmlFor="contact_person_name">Contact Person Name</Label>
                                        <Input id="contact_person_name" name="contact_person_name" value={formData.contact_person_name} onChange={handleChange} />
                                    </div>
                                    <div>
                                        <Label htmlFor="date_of_birth">Date of Establishment</Label>
                                        <DatePicker
                                            value={formData.date_of_birth}
                                            onChange={(d) => handleDateChange('date_of_birth', d)}
                                            captionLayout="dropdown-buttons"
                                            fromYear={1900}
                                            toYear={new Date().getFullYear()}
                                        />
                                    </div>
                                 </div>
                            </div>
                        </div>
    
                        <div className="glass-pane p-6 rounded-lg">
                            <h2 className="text-xl font-semibold mb-4">Contact & Address</h2>
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                 <div>
                                    <Label htmlFor="mobile">Mobile No.*</Label>
                                    <Input id="mobile" name="mobile" value={formData.mobile} onChange={handleChange} required />
                                </div>
                                <div>
                                    <Label htmlFor="secondary_phone">Secondary Phone</Label>
                                    <Input id="secondary_phone" name="secondary_phone" value={formData.secondary_phone} onChange={handleChange} />
                                </div>
                                <div>
                                    <Label htmlFor="email">Email</Label>
                                    <Input id="email" name="email" type="email" value={formData.email} onChange={handleChange} />
                                </div>
                                <div className="md:col-span-2 lg:col-span-3">
                                    <Label htmlFor="address_line1">Address Line 1</Label>
                                    <Input id="address_line1" name="address_line1" value={formData.address_line1} onChange={handleChange} />
                                </div>
                                 <div className="md:col-span-2 lg:col-span-3">
                                    <Label htmlFor="address_line2">Address Line 2</Label>
                                    <Input id="address_line2" name="address_line2" value={formData.address_line2} onChange={handleChange} />
                                </div>
                                <div>
                                    <Label htmlFor="city">City</Label>
                                    <Input id="city" name="city" value={formData.city} onChange={handleChange} />
                                </div>
                                <div>
                                    <Label htmlFor="state">State</Label>
                                    <Select name="state" onValueChange={(v) => handleSelectChange('state', v)} value={formData.state}>
                                        <SelectTrigger><SelectValue placeholder="Select state" /></SelectTrigger>
                                        <SelectContent>
                                            {states.map(state => <SelectItem key={state} value={state}>{state}</SelectItem>)}
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div>
                                    <Label htmlFor="postal_code">Postal Code</Label>
                                    <Input id="postal_code" name="postal_code" value={formData.postal_code} onChange={handleChange} />
                                </div>
                            </div>
                        </div>
    
    
                        <div className="glass-pane p-6 rounded-lg">
                            <h2 className="text-xl font-semibold mb-4">Assignments (Optional)</h2>
                             <p className="text-sm text-gray-400 mb-4">Assign team members and tags. This can also be done later.</p>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                 <div>
                                    <Label>Assigned CA</Label>
                                    <Select
                                        onValueChange={v => handleSelectChange('assigned_ca_user_id', v)}
                                        value={formData.assigned_ca_user_id ? String(formData.assigned_ca_user_id) : ""}
                                    >
                                        <SelectTrigger>
                                            <SelectValue>
                                                {formData.assigned_ca_user_id
                                                    ? (
                                                        teamMembers.find(m => String(m.user_id) === String(formData.assigned_ca_user_id))?.name ||
                                                        teamMembers.find(m => String(m.user_id) === String(formData.assigned_ca_user_id))?.email ||
                                                        "Select a team member"
                                                    )
                                                    : "Select a team member"}
                                            </SelectValue>
                                        </SelectTrigger>
                                        <SelectContent>
                                           {teamMembers && teamMembers.length > 0 ? (
                                               teamMembers.map(member => (
                                                   <SelectItem key={member.user_id} value={String(member.user_id)}>{member.name || member.email}</SelectItem>
                                               ))
                                           ) : (
                                               <SelectItem value="no-members" disabled>No team members found</SelectItem>
                                           )}
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div>
                                    <Label>Tags</Label>
                                     <Popover>
                                        <PopoverTrigger asChild>
                                            <Button variant="outline" className="w-full justify-start">
                                                <div className="flex gap-1 flex-wrap">
                                                    {formData.tag_ids.map(tagId => {
                                                        const tag = tags.find(t => t.id === tagId);
                                                        return <Badge key={tagId} variant="secondary">{tag?.name}</Badge>;
                                                    })}
                                                    {formData.tag_ids.length === 0 && 'Select tags'}
                                                </div>
                                            </Button>
                                        </PopoverTrigger>
                                        <PopoverContent className="w-[--radix-popover-trigger-width] p-0" align="start">
                                            <Command>
                                                <CommandInput placeholder="Search tags..." />
                                                <CommandList>
                                                    <CommandEmpty>No tags found.</CommandEmpty>
                                                    <CommandGroup>
                                                        {tags && tags.map(tag => (
                                                            <CommandItem
                                                                key={tag.id}
                                                                onSelect={() => handleMultiSelectChange('tag_ids', tag.id)}
                                                            >
                                                                <Check className={cn("mr-2 h-4 w-4", formData.tag_ids.includes(tag.id) ? "opacity-100" : "opacity-0")} />
                                                                {tag.name}
                                                            </CommandItem>
                                                        ))}
                                                    </CommandGroup>
                                                </CommandList>
                                            </Command>
                                        </PopoverContent>
                                    </Popover>
                                </div>
                            </div>
                        </div>
                    </form>
                </div>
            </div>
        );
    };
    
    export default NewClientForm;
