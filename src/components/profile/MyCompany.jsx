import React, { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useToast } from '@/components/ui/use-toast';
import { useAuth } from '@/hooks/useAuth';
import { getCACompanyProfile, createCACompanyProfile, updateCACompanyProfile } from '@/lib/api';
import { Upload, Loader2, Building2, Camera, Trash2 } from 'lucide-react';
import Cropper from 'react-easy-crop';
import { getCroppedImg } from '@/lib/imageUtils';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';

const MyCompany = () => {
    const { user } = useAuth();
    const { toast } = useToast();
    
    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    const [companyData, setCompanyData] = useState({
        name: '',
        address: '',
        city: '',
        state: '',
        country: '',
        gstin: '',
        company_pan: '',
        account_holder_name: '',
        bank_name: '',
        account_number: '',
        branch: '',
        ifsc_code: '',
        swift_code: '',
    });
    const [logoFile, setLogoFile] = useState(null);
    const [logoPreview, setLogoPreview] = useState(null);
    const [existingLogoUrl, setExistingLogoUrl] = useState(null);
    
    // Crop dialog states
    const [showCropDialog, setShowCropDialog] = useState(false);
    const [imageToCrop, setImageToCrop] = useState(null);
    const [crop, setCrop] = useState({ x: 0, y: 0 });
    const [zoom, setZoom] = useState(1);
    const [croppedAreaPixels, setCroppedAreaPixels] = useState(null);
    
    const fileInputRef = useRef(null);
    const hasProfile = useRef(false);

    useEffect(() => {
        if (user?.access_token) {
            loadCompanyProfile();
        }
    }, [user?.access_token]);

    // Cleanup blob URLs on unmount
    useEffect(() => {
        return () => {
            if (logoPreview && logoPreview.startsWith('blob:')) {
                URL.revokeObjectURL(logoPreview);
            }
        };
    }, [logoPreview]);

    const loadCompanyProfile = async () => {
        setIsLoading(true);
        try {
            const data = await getCACompanyProfile(user.access_token);
            hasProfile.current = true;
            setCompanyData({
                name: data.name || '',
                address: data.address || '',
                city: data.city || '',
                state: data.state || '',
                country: data.country || '',
                gstin: data.gstin || '',
                company_pan: data.company_pan || '',
                account_holder_name: data.account_holder_name || '',
                bank_name: data.bank_name || '',
                account_number: data.account_number || '',
                branch: data.branch || '',
                ifsc_code: data.ifsc_code || '',
                swift_code: data.swift_code || '',
            });
            if (data.logo_url) {
                setExistingLogoUrl(data.logo_url);
            }
        } catch (error) {
            // Check if it's a 404 error (profile doesn't exist yet)
            if (error.response?.status === 404 || (error.message && error.message.includes('404'))) {
                hasProfile.current = false;
                // Profile doesn't exist yet - this is fine for first-time users
                // Don't show error, just allow them to fill the form
            } else {
                console.error('Error loading company profile:', error);
                // Only show error for non-404 errors
                toast({
                    title: 'Error',
                    description: 'Failed to load company profile',
                    variant: 'destructive',
                });
            }
        } finally {
            setIsLoading(false);
        }
    };

    const handleLogoSelect = (e) => {
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
            if (file.size > 5 * 1024 * 1024) {
                toast({
                    title: 'Error',
                    description: 'File size must be less than 5MB',
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

    const onCropComplete = (croppedArea, croppedAreaPixels) => {
        setCroppedAreaPixels(croppedAreaPixels);
    };

    const handleSaveCrop = async () => {
        if (!imageToCrop || !croppedAreaPixels) return;
        
        try {
            const croppedBlob = await getCroppedImg(imageToCrop, croppedAreaPixels);
            // Convert blob to file
            const file = new File([croppedBlob], 'logo.png', { type: 'image/png' });
            // Create preview URL from blob
            const previewUrl = URL.createObjectURL(croppedBlob);
            setLogoFile(file);
            setLogoPreview(previewUrl);
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

    const handleCancelCrop = () => {
        setShowCropDialog(false);
        setImageToCrop(null);
        if (fileInputRef.current) {
            fileInputRef.current.value = '';
        }
    };

    const handleRemoveLogo = () => {
        setLogoFile(null);
        setLogoPreview(null);
        setExistingLogoUrl(null);
        if (fileInputRef.current) {
            fileInputRef.current.value = '';
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setIsSaving(true);
        
        try {
            const formData = new FormData();
            formData.append('name', companyData.name);
            if (logoFile) {
                formData.append('logo', logoFile);
            }
            if (companyData.address) formData.append('address', companyData.address);
            if (companyData.city) formData.append('city', companyData.city);
            if (companyData.state) formData.append('state', companyData.state);
            if (companyData.country) formData.append('country', companyData.country);
            if (companyData.gstin) formData.append('gstin', companyData.gstin);
            if (companyData.company_pan) formData.append('company_pan', companyData.company_pan);
            if (companyData.account_holder_name) formData.append('account_holder_name', companyData.account_holder_name);
            if (companyData.bank_name) formData.append('bank_name', companyData.bank_name);
            if (companyData.account_number) formData.append('account_number', companyData.account_number);
            if (companyData.branch) formData.append('branch', companyData.branch);
            if (companyData.ifsc_code) formData.append('ifsc_code', companyData.ifsc_code);
            if (companyData.swift_code) formData.append('swift_code', companyData.swift_code);

            if (hasProfile.current) {
                await updateCACompanyProfile(formData, user.access_token);
                toast({
                    title: 'Success',
                    description: 'Company profile updated successfully',
                });
            } else {
                await createCACompanyProfile(formData, user.access_token);
                hasProfile.current = true;
                toast({
                    title: 'Success',
                    description: 'Company profile created successfully',
                });
            }
            
            // Clean up preview URL if it's a blob URL
            if (logoPreview && logoPreview.startsWith('blob:')) {
                URL.revokeObjectURL(logoPreview);
            }
            // Reload to get updated logo URL
            await loadCompanyProfile();
            setLogoFile(null);
            setLogoPreview(null);
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
            <div className="flex justify-center items-center h-full">
                <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-white"></div>
            </div>
        );
    }

    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
        >
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Left Column - Logo Card */}
                <div className="lg:col-span-1">
                    <Card className="glass-card">
                        <CardContent className="pt-6 flex flex-col items-center text-center">
                            <div className="mb-4">
                                <Avatar className="w-32 h-32 text-4xl border-4 border-white/20">
                                    {(logoPreview || existingLogoUrl) ? (
                                        <AvatarImage
                                            src={logoPreview || existingLogoUrl}
                                            alt="Company Logo"
                                            key={logoPreview || existingLogoUrl}
                                        />
                                    ) : (
                                        <AvatarFallback className="bg-gradient-to-br from-sky-500 to-indigo-600 text-white">
                                            <Building2 className="w-16 h-16" />
                                        </AvatarFallback>
                                    )}
                                </Avatar>
                            </div>
                            <div className="flex gap-2 mb-4">
                                <Button
                                    size="icon"
                                    className="rounded-full w-10 h-10 bg-white/20 text-white hover:bg-white/30 backdrop-blur-sm border border-white/30"
                                    onClick={() => fileInputRef.current?.click()}
                                    disabled={isSaving}
                                >
                                    <Camera className="w-5 h-5" />
                                </Button>
                                {(logoPreview || existingLogoUrl) && (
                                    <Button
                                        size="icon"
                                        className="rounded-full w-10 h-10 bg-red-500/20 text-white hover:bg-red-500/30 backdrop-blur-sm border border-red-500/30"
                                        onClick={handleRemoveLogo}
                                        disabled={isSaving}
                                    >
                                        <Trash2 className="w-5 h-5" />
                                    </Button>
                                )}
                            </div>
                            <Input
                                type="file"
                                ref={fileInputRef}
                                className="hidden"
                                accept="image/*"
                                onChange={handleLogoSelect}
                            />
                            <h2 className="text-2xl font-bold text-white">{companyData.name || 'Company Name'}</h2>
                            <p className="text-sm text-gray-400 mt-2 flex items-center justify-center gap-2">
                                <Building2 className="w-4 h-4" />
                                {companyData.city && companyData.state ? `${companyData.city}, ${companyData.state}` : 'Company Details'}
                            </p>
                        </CardContent>
                    </Card>
                </div>

                {/* Right Column - Form Sections */}
                <div className="lg:col-span-2 space-y-8">
                    <form onSubmit={handleSubmit} className="space-y-8">
                        {/* Basic Information */}
                        <Card className="glass-card">
                            <CardHeader>
                                <CardTitle>Basic Information</CardTitle>
                                <CardDescription>Company name and registration details.</CardDescription>
                            </CardHeader>
                            <CardContent>
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                    <div>
                                        <Label htmlFor="name">Company Name *</Label>
                                        <Input
                                            id="name"
                                            value={companyData.name}
                                            onChange={(e) => setCompanyData({ ...companyData, name: e.target.value })}
                                            required
                                        />
                                    </div>
                                    <div>
                                        <Label htmlFor="gstin">GSTIN/UIN</Label>
                                        <Input
                                            id="gstin"
                                            value={companyData.gstin}
                                            onChange={(e) => setCompanyData({ ...companyData, gstin: e.target.value })}
                                        />
                                    </div>
                                    <div>
                                        <Label htmlFor="company_pan">Company PAN</Label>
                                        <Input
                                            id="company_pan"
                                            value={companyData.company_pan}
                                            onChange={(e) => setCompanyData({ ...companyData, company_pan: e.target.value })}
                                        />
                                    </div>
                                </div>
                            </CardContent>
                        </Card>

                        {/* Address Information */}
                        <Card className="glass-card">
                            <CardHeader>
                                <CardTitle>Address</CardTitle>
                                <CardDescription>Company address and location details.</CardDescription>
                            </CardHeader>
                            <CardContent>
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                    <div className="sm:col-span-2">
                                        <Label htmlFor="address">Address</Label>
                                        <Input
                                            id="address"
                                            value={companyData.address}
                                            onChange={(e) => setCompanyData({ ...companyData, address: e.target.value })}
                                        />
                                    </div>
                                    <div>
                                        <Label htmlFor="city">City</Label>
                                        <Input
                                            id="city"
                                            value={companyData.city}
                                            onChange={(e) => setCompanyData({ ...companyData, city: e.target.value })}
                                        />
                                    </div>
                                    <div>
                                        <Label htmlFor="state">State</Label>
                                        <Input
                                            id="state"
                                            value={companyData.state}
                                            onChange={(e) => setCompanyData({ ...companyData, state: e.target.value })}
                                        />
                                    </div>
                                    <div>
                                        <Label htmlFor="country">Country</Label>
                                        <Input
                                            id="country"
                                            value={companyData.country}
                                            onChange={(e) => setCompanyData({ ...companyData, country: e.target.value })}
                                        />
                                    </div>
                                </div>
                            </CardContent>
                        </Card>

                        {/* Bank Details */}
                        <Card className="glass-card">
                            <CardHeader>
                                <CardTitle>Bank Details</CardTitle>
                                <CardDescription>Company bank account information.</CardDescription>
                            </CardHeader>
                            <CardContent>
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                    <div>
                                        <Label htmlFor="account_holder_name">Account Holder Name</Label>
                                        <Input
                                            id="account_holder_name"
                                            value={companyData.account_holder_name}
                                            onChange={(e) => setCompanyData({ ...companyData, account_holder_name: e.target.value })}
                                        />
                                    </div>
                                    <div>
                                        <Label htmlFor="bank_name">Bank Name</Label>
                                        <Input
                                            id="bank_name"
                                            value={companyData.bank_name}
                                            onChange={(e) => setCompanyData({ ...companyData, bank_name: e.target.value })}
                                        />
                                    </div>
                                    <div>
                                        <Label htmlFor="account_number">Account Number</Label>
                                        <Input
                                            id="account_number"
                                            value={companyData.account_number}
                                            onChange={(e) => setCompanyData({ ...companyData, account_number: e.target.value })}
                                        />
                                    </div>
                                    <div>
                                        <Label htmlFor="branch">Branch</Label>
                                        <Input
                                            id="branch"
                                            value={companyData.branch}
                                            onChange={(e) => setCompanyData({ ...companyData, branch: e.target.value })}
                                        />
                                    </div>
                                    <div>
                                        <Label htmlFor="ifsc_code">IFSC Code</Label>
                                        <Input
                                            id="ifsc_code"
                                            value={companyData.ifsc_code}
                                            onChange={(e) => setCompanyData({ ...companyData, ifsc_code: e.target.value })}
                                        />
                                    </div>
                                    <div>
                                        <Label htmlFor="swift_code">SWIFT Code</Label>
                                        <Input
                                            id="swift_code"
                                            value={companyData.swift_code}
                                            onChange={(e) => setCompanyData({ ...companyData, swift_code: e.target.value })}
                                        />
                                    </div>
                                </div>
                            </CardContent>
                        </Card>

                        <div className="flex justify-end">
                            <Button type="submit" disabled={isSaving}>
                                {isSaving ? (
                                    <>
                                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                        Saving...
                                    </>
                                ) : (
                                    'Save Changes'
                                )}
                            </Button>
                        </div>
                    </form>
                </div>
            </div>

            {/* Crop Dialog */}
            <Dialog open={showCropDialog} onOpenChange={setShowCropDialog}>
                <DialogContent className="max-w-2xl">
                    <DialogHeader>
                        <DialogTitle>Crop Company Logo</DialogTitle>
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
        </motion.div>
    );
};

export default MyCompany;
