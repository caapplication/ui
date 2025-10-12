import React, { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Loader2, CheckCircle2, XCircle } from "lucide-react";
import { verifyToken, acceptInvitation } from "@/lib/api/auth";

const VerifyToken = () => {
  const [searchParams] = useSearchParams();
  const token = searchParams.get("token");
  const [status, setStatus] = useState("loading"); // loading | verified | error | submitting | done
  const [message, setMessage] = useState("");
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [password, setPassword] = useState("");
  const [postError, setPostError] = useState("");

  useEffect(() => {
    if (!token) {
      setStatus("error");
      setMessage("No token provided in the URL.");
      return;
    }
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
      setStatus("verified");
      setPostError(
        err?.message ||
          "Failed to set up account. Please try again or contact support."
      );
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
              : "There was a problem verifying your token."}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center gap-4 py-4">
            {status === "loading" && (
              <Loader2 className="animate-spin w-12 h-12 text-blue-500" />
            )}
            {status === "error" && (
              <>
                <XCircle className="w-12 h-12 text-red-500" />
                <div className="text-lg font-medium text-gray-200">{message}</div>
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
