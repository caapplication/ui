import React from 'react';
import { motion } from 'framer-motion';
import { Rocket, Sparkles, Zap, Code, Palette, Globe } from 'lucide-react';

const ComingSoon = () => {
  const features = [
    {
      icon: <Code className="w-8 h-8" />,
      title: "Revolutionary Features",
      description: "Building cutting-edge functionality that'll blow your mind"
    },
    {
      icon: <Palette className="w-8 h-8" />,
      title: "Stunning Design",
      description: "Crafting a beautiful, intuitive interface you'll love"
    },
    {
      icon: <Zap className="w-8 h-8" />,
      title: "Lightning Fast",
      description: "Optimizing every pixel for blazing performance"
    },
    {
      icon: <Globe className="w-8 h-8" />,
      title: "Global Ready",
      description: "Preparing for worldwide launch and accessibility"
    }
  ];

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.2,
        delayChildren: 0.3
      }
    }
  };

  const itemVariants = {
    hidden: { y: 50, opacity: 0 },
    visible: {
      y: 0,
      opacity: 1,
      transition: {
        type: "spring",
        stiffness: 100,
        damping: 12
      }
    }
  };

  const floatingVariants = {
    animate: {
      y: [-10, 10, -10],
      transition: {
        duration: 3,
        repeat: Infinity,
        ease: "easeInOut"
      }
    }
  };

  const pulseVariants = {
    animate: {
      scale: [1, 1.05, 1],
      transition: {
        duration: 2,
        repeat: Infinity,
        ease: "easeInOut"
      }
    }
  };

  return (
    <div className="min-h-screen relative overflow-hidden flex items-center justify-center p-4">
      {/* Animated Background Elements */}
      <div className="absolute inset-0 overflow-hidden">
        <motion.div
          className="absolute top-20 left-10 w-72 h-72 bg-purple-500/20 rounded-full blur-3xl"
          animate={{
            x: [0, 100, 0],
            y: [0, 50, 0],
            scale: [1, 1.2, 1]
          }}
          transition={{
            duration: 8,
            repeat: Infinity,
            ease: "easeInOut"
          }}
        />
        <motion.div
          className="absolute bottom-20 right-10 w-96 h-96 bg-blue-500/20 rounded-full blur-3xl"
          animate={{
            x: [0, -80, 0],
            y: [0, -60, 0],
            scale: [1, 1.3, 1]
          }}
          transition={{
            duration: 10,
            repeat: Infinity,
            ease: "easeInOut"
          }}
        />
        <motion.div
          className="absolute top-1/2 left-1/2 w-64 h-64 bg-pink-500/20 rounded-full blur-3xl"
          animate={{
            x: [-100, 100, -100],
            y: [-50, 50, -50],
            scale: [1, 1.1, 1]
          }}
          transition={{
            duration: 12,
            repeat: Infinity,
            ease: "easeInOut"
          }}
        />
      </div>

      {/* Main Content */}
      <motion.div
        className="relative z-10 max-w-6xl mx-auto text-center"
        variants={containerVariants}
        initial="hidden"
        animate="visible"
      >
        {/* Floating Rocket Icon */}
        <motion.div
          className="flex justify-center mb-8"
          variants={floatingVariants}
          animate="animate"
        >
          <div className="relative">
            <motion.div
              className="absolute inset-0 bg-gradient-to-r from-purple-500 to-pink-500 rounded-full blur-xl opacity-50"
              variants={pulseVariants}
              animate="animate"
            />
            <div className="relative bg-gradient-to-br from-purple-600 to-pink-600 p-6 rounded-full">
              <Rocket className="w-16 h-16 text-white" />
            </div>
          </div>
        </motion.div>

        {/* Main Heading */}
        <motion.div variants={itemVariants}>
          <h1 className="text-5xl md:text-7xl font-bold mb-6 bg-gradient-to-r from-purple-400 via-pink-400 to-blue-400 bg-clip-text text-transparent">
            Coming Soon
          </h1>
        </motion.div>

        {/* Sparkles Animation */}
        <motion.div
          className="flex justify-center gap-4 mb-8"
          variants={itemVariants}
        >
          {[...Array(3)].map((_, i) => (
            <motion.div
              key={i}
              animate={{
                rotate: [0, 360],
                scale: [1, 1.2, 1]
              }}
              transition={{
                duration: 2,
                repeat: Infinity,
                delay: i * 0.3,
                ease: "easeInOut"
              }}
            >
              <Sparkles className="w-8 h-8 text-yellow-400" />
            </motion.div>
          ))}
        </motion.div>

        {/* What We're Working On Section */}
        <motion.div
          className="mb-8 max-w-3xl mx-auto bg-white/5 backdrop-blur-lg border border-white/10 rounded-2xl p-6"
          variants={itemVariants}
        >
          <h2 className="text-2xl font-bold text-white mb-4">What We're Working On</h2>
          <ul className="text-left text-lg text-gray-200 list-disc pl-6 space-y-2">
            <li>Document Management: Upload, organize, and share your important files securely.</li>
            <li>Task & Workflow Automation: Assign, track, and complete tasks with smart reminders.</li>
            <li>Service Marketplace: Discover and request new business services from trusted providers.</li>
            <li>Advanced Analytics: Visualize your data with interactive dashboards and reports.</li>
            <li>Customizable Notifications: Stay informed with real-time alerts tailored to your needs.</li>
            <li>Seamless Integrations: Connect with your favorite tools and platforms.</li>
            <li>Modern, Responsive UI: Enjoy a beautiful, fast, and accessible experience on any device.</li>
          </ul>
        </motion.div>
        {/* Subtitle */}
        <motion.p
          className="text-xl md:text-2xl text-gray-300 mb-12 max-w-3xl mx-auto"
          variants={itemVariants}
        >
          We're cooking up something absolutely incredible! Our team is working around the clock to bring you an experience that'll revolutionize the way you work.
        </motion.p>

        {/* Features Grid */}
        <motion.div
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-12"
          variants={containerVariants}
        >
          {features.map((feature, index) => (
            <motion.div
              key={index}
              className="relative group"
              variants={itemVariants}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              <div className="absolute inset-0 bg-gradient-to-br from-purple-600/20 to-pink-600/20 rounded-2xl blur-xl group-hover:blur-2xl transition-all duration-300" />
              <div className="relative bg-white/5 backdrop-blur-lg border border-white/10 rounded-2xl p-6 hover:border-purple-400/50 transition-all duration-300">
                <motion.div
                  className="text-purple-400 mb-4 flex justify-center"
                  animate={{
                    rotate: [0, 5, -5, 0]
                  }}
                  transition={{
                    duration: 2,
                    repeat: Infinity,
                    delay: index * 0.2
                  }}
                >
                  {feature.icon}
                </motion.div>
                <h3 className="text-lg font-bold text-white mb-2">{feature.title}</h3>
                <p className="text-sm text-gray-400">{feature.description}</p>
              </div>
            </motion.div>
          ))}
        </motion.div>

        {/* Progress Indicator */}
        <motion.div
          className="max-w-2xl mx-auto"
          variants={itemVariants}
        >
          <div className="bg-white/5 backdrop-blur-lg border border-white/10 rounded-2xl p-8">
            <div className="flex items-center justify-between mb-4">
              <span className="text-lg font-semibold text-white">Development Progress</span>
              <span className="text-2xl font-bold bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent">85%</span>
            </div>
            <div className="relative h-4 bg-white/10 rounded-full overflow-hidden">
              <motion.div
                className="absolute inset-y-0 left-0 bg-gradient-to-r from-purple-500 via-pink-500 to-blue-500 rounded-full"
                initial={{ width: 0 }}
                animate={{ width: "85%" }}
                transition={{
                  duration: 2,
                  ease: "easeOut",
                  delay: 1
                }}
              />
              <motion.div
                className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent"
                animate={{
                  x: ["-100%", "200%"]
                }}
                transition={{
                  duration: 2,
                  repeat: Infinity,
                  ease: "linear"
                }}
              />
            </div>
            <p className="text-sm text-gray-400 mt-4 text-center">
              Almost there! We're putting the finishing touches on something extraordinary.
            </p>
          </div>
        </motion.div>

        {/* Call to Action removed as per user request */}
      </motion.div>
    </div>
  );
};

export default ComingSoon;
