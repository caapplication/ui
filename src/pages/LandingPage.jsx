import React from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
    ShieldCheck,
    PieChart,
    FileText,
    ArrowRight,
    CheckCircle,
    Menu,
    X,
    CreditCard,
    Building,
    Users,
    Clock,
    Zap,
    Globe,
    Layers,
    Lock,
} from "lucide-react";
import { FaArrowUp, FaSlack } from "react-icons/fa";
import { Button } from "@/components/ui/button";
import dashboardImage from "../../public/dashboard.jpg";

const LandingPage = () => {
    const navigate = useNavigate();
    const [mobileMenuOpen, setMobileMenuOpen] = React.useState(false);

    const containerVariants = {
        hidden: { opacity: 0 },
        visible: {
            opacity: 1,
            transition: { staggerChildren: 0.1, delayChildren: 0.1 },
        },
    };

    const itemVariants = {
        hidden: { y: 20, opacity: 0 },
        visible: {
            y: 0,
            opacity: 1,
            transition: { type: "spring", stiffness: 100 },
        },
    };

    return (
        <div className="min-h-screen bg-[#0B1026] text-white selection:bg-cyan-500/30 font-sans overflow-x-hidden">
            {/* Ambient Background Glows */}
            <div className="fixed bottom-[-20%] right-[-10%] w-[50%] h-[50%] bg-cyan-600/20 rounded-full blur-[120px] pointer-events-none" />
            <div className="fixed top-[-20%] left-[-10%] w-[50%] h-[50%] bg-blue-600/30 rounded-full blur-[120px] pointer-events-none" />

            {/* Glass Navbar */}
            <nav className="fixed top-0 inset-x-0 mx-auto w-full max-w-[1440px] z-50 h-20 flex items-center justify-between px-4 lg:px-12 mt-4 md:mt-6">
                <div className="absolute inset-0 bg-white/[0.03] backdrop-blur-xl border border-white/[0.05] rounded-full mx-4 md:mx-8 shadow-2xl shadow-black/20" />

                <div className="relative z-10 flex items-center justify-between w-full mx-4">
                    <div className="flex items-center gap-3">
                        <img src="/logo.png" alt="logo" className="w-11 h-11" />
                    </div>

                    {/* Desktop Menu */}
                    <div className="hidden lg:flex items-center gap-1 bg-black/20 backdrop-blur-md rounded-full p-1 border border-white/5">
                        <NavLink href="#overview">Overview</NavLink>
                        <NavLink href="#problems">Challenges</NavLink>
                        <NavLink href="#features">Features</NavLink>
                        <NavLink href="#use-cases">Use Cases</NavLink>
                    </div>

                    <div className="hidden md:flex items-center gap-4">
                        <Button
                            className="bg-white text-blue-950 hover:bg-blue-50 rounded-full text-white px-8 shadow-lg shadow-blue-500/20 transition-all hover:scale-105"
                            onClick={() => navigate("/login")}
                        >
                            Log in
                        </Button>
                    </div>

                    {/* Mobile Menu Button */}
                    <div className="md:hidden">
                        <button
                            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                            className="p-2 text-white/80"
                        >
                            {mobileMenuOpen ? <X /> : <Menu />}
                        </button>
                    </div>
                </div>
            </nav>

            {/* Mobile Menu Overlay */}
            <AnimatePresence>
                {mobileMenuOpen && (
                    <motion.div
                        initial={{ opacity: 0, y: -20 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -20 }}
                        transition={{ duration: 0.3, ease: "easeInOut" }}
                        className="fixed inset-0 z-40 bg-[#0B1026]/95 backdrop-blur-2xl pt-32 px-6 md:hidden"
                    >
                        <div className="flex flex-col gap-6 text-xl text-center">
                            <a
                                href="#overview"
                                className="text-white/80"
                                onClick={() => setMobileMenuOpen(false)}
                            >
                                Overview
                            </a>
                            <a
                                href="#problems"
                                className="text-white/80"
                                onClick={() => setMobileMenuOpen(false)}
                            >
                                Challenges
                            </a>
                            <a
                                href="#features"
                                className="text-white/80"
                                onClick={() => setMobileMenuOpen(false)}
                            >
                                Features
                            </a>
                            <a
                                href="#use-cases"
                                className="text-white/80"
                                onClick={() => setMobileMenuOpen(false)}
                            >
                                Use Cases
                            </a>
                            <Button
                                className="w-full bg-white text-blue-950 rounded-full h-12"
                                onClick={() => navigate("/login")}
                            >
                                Log In
                            </Button>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Hero Section */}
            <section
                id="overview"
                className="relative pt-40 lg:pt-48 pb-20 overflow-hidden min-h-screen flex items-center justify-center"
            >
                <motion.div
                    variants={containerVariants}
                    initial="hidden"
                    animate="visible"
                    className="container mx-auto px-4 text-center relative z-10"
                >
                    <motion.div
                        variants={itemVariants}
                        className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-blue-500/10 backdrop-blur-md border border-blue-400/20 text-sm text-blue-200 mb-8 shadow-inner shadow-blue-500/10"
                    >
                        <span className="relative flex h-2 w-2">
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-cyan-400 opacity-75"></span>
                            <span className="relative inline-flex rounded-full h-2 w-2 bg-cyan-500"></span>
                        </span>
                        <span className="font-medium">Smart Accounting Operations</span>
                    </motion.div>

                    <motion.h1
                        variants={itemVariants}
                        className="text-4xl md:text-6xl lg:text-7xl font-semibold tracking-tight leading-[1.1] mb-8"
                    >
                        {" "}
                        <span className="inline-block bg-clip-text text-transparent bg-gradient-to-b from-white via-white to-blue-200/40">
                            {" "}
                            Simplify Your Accounts.{" "}
                        </span>{" "}
                        <br />{" "}
                        <span className="inline-block bg-clip-text text-transparent bg-gradient-to-b from-blue-300 via-cyan-300 to-blue-200/10">
                            {" "}
                            Connect Your Business{" "}
                        </span>{" "}
                        <br />{" "}
                        <span className="inline-block bg-clip-text text-transparent bg-gradient-to-b from-blue-300 via-cyan-300 to-blue-200/10">
                            {" "}
                            with Chartered Accountants.{" "}
                        </span>{" "}
                    </motion.h1>

                    <motion.p
                        variants={itemVariants}
                        className="text-sm md:text-lg text-blue-200/50 max-w-5xl mx-auto mb-6 font-normal italic text-center leading-normal lg:leading-relaxed"
                    >
                        Fynivo is a cloud-based accounting and compliance collaboration
                        platform built to simplify day-to-day accounting operations for
                        businesses while enabling seamless remote working with Chartered
                        Accountants and accounting firms. It bridges the long-standing gap
                        between business owners and accounting professionals by replacing
                        fragmented tools, high capital costs, and manual coordination with
                        one unified, intelligent system.
                    </motion.p>

                    <motion.div
                        variants={itemVariants}
                        className="flex flex-col sm:flex-row items-center justify-center gap-4"
                    >
                        <Button
                            size="md"
                            className="w-full sm:w-auto text-lg h-14 px-8 rounded-full text-white hover:bg-blue-50 shadow-[0_0_40px_-10px_rgba(255,255,255,0.3)] transition-all hover:scale-105"
                            onClick={() => navigate("/login")}
                        >
                            Request Demo
                        </Button>
                        {/* <Button
                            size="md"
                            variant="ghost"
                            className="w-full sm:w-auto text-lg h-14 px-8 rounded-full border border-blue-200/10 bg-blue-500/5 hover:bg-blue-500/10 text-white backdrop-blur-sm transition-all"
                        >
                            Watch Demo <ArrowRight className="ml-2 h-4 w-4 opacity-70" />
                        </Button> */}
                    </motion.div>

                    {/* Glass Bento Card for Preview - Static no scroll animation */}
                    <motion.div
                        variants={itemVariants}
                        className="mt-20 mx-auto max-w-6xl lg:px-4"
                    >
                        <div className="relative border border-white/10 p-1 lg:p-2 rounded-3xl bg-blue-400/10">
                            <div className="relative rounded-[15px] bg-[#0B1026]/40 backdrop-blur-xl border border-white/10 overflow-hidden shadow-2xl">
                                <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-blue-400/20 to-transparent" />
                                <img
                                    src={dashboardImage}
                                    alt="Dashboard"
                                    className="w-full h-auto opacity-90"
                                />

                                <div className="absolute inset-0 bg-gradient-to-tr from-blue-500/5 to-transparent pointer-events-none" />
                            </div>
                        </div>
                    </motion.div>
                </motion.div>
            </section>

            {/* The Hard Truth Section */}
            <section
                id="problems"
                className=" py-16 lg:py-28 relative overflow-hidden bg-white/[0.02]"
            >
                <div className="container mx-auto px-4">
                    <div className="grid md:grid-cols-2 gap-16 items-center">
                        <div>
                            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-red-500/10 border border-red-500/20 text-sm text-red-300 mb-6">
                                <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
                                The Reality Businesses Face Today
                            </div>
                            <h2 className="text-3xl md:text-5xl font-semibold mb-6 !leading-[1.3] bg-clip-text text-transparent bg-gradient-to-r from-blue-300 via-cyan-300 to-sky-300">
                                Running a finance department is{" "}
                                <span className="text-white">
                                    no longer just about bookkeeping.
                                </span>
                            </h2>
                            <p className="text-md md:text-xl text-white/50 mb-8">
                                It's about speed, accuracy, compliance, and visibility. But most
                                businesses are stuck with broken models.
                            </p>

                            <div className="space-y-6">
                                <div className="p-6 rounded-2xl bg-white/5 border border-white/10">
                                    <h3 className="text-lg font-semibold mb-2">
                                        Most businesses burn lakhs every year on:
                                    </h3>
                                    <ul className="space-y-3">
                                        {[
                                            "Skilled accounting staff that’s hard to hire",
                                            "Office space, systems, hardware, and licensed software",
                                            "Multiple tools that don’t talk to each other",
                                            "Follow-ups with CAs spread across email, calls, and WhatsApp",
                                        ].map((item, i) => (
                                            <li
                                                key={i}
                                                className="flex items-start gap-3 text-white/70"
                                            >
                                                <X className="w-5 h-5 text-red-400 mt-0.5 shrink-0" />
                                                {item}
                                            </li>
                                        ))}
                                    </ul>
                                </div>
                                <p className="text-red-300 italic p-4 border-l-2 border-red-500/30 bg-red-500/5">
                                    "And still—accounts are late, audits are stressful, and
                                    visibility is poor."
                                </p>
                            </div>
                        </div>

                        <div className="relative">
                            {/* <div className="absolute inset-0 bg-gradient-to-tr from-red-500/20 to-orange-500/20 rounded-[40px] blur-[100px] -z-10" /> */}
                            <div className="p-6 lg:p-10 rounded-[40px] border border-white/10 bg-[#0B1026]/60 backdrop-blur-xl relative overflow-hidden group">
                                <div className="absolute top-0 right-0 p-8 opacity-10 group-hover:opacity-20 transition-opacity">
                                    {/* <Layers className="w-48 h-48" /> */}
                                    <FaSlack className="w-48 h-48" />
                                </div>
                                <h3 className="text-3xl font-semibold mb-6">
                                    The Fynivo Vision
                                </h3>
                                <p className="text-lg text-white/60 mb-8 leading-relaxed">
                                    Fynivo reimagine how accounting is done. Instead of building
                                    heavy in-house finance teams, businesses can operate a{" "}
                                    <span className="text-white font-medium">
                                        lean, cloud-driven finance function
                                    </span>
                                    , powered by remote Chartered Accountants, all working inside
                                    one secure digital ecosystem.
                                </p>
                                <Button
                                    asChild
                                    className="w-full lg:w-1/2 m-auto bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 h-12 text-sm lg:text-lg"
                                >
                                    <a
                                        href="https://wa.me/+918300803603?text=I%20just%20want%20to%20know%20about%20Fynivo"
                                        target="_blank"
                                        rel="noopener noreferrer"
                                    >
                                        Switch to the Future &nbsp;{" "}
                                        <svg
                                            xmlns="http://www.w3.org/2000/svg"
                                            width="24"
                                            height="24"
                                            viewBox="0 0 24 24"
                                            fill="none"
                                            stroke="currentColor"
                                            stroke-width="2"
                                            stroke-linecap="round"
                                            stroke-linejoin="round"
                                            class="icon icon-tabler icons-tabler-outline icon-tabler-arrow-right"
                                        >
                                            <path stroke="none" d="M0 0h24v24H0z" fill="none" />
                                            <path d="M5 12l14 0" />
                                            <path d="M13 18l6 -6" />
                                            <path d="M13 6l6 6" />
                                        </svg>
                                    </a>
                                </Button>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            {/* Core Capabilities Section */}
            <section
                id="features"
                className="py-16 lg:py-28 relative overflow-hidden"
            >
                <div className="container mx-auto px-4">
                    <div className="mb-20 text-center max-w-4xl mx-auto">
                        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-blue-500/10 border border-blue-500/20 text-sm text-blue-300 mb-6 font-medium">
                            Core Capabilities
                        </div>
                        <h2 className="text-3xl md:text-5xl font-semibold mb-6 bg-clip-text text-transparent  bg-gradient-to-b from-blue-300 via-cyan-300 to-blue-200/10">
                            How Fynivo Works
                        </h2>
                        <p className="text-white/50 text-base lg:text-xl font-light">
                            A unified interface where businesses upload data, CAs audit
                            remotely, and collaboration happens in real-time. No emails. No
                            file chaos. No follow-ups lost in WhatsApp
                        </p>
                    </div>

                    <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                        <FeatureCard
                            icon={<Layers className="text-blue-400" />}
                            title="1. Unified Accounting Workspace"
                            description="Vouchers, Invoices, Tasks, Documents, Notices, and Compliance activities all under one searchable dashboard."
                        />
                        <FeatureCard
                            icon={<Users className="text-cyan-400" />}
                            title="2. Sealess Business–CA Collaboration"
                            description="Real-time collaboration on the same data. Clear task allocation, chat linked to documents, and faster closures."
                        />
                        <FeatureCard
                            icon={<CreditCard className="text-blue-400" />}
                            title="3. Significant Cost Reduction"
                            description="Slash capital expenses on teams, offices, and hardware. Convert fixed finance costs into scalable operating costs."
                        />
                        <FeatureCard
                            icon={<Globe className="text-indigo-400" />}
                            title="4. Cloud-Based & Always Accessible"
                            description="Secure cloud infrastructure accessible anytime, anywhere with role-based controls and full audit trails."
                        />
                        <FeatureCard
                            icon={<Clock className="text-sky-400" />}
                            title="5. Task & Compliance Management"
                            description="Automated tracking of recurring compliance, centralized notice management, and clear deadline visibility."
                        />
                        <FeatureCard
                            icon={<CheckCircle className="text-teal-400" />}
                            title="6. Audit-Ready by Design"
                            description="Organized, tagged vouchers and invoices with clear documentation trails for faster audit cycles."
                        />
                    </div>
                </div>
            </section>

            {/* Use Cases Section */}
            <section
                id="use-cases"
                className="py-16 lg:py-28 relative overflow-hidden bg-white/[0.02]"
            >
                <div className="absolute top-0 right-[-10%] w-[50%] h-[50%] bg-blue-600/10 rounded-full blur-[120px] pointer-events-none" />
                <div className="container mx-auto px-4">
                    <div className="mb-16 text-center">
                        <h2 className="text-3xl md:text-5xl font-semibold mb-6 bg-clip-text text-transparent  bg-gradient-to-b from-blue-300 via-cyan-300 to-blue-200/10">
                            Who is Fynivo For?
                        </h2>
                        <p className="text-white/50 text-base lg:text-xl font-light">
                            Tailored solutions for every stakeholder in the ecosystem.
                        </p>
                    </div>

                    <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
                        <PersonaCard
                            title="Business Owners & Founders"
                            icon={<Building className="w-8 h-8 text-blue-400" />}
                            items={[
                                "Tired of finance overheads",
                                "Want control without micromanagement",
                                "Need faster, cleaner financial visibility",
                            ]}
                        />
                        <PersonaCard
                            title="Growing Companies"
                            icon={<Zap className="w-8 h-8 text-cyan-400" />}
                            items={[
                                "Scaling without scaling costs",
                                "Moving to remote and cloud operations",
                                "Reducing dependency on in-house teams",
                            ]}
                        />
                        <PersonaCard
                            title="Chartered Accountants"
                            icon={<ShieldCheck className="w-8 h-8 text-indigo-400" />}
                            items={[
                                "Manage multiple clients effortlessly",
                                "Eliminate operational clutter",
                                "Deliver faster, better service",
                            ]}
                        />
                    </div>
                </div>
            </section>

            {/* Why Switch Section */}
            <section className="py-16 lg:py-24 relative">
                <div className="container mx-auto px-4">
                    <div className="bg-gradient-to-r from-blue-900/40 to-indigo-900/40 border border-white/10 rounded-[3rem] py-10 px-4 lg:px-6 md:p-20 text-center relative overflow-hidden">
                        {/* <div className="absolute top-0 left-0 w-full h-full bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-20" /> */}

                        <h2 className="text-3xl md:text-5xl !leading-[1.3] font-bold mb-8 lg:mb-12 relative z-10 bg-clip-text text-transparent  bg-gradient-to-b from-blue-300 via-cyan-300 to-blue-200/10">
                            Why Businesses Are Switching
                        </h2>

                        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2 md:gap-6 lg:gap-8 relative z-10  lg:mb-16 mb-8">
                            {[
                                "Lower costs",
                                "Faster accounting cycles",
                                "Better coordination",
                                "Zero operational chaos",
                                "Complete visibility",
                                "Higher efficiency",
                                "Compliance confidence",
                                "Focus on growth",
                            ].map((benefit, i) => (
                                <div key={i} className="[perspective:1200px]">
                                    <div
                                        className="
          group relative overflow-hidden
          p-4 rounded-2xl h-full    
          bg-white/[0.08] border border-white/[0.18]
          backdrop-blur-2xl
          shadow-[0_25px_80px_-35px_rgba(0,0,0,0.85)]
          transition-all duration-300
          hover:bg-white/[0.12]
          hover:shadow-[0_35px_110px_-45px_rgba(0,0,0,0.9)]
          hover:[transform:translateY(-6px)_rotateX(6deg)_rotateY(-8deg)]
        "
                                    >
                                        {/* Specular highlight (top-left light) */}
                                        <div
                                            className="pointer-events-none absolute inset-0 opacity-70 group-hover:opacity-90 transition-opacity
                        bg-gradient-to-br from-white/30 via-white/10 to-transparent"
                                        />

                                        {/* Edge glow */}
                                        <div className="pointer-events-none absolute inset-0 rounded-2xl ring-1 ring-white/20" />

                                        {/* Soft light blobs */}
                                        <div className="pointer-events-none absolute -top-20 -left-20 h-52 w-52 rounded-full bg-white/20 blur-3xl" />
                                        <div className="pointer-events-none absolute -bottom-24 -right-24 h-56 w-56 rounded-full bg-white/10 blur-3xl" />

                                        {/* Gloss streak */}
                                        <div
                                            className="pointer-events-none absolute top-0 left-[-40%] h-full w-[60%] rotate-12
                        bg-gradient-to-r from-transparent via-white/12 to-transparent
                        opacity-0 group-hover:opacity-100 transition-opacity duration-300"
                                        />

                                        {/* Content */}
                                        <p className="relative font-semibold text-sm lg:text-lg flex justify-center items-center h-full text-white/90 tracking-tight">
                                            {benefit}
                                        </p>
                                    </div>
                                </div>
                            ))}
                        </div>

                        <blockquote className="text-lg md:text-2xl italic text-white/80 font-light mb-8">
                            “This is not another accounting tool. This is a new way to run
                            finance.”
                        </blockquote>
                        {/* <p className="text-blue-300 font-semibold tracking-wide uppercase text-sm">
                            Fynivo Definition
                        </p> */}
                    </div>
                </div>
            </section>

            {/* CTA Section */}
            <section className="pt-0 pb-16  relative overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-b from-transparent via-blue-900/10 to-transparent pointer-events-none" />
                <div className="container mx-auto px-4 text-center relative z-10">
                    <h2 className="text-3xl md:text-5xl font-semibold tracking-tight mb-8 bg-clip-text text-transparent bg-gradient-to-b from-white via-white to-blue-200/40">
                        Your Finance Department.
                        <br />
                        <span className="inline-block bg-clip-text text-transparent  bg-gradient-to-b from-blue-300 via-cyan-300 to-blue-200/10">
                            Simplified. Centralized. Cloud-Powered.
                        </span>
                    </h2>
                    <p className="text-md md:text-xl text-white/50 mb-12 max-w-2xl mx-auto">
                        Simplify your accounts. Let Fynivo handle the complexity.
                    </p>
                    <div className="flex items-center justify-center">
                        <a
                            href="#overview"
                            className="
      inline-flex items-center justify-center
      h-14 w-14 rounded-full
      bg-white/10 text-white
      backdrop-blur-md
      border border-white/20
      
      transition-all
      hover:bg-white/20 hover:scale-110
    "
                            aria-label="Go to overview"
                        >
                            <FaArrowUp className="text-lg" />
                        </a>
                    </div>
                </div>
            </section>

            {/* whatsapp button */}
            <div className="fixed bottom-5 right-5 z-[9999]">
                <a
                    href="https://wa.me/+918300803603?text=I%20just%20want%20to%20know%20about%20Fynivo"
                    target="_blank"
                    aria-label="Chat on WhatsApp"
                    className="flex h-14 w-14 items-center justify-center rounded-full bg-green-500 shadow-lg transition hover:scale-110 hover:bg-green-600"
                >
                    <img src="whatsapp.png" alt="WhatsApp" className="h-8 w-8" />
                </a>
            </div>

            {/* Footer */}
            <footer className="py-12 border-t border-white/10 bg-[#0B1026]">
                <div className="container mx-auto px-4 flex flex-col md:flex-row justify-between items-center gap-6">
                    <div className="flex items-center gap-2 opacity-50 hover:opacity-100 transition-opacity">
                        <div className="flex items-center gap-3">
                            <img src="/logo.png" alt="logo" className="w-11 h-11" />
                        </div>
                    </div>
                    <div className="text-white/30 text-sm">
                        © {new Date().getFullYear()} Snolep Technologies. All rights
                        reserved.
                    </div>
                    <div className="flex gap-8">
                        <a
                            href="/privacy"
                            // target="_blank"
                            className="text-white/30 hover:text-white transition-colors text-sm"
                        >
                            Privacy
                        </a>
                        <a
                            href="/terms"
                            // target="_blank"
                            className="text-white/30 hover:text-white transition-colors text-sm"
                        >
                            Terms
                        </a>
                        <a
                            href="https://wa.me/918300803603?text=I%20just%20want%20to%20know%20about%20Fynivo"
                            target="_blank"
                            className="text-white/30 hover:text-white transition-colors text-sm"
                        >
                            Contact
                        </a>
                    </div>
                </div>
            </footer>
        </div>
    );
};

const NavLink = ({ href, children }) => (
    <a
        href={href}
        className="px-5 py-2 text-sm font-medium text-white/70 hover:text-white hover:bg-white/10 hover:backdrop-blur-md rounded-full transition-all"
    >
        {children}
    </a>
);

const FeatureCard = ({ icon, title, description }) => (
    <div className="glass-3d-card p-8 rounded-3xl transition-all group duration-300">
        <div className="w-12 h-12 rounded-2xl bg-blue-500/10 flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
            {React.cloneElement(icon, {
                className: `w-6 h-6 ${icon.props.className}`,
            })}
        </div>
        <h3 className="text-xl font-semibold mb-3">{title}</h3>
        <p className="text-white/50 leading-relaxed font-light">{description}</p>
    </div>
);

const PersonaCard = ({ title, icon, items }) => (
    <div className="glass-3d-card p-8 rounded-[32px] transition-all duration-300">
        <div className="w-14 h-14 rounded-2xl bg-blue-500/10 flex items-center justify-center mb-6">
            {icon}
        </div>
        <h3 className="text-2xl font-semibold mb-8">{title}</h3>
        <ul className="space-y-4">
            {items.map((item, i) => (
                <li key={i} className="flex items-start gap-3 text-white/70">
                    <CheckCircle className="w-5 h-5 text-blue-400/50 mt-0.5 shrink-0" />
                    {item}
                </li>
            ))}
        </ul>
    </div>
);

export default LandingPage;
