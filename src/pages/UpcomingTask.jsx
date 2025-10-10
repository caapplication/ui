import React from "react";
import { motion } from "framer-motion";
import { ListTodo } from "lucide-react";
import FeatureCards from "@/components/ui/FeatureCards";

const UpcomingTask = () => (
  <div className="min-h-screen flex flex-col items-center justify-center p-8">
    <motion.div
      initial={{ opacity: 0, y: 30 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6 }}
      className="max-w-2xl w-full bg-white/10 rounded-2xl shadow-xl p-8 text-center"
    >
      <div className="flex justify-center mb-6">
        <ListTodo className="w-16 h-16 text-green-400" />
      </div>
      <h1 className="text-4xl font-bold mb-4 text-white">Task Management - Coming Soon</h1>
      <p className="text-lg text-gray-300 mb-6">
        Our Task Management module will help you stay organized, productive, and on top of your work.
      </p>
      <ul className="text-left text-gray-200 text-base space-y-2 mb-6">
        <li>• Create, assign, and track tasks for yourself and your team</li>
        <li>• Set deadlines, priorities, and reminders for important work</li>
        <li>• Visualize progress with Kanban boards and calendar views</li>
        <li>• Collaborate with comments, attachments, and real-time updates</li>
        <li>• Automate recurring tasks and workflows</li>
      </ul>
      <p className="text-gray-400">
        Get ready for a smarter way to manage your daily work and projects!
      </p>
      {/* Development Progress */}
      <div className="mt-10">
        <div className="bg-white/5 backdrop-blur-lg border border-white/10 rounded-2xl p-8">
          <div className="flex items-center justify-between mb-4">
            <span className="text-lg font-semibold text-white">Development Progress</span>
            <span className="text-2xl font-bold bg-gradient-to-r from-green-400 to-blue-400 bg-clip-text text-transparent">50%</span>
          </div>
          <div className="relative h-4 bg-white/10 rounded-full overflow-hidden">
            <div
              className="absolute inset-y-0 left-0 bg-gradient-to-r from-green-500 via-blue-500 to-purple-500 rounded-full"
              style={{ width: "50%" }}
            />
          </div>
          <p className="text-sm text-gray-400 mt-4 text-center">
            We're halfway there! Task management is shaping up to be a game changer.
          </p>
        </div>
      </div>
    </motion.div>
    <div className="mt-24" />
    <FeatureCards />
  </div>
);

export default UpcomingTask;
