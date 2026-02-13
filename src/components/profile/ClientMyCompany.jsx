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

const ClientMyCompany = () => {
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

    useEffect(() => {
        if (user?.access_token) {
            loadCompanyProfile();
        }
    }, [user?.access_token]);

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
            const data = await getMyCompany(user.access_token);
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
                description: 'Failed to load company profile',
                variant: 'destructive',
            });
        } finally {
            setIsLoading(false);
        }
    };

    const handlePhotoSelect = (e) => {
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
        setPhotoFile(null);
        setPhotoPreview(null);
        setExistingPhotoUrl(null);
        if (fileInputRef.current) {
            fileInputRef.current.value = '';
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
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

            await updateMyCompany(updateData, user.access_token);
            
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
            <Card className="glass-card">
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <Building2 className="w-5 h-5" />
                        My Company Profile
                    </CardTitle>
                    <CardDescription>
                        Update your company details. These details are used for invoicing and communication.
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <form onSubmit={handleSubmit} className="space-y-6">
                        {/* Company Logo/Photo */}
                        <div className="flex flex-col items-center gap-4 pb-6 border-b border-white/10">
                            <div className="relative">
                                <Avatar className="w-32 h-32 border-2 border-white/20">
                                    <AvatarImage src={photoPreview || existingPhotoUrl} />
                                    <AvatarFallback className="bg-gradient-to-br from-blue-600 to-indigo-700 text-white text-2xl">
                                        {companyData.name ? companyData.name.charAt(0).toUpperCase() : 'C'}
                                    </AvatarFallback>
                                </Avatar>
                                <Button
                                    type="button"
                                    size="icon"
                                    className="absolute bottom-0 right-0 rounded-full bg-blue-600 hover:bg-blue-700"
                                    onClick={() => fileInputRef.current?.click()}
                                >
                                    <Camera className="w-4 h-4" />
                                </Button>
                            </div>
                            <div className="flex gap-2">
                                <Button
                                    type="button"
                                    variant="outline"
                                    size="sm"
                                    onClick={() => fileInputRef.current?.click()}
                                >
                                    Change Photo
                                </Button>
                                {(photoPreview || existingPhotoUrl) && (
                                    <Button
                                        type="button"
                                        variant="outline"
                                        size="sm"
                                        onClick={handleRemovePhoto}
                                    >
                                        <Trash2 className="w-4 h-4 mr-2" />
                                        Remove
                                    </Button>
                                )}
                            </div>
                            <Input
                                ref={fileInputRef}
                                type="file"
                                className="hidden"
                                accept="image/*"
                                onChange={handlePhotoSelect}
                            />
                        </div>

                        {/* Company Details */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="md:col-span-2">
                                <Label htmlFor="name">Company Name *</Label>
                                <Input
                                    id="name"
                                    value={companyData.name}
                                    onChange={(e) => setCompanyData({ ...companyData, name: e.target.value })}
                                    required
                                />
                            </div>

                            <div>
                                <Label htmlFor="pan">PAN</Label>
                                <Input
                                    id="pan"
                                    value={companyData.pan || ''}
                                    onChange={(e) => setCompanyData({ ...companyData, pan: e.target.value })}
                                    placeholder="ABCDE1234F"
                                    maxLength={10}
                                />
                            </div>

                            <div>
                                <Label htmlFor="gstin">GSTIN</Label>
                                <Input
                                    id="gstin"
                                    value={companyData.gstin || ''}
                                    onChange={(e) => setCompanyData({ ...companyData, gstin: e.target.value })}
                                    placeholder="29ABCDE1234F1Z5"
                                    maxLength={15}
                                />
                            </div>

                            <div>
                                <Label htmlFor="mobile">Mobile Number</Label>
                                <Input
                                    id="mobile"
                                    type="tel"
                                    value={companyData.mobile || ''}
                                    onChange={(e) => setCompanyData({ ...companyData, mobile: e.target.value })}
                                    placeholder="10-digit mobile number"
                                />
                            </div>

                            <div>
                                <Label htmlFor="secondary_phone">Secondary Phone</Label>
                                <Input
                                    id="secondary_phone"
                                    type="tel"
                                    value={companyData.secondary_phone || ''}
                                    onChange={(e) => setCompanyData({ ...companyData, secondary_phone: e.target.value })}
                                    placeholder="Alternative phone number"
                                />
                            </div>

                            <div className="md:col-span-2">
                                <Label htmlFor="email">Email</Label>
                                <Input
                                    id="email"
                                    type="email"
                                    value={companyData.email || ''}
                                    onChange={(e) => setCompanyData({ ...companyData, email: e.target.value })}
                                    placeholder="company@example.com"
                                />
                            </div>

                            <div className="md:col-span-2">
                                <Label htmlFor="address_line1">Address Line 1</Label>
                                <Input
                                    id="address_line1"
                                    value={companyData.address_line1 || ''}
                                    onChange={(e) => setCompanyData({ ...companyData, address_line1: e.target.value })}
                                    placeholder="Street address"
                                />
                            </div>

                            <div className="md:col-span-2">
                                <Label htmlFor="address_line2">Address Line 2</Label>
                                <Input
                                    id="address_line2"
                                    value={companyData.address_line2 || ''}
                                    onChange={(e) => setCompanyData({ ...companyData, address_line2: e.target.value })}
                                    placeholder="Apartment, suite, etc."
                                />
                            </div>

                            <div>
                                <Label htmlFor="city">City</Label>
                                <Input
                                    id="city"
                                    value={companyData.city || ''}
                                    onChange={(e) => setCompanyData({ ...companyData, city: e.target.value })}
                                    placeholder="City"
                                />
                            </div>

                            <div>
                                <Label htmlFor="state">State</Label>
                                <Input
                                    id="state"
                                    value={companyData.state || ''}
                                    onChange={(e) => setCompanyData({ ...companyData, state: e.target.value })}
                                    placeholder="State"
                                />
                            </div>

                            <div>
                                <Label htmlFor="postal_code">Postal Code</Label>
                                <Input
                                    id="postal_code"
                                    value={companyData.postal_code || ''}
                                    onChange={(e) => setCompanyData({ ...companyData, postal_code: e.target.value })}
                                    placeholder="PIN/ZIP code"
                                />
                            </div>

                            <div>
                                <Label htmlFor="date_of_birth">Date of Birth</Label>
                                <Input
                                    id="date_of_birth"
                                    type="date"
                                    value={companyData.date_of_birth || ''}
                                    onChange={(e) => setCompanyData({ ...companyData, date_of_birth: e.target.value })}
                                />
                            </div>

                            <div>
                                <Label htmlFor="contact_person_name">Contact Person Name</Label>
                                <Input
                                    id="contact_person_name"
                                    value={companyData.contact_person_name || ''}
                                    onChange={(e) => setCompanyData({ ...companyData, contact_person_name: e.target.value })}
                                    placeholder="Primary contact person"
                                />
                            </div>

                            <div>
                                <Label htmlFor="contact_person_phone">Contact Person Phone</Label>
                                <Input
                                    id="contact_person_phone"
                                    type="tel"
                                    value={companyData.contact_person_phone || ''}
                                    onChange={(e) => setCompanyData({ ...companyData, contact_person_phone: e.target.value })}
                                    placeholder="Contact person phone"
                                />
                            </div>
                        </div>

                        <div className="flex justify-end gap-4 pt-4 border-t border-white/10">
                            <Button
                                type="submit"
                                disabled={isSaving}
                                className="bg-blue-600 hover:bg-blue-700"
                            >
                                {isSaving ? (
                                    <>
                                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                        Saving...
                                    </>
                                ) : (
                                    'Save Changes'
                                )}
                            </Button>
                        </div>
                    </form>
                </CardContent>
            </Card>

            {/* Crop Dialog */}
            <Dialog open={showCropDialog} onOpenChange={setShowCropDialog}>
                <DialogContent className="max-w-2xl">
                    <DialogHeader>
                        <DialogTitle>Crop Photo</DialogTitle>
                    </DialogHeader>
                    <div className="relative w-full h-96 bg-black rounded-lg overflow-hidden">
                        {imageToCrop && (
                            <Cropper
                                image={imageToCrop}
                                crop={crop}
                                zoom={zoom}
                                aspect={1}
                                onCropChange={setCrop}
                                onZoomChange={setZoom}
                                onCropComplete={onCropComplete}
                            />
                        )}
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setShowCropDialog(false)}>
                            Cancel
                        </Button>
                        <Button onClick={handleCropComplete}>
                            Crop & Use
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </motion.div>
    );
};

export default ClientMyCompany;
