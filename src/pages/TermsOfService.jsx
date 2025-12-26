import React from 'react';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';

const TermsOfService = () => {
    return (
        <div className="min-h-screen bg-[#0B1026] text-white selection:bg-cyan-500/30 font-sans overflow-x-hidden">
            {/* Background elements */}
            <div className="fixed bottom-[-20%] right-[-10%] w-[50%] h-[50%] bg-cyan-600/20 rounded-full blur-[120px] pointer-events-none" />
            <div className="fixed top-[-20%] left-[-10%] w-[50%] h-[50%] bg-blue-600/30 rounded-full blur-[120px] pointer-events-none" />

            <nav className="relative z-50 flex items-center justify-between px-6 py-6 lg:px-12 max-w-7xl mx-auto">
                <Link to="/" className="flex items-center gap-2 text-white/70 hover:text-white transition-colors">
                    <ArrowLeft className="w-5 h-5" />
                    Back to Home
                </Link>
                <div className="flex items-center gap-3">
                    <img src="/logo.png" alt="logo" className="w-10 h-10" />
                </div>
            </nav>

            <main className="relative z-10 container mx-auto px-4 py-12 max-w-4xl">
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.5 }}
                >
                    <h1 className="text-4xl md:text-5xl font-bold mb-8 bg-clip-text text-transparent bg-gradient-to-r from-blue-300 via-cyan-300 to-sky-300">
                        Terms of Service
                    </h1>
                    <p className="text-white/50 mb-12 text-lg">
                        Last Updated: {new Date().toLocaleDateString()}
                    </p>

                    <div className="space-y-12 text-white/80 leading-relaxed">
                        <section>
                            <h2 className="text-2xl font-semibold mb-4 text-white">1. Agreement to Terms</h2>
                            <p>
                                By accessing or using the Fynivo platform ("Platform"), maintained by Snolep Technologies ("we," "us," or "our"), you agree to be bound by these Terms of Service.
                                If you disagree with any part of these terms, you may not access the Platform.
                            </p>
                        </section>

                        <section>
                            <h2 className="text-2xl font-semibold mb-4 text-white">2. Description of Service</h2>
                            <p className="mb-4">
                                Fynivo is a cloud-based accounting and compliance collaboration platform. We provide:
                            </p>
                            <ul className="list-disc pl-6 space-y-2 text-white/70">
                                <li>A unified workspace for businesses to upload and manage financial data.</li>
                                <li>Tools for Chartered Accountants to audit, review, and collaborate remotely.</li>
                                <li>Task management, document storage, and compliance tracking features.</li>
                            </ul>
                            <p className="mt-4">
                                We act as a facilitator connecting businesses with accounting professionals but do not ourselves provide certified public accounting advice or services unless explicitly stated otherwise.
                            </p>
                        </section>

                        <section>
                            <h2 className="text-2xl font-semibold mb-4 text-white">3. User Accounts</h2>
                            <p className="mb-4">
                                To access most features of the Platform, you must register for an account. You agree to:
                            </p>
                            <ul className="list-disc pl-6 space-y-2 text-white/70">
                                <li>Provide accurate, current, and complete information during the registration process.</li>
                                <li>Maintain the security of your password and accept all risks of unauthorized access to your account.</li>
                                <li>Notify us immediately if you discover or suspect any security breaches related to the Platform.</li>
                            </ul>
                        </section>

                        <section>
                            <h2 className="text-2xl font-semibold mb-4 text-white">4. Acceptable Use</h2>
                            <p className="mb-4">
                                You agree not to use the Platform to:
                            </p>
                            <ul className="list-disc pl-6 space-y-2 text-white/70">
                                <li>Upload or distribute any files that contain viruses, corrupted files, or any other similar software.</li>
                                <li>Violate any applicable laws or regulations, including tax and financial regulations.</li>
                                <li>Infringe upon the rights of others, including intellectual property rights.</li>
                                <li>Attempt to gain unauthorized access to any portion of the Platform.</li>
                            </ul>
                        </section>

                        <section>
                            <h2 className="text-2xl font-semibold mb-4 text-white">5. Intellectual Property</h2>
                            <p>
                                The Platform and its original content (excluding content provided by users), features, and functionality are and will remain the exclusive property of Snolep Technologies and its licensors.
                                The Service is protected by copyright, trademark, and other laws of both India and foreign countries.
                            </p>
                        </section>

                        <section>
                            <h2 className="text-2xl font-semibold mb-4 text-white">6. Limitation of Liability</h2>
                            <p>
                                To the maximum extent permitted by law, Snolep Technologies shall not be liable for any indirect, incidental, special, consequential, or punitive damages,
                                including without limitation, loss of profits, data, use, goodwill, or other intangible losses, resulting from:
                            </p>
                            <ul className="list-disc pl-6 space-y-2 text-white/70">
                                <li>Your access to or use of or inability to access or use the Service.</li>
                                <li>Any conduct or content of any third party on the Service.</li>
                                <li>Any content obtained from the Service.</li>
                                <li>Unauthorized access, use, or alteration of your transmissions or content.</li>
                            </ul>
                        </section>

                        <section>
                            <h2 className="text-2xl font-semibold mb-4 text-white">7. Termination</h2>
                            <p>
                                We may terminate or suspend your account immediately, without prior notice or liability, for any reason whatsoever, including without limitation if you breach the Terms.
                                Upon termination, your right to use the Service will immediately cease.
                            </p>
                        </section>

                        <section>
                            <h2 className="text-2xl font-semibold mb-4 text-white">8. Changes to Terms</h2>
                            <p>
                                We reserve the right, at our sole discretion, to modify or replace these Terms at any time. By continuing to access or use our Service after those revisions become effective,
                                you agree to be bound by the revised terms.
                            </p>
                        </section>

                        <section>
                            <h2 className="text-2xl font-semibold mb-4 text-white">9. Contact Us</h2>
                            <p>
                                If you have any questions about these Terms, please contact us at support@fynivo.com.
                            </p>
                        </section>
                    </div>
                </motion.div>
            </main>

            <footer className="py-8 border-t border-white/10 bg-[#0B1026] text-center text-white/30 text-sm">
                <div className="container mx-auto px-4">
                    © {new Date().getFullYear()} Snolep Technologies. All rights reserved.
                </div>
            </footer>
        </div>
    );
};

export default TermsOfService;
