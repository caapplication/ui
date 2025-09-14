import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/components/ui/use-toast';
import { Mail, KeyRound, ArrowLeft } from 'lucide-react';
import { requestPasswordReset } from '@/lib/api';

const ForgotPassword = () => {
    const [email, setEmail] = useState('');
    const [loading, setLoading] = useState(false);
    const { toast } = useToast();

    const handlePasswordResetRequest = async (e) => {
        e.preventDefault();
        setLoading(true);
        try {
            await requestPasswordReset(email);
            toast({
                title: "Check your email",
                description: "If an account with that email exists, we've sent instructions to reset your password.",
            });
        } catch (error) {
            toast({
                title: "Error",
                description: error.message || "Failed to send reset instructions. Please try again.",
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
                            animate={{ scale: 1, rotate: -15 }}
                            transition={{ delay: 0.3, type: "spring", stiffness: 150, duration: 1 }}
                            className="mx-auto mb-4 w-20 h-20 bg-gradient-to-r from-yellow-500 to-orange-600 rounded-full flex items-center justify-center shadow-lg shadow-yellow-500/30"
                        >
                            <KeyRound className="w-10 h-10 text-white" />
                        </motion.div>
                        <CardTitle className="text-3xl font-bold gradient-text from-yellow-400 to-orange-500">Forgot Password</CardTitle>
                        <CardDescription className="text-gray-300">
                            Enter your email to receive a reset link.
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <form onSubmit={handlePasswordResetRequest} className="space-y-6">
                            <div className="space-y-2">
                                <Label htmlFor="email" className="text-gray-200">Email</Label>
                                <div className="relative">
                                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                                    <Input
                                        id="email"
                                        type="email"
                                        placeholder="Enter your registered email"
                                        value={email}
                                        onChange={(e) => setEmail(e.target.value)}
                                        className="pl-10 h-12 bg-white/5 border-white/20 text-white placeholder:text-gray-400 focus:bg-white/10 focus:ring-yellow-500"
                                        required
                                    />
                                </div>
                            </div>
                            <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
                                <Button
                                    type="submit"
                                    className="w-full bg-gradient-to-r from-yellow-500 to-orange-600 hover:from-yellow-600 hover:to-orange-700 text-white font-semibold py-3 text-base rounded-lg transition-all duration-300 shadow-lg hover:shadow-yellow-500/40"
                                    disabled={loading}
                                >
                                    {loading ? "Sending..." : "Send Reset Link"}
                                </Button>
                            </motion.div>
                        </form>
                        <div className="mt-6 text-center">
                            <Button asChild variant="link" className="text-gray-400 hover:text-white">
                                <Link to="/login" className="flex items-center justify-center gap-2">
                                    <ArrowLeft className="w-4 h-4" />
                                    Back to Login
                                </Link>
                            </Button>
                        </div>
                    </CardContent>
                </Card>
            </motion.div>
        </div>
    );
};

export default ForgotPassword;