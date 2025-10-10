import React from "react";
import { motion } from "framer-motion";
import { FileText } from "lucide-react";
import FeatureCards from "@/components/ui/FeatureCards";

const UpcomingDocuments = () => (
  <div className="min-h-screen flex flex-col items-center justify-center p-8">
    <motion.div
      initial={{ opacity: 0, y: 30 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6 }}
      className="max-w-2xl w-full bg-white/10 rounded-2xl shadow-xl p-8 text-center"
    >
      <div className="flex justify-center mb-6">
        <FileText className="w-16 h-16 text-blue-400" />
      </div>
      <h1 className="text-4xl font-bold mb-4 text-white">Documents - Coming Soon</h1>
      <p className="text-lg text-gray-300 mb-6">
        Our Documents module will let you securely upload, organize, and share all your important files in one place.
      </p>
      <ul className="text-left text-gray-200 text-base space-y-2 mb-6">
        <li>• Upload and categorize documents with tags and folders</li>
        <li>• Advanced search and filtering for quick access</li>
        <li>• Share documents with your team or clients with granular permissions</li>
        <li>• Version control and audit trails for compliance</li>
        <li>• Seamless integration with other modules (tasks, services, etc.)</li>
      </ul>
      <p className="text-gray-400">
        Stay tuned for a smarter, safer way to manage your business documents!
      </p>
      {/* Development Progress */}
      <div className="mt-10">
        <div className="bg-white/5 backdrop-blur-lg border border-white/10 rounded-2xl p-8">
          <div className="flex items-center justify-between mb-4">
            <span className="text-lg font-semibold text-white">Development Progress</span>
            <span className="text-2xl font-bold bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent">90%</span>
          </div>
          <div className="relative h-4 bg-white/10 rounded-full overflow-hidden">
            <div
              className="absolute inset-y-0 left-0 bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500 rounded-full"
              style={{ width: "90%" }}
            />
          </div>
          <p className="text-sm text-gray-400 mt-4 text-center">
            Almost there! We're putting the finishing touches on a powerful document management experience.
          </p>
        </div>
      </div>
    </motion.div>
    <div className="mt-24" />
    <FeatureCards />
  </div>
);

export default UpcomingDocuments;
