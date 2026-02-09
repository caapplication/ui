import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useLocation, useNavigate, Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useAuth } from '@/hooks/useAuth.jsx';
import { useToast } from '@/components/ui/use-toast';
import { ShieldCheck, KeyRound, ArrowLeft, RefreshCw } from 'lucide-react';
import { resend2FA } from '@/lib/api';

const TwoFactorVerify = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { verifyOtpAndFinishLogin, login } = useAuth();
  const { toast } = useToast();

  const [otp, setOtp] = useState('');
  const [loading, setLoading] = useState(false);
  const [loginAttemptData, setLoginAttemptData] = useState(null);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  useEffect(() => {
    if (location.state && location.state.loginData) {
      setLoginAttemptData(location.state.loginData);
    } else if (location.state && location.state.email && location.state.password) {
      setEmail(location.state.email);
      setPassword(location.state.password);
    } else {
      // If accessed directly without login data, redirect to login
      navigate('/login');
    }
  }, [location, navigate]);

  const handleOtpSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      if (loginAttemptData) {
        await verifyOtpAndFinishLogin(loginAttemptData, otp);
      } else if (email && password) {
        await login(email, password, otp);
      } else {
        throw new Error("Missing credentials");
      }

      toast({
        title: "Welcome back!",
        description: "You've successfully signed in.",
      });
      navigate('/');
    } catch (error) {
      toast({
        title: "Verification Failed",
        description: error.message || "Invalid OTP. Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
      setOtp('');
    }
  };

  const handleResendOtp = async () => {
    try {
      if (loginAttemptData && loginAttemptData.access_token) {
        await resend2FA(loginAttemptData.access_token);
        toast({
          title: "OTP Resent",
          description: "A new verification code has been sent to your email.",
        });
      } else {
        // If we don't have the token (direct login case without partial state), we might need to re-login first.
        // But for this flow, we usually have loginAttemptData if we came from login.
        toast({
          title: "Cannot Resend",
          description: "Please log in again to receive a new code.",
          variant: "destructive",
        });
      }
    } catch (error) {
      toast({
        title: "Resend Failed",
        description: error.message || "Failed to resend OTP.",
        variant: "destructive",
      });
    }
  };

  if (!loginAttemptData && !email) {
    return null;
  }

  return (
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
              className="mx-auto mb-4 w-20 h-20 bg-gradient-to-r from-sky-500 to-indigo-500 rounded-full flex items-center justify-center shadow-lg shadow-sky-500/30"
            >
              <ShieldCheck className="w-10 h-10 text-white" />
            </motion.div>
            <CardTitle className="text-3xl font-bold gradient-text">Two-Factor Auth</CardTitle>
            <CardDescription className="text-gray-300">
              Enter the 6-digit code sent to your email.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleOtpSubmit} className="space-y-6">
              <div className="space-y-2">
                <div className="relative">
                  <KeyRound className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                  <Input
                    id="otp"
                    type="text"
                    placeholder="_ _ _ _ _ _"
                    maxLength="6"
                    value={otp}
                    onChange={(e) => setOtp(e.target.value.replace(/\D/g, ''))}
                    className="pl-12 h-14 text-center text-2xl tracking-[0.5em] bg-white/5 border-white/20 text-white placeholder:text-gray-500 focus:bg-white/10 focus:ring-sky-500"
                    required
                    autoFocus
                  />
                </div>
              </div>
              <div className="flex justify-end">
                <Button
                  type="button"
                  variant="link"
                  onClick={handleResendOtp}
                  className="text-sky-400 hover:text-sky-300 p-0 h-auto font-normal text-sm"
                >
                  <RefreshCw className="w-3 h-3 mr-1" />
                  Resend Code
                </Button>
              </div>
              <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
                <Button
                  type="submit"
                  className="w-full bg-gradient-to-r from-sky-500 to-indigo-600 hover:from-sky-600 hover:to-indigo-700 text-white font-semibold py-3 text-base rounded-lg transition-all duration-300 shadow-lg hover:shadow-sky-500/40"
                  disabled={loading}
                >
                  {loading ? "Verifying..." : "Verify Code"}
                </Button>
              </motion.div>
            </form>
            <div className="mt-6 flex justify-center">
              <Button asChild variant="link" className="text-gray-300 hover:text-white">
                <Link to="/login">
                  <ArrowLeft className="w-4 h-4 mr-2" />
                  Back to Login
                </Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      </motion.div>
      <div className="absolute bottom-4 left-0 w-full text-center">
        <p className="text-gray-500 text-sm mt-8">
          ©️ {new Date().getFullYear()} Fynivo by Snolep. All rights reserved.
        </p>
      </div>
    </div>
  );
};

export default TwoFactorVerify;
