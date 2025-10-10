import React from "react";
import { motion } from "framer-motion";
import { Briefcase } from "lucide-react";
import FeatureCards from "@/components/ui/FeatureCards";

const UpcomingServices = () => (
  <div className="min-h-screen flex flex-col items-center justify-center p-8">
    <motion.div
      initial={{ opacity: 0, y: 30 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6 }}
      className="max-w-2xl w-full bg-white/10 rounded-2xl shadow-xl p-8 text-center"
    >
      <div className="flex justify-center mb-6">
        <Briefcase className="w-16 h-16 text-pink-400" />
      </div>
      <h1 className="text-4xl font-bold mb-4 text-white">Services Marketplace - Coming Soon</h1>
      <p className="text-lg text-gray-300 mb-6">
        Our Services Marketplace will connect you with trusted providers for all your business needs.
      </p>
      <ul className="text-left text-gray-200 text-base space-y-2 mb-6">
        <li>• Browse and request a wide range of business services</li>
        <li>• Compare providers, pricing, and reviews</li>
        <li>• Seamless onboarding and service management</li>
        <li>• Track service progress and communicate with providers</li>
        <li>• Integrated billing and payment solutions</li>
      </ul>
      <p className="text-gray-400">
        Soon you'll be able to discover, request, and manage services—all in one place!
      </p>
      {/* Development Progress */}
      <div className="mt-10">
        <div className="bg-white/5 backdrop-blur-lg border border-white/10 rounded-2xl p-8">
          <div className="flex items-center justify-between mb-4">
            <span className="text-lg font-semibold text-white">Development Progress</span>
            <span className="text-2xl font-bold bg-gradient-to-r from-pink-400 to-purple-400 bg-clip-text text-transparent">80%</span>
          </div>
          <div className="relative h-4 bg-white/10 rounded-full overflow-hidden">
            <div
              className="absolute inset-y-0 left-0 bg-gradient-to-r from-pink-500 via-purple-500 to-blue-500 rounded-full"
              style={{ width: "80%" }}
            />
          </div>
          <p className="text-sm text-gray-400 mt-4 text-center">
            We're almost ready! The services marketplace is nearing launch.
          </p>
        </div>
      </div>
    </motion.div>
    <div className="mt-24" />
    <FeatureCards />
  </div>
);

export default UpcomingServices;
