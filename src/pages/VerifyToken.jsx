import React, { useEffect, useState, useRef } from "react";
import { useSearchParams } from "react-router-dom";
import { motion } from "framer-motion";
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, CheckCircle2, XCircle, Mail, User, Lock, Eye, EyeOff } from "lucide-react";
import { verifyToken, acceptInvitation } from "@/lib/api/auth";

const VerifyToken = () => {
  const [searchParams] = useSearchParams();
  // Replace spaces with + to handle potential URL decoding issues where + was not properly encoded in the link
  const token = searchParams.get("token")?.replace(/ /g, '+');
  const [status, setStatus] = useState("loading"); // loading | verified | error | submitting | done | no_token
  const [message, setMessage] = useState("");
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [postError, setPostError] = useState("");
  const verifiedTokenRef = useRef(null);

  useEffect(() => {
    if (!token) {
      setStatus("no_token");
      setMessage("No token provided in the URL.");
      return;
    }

    if (verifiedTokenRef.current === token) {
      return;
    }
    verifiedTokenRef.current = token;

    setStatus("loading");
    verifyToken(token)
      .then((res) => {
        setStatus("verified");
        setEmail(res?.email || "");
        setMessage(res?.message || "Token verified. Please set your name and password.");
      })
      .catch((err) => {
        setStatus("error");
        setMessage(
          err?.message ||
          "Verification failed. The token may be invalid or expired."
        );
      });
  }, [token]);

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (password !== confirmPassword) {
      setPostError("Passwords do not match");
      return;
    }

    setStatus("submitting");
    setPostError("");
    try {
      await acceptInvitation(token, name, email, password);
      setStatus("done");
      setMessage("Account setup successful! You can now log in.");
    } catch (err) {
      if (err?.message?.includes("Email already registered")) {
        setStatus("existing_user");
        setMessage("It looks like you already have an account with us. Please log in to accept the invitation.");
      } else {
        setStatus("verified");
        setPostError(
          err?.message ||
          "Failed to set up account. Please try again or contact support."
        );
      }
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 relative">
      <div className="animated-bg"></div>
      <motion.div
        initial={{ opacity: 0, scale: 0.9, y: 50 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ duration: 0.7, type: "spring", stiffness: 100 }}
        className="w-full max-w-md"
      >
        <Card className="glass-effect rounded-2xl border-white/20">
          <CardHeader className="text-center">
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1, rotate: 360 }}
              transition={{ delay: 0.3, type: "spring", stiffness: 150, duration: 1 }}
              className="mx-auto mb-4 w-20 h-20 bg-gradient-to-r from-blue-500 to-purple-600 rounded-full flex items-center justify-center shadow-lg shadow-blue-500/30"
            >
              <img src="/logo.png" alt="logo" className="w-11 h-11" />
            </motion.div>
            <CardTitle className="text-3xl font-bold gradient-text">
              Token Verification
            </CardTitle>
            <CardDescription className="text-gray-300">
              {status === "loading"
                ? "Verifying your token, please wait..."
                : status === "verified"
                  ? "Your token has been verified. Please set your name and password."
                  : status === "done"
                    ? "Account setup complete."
                    : status === "existing_user"
                      ? "Account already exists."
                      : status === "no_token"
                        ? "Invalid Verification Link"
                        : "Hold on, verifying and setting up your profile..."}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col items-center gap-4 py-2">
              {status === "loading" && (
                <Loader2 className="animate-spin w-12 h-12 text-blue-500" />
              )}
              {(status === "error" || status === "no_token") && (
                <>
                  <XCircle className="w-12 h-12 text-red-500" />
                  <div className="text-lg font-medium text-white">{message}</div>
                </>
              )}
              {status === "existing_user" && (
                <>
                  <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-lg p-4 text-left w-full">
                    <div className="flex items-start gap-3">
                      <CheckCircle2 className="w-5 h-5 text-yellow-500 mt-0.5" />
                      <div className="flex-1">
                        <p className="text-sm font-medium text-yellow-500 mb-1">Account Exists</p>
                        <p className="text-sm text-gray-300">{message}</p>
                      </div>
                    </div>
                  </div>
                  <Button asChild className="w-full mt-4 bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white font-semibold py-3 text-base rounded-lg transition-all duration-300 shadow-lg hover:shadow-blue-500/40">
                    <a href="/login">Go to Login</a>
                  </Button>
                </>
              )}
              {status === "verified" && (
                <form onSubmit={handleSubmit} className="w-full space-y-6">
                  <div className="space-y-2">
                    <Label className="text-gray-200">Email</Label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                      <Input
                        value={email}
                        disabled
                        className="pl-10 h-12 bg-white/5 border-white/20 text-gray-400 focus:bg-white/10 focus:ring-blue-500"
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="name" className="text-gray-200">Name</Label>
                    <div className="relative">
                      <User className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                      <Input
                        id="name"
                        value={name}
                        onChange={e => setName(e.target.value)}
                        required
                        placeholder="Enter your name"
                        className="pl-10 h-12 bg-white/5 border-white/20 text-white placeholder:text-gray-400 focus:bg-white/10 focus:ring-blue-500"
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
                        value={password}
                        onChange={e => setPassword(e.target.value)}
                        required
                        placeholder="Set a password"
                        className="pl-10 pr-12 h-12 bg-white/5 border-white/20 text-white placeholder:text-gray-400 focus:bg-white/10 focus:ring-blue-500"
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

                  <div className="space-y-2">
                    <Label htmlFor="confirmPassword" className="text-gray-200">Confirm Password</Label>
                    <div className="relative">
                      <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                      <Input
                        id="confirmPassword"
                        type={showConfirmPassword ? 'text' : 'password'}
                        value={confirmPassword}
                        onChange={e => setConfirmPassword(e.target.value)}
                        required
                        placeholder="Confirm your password"
                        className="pl-10 pr-12 h-12 bg-white/5 border-white/20 text-white placeholder:text-gray-400 focus:bg-white/10 focus:ring-blue-500"
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="absolute right-1 top-1/2 -translate-y-1/2 h-9 w-9 text-gray-400 hover:text-white"
                        onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      >
                        {showConfirmPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                      </Button>
                    </div>
                  </div>
                  {postError && (
                    <div className="text-red-400 text-sm bg-red-500/10 p-3 rounded-md border border-red-500/20">{postError}</div>
                  )}
                  <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
                    <Button
                      type="submit"
                      className="w-full bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white font-semibold py-3 text-base rounded-lg transition-all duration-300 shadow-lg hover:shadow-blue-500/40"
                      disabled={status === "submitting"}
                    >
                      {status === "submitting" ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Setting up...
                        </>
                      ) : (
                        "Set Password & Activate"
                      )}
                    </Button>
                  </motion.div>
                </form>
              )}
              {status === "done" && (
                <>
                  <CheckCircle2 className="w-16 h-16 text-green-500 mb-2" />
                  <div className="text-xl font-semibold text-white mb-2">You're all set!</div>
                  <div className="text-gray-300 text-center mb-6">{message}</div>
                  <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} className="w-full">
                    <Button asChild className="w-full bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white font-semibold py-3 text-base rounded-lg transition-all duration-300 shadow-lg hover:shadow-blue-500/40">
                      <a href="/login">Go to Login</a>
                    </Button>
                  </motion.div>
                </>
              )}
            </div>
          </CardContent>
        </Card>
      </motion.div>
      <div className="absolute bottom-4 left-0 w-full text-center">
        <p className="text-gray-400 text-sm">
          ©️ {new Date().getFullYear()} Fynivo by Snolep. All rights reserved.
        </p>
      </div>
    </div>
  );
};

export default VerifyToken;
