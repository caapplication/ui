import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Link, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useAuth } from '@/hooks/useAuth.jsx';
import { useToast } from '@/components/ui/use-toast';
import { Mail, Lock, Eye, EyeOff, ArrowLeft } from 'lucide-react';

const LoginForm = () => {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  const { login } = useAuth();
  const { toast } = useToast();

  const handleInitialLogin = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      const result = await login(email, password);

      if (result.twoFactorEnabled) {
        navigate('/verify-2fa', { state: { loginData: result.loginData } });
      } else {
        toast({
          title: "Welcome back!",
          description: "You've successfully signed in.",
        });
      }
    } catch (error) {
      if (error.message === 'MFA code required') {
        navigate('/verify-2fa', { state: { email, password } });
        return;
      }
      
      // Check if account is locked
      const errorMessage = error.message || "Please check your credentials and try again.";
      const isLocked = errorMessage.toLowerCase().includes('locked') || 
                       errorMessage.toLowerCase().includes('pay your due bills');
      
      toast({
        title: isLocked ? "Account Locked" : "Login Failed",
        description: errorMessage,
        variant: "destructive",
        duration: isLocked ? 8000 : 5000, // Show locked message longer
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <div className="min-h-screen flex items-center justify-center p-4 relative">
        <div className="animated-bg"></div>
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
                animate={{ scale: 1, rotate: 360 }}
                transition={{ delay: 0.3, type: "spring", stiffness: 150, duration: 1 }}
                className="mx-auto mb-4 w-20 h-20 bg-gradient-to-r from-blue-500 to-purple-600 rounded-full flex items-center justify-center shadow-lg shadow-blue-500/30"
              >
                <img src="/logo.png" alt="logo" className="w-11 h-11" />
              </motion.div>
              <CardTitle className="text-3xl font-bold gradient-text">Welcome Back</CardTitle>
              <CardDescription className="text-gray-300">
                Sign in to access your account.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleInitialLogin} className="space-y-6">
                <div className="space-y-2">
                  <Label htmlFor="email" className="text-gray-200">Email</Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                    <Input
                      id="email"
                      type="email"
                      placeholder="Enter your email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="pl-10 h-12 bg-white/5 border-white/20 text-white placeholder:text-gray-400 focus:bg-white/10 focus:ring-blue-500"
                      required
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="password" className="text-gray-200">Password</Label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                    <Input
                      id="password"
                      type={showPassword ? 'text' : 'password'}
                      placeholder="Enter your password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="pl-10 pr-12 h-12 bg-white/5 border-white/20 text-white placeholder:text-gray-400 focus:bg-white/10 focus:ring-blue-500"
                      required
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
                </div>
                <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
                  <Button
                    type="submit"
                    className="w-full bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white font-semibold py-3 text-base rounded-lg transition-all duration-300 shadow-lg hover:shadow-blue-500/40"
                    disabled={loading}
                  >
                    {loading ? "Signing in..." : "Sign In"}
                  </Button>
                </motion.div>
              </form>
              <div className="mt-4 flex justify-end text-sm">
                <Button asChild variant="link" className="text-gray-200 hover:text-white px-0">
                  <Link to="/forgot-password">Forgot Password?</Link>
                </Button>
              </div>
              <div className="flex items-center justify-center gap-4">
                <Button asChild variant="outline">
                  <a href="https://fynivo.in/">
                    <ArrowLeft className="w-5 h-5 mr-2" />
                    Explore Fynivo
                  </a>
                </Button>
              </div>

            </CardContent>
          </Card>
        </motion.div>
        <div className="absolute bottom-4 left-0 w-full text-center">
          <p className="text-gray-500 text-sm mt-8 relative z-10">
            ©️ {new Date().getFullYear()} Fynivo by Snolep. All rights reserved.
          </p>
        </div>
      </div>
    </>
  );
};

export default LoginForm;
