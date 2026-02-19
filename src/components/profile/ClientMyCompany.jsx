import React, { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useToast } from '@/components/ui/use-toast';
import { useAuth } from '@/hooks/useAuth';
import { getMyCompany, updateMyCompany } from '@/lib/api';
import { Loader2, Building2, Camera, Trash2 } from 'lucide-react';
import Cropper from 'react-easy-crop';
import { getCroppedImg } from '@/lib/imageUtils';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { uploadClientPhoto } from '@/lib/api';

const ClientMyCompany = ({ readOnly = false }) => {
    const { user } = useAuth();
    const { toast } = useToast();

    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    const [companyData, setCompanyData] = useState({
        name: '',
        pan: '',
        gstin: '',
        mobile: '',
        secondary_phone: '',
        email: '',
        address_line1: '',
        address_line2: '',
        city: '',
        state: '',
        postal_code: '',
        contact_person_name: '',
        contact_person_phone: '',
        date_of_birth: '',
    });
    const [photoFile, setPhotoFile] = useState(null);
    const [photoPreview, setPhotoPreview] = useState(null);
    const [existingPhotoUrl, setExistingPhotoUrl] = useState(null);

    // Crop dialog states
    const [showCropDialog, setShowCropDialog] = useState(false);
    const [imageToCrop, setImageToCrop] = useState(null);
    const [crop, setCrop] = useState({ x: 0, y: 0 });
    const [zoom, setZoom] = useState(1);
    const [croppedAreaPixels, setCroppedAreaPixels] = useState(null);

    const fileInputRef = useRef(null);
    const [clientId, setClientId] = useState(null);
    const [activeEntityId, setActiveEntityId] = useState(() => localStorage.getItem('entityId'));

    useEffect(() => {
        const handleStorageChange = () => {
            const newEntityId = localStorage.getItem('entityId');
            if (newEntityId !== activeEntityId) {
                setActiveEntityId(newEntityId);
            }
        };

        window.addEventListener('storage', handleStorageChange);
        // Also listen to custom event if app uses one
        window.addEventListener('entityChange', handleStorageChange);

        return () => {
            window.removeEventListener('storage', handleStorageChange);
            window.removeEventListener('entityChange', handleStorageChange);
        };
    }, [activeEntityId]);

    useEffect(() => {
        if (user?.access_token) {
            loadCompanyProfile();
        }
    }, [user?.access_token, activeEntityId]);

    // Cleanup blob URLs on unmount
    useEffect(() => {
        return () => {
            if (photoPreview && photoPreview.startsWith('blob:')) {
                URL.revokeObjectURL(photoPreview);
            }
        };
    }, [photoPreview]);

    const loadCompanyProfile = async () => {
        setIsLoading(true);
        try {
            const data = await getMyCompany(user.access_token, activeEntityId);
            setClientId(data.id);
            setCompanyData({
                name: data.name || '',
                pan: data.pan || '',
                gstin: data.gstin || '',
                mobile: data.mobile || '',
                secondary_phone: data.secondary_phone || '',
                email: data.email || '',
                address_line1: data.address_line1 || '',
                address_line2: data.address_line2 || '',
                city: data.city || '',
                state: data.state || '',
                postal_code: data.postal_code || '',
                contact_person_name: data.contact_person_name || '',
                contact_person_phone: data.contact_person_phone || '',
                date_of_birth: data.date_of_birth || data.dob || '',
            });
            if (data.photo_url) {
                setExistingPhotoUrl(data.photo_url);
            }
        } catch (error) {
            console.error('Error loading company profile:', error);
            toast({
                title: 'Error',
                description: 'Failed to load company profile. Please ensure you have selected a valid client.',
                variant: 'destructive',
            });
        } finally {
            setIsLoading(false);
        }
    };

    const handlePhotoSelect = (e) => {
        if (readOnly) return;
        const file = e.target.files[0];
        if (file) {
            if (!file.type.startsWith('image/')) {
                toast({
                    title: 'Error',
                    description: 'Please select an image file',
                    variant: 'destructive',
                });
                return;
            }
            const reader = new FileReader();
            reader.onload = () => {
                setImageToCrop(reader.result);
                setShowCropDialog(true);
            };
            reader.readAsDataURL(file);
        }
    };

    const onCropComplete = async (croppedArea, croppedAreaPixels) => {
        setCroppedAreaPixels(croppedAreaPixels);
    };

    const handleCropComplete = async () => {
        if (!imageToCrop || !croppedAreaPixels) return;

        try {
            const croppedImage = await getCroppedImg(imageToCrop, croppedAreaPixels);
            setPhotoFile(croppedImage);
            setPhotoPreview(URL.createObjectURL(croppedImage));
            setShowCropDialog(false);
        } catch (error) {
            console.error('Error cropping image:', error);
            toast({
                title: 'Error',
                description: 'Failed to crop image',
                variant: 'destructive',
            });
        }
    };

    const handleRemovePhoto = () => {
        if (readOnly) return;
        setPhotoFile(null);
        setPhotoPreview(null);
        setExistingPhotoUrl(null);
        if (fileInputRef.current) {
            fileInputRef.current.value = '';
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (readOnly) return;
        if (!user?.access_token) return;

        setIsSaving(true);
        try {
            // First upload photo if there's a new one
            if (photoFile && clientId) {
                const agencyId = user?.agency_id || localStorage.getItem('agency_id');
                await uploadClientPhoto(clientId, photoFile, agencyId, user.access_token);
            }

            // Then update company data
            const updateData = {
                ...companyData,
            };

            // Convert empty strings to null for optional fields
            Object.keys(updateData).forEach(key => {
                if (updateData[key] === '') {
                    updateData[key] = null;
                }
            });

            await updateMyCompany(updateData, user.access_token, activeEntityId);

            toast({
                title: 'Success',
                description: 'Company profile updated successfully',
            });

            // Reload to get updated photo URL
            await loadCompanyProfile();
        } catch (error) {
            console.error('Error saving company profile:', error);
            toast({
                title: 'Error',
                description: error.message || 'Failed to save company profile',
                variant: 'destructive',
            });
        } finally {
            setIsSaving(false);
        }
    };

    if (isLoading) {
        return (
            <Card className="glass-card">
                <CardContent className="flex items-center justify-center py-12">
                    <Loader2 className="w-8 h-8 animate-spin text-white" />
                </CardContent>
            </Card>
        );
    }

    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
        >
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Left Column - Company Identity */}
                <div className="lg:col-span-1">
                    <Card className="glass-card">
                        <CardContent className="pt-6 flex flex-col items-center text-center">
                            <div className="mb-4 relative">
                                <Avatar className="w-32 h-32 text-4xl border-4 border-white/20">
                                    <AvatarImage src={photoPreview || existingPhotoUrl} key={photoPreview || existingPhotoUrl} />
                                    <AvatarFallback className="bg-gradient-to-br from-blue-600 to-indigo-700 text-white">
                                        {companyData.name ? companyData.name.charAt(0).toUpperCase() : 'C'}
                                    </AvatarFallback>
                                </Avatar>

                                {!readOnly && (
                                    <div className="absolute -bottom-2 -right-2 flex gap-2">
                                        <Button
                                            size="icon"
                                            className="rounded-full w-10 h-10 bg-white/20 text-white hover:bg-white/30 backdrop-blur-sm border border-white/30"
                                            onClick={() => fileInputRef.current?.click()}
                                            type="button"
                                        >
                                            <Camera className="w-5 h-5" />
                                        </Button>
                                        {(photoPreview || existingPhotoUrl) && (
                                            <Button
                                                size="icon"
                                                className="rounded-full w-10 h-10 bg-red-500/20 text-white hover:bg-red-500/30 backdrop-blur-sm border border-red-500/30"
                                                onClick={handleRemovePhoto}
                                                type="button"
                                            >
                                                <Trash2 className="w-5 h-5" />
                                            </Button>
                                        )}
                                    </div>
                                )}
                            </div>

                            <input
                                type="file"
                                ref={fileInputRef}
                                className="hidden"
                                accept="image/*"
                                onChange={handlePhotoSelect}
                            />

                            <h2 className="text-2xl font-bold text-white break-words w-full px-4">{companyData.name || 'Company Name'}</h2>
                            <p className="text-sm text-gray-400 mt-2 flex items-center justify-center gap-2 break-all px-4">
                                <Building2 className="w-4 h-4 flex-shrink-0" />
                                {companyData.email || 'No email provided'}
                            </p>

                            {readOnly && (
                                <div className="mt-6 px-4 py-3 bg-blue-500/10 border border-blue-500/20 rounded-lg text-sm text-blue-200 w-full">
                                    View-only access. Contact master admin to edit.
                                </div>
                            )}
                        </CardContent>
                    </Card>
                </div>

                {/* Right Column - Company Details Form */}
                <div className="lg:col-span-2 space-y-8">
                    <Card className="glass-card">
                        <CardHeader>
                            <CardTitle>Company Information</CardTitle>
                            <CardDescription>
                                Update your company details used for invoicing and communication.
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            <form onSubmit={handleSubmit} className="space-y-6">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <div className="space-y-2">
                                        <Label htmlFor="name">Company Name *</Label>
                                        <div className="relative">
                                            <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
                                            <Input
                                                id="name"
                                                className="pl-9"
                                                value={companyData.name}
                                                onChange={(e) => setCompanyData({ ...companyData, name: e.target.value })}
                                                disabled={true}
                                                required // Keeping required though disabled for semantics
                                            />
                                        </div>
                                    </div>

                                    <div className="space-y-2">
                                        <Label htmlFor="email">Email Address</Label>
                                        <Input
                                            id="email"
                                            type="email"
                                            value={companyData.email}
                                            onChange={(e) => setCompanyData({ ...companyData, email: e.target.value })}
                                            disabled={readOnly}
                                        />
                                    </div>

                                    <div className="space-y-2">
                                        <Label htmlFor="pan">PAN Number</Label>
                                        <Input
                                            id="pan"
                                            value={companyData.pan}
                                            onChange={(e) => setCompanyData({ ...companyData, pan: e.target.value.toUpperCase() })}
                                            disabled={true}
                                            maxLength={10}
                                        />
                                    </div>

                                    <div className="space-y-2">
                                        <Label htmlFor="gstin">GSTIN</Label>
                                        <Input
                                            id="gstin"
                                            value={companyData.gstin}
                                            onChange={(e) => setCompanyData({ ...companyData, gstin: e.target.value.toUpperCase() })}
                                            disabled={true}
                                            maxLength={15}
                                        />
                                    </div>

                                    <div className="space-y-2">
                                        <Label htmlFor="mobile">Mobile Number</Label>
                                        <Input
                                            id="mobile"
                                            value={companyData.mobile}
                                            onChange={(e) => setCompanyData({ ...companyData, mobile: e.target.value })}
                                            disabled={readOnly}
                                        />
                                    </div>

                                    <div className="space-y-2">
                                        <Label htmlFor="secondary_phone">Secondary Phone</Label>
                                        <Input
                                            id="secondary_phone"
                                            value={companyData.secondary_phone}
                                            onChange={(e) => setCompanyData({ ...companyData, secondary_phone: e.target.value })}
                                            disabled={readOnly}
                                        />
                                    </div>

                                    <div className="space-y-2 md:col-span-2">
                                        <Label htmlFor="address_line1">Address Line 1</Label>
                                        <Input
                                            id="address_line1"
                                            value={companyData.address_line1}
                                            onChange={(e) => setCompanyData({ ...companyData, address_line1: e.target.value })}
                                            disabled={readOnly}
                                        />
                                    </div>

                                    <div className="space-y-2 md:col-span-2">
                                        <Label htmlFor="address_line2">Address Line 2</Label>
                                        <Input
                                            id="address_line2"
                                            value={companyData.address_line2}
                                            onChange={(e) => setCompanyData({ ...companyData, address_line2: e.target.value })}
                                            disabled={readOnly}
                                        />
                                    </div>

                                    <div className="space-y-2">
                                        <Label htmlFor="city">City</Label>
                                        <Input
                                            id="city"
                                            value={companyData.city}
                                            onChange={(e) => setCompanyData({ ...companyData, city: e.target.value })}
                                            disabled={readOnly}
                                        />
                                    </div>

                                    <div className="space-y-2">
                                        <Label htmlFor="state">State</Label>
                                        <Input
                                            id="state"
                                            value={companyData.state}
                                            onChange={(e) => setCompanyData({ ...companyData, state: e.target.value })}
                                            disabled={readOnly}
                                        />
                                    </div>

                                    <div className="space-y-2">
                                        <Label htmlFor="postal_code">Postal Code</Label>
                                        <Input
                                            id="postal_code"
                                            value={companyData.postal_code}
                                            onChange={(e) => setCompanyData({ ...companyData, postal_code: e.target.value })}
                                            disabled={readOnly}
                                        />
                                    </div>

                                    <div className="space-y-2">
                                        <Label htmlFor="dob">Date of Incorporation/Birth</Label>
                                        <Input
                                            id="dob"
                                            type="date"
                                            value={companyData.date_of_birth}
                                            onChange={(e) => setCompanyData({ ...companyData, date_of_birth: e.target.value })}
                                            disabled={readOnly}
                                        />
                                    </div>
                                </div>

                                {!readOnly && (
                                    <div className="flex justify-end pt-4 border-t border-white/10">
                                        <Button type="submit" disabled={isSaving}>
                                            {isSaving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                                            {isSaving ? 'Saving Changes...' : 'Save Changes'}
                                        </Button>
                                    </div>
                                )}
                            </form>
                        </CardContent>
                    </Card>
                </div>
            </div>

            {/* Image Crop Dialog */}
            <Dialog open={showCropDialog} onOpenChange={setShowCropDialog}>
                <DialogContent className="max-w-xl">
                    <DialogHeader>
                        <DialogTitle>Crop Company Logo</DialogTitle>
                    </DialogHeader>
                    <div className="relative w-full h-80 bg-black rounded-lg overflow-hidden">
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
                            />
                        )}
                    </div>
                    <div className="flex justify-end gap-2 mt-4">
                        <Button variant="ghost" onClick={() => setShowCropDialog(false)}>Cancel</Button>
                        <Button onClick={handleCropComplete}>Save Photo</Button>
                    </div>
                </DialogContent>
            </Dialog>
        </motion.div>
    );
};

export default ClientMyCompany;
