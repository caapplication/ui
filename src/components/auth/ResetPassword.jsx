import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/components/ui/use-toast';
import { Lock, Eye, EyeOff, ShieldCheck } from 'lucide-react';
import { confirmPasswordReset } from '@/lib/api';

const PasswordInput = ({ id, value, onChange, placeholder, ...props }) => {
    const [showPassword, setShowPassword] = useState(false);
    return (
        <div className="relative">
            <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
            <Input
                id={id}
                type={showPassword ? 'text' : 'password'}
                placeholder={placeholder}
                value={value}
                onChange={onChange}
                className="pl-10 pr-12 h-12 bg-white/5 border-white/20 text-white placeholder:text-gray-400 focus:bg-white/10 focus:ring-green-500"
                required
                {...props}
            />
            <Button
                type="button"
                variant="ghost"
                size="icon"
                className="absolute right-1 top-1/2 -translate-y-1/2 h-9 w-9 text-gray-400 hover:text-white"
                onClick={() => setShowPassword(!showPassword)}
            >
                {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
            </Button>
        </div>
    );
};

const ResetPassword = () => {
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [loading, setLoading] = useState(false);
    
    const [searchParams] = useSearchParams();
    const navigate = useNavigate();
    const { toast } = useToast();

    const token = searchParams.get('token');

    const handlePasswordReset = async (e) => {
        e.preventDefault();
        
        if (!token) {
            toast({ title: "Error", description: "Invalid or missing reset token.", variant: "destructive" });
            return;
        }

        if (newPassword !== confirmPassword) {
            toast({ title: "Error", description: "Passwords do not match.", variant: "destructive" });
            return;
        }

        setLoading(true);
        try {
            await confirmPasswordReset(token, newPassword);
            toast({
                title: "Success",
                description: "Your password has been reset. Please log in with your new password.",
            });
            navigate('/login');
        } catch (error) {
            toast({
                title: "Error",
                description: error.message || "Failed to reset password. The link may have expired.",
                variant: "destructive",
            });
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center p-4">
            <motion.div
                initial={{ opacity: 0, scale: 0.9, y: 50 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                transition={{ duration: 0.7, type: "spring", stiffness: 100 }}
                className="w-full max-w-md"
            >
                <Card className="glass-effect rounded-2xl">
                    <CardHeader className="text-center">
                        <motion.div
                            initial={{ scale: 0 }}
                            animate={{ scale: 1, rotate: 10 }}
                            transition={{ delay: 0.3, type: "spring", stiffness: 150, duration: 1 }}
                            className="mx-auto mb-4 w-20 h-20 bg-gradient-to-r from-green-500 to-teal-600 rounded-full flex items-center justify-center shadow-lg shadow-green-500/30"
                        >
                            <ShieldCheck className="w-10 h-10 text-white" />
                        </motion.div>
                        <CardTitle className="text-3xl font-bold gradient-text from-green-400 to-teal-500">Reset Your Password</CardTitle>
                        <CardDescription className="text-gray-300">
                            Create a new, strong password.
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <form onSubmit={handlePasswordReset} className="space-y-6">
                            <div className="space-y-2">
                                <Label htmlFor="new-password">New Password</Label>
                                <PasswordInput
                                    id="new-password"
                                    placeholder="Enter your new password"
                                    value={newPassword}
                                    onChange={(e) => setNewPassword(e.target.value)}
                                />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="confirm-password">Confirm New Password</Label>
                                <PasswordInput
                                    id="confirm-password"
                                    placeholder="Confirm your new password"
                                    value={confirmPassword}
                                    onChange={(e) => setConfirmPassword(e.target.value)}
                                />
                            </div>
                            <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
                                <Button
                                    type="submit"
                                    className="w-full bg-gradient-to-r from-green-500 to-teal-600 hover:from-green-600 hover:to-teal-700 text-white font-semibold py-3 text-base rounded-lg transition-all duration-300 shadow-lg hover:shadow-green-500/40"
                                    disabled={loading}
                                >
                                    {loading ? "Resetting..." : "Reset Password"}
                                </Button>
                            </motion.div>
                        </form>
                    </CardContent>
                </Card>
            </motion.div>
        </div>
    );
};

export default ResetPassword;