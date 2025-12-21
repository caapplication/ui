import React, { useState, useEffect, useRef, useCallback } from 'react';
import { motion } from 'framer-motion';
import { useAuth } from '@/hooks/useAuth.jsx';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useToast } from '@/components/ui/use-toast';
import { User, Lock, Shield, Camera, Mail, Eye, EyeOff, Trash2 } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogClose } from '@/components/ui/dialog';
import { getProfile, updateName, updatePassword, toggle2FA, verify2FA, uploadProfilePicture, deleteProfilePicture } from '@/lib/api';

const PasswordInput = ({ id, value, onChange, ...props }) => {
    const [showPassword, setShowPassword] = useState(false);
    return (
        <div className="relative">
            <Input
                id={id}
                type={showPassword ? 'text' : 'password'}
                value={value}
                onChange={onChange}
                className="pr-10"
                {...props}
            />
            <Button
                type="button"
                variant="ghost"
                size="icon"
                className="absolute right-1 top-1/2 -translate-y-1/2 h-8 w-8 text-gray-400 hover:text-white"
                onClick={() => setShowPassword(prev => !prev)}
            >
                {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
            </Button>
        </div>
    );
}

const Profile = () => {
    const { user, updateUser, loading: authLoading } = useAuth();
    const { toast } = useToast();
    
    const [profileData, setProfileData] = useState(null);
    const [firstName, setFirstName] = useState('');
    const [lastName, setLastName] = useState('');
    const [currentPassword, setCurrentPassword] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    
    const [is2faDialogOpen, setIs2faDialogOpen] = useState(false);
    const [qrCodeImage, setQrCodeImage] = useState(null);
    const [verificationCode, setVerificationCode] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isLoadingProfile, setIsLoadingProfile] = useState(true);

    const fileInputRef = useRef(null);
    
    const fetchProfileData = useCallback(async (token) => {
        setIsLoadingProfile(true);
        try {
            const data = await getProfile(token);
            setProfileData(data);
            const [firstName, ...lastNameParts] = data.name.split(' ');
            setFirstName(firstName);
            setLastName(lastNameParts.join(' '));
            updateUser({ is_2fa_enabled: data.is_2fa_enabled, name: data.name, sub: data.email });
        } catch (error) {
            toast({ title: "Error", description: "Failed to fetch profile data.", variant: "destructive" });
        } finally {
            setIsLoadingProfile(false);
        }
    }, [toast, updateUser]);

    useEffect(() => {
        if (!authLoading && user?.access_token) {
            fetchProfileData(user.access_token);
        } else if (!authLoading && !user?.access_token) {
            setIsLoadingProfile(false);
            toast({ title: "Authentication Error", description: "Could not find access token.", variant: "destructive" });
        }
    }, [user?.access_token, authLoading, fetchProfileData, toast]);
    
    const handleNameUpdate = async (e) => {
        e.preventDefault();
        setIsSubmitting(true);
        try {
            await updateName(firstName, lastName, user.access_token);
            updateUser({ name: `${firstName} ${lastName}`.trim(), first_name: firstName, last_name: lastName });
            toast({ title: "Success", description: "Your name has been updated." });
        } catch (error) {
            toast({ title: "Error", description: error.message, variant: "destructive" });
        } finally {
            setIsSubmitting(false);
        }
    };

    const handlePasswordUpdate = async (e) => {
        e.preventDefault();
        if (newPassword !== confirmPassword) {
            toast({ title: "Error", description: "New passwords do not match.", variant: "destructive" });
            return;
        }
        setIsSubmitting(true);
        try {
            await updatePassword(currentPassword, newPassword, confirmPassword, user.access_token);
            toast({ title: "Success", description: "Password updated successfully." });
            setCurrentPassword('');
            setNewPassword('');
            setConfirmPassword('');
        } catch (error) {
            toast({ title: "Error", description: error.message, variant: "destructive" });
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleToggle2FA = async () => {
        setIsSubmitting(true);
        try {
            if (user.is_2fa_enabled) {
                await toggle2FA(false, user.access_token);
                updateUser({ is_2fa_enabled: false });
                toast({ title: "Success", description: "Two-Factor Authentication has been disabled." });
            } else {
                const response = await toggle2FA(true, user.access_token);
                setQrCodeImage(response.qr_code_image);
                setIs2faDialogOpen(true);
            }
        } catch (error) {
            toast({ title: "Error", description: error.message, variant: "destructive" });
        } finally {
            setIsSubmitting(false);
        }
    };
    
    const handleVerify2FA = async () => {
        setIsSubmitting(true);
        try {
            await verify2FA(verificationCode, user.access_token);
            updateUser({ is_2fa_enabled: true });
            toast({ title: "Success", description: "Two-Factor Authentication has been enabled." });
            setIs2faDialogOpen(false);
            setVerificationCode('');
            setQrCodeImage(null);
        } catch (error) {
            toast({ title: "Error", description: error.message, variant: "destructive" });
        } finally {
            setIsSubmitting(false);
        }
    };

    const handlePictureUpload = async (event) => {
        const file = event.target.files[0];
        if (!file) return;

        setIsSubmitting(true);
        try {
            const response = await uploadProfilePicture(file, user.access_token);
            updateUser({ ...user, photo_url: response.photo_url });
            toast({ title: "Success", description: "Profile picture updated successfully." });
        } catch (error) {
            toast({ title: "Error", description: error.message, variant: "destructive" });
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleRemovePicture = async () => {
        if (!user?.photo_url) return;

        setIsSubmitting(true);
        try {
            await deleteProfilePicture(user.access_token);
            updateUser({ ...user, photo_url: null });
            toast({ title: "Success", description: "Profile picture removed successfully." });
        } catch (error) {
            toast({ title: "Error", description: error.message, variant: "destructive" });
        } finally {
            setIsSubmitting(false);
        }
    };

    if (isLoadingProfile || authLoading) {
        return <div className="p-8 flex justify-center items-center h-full"><div className="animate-spin rounded-full h-16 w-16 border-b-2 border-white"></div></div>;
    }

    return (
        <div className="p-8">
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5 }}
            >
                <header className="mb-8">
                    <h1 className="text-5xl font-bold text-white">Profile Settings</h1>
                    <p className="text-gray-400 mt-1">Manage your account details and security settings.</p>
                </header>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    <div className="lg:col-span-1">
                        <Card className="glass-card">
                            <CardContent className="pt-6 flex flex-col items-center text-center">
                                <div className="relative mb-4">
                                    <Avatar className="w-32 h-32 text-4xl border-4 border-white/20">
                                        <AvatarImage 
                                            src={user?.photo_url} 
                                            alt={user?.name} 
                                            key={user?.photo_url} 
                                        />
                                        <AvatarFallback className="bg-gradient-to-br from-sky-500 to-indigo-600 text-white">
                                            {user?.name?.charAt(0).toUpperCase() || user?.sub?.charAt(0).toUpperCase()}
                                        </AvatarFallback>
                                    </Avatar>
                                    <div className="absolute bottom-1 right-1 flex gap-2">
                                        <Button
                                            size="icon"
                                            className="rounded-full w-10 h-10 bg-white/20 text-white hover:bg-white/30 backdrop-blur-sm border border-white/30"
                                            onClick={() => fileInputRef.current.click()}
                                            disabled={isSubmitting}
                                        >
                                            <Camera className="w-5 h-5" />
                                        </Button>
                                        {user?.photo_url && (
                                            <Button
                                                size="icon"
                                                className="rounded-full w-10 h-10 bg-red-500/20 text-white hover:bg-red-500/30 backdrop-blur-sm border border-red-500/30"
                                                onClick={handleRemovePicture}
                                                disabled={isSubmitting}
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
                                        onChange={handlePictureUpload}
                                    />
                                </div>
                                <h2 className="text-2xl font-bold text-white">{user?.name || 'User'}</h2>
                                <p className="text-sm text-gray-400 mt-2 flex items-center justify-center gap-2"><Mail className="w-4 h-4"/>{user?.sub}</p>
                            </CardContent>
                        </Card>
                    </div>

                    <div className="lg:col-span-2 space-y-8">
                        <Card className="glass-card">
                            <CardHeader>
                                <CardTitle>Personal Information</CardTitle>
                                <CardDescription>Update your name.</CardDescription>
                            </CardHeader>
                            <CardContent>
                                <form onSubmit={handleNameUpdate} className="space-y-4">
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                        <div>
                                            <Label htmlFor="first-name">First Name</Label>
                                            <Input id="first-name" value={firstName} onChange={(e) => setFirstName(e.target.value)} />
                                        </div>
                                        <div>
                                            <Label htmlFor="last-name">Last Name</Label>
                                            <Input id="last-name" value={lastName} onChange={(e) => setLastName(e.target.value)} />
                                        </div>
                                    </div>
                                    <div className="flex justify-end">
                                        <Button type="submit" disabled={isSubmitting}>{isSubmitting ? 'Saving...' : 'Save Changes'}</Button>
                                    </div>
                                </form>
                            </CardContent>
                        </Card>

                        <Card className="glass-card">
                            <CardHeader>
                                <CardTitle>Change Password</CardTitle>
                                <CardDescription>For your security, we recommend a strong, unique password.</CardDescription>
                            </CardHeader>
                            <CardContent>
                                <form onSubmit={handlePasswordUpdate} className="space-y-4">
                                    <div>
                                        <Label htmlFor="current-password">Current Password</Label>
                                        <PasswordInput id="current-password" value={currentPassword} onChange={(e) => setCurrentPassword(e.target.value)} />
                                    </div>
                                    <div>
                                        <Label htmlFor="new-password">New Password</Label>
                                        <PasswordInput id="new-password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} />
                                    </div>
                                    <div>
                                        <Label htmlFor="confirm-password">Confirm New Password</Label>
                                        <PasswordInput id="confirm-password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} />
                                    </div>
                                    <div className="flex justify-end">
                                        <Button type="submit" disabled={isSubmitting}>{isSubmitting ? 'Updating...' : 'Update Password'}</Button>
                                    </div>
                                </form>
                            </CardContent>
                        </Card>

                        <Card className="glass-card">
                            <CardHeader>
                                <CardTitle>Two-Factor Authentication</CardTitle>
                                <CardDescription>Add an extra layer of security to your account.</CardDescription>
                            </CardHeader>
                            <CardContent className="flex items-center justify-between">
                                <p className="text-gray-300">Status: <span className={user?.is_2fa_enabled ? 'text-green-400 font-semibold' : 'text-red-400 font-semibold'}>{user?.is_2fa_enabled ? 'Enabled' : 'Disabled'}</span></p>
                                <Button onClick={handleToggle2FA} variant={user?.is_2fa_enabled ? "destructive" : "default"} disabled={isSubmitting}>
                                    {isSubmitting ? 'Processing...' : (user?.is_2fa_enabled ? 'Disable 2FA' : 'Enable 2FA')}
                                </Button>
                            </CardContent>
                        </Card>
                    </div>
                </div>
            </motion.div>

            <Dialog open={is2faDialogOpen} onOpenChange={setIs2faDialogOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Enable Two-Factor Authentication</DialogTitle>
                        <DialogDescription>
                            Scan the QR code with your authenticator app, then enter the verification code below.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="flex flex-col items-center gap-4 py-4">
                        {qrCodeImage ? (
                            <div className="p-2 bg-white rounded-lg">
                                <img src={qrCodeImage} alt="2FA QR Code" />
                            </div>
                        ) : (
                            <div className="w-[200px] h-[200px] bg-gray-700 animate-pulse rounded-lg flex items-center justify-center">
                                <p className="text-sm text-gray-400">Loading QR...</p>
                            </div>
                        )}
                        <div>
                            <Label htmlFor="verification-code" className="sr-only">Verification Code</Label>
                            <Input
                                id="verification-code"
                                placeholder="Enter 6-digit code"
                                value={verificationCode}
                                onChange={(e) => setVerificationCode(e.target.value)}
                                maxLength={6}
                                className="w-48 text-center text-lg tracking-[0.2em]"
                            />
                        </div>
                    </div>
                    <DialogFooter>
                        <DialogClose asChild>
                            <Button variant="ghost">Cancel</Button>
                        </DialogClose>
                        <Button onClick={handleVerify2FA} disabled={isSubmitting || verificationCode.length < 6}>
                            {isSubmitting ? 'Verifying...' : 'Verify & Enable'}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
};

export default Profile;
