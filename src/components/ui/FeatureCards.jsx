import React from "react";
import { Code, Palette, Zap, Globe } from "lucide-react";

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

const FeatureCards = () => (
  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 mb-12 max-w-7xl mx-auto">
    {features.map((feature, index) => (
      <div
        key={index}
        className="relative group bg-white/5 backdrop-blur-lg border border-white/10 rounded-2xl p-6 hover:border-purple-400/50 transition-all duration-300 text-center min-w-[220px]"
      >
        <div className="text-purple-400 mb-4 flex justify-center">
          {feature.icon}
        </div>
        <h3 className="text-lg font-bold text-white mb-2">{feature.title}</h3>
        <p className="text-sm text-gray-400">{feature.description}</p>
      </div>
    ))}
  </div>
);

export default FeatureCards;
