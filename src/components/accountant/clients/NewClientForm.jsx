import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { DatePicker } from '@/components/ui/date-picker';
import { ArrowLeft, CalendarPlus as CalendarIcon, Loader2, UploadCloud, User, X, Check, Camera, Trash2, Edit2, Plus } from 'lucide-react';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Textarea } from '@/components/ui/textarea.jsx';
import { useToast } from '@/components/ui/use-toast';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogClose } from '@/components/ui/dialog';
import { createOrganisation, updateOrganisation, deleteOrganisation } from '@/lib/api/organisation';
import { useAuth } from '@/hooks/useAuth';
import Cropper from 'react-easy-crop';


// Helper function to create image from URL
const createImage = (url) =>
    new Promise((resolve, reject) => {
        const image = new Image();
        image.addEventListener('load', () => resolve(image));
        image.addEventListener('error', (error) => reject(error));
        image.setAttribute('crossOrigin', 'anonymous');
        image.src = url;
    });

// Helper function to get cropped image
const getCroppedImg = async (imageSrc, pixelCrop) => {
    const image = await createImage(imageSrc);
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');

    canvas.width = pixelCrop.width;
    canvas.height = pixelCrop.height;

    ctx.drawImage(
        image,
        pixelCrop.x,
        pixelCrop.y,
        pixelCrop.width,
        pixelCrop.height,
        0,
        0,
        pixelCrop.width,
        pixelCrop.height
    );

    return new Promise((resolve) => {
        canvas.toBlob((blob) => {
            resolve(blob);
        }, 'image/jpeg', 0.95);
    });
};



const NewClientForm = ({ onBack, onSave, client, allServices, organisations, businessTypes, teamMembers, tags, onAddOrganisation }) => {
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
        notify_client: false,
        gst_autofill_enabled: false,
        users: [],
    });

    const [isSaving, setIsSaving] = useState(false);
    const [photoFile, setPhotoFile] = useState(null);
    const [photoPreview, setPhotoPreview] = useState(null);
    const [photoBlobUrl, setPhotoBlobUrl] = useState(null);
    const [isPhotoLoading, setIsPhotoLoading] = useState(false);
    const fileInputRef = useRef(null);
    const photoFileInputRef = useRef(null);

    // Crop dialog states
    const [showCropDialog, setShowCropDialog] = useState(false);
    const [imageToCrop, setImageToCrop] = useState(null);
    const [crop, setCrop] = useState({ x: 0, y: 0 });
    const [zoom, setZoom] = useState(1);
    const [croppedAreaPixels, setCroppedAreaPixels] = useState(null);

    // State for Add Organisation dialog
    const [showAddOrgDialog, setShowAddOrgDialog] = useState(false);
    const [newOrgName, setNewOrgName] = useState('');
    const [isAddingOrg, setIsAddingOrg] = useState(false);

    // State for Edit Organisation dialog
    const [showEditOrgDialog, setShowEditOrgDialog] = useState(false);
    const [editingOrg, setEditingOrg] = useState(null);
    const [editOrgName, setEditOrgName] = useState('');
    const [isEditingOrg, setIsEditingOrg] = useState(false);

    // State for Delete Organisation dialog
    const [showDeleteOrgDialog, setShowDeleteOrgDialog] = useState(false);
    const [deletingOrg, setDeletingOrg] = useState(null);
    const [isDeletingOrg, setIsDeletingOrg] = useState(false);

    // State for org popover open/close
    const [orgPopoverOpen, setOrgPopoverOpen] = useState(false);

    // Local org list update
    // We initialize localOrgs with organisations prop, but then allow local edits to override/extend it.
    // If organisations prop changes (e.g. parent refresh), we update localOrgs unless we have unsaved local changes?
    // For simplicity, we sync when prop changes.
    const [localOrgs, setLocalOrgs] = useState(organisations || []);

    useEffect(() => {
        if (organisations) {
            setLocalOrgs(organisations);
        }
    }, [organisations]);

    // Use localOrgs as the source for the dropdown to reflect immediate edits
    const orgList = localOrgs;

    const addOrganisation = (org) => {
        setLocalOrgs(prev => [...prev, org]);
        if (typeof onAddOrganisation === 'function') {
            onAddOrganisation(org);
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
                secondary_phone: client.contact?.secondary_phone || client.secondary_phone || '',
                email: client.contact?.email || client.email || '',
                address_line1: client.contact?.address_line1 || client.address_line1 || '',
                address_line2: client.contact?.address_line2 || client.address_line2 || '',
                city: client.contact?.city || client.city || '',
                state: client.contact?.state || client.state || '',
                postal_code: client.contact?.postal_code || client.postal_code || '',
                opening_balance_amount: client.opening_balance?.amount || client.opening_balance_amount || '',
                opening_balance_type: client.opening_balance?.opening_balance_type || client.opening_balance_type || 'credit',
                opening_balance_date: client.opening_balance?.opening_balance_date || client.opening_balance_date ? new Date(client.opening_balance?.opening_balance_date || client.opening_balance_date) : null,
                assigned_ca_user_id: client.assigned_ca_user_id || '',
                tag_ids: Array.isArray(client.tags) ? client.tags.map(t => t.id) : (client.tag_ids || []),
                notify_client: client.notify_client ?? false,
                gst_autofill_enabled: client.gst_autofill_enabled ?? false,
                users: Array.isArray(client.users) ? client.users : [],
            });
        }
    }, [client]);

    // Fetch photo as blob with authentication (optimized to reduce delay)
    useEffect(() => {
        // Cleanup previous blob URL
        if (photoBlobUrl && photoBlobUrl.startsWith('blob:')) {
            URL.revokeObjectURL(photoBlobUrl);
        }

        if (client?.id && user?.access_token && !photoPreview) {
            setIsPhotoLoading(true);
            const clientApiUrl = import.meta.env.VITE_CLIENT_API_URL || 'http://127.0.0.1:8002';
            // Use cache-busting with updated_at timestamp if available
            const updateTimestamp = client.updated_at ? new Date(client.updated_at).getTime() : Date.now();
            const photoEndpoint = `${clientApiUrl}/clients/${client.id}/photo?t=${updateTimestamp}`;

            // Always fetch from the endpoint with authentication (simplified approach)
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
                    // If 404, there's no photo - that's OK
                    if (response.status === 404) {
                        setPhotoBlobUrl(null);
                        setIsPhotoLoading(false);
                        return null;
                    }
                    throw new Error(`Failed to fetch photo: ${response.status}`);
                })
                .then(blob => {
                    if (blob) {
                        const url = URL.createObjectURL(blob);
                        setPhotoBlobUrl(url);
                    }
                    setIsPhotoLoading(false);
                })
                .catch(err => {
                    console.error('Error loading client photo:', err);
                    setPhotoBlobUrl(null);
                    setIsPhotoLoading(false);
                });
        } else {
            setPhotoBlobUrl(null);
            setIsPhotoLoading(false);
        }
    }, [client?.id, client?.updated_at, user?.access_token, user?.agency_id, photoPreview]);

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

    const handleEditOrg = async () => {
        if (!editOrgName.trim() || !editingOrg) return;
        setIsEditingOrg(true);
        try {
            const updatedOrg = await updateOrganisation(editingOrg.id, { name: editOrgName }, user?.access_token);
            toast({ title: "Organisation updated", description: updatedOrg.name });

            // Update local list
            setLocalOrgs(prev => prev.map(o => o.id === updatedOrg.id ? updatedOrg : o));

            // If the updated org was selected, update the form data display
            if (formData.organization_id === updatedOrg.id && typeof onAddOrganisation === 'function') {
                // Trigger parent update if needed, or rely on local re-render
                // Since orgList is derived, we need to ensure parent state is updated if orgList comes from props
                // If orgList comes from props, we can't update it directly here unless parent provides a setter.
                // However, for now, we assume localOrgs is used or parent updates. 
                // If 'organisations' prop is passed, we might not be able to update it without a callback.
                // But valid pattern is usually to request refresh. 
                // For now, let's assume we can only update local state if we have control, 
                // or maybe we should trigger a refresh callback if available?
                // The prompt implies we should just make it work. 
                // If organisations is passed from parent, we can't mutate it. 
                // We'll rely on addOrganisation callback if it supports updates, or specific update callback?
                // Current implementation of addOrganisation only adds. 
                // Let's assume for this feature we might need to rely on parent refresh or just update local view if possible.
                // Wait, `orgList` switches between `organisations` prop and `localOrgs` state.
                // We should probably emit an event or call a prop if it exists.
                // But for this task, the most robust way is to try to update `localOrgs` AND 
                // if parent provided `organisations`, we might be out of sync unless we reload.
                // Let's modify `onAddOrganisation` to be generic `onUpdateOrganisation`?
                // Or we just update `localOrgs` and hope `organisations` prop isn't strictly controlled without update mechanism.
                // Actually, `NewClientForm` seems to use `orgList` for display.
                // If `organisations` prop is provided, `localOrgs` is ignored unless we merge/override.
                // To properly support this, we should really be using `localOrgs` initialized from props and then managing it locally,
                // OR asking parent to refresh.
                // Given the constraints, I will update a local "override" or just assume `localOrgs` is the way if I can.
                // BUT `orgList` definition: `const orgList = typeof onAddOrganisation === 'function' ? organisations : localOrgs;`
                // This means if `onAddOrganisation` is passed (which it likely is), we work with props.
                // So we can't update the list locally easily.
                // I will blindly call `addOrganisation` for update? No.
                // I'll add a check: if we are in "props mode", we might need to reload the page or `fetchUsers`.
                // But wait, the user wants "instantly edit/delete".
                // So I really need to update the list the UI sees.
                // I will change `orgList` to ALWAYS combine props and local changes? 
                // Or better: I will use a local state `effectiveOrgList` initialized from props, and keep it in sync.

                // Let's simple hack: Force `localOrgs` to take over if we edit? 
                // No, that's messy. 
                // Correct logic: 
                // 1. `useEffect` to sync `localOrgs` with `organisations` prop.
                // 2. Always use `localOrgs` for rendering.
                // 3. `onAddOrganisation` can still be called to notify parent.

                // I'll rewrite the component to use `localOrgs` as the source of truth for the dropdown, initialized from props.
            }
            // Logic to update the list used in render:
            // Since I can't easily change the architecture in one go, I'll modify `orgList` logic slightly 
            // to allow local overrides if I can, OR just assume `localOrgs` is enough if I use it.
            // Actually, lines 143-144:
            // `const [localOrgs, setLocalOrgs] = useState(organisations || []);`
            // `const orgList = typeof onAddOrganisation === 'function' ? organisations : localOrgs;`

            // I will change this to:
            // `const [localOrgs, setLocalOrgs] = useState(organisations || []);`
            // `useEffect(() => { if(organisations) setLocalOrgs(organisations); }, [organisations]);`
            // `const orgList = localOrgs;`
            // This allows me to locally mutate the list for UI purposes while still respecting props updates.

            // But I can't do that inside this `handleEditOrg` function block.
            // So I will make a separate `replace_file_content` for that setup change.
            // For now, I will write the handler assuming `setLocalOrgs` works and I'll fix the state sourcing in the next chunk.

            setShowEditOrgDialog(false);
            setEditingOrg(null);
            setEditOrgName('');
        } catch (err) {
            toast({ title: "Error", description: err.message, variant: "destructive" });
        } finally {
            setIsEditingOrg(false);
        }
    };

    const handleDeleteOrg = async () => {
        if (!deletingOrg) return;
        setIsDeletingOrg(true);
        try {
            await deleteOrganisation(deletingOrg.id, user?.access_token);
            toast({ title: "Organisation deleted", description: deletingOrg.name });

            // Update local list
            setLocalOrgs(prev => prev.filter(o => o.id !== deletingOrg.id));

            // If deleted org was selected, clear selection
            if (formData.organization_id === deletingOrg.id) {
                handleSelectChange('organization_id', '');
            }

            setShowDeleteOrgDialog(false);
            setDeletingOrg(null);
        } catch (err) {
            toast({ title: "Error", description: err.message, variant: "destructive" });
        } finally {
            setIsDeletingOrg(false);
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();

        const requiredFields = {
            name: "Client Name",
            client_type: "Client Type",
            organization_id: "Group (Organisation)",
            mobile: "Mobile No.",
            email: "Email"
        };

        for (const [field, name] of Object.entries(requiredFields)) {
            if (!formData[field]) {
                toast({
                    title: "Missing Information",
                    description: `${name} is a required field.`,
                    variant: "destructive",
                });
                return;
            }
        }

        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(formData.email)) {
            toast({
                title: "Invalid Email",
                description: "Please enter a valid email address.",
                variant: "destructive",
            });
            return;
        }

        setIsSaving(true);

        // Flatten contact and opening_balance fields to match backend expectations
        const dataToSave = {
            is_active: formData.is_active,
            name: formData.name,
            client_type: formData.client_type,
            organization_id: formData.organization_id,
            pan: formData.pan,
            gstin: formData.gstin,
            contact_person_name: formData.contact_person_name,
            date_of_birth: formData.date_of_birth ? format(formData.date_of_birth, 'yyyy-MM-dd') : null,
            user_ids: [], // You may want to populate this if needed
            tag_ids: formData.tag_ids,
            mobile: formData.mobile,
            secondary_phone: formData.secondary_phone,
            email: formData.email,
            address_line1: formData.address_line1,
            address_line2: formData.address_line2,
            city: formData.city,
            postal_code: formData.postal_code,
            state: formData.state,
            opening_balance_date: formData.opening_balance_date ? format(formData.opening_balance_date, 'yyyy-MM-dd') : null,
            opening_balance_amount: formData.opening_balance_amount ? parseFloat(formData.opening_balance_amount) : 0,
            assigned_ca_user_id: (formData.assigned_ca_user_id && formData.assigned_ca_user_id !== "undefined") ? formData.assigned_ca_user_id : null,
        };

        // Find organisation name to pass to parent for immediate UI update
        // Use orgList which is correctly resolved to either props.organisations or localOrgs
        // NOTE: orgList might be stale if I only updated localOrgs but used props.organisations
        // I will fix orgList definition in next step.
        if (formData.organization_id) {
            const selectedOrg = (organisations || localOrgs).find(o => String(o.id) === String(formData.organization_id));
            if (selectedOrg) {
                // Pass as a special property that parental component can use but should likely strip before API call if strict
                dataToSave.organization_name = selectedOrg.name;
            }
        }

        await onSave(dataToSave, photoFile);
        setIsSaving(false);
        // Reset photo after save and cleanup blob URLs
        setPhotoFile(null);
        setPhotoPreview(null);
        // Cleanup blob URL if it exists
        if (photoBlobUrl && photoBlobUrl.startsWith('blob:')) {
            URL.revokeObjectURL(photoBlobUrl);
        }
        setPhotoBlobUrl(null);
    };

    const states = ["Andhra Pradesh", "Arunachal Pradesh", "Assam", "Bihar", "Chhattisgarh", "Goa", "Gujarat", "Haryana", "Himachal Pradesh", "Jharkhand", "Karnataka", "Kerala", "Madhya Pradesh", "Maharashtra", "Manipur", "Meghalaya", "Mizoram", "Nagaland", "Odisha", "Punjab", "Rajasthan", "Sikkim", "Tamil Nadu", "Telangana", "Tripura", "Uttar Pradesh", "Uttarakhand", "West Bengal", "Andaman and Nicobar Islands", "Chandigarh", "Dadra and Nagar Haveli and Daman and Diu", "Delhi", "Jammu and Kashmir", "Ladakh", "Lakshadweep", "Puducherry"];

    // Callback when crop area changes
    const onCropComplete = useCallback((croppedArea, croppedAreaPixels) => {
        setCroppedAreaPixels(croppedAreaPixels);
    }, []);

    // Handle saving cropped image
    const handleSaveCrop = async () => {
        try {
            const croppedBlob = await getCroppedImg(imageToCrop, croppedAreaPixels);
            const croppedFile = new File([croppedBlob], 'profile.jpg', { type: 'image/jpeg' });

            setPhotoFile(croppedFile);
            const croppedUrl = URL.createObjectURL(croppedBlob);
            setPhotoPreview(croppedUrl);
            setShowCropDialog(false);
            setImageToCrop(null);
        } catch (error) {
            console.error('Error cropping image:', error);
            toast({
                title: "Error",
                description: "Failed to crop image. Please try again.",
                variant: "destructive",
            });
        }
    };

    // Handle canceling crop
    const handleCancelCrop = () => {
        setShowCropDialog(false);
        setImageToCrop(null);
        setCrop({ x: 0, y: 0 });
        setZoom(1);
        setCroppedAreaPixels(null);
    };

    return (
        <div className="h-full flex flex-col">
            <header className="flex justify-between items-center mb-4 flex-shrink-0">
                <div className="flex items-center gap-2">
                    <Button variant="ghost" size="icon" onClick={onBack} disabled={isSaving}>
                        <ArrowLeft className="w-5 h-5" />
                    </Button>
                    <h1 className="text-2xl font-bold text-white">
                        {client ? (
                            <>
                                <span className="text-gray-400 cursor-pointer hover:underline" onClick={onBack}>Clients / </span>
                                Edit Client
                            </>
                        ) : (
                            'Client Onboarding'
                        )}
                    </h1>
                </div>
                <div className="flex items-center gap-2">
                    <Button variant="outline" onClick={onBack} disabled={isSaving}>Cancel</Button>
                    <Button onClick={handleSubmit} disabled={isSaving} style={isSaving ? { opacity: 0.5, pointerEvents: 'none' } : {}}>
                        {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        {client ? 'Save Changes' : 'Create Client'}
                    </Button>
                </div>
            </header>

            <div className="flex-grow overflow-y-auto no-scrollbar pr-2">
                <form onSubmit={handleSubmit} className="space-y-6">

                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                        <div className="lg:col-span-1 glass-pane p-6 rounded-lg flex flex-col items-center">
                            <h2 className="text-xl font-semibold mb-4 w-full">Client Photo</h2>
                            <div className="relative mb-4">
                                <Avatar className="w-32 h-32 text-4xl border-4 border-white/20">
                                    <AvatarImage
                                        src={photoPreview || photoBlobUrl || (client?.photo_url && client.photo_url.includes('.s3.amazonaws.com/') && client?.id
                                            ? `${import.meta.env.VITE_CLIENT_API_URL || 'http://127.0.0.1:8002'}/clients/${client.id}/photo`
                                            : (client?.photo_url || client?.photo))}
                                        alt={formData.name || 'Client'}
                                        key={`client-photo-${client?.id}-${client?.photo_url || 'no-photo'}-${Date.now()}`}
                                        onError={(e) => {
                                            console.error('Failed to load client photo:', e);
                                            setPhotoBlobUrl(null);
                                            setIsPhotoLoading(false);
                                        }}
                                        onLoad={() => {
                                            setIsPhotoLoading(false);
                                        }}
                                    />
                                    <AvatarFallback className="bg-gradient-to-br from-sky-500 to-indigo-600 text-white">
                                        {formData.name?.charAt(0).toUpperCase() || 'C'}
                                    </AvatarFallback>
                                </Avatar>
                                {/* Loading overlay */}
                                {isPhotoLoading && !photoPreview && (
                                    <div className="absolute inset-0 flex items-center justify-center bg-black/30 rounded-full">
                                        <Loader2 className="w-10 h-10 text-white animate-spin" />
                                    </div>
                                )}
                                <div className="absolute bottom-1 right-1 flex gap-2">
                                    <Button
                                        type="button"
                                        size="icon"
                                        className="rounded-full w-10 h-10 bg-white/20 text-white hover:bg-white/30 backdrop-blur-sm border border-white/30"
                                        onClick={() => photoFileInputRef.current?.click()}
                                        disabled={isSaving}
                                    >
                                        <Camera className="w-5 h-5" />
                                    </Button>
                                    {(photoPreview || client?.photo_url || client?.photo) && (
                                        <Button
                                            type="button"
                                            size="icon"
                                            className="rounded-full w-10 h-10 bg-red-500/20 text-white hover:bg-red-500/30 backdrop-blur-sm border border-red-500/30"
                                            onClick={() => {
                                                setPhotoFile(null);
                                                setPhotoPreview(null);
                                            }}
                                            disabled={isSaving}
                                        >
                                            <Trash2 className="w-5 h-5" />
                                        </Button>
                                    )}
                                </div>
                                <Input
                                    type="file"
                                    ref={photoFileInputRef}
                                    className="hidden"
                                    accept="image/*"
                                    onChange={(e) => {
                                        const file = e.target.files?.[0];
                                        if (file) {
                                            const reader = new FileReader();
                                            reader.onloadend = () => {
                                                setImageToCrop(reader.result);
                                                setShowCropDialog(true);
                                            };
                                            reader.readAsDataURL(file);
                                        }
                                        // Reset input so same file can be selected again
                                        e.target.value = '';
                                    }}
                                />
                            </div>
                            <h2 className="text-xl font-semibold mb-4 w-full mt-4">Client Status</h2>
                            <div className="flex flex-col gap-4 pt-6 w-full justify-center">
                                <div className="flex items-center space-x-2">
                                    <Switch id="is_active" name="is_active" checked={formData.is_active} onCheckedChange={(c) => handleSwitchChange('is_active', c)} disabled={isSaving} />
                                    <Label htmlFor="is_active">Client is Active</Label>
                                </div>
                                <div className="flex items-center space-x-2">
                                    <Switch id="notify_client" name="notify_client" checked={formData.notify_client} onCheckedChange={(c) => handleSwitchChange('notify_client', c)} disabled={isSaving} />
                                    <Label htmlFor="notify_client">Notify Client</Label>
                                </div>
                                <div className="flex items-center space-x-2">
                                    <Switch id="gst_autofill_enabled" name="gst_autofill_enabled" checked={formData.gst_autofill_enabled} onCheckedChange={(c) => handleSwitchChange('gst_autofill_enabled', c)} disabled={isSaving} />
                                    <Label htmlFor="gst_autofill_enabled">GST Autofill Enabled</Label>
                                </div>
                            </div>
                        </div>

                        <div className="lg:col-span-2 glass-pane p-6 rounded-lg">
                            <h2 className="text-xl font-semibold mb-4">Business Details</h2>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div>
                                    <Label htmlFor="name">Client Name*</Label>
                                    <Input id="name" name="name" value={formData.name} onChange={handleChange} required disabled={isSaving} />
                                </div>
                                <div>
                                    <Label htmlFor="client_type">Client Type*</Label>
                                    <Select name="client_type" onValueChange={(v) => handleSelectChange('client_type', v)} value={formData.client_type} required disabled={isSaving}>
                                        <SelectTrigger><SelectValue placeholder="Select type" /></SelectTrigger>
                                        <SelectContent>
                                            {businessTypes && businessTypes.length > 0 ? (
                                                businessTypes.map(type => <SelectItem key={type.id} value={String(type.id)}>{type.name}</SelectItem>)
                                            ) : (
                                                <SelectItem value="no-types" disabled>No business types available. Please add one in Settings.</SelectItem>
                                            )}
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div className="md:col-span-2">
                                    <Label htmlFor="organization_id">Group (Organisation)*</Label>
                                    <Popover open={orgPopoverOpen} onOpenChange={setOrgPopoverOpen}>
                                        <PopoverTrigger asChild>
                                            <Button variant="outline" className="w-full justify-start text-left font-normal" disabled={isSaving}>
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
                                                                className="flex items-center justify-between group"
                                                            >
                                                                <span>{org.name}</span>
                                                                <div className="flex items-center gap-1 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity">
                                                                    <Button
                                                                        variant="ghost"
                                                                        size="icon"
                                                                        className="h-6 w-6 p-0 hover:bg-white/20"
                                                                        onClick={(e) => {
                                                                            e.stopPropagation();
                                                                            setEditingOrg(org);
                                                                            setEditOrgName(org.name);
                                                                            setShowEditOrgDialog(true);
                                                                        }}
                                                                    >
                                                                        <Edit2 className="h-3 w-3 text-blue-400" />
                                                                    </Button>
                                                                    <Button
                                                                        variant="ghost"
                                                                        size="icon"
                                                                        className="h-6 w-6 p-0 hover:bg-white/20"
                                                                        onClick={(e) => {
                                                                            e.stopPropagation();
                                                                            setDeletingOrg(org);
                                                                            setShowDeleteOrgDialog(true);
                                                                        }}
                                                                    >
                                                                        <Trash2 className="h-3 w-3 text-red-400" />
                                                                    </Button>
                                                                </div>
                                                            </CommandItem>
                                                        ))}
                                                    </CommandGroup>
                                                </CommandList>
                                            </Command>
                                        </PopoverContent>
                                    </Popover>
                                    {/* Add Organisation Dialog */}
                                    <Dialog open={showAddOrgDialog} onOpenChange={setShowAddOrgDialog}>
                                        <DialogContent closeDisabled={isAddingOrg}>
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
                                                            // Use new implementation of addOrganisation that updates localOrgs
                                                            setLocalOrgs(prev => [...prev, newOrg]);
                                                            if (typeof onAddOrganisation === 'function') {
                                                                onAddOrganisation(newOrg);
                                                            }

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

                                    {/* Edit Organisation Dialog */}
                                    <Dialog open={showEditOrgDialog} onOpenChange={setShowEditOrgDialog}>
                                        <DialogContent closeDisabled={isEditingOrg}>
                                            <DialogHeader>
                                                <DialogTitle>Edit Organisation</DialogTitle>
                                            </DialogHeader>
                                            <div className="py-4">
                                                <Label htmlFor="edit_org_name">Organisation Name</Label>
                                                <Input
                                                    id="edit_org_name"
                                                    value={editOrgName}
                                                    onChange={e => setEditOrgName(e.target.value)}
                                                    className="mb-4 mt-2"
                                                    autoFocus
                                                />
                                            </div>
                                            <DialogFooter>
                                                <DialogClose asChild>
                                                    <Button variant="outline" onClick={() => setShowEditOrgDialog(false)} disabled={isEditingOrg}>Cancel</Button>
                                                </DialogClose>
                                                <Button
                                                    onClick={handleEditOrg}
                                                    disabled={isEditingOrg || !editOrgName.trim()}
                                                >
                                                    {isEditingOrg ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                                                    Save Changes
                                                </Button>
                                            </DialogFooter>
                                        </DialogContent>
                                    </Dialog>

                                    {/* Delete Organisation Dialog */}
                                    <Dialog open={showDeleteOrgDialog} onOpenChange={setShowDeleteOrgDialog}>
                                        <DialogContent closeDisabled={isDeletingOrg}>
                                            <DialogHeader>
                                                <DialogTitle>Delete Organisation</DialogTitle>
                                            </DialogHeader>
                                            <div className="py-4 text-white">
                                                <p>Are you sure you want to delete <span className="font-bold">{deletingOrg?.name}</span>?</p>
                                                <p className="text-sm text-gray-400 mt-2">This action cannot be undone.</p>
                                            </div>
                                            <DialogFooter>
                                                <DialogClose asChild>
                                                    <Button variant="outline" onClick={() => setShowDeleteOrgDialog(false)} disabled={isDeletingOrg}>Cancel</Button>
                                                </DialogClose>
                                                <Button
                                                    variant="destructive"
                                                    onClick={handleDeleteOrg}
                                                    disabled={isDeletingOrg}
                                                >
                                                    {isDeletingOrg ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                                                    Delete
                                                </Button>
                                            </DialogFooter>
                                        </DialogContent>
                                    </Dialog>
                                </div>
                                <div>
                                    <Label htmlFor="pan">PAN</Label>
                                    <Input id="pan" name="pan" value={formData.pan} onChange={handleChange} disabled={isSaving} />
                                </div>
                                <div>
                                    <Label htmlFor="gstin">GSTIN</Label>
                                    <Input id="gstin" name="gstin" value={formData.gstin} onChange={handleChange} disabled={isSaving} />
                                </div>
                                <div>
                                    <Label htmlFor="contact_person_name">Contact Person Name</Label>
                                    <Input id="contact_person_name" name="contact_person_name" value={formData.contact_person_name} onChange={handleChange} disabled={isSaving} />
                                </div>
                                <div>
                                    <Label htmlFor="date_of_birth">Date of Establishment</Label>
                                    <DatePicker
                                        value={formData.date_of_birth}
                                        onChange={(d) => handleDateChange('date_of_birth', d)}
                                        captionLayout="dropdown-buttons"
                                        fromYear={1900}
                                        toYear={new Date().getFullYear()}
                                        disabled={isSaving}
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
                                <Input id="mobile" name="mobile" value={formData.mobile} onChange={handleChange} required disabled={isSaving} />
                            </div>
                            <div>
                                <Label htmlFor="secondary_phone">Secondary Phone</Label>
                                <Input id="secondary_phone" name="secondary_phone" value={formData.secondary_phone} onChange={handleChange} disabled={isSaving} />
                            </div>
                            <div>
                                <Label htmlFor="email">Email*</Label>
                                <Input id="email" name="email" type="email" value={formData.email} onChange={handleChange} required disabled={isSaving} />
                            </div>
                            <div className="md:col-span-2 lg:col-span-3">
                                <Label htmlFor="address_line1">Address Line 1</Label>
                                <Input id="address_line1" name="address_line1" value={formData.address_line1} onChange={handleChange} disabled={isSaving} />
                            </div>
                            <div className="md:col-span-2 lg:col-span-3">
                                <Label htmlFor="address_line2">Address Line 2</Label>
                                <Input id="address_line2" name="address_line2" value={formData.address_line2} onChange={handleChange} disabled={isSaving} />
                            </div>
                            <div>
                                <Label htmlFor="city">City</Label>
                                <Input id="city" name="city" value={formData.city} onChange={handleChange} disabled={isSaving} />
                            </div>
                            <div>
                                <Label htmlFor="state">State</Label>
                                <Select name="state" onValueChange={(v) => handleSelectChange('state', v)} value={formData.state} disabled={isSaving}>
                                    <SelectTrigger><SelectValue placeholder="Select state" /></SelectTrigger>
                                    <SelectContent>
                                        {states.map(state => <SelectItem key={state} value={state}>{state}</SelectItem>)}
                                    </SelectContent>
                                </Select>
                            </div>
                            <div>
                                <Label htmlFor="postal_code">Postal Code</Label>
                                <Input id="postal_code" name="postal_code" value={formData.postal_code} onChange={handleChange} disabled={isSaving} />
                            </div>
                        </div>
                    </div>




                </form>
            </div>

            {/* Image Crop Dialog */}
            <Dialog open={showCropDialog} onOpenChange={setShowCropDialog}>
                <DialogContent className="max-w-2xl">
                    <DialogHeader>
                        <DialogTitle>Crop Profile Photo</DialogTitle>
                    </DialogHeader>
                    <div className="relative w-full h-96 bg-black rounded-lg">
                        {imageToCrop && (
                            <Cropper
                                image={imageToCrop}
                                crop={crop}
                                zoom={zoom}
                                aspect={1}
                                cropShape="round"
                                showGrid={false}
                                onCropChange={setCrop}
                                onZoomChange={setZoom}
                                onCropComplete={onCropComplete}
                                restrictPosition={false}
                            />
                        )}
                    </div>
                    <div className="space-y-4">
                        <div className="space-y-2">
                            <Label>Zoom</Label>
                            <input
                                type="range"
                                min="0.1"
                                max="3"
                                step="0.1"
                                value={zoom}
                                onChange={(e) => setZoom(parseFloat(e.target.value))}
                                className="w-full"
                            />
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={handleCancelCrop}>
                            Cancel
                        </Button>
                        <Button onClick={handleSaveCrop}>
                            Save
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
};

export default NewClientForm;
