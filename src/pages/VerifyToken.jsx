import React, { useEffect, useState, useRef } from "react";
import { useSearchParams } from "react-router-dom";
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Loader2, CheckCircle2, XCircle } from "lucide-react";
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
    <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-br from-blue-900 to-purple-900">
      <Card className="w-full max-w-md glass-effect rounded-2xl text-center">
        <CardHeader>
          <CardTitle className="text-2xl font-bold gradient-text">
            Token Verification
          </CardTitle>
          <CardDescription>
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
          <div className="flex flex-col items-center gap-4 py-4">
            {status === "loading" && (
              <Loader2 className="animate-spin w-12 h-12 text-blue-500" />
            )}
            {(status === "error" || status === "no_token") && (
              <>
                <XCircle className="w-12 h-12 text-red-500" />
                <div className="text-lg font-medium text-gray-200">{message}</div>
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
                <Button asChild className="w-full mt-4 bg-gradient-to-r from-blue-500 to-purple-600 text-white font-semibold py-3 text-base rounded-lg">
                  <a href="/login">Go to Login</a>
                </Button>
              </>
            )}
            {status === "verified" && (
              <form onSubmit={handleSubmit} className="w-full flex flex-col gap-4">
                <div className="flex flex-col gap-2 text-left">
                  <label className="text-gray-300 font-medium">Email</label>
                  <Input value={email} disabled className="bg-gray-800 text-gray-300" />
                </div>
                <div className="flex flex-col gap-2 text-left">
                  <label htmlFor="name" className="text-gray-300 font-medium">Name</label>
                  <Input
                    id="name"
                    value={name}
                    onChange={e => setName(e.target.value)}
                    required
                    placeholder="Enter your name"
                  />
                </div>
                <div className="flex flex-col gap-2 text-left">
                  <label htmlFor="password" className="text-gray-300 font-medium">Password</label>
                  <Input
                    id="password"
                    type="password"
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    required
                    placeholder="Set a password"
                  />
                </div>
                {postError && (
                  <div className="text-red-400 text-sm">{postError}</div>
                )}
                <Button
                  type="submit"
                  className="w-full bg-gradient-to-r from-blue-500 to-purple-600 text-white font-semibold py-3 text-base rounded-lg"
                  disabled={status === "submitting"}
                >
                  {status === "submitting" ? "Setting up..." : "Set Password & Activate"}
                </Button>
              </form>
            )}
            {status === "done" && (
              <>
                <CheckCircle2 className="w-12 h-12 text-green-500" />
                <div className="text-lg font-medium text-gray-200">{message}</div>
                <Button asChild className="mt-2">
                  <a href="/login">Go to Login</a>
                </Button>
              </>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default VerifyToken;
