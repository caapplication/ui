import React from 'react';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';

const PrivacyPolicy = () => {
    return (
        <div className="min-h-screen bg-[#0B1026] text-white selection:bg-cyan-500/30 font-sans overflow-x-hidden">
            {/* Background elements similar to LandingPage */}
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
                        Privacy Policy
                    </h1>
                    <p className="text-white/50 mb-12 text-lg">
                        Last Updated: {new Date().toLocaleDateString()}
                    </p>

                    <div className="space-y-12 text-white/80 leading-relaxed">
                        <section>
                            <h2 className="text-2xl font-semibold mb-4 text-white">1. Introduction</h2>
                            <p className="mb-4">
                                Welcome to Fynivo ("we," "our," or "us"). We are committed to protecting your personal information and your right to privacy.
                                This Privacy Policy explains how we collect, use, disclose, and safeguard your information when you use our cloud-based accounting
                                and compliance collaboration platform (the "Platform").
                            </p>
                            <p>
                                By accessing or using Fynivo, you agree to the terms of this Privacy Policy. If you do not agree with the terms of this policy,
                                please do not access the Platform.
                            </p>
                        </section>

                        <section>
                            <h2 className="text-2xl font-semibold mb-4 text-white">2. Information We Collect</h2>
                            <p className="mb-4">We collect information that you actively provide to us when you register on the Platform, express an interest in obtaining information about us or our products and services, or otherwise contact us.</p>
                            <ul className="list-disc pl-6 space-y-2 text-white/70">
                                <li><strong>Personal Identification Data:</strong> Name, email address, phone number, and job title.</li>
                                <li><strong>Business Data:</strong> Company name, GSTIN, PAN, financial records, invoices, bank statements, and other accounting documents uploaded to the Platform.</li>
                                <li><strong>Account Credentials:</strong> Passwords, hints, and similar security information used for authentication and account access.</li>
                            </ul>
                        </section>

                        <section>
                            <h2 className="text-2xl font-semibold mb-4 text-white">3. How We Use Your Information</h2>
                            <p className="mb-4">We use the information we collect or receive to:</p>
                            <ul className="list-disc pl-6 space-y-2 text-white/70">
                                <li><strong>Facilitate Account Creation and Logon Process:</strong> To manage your account and allow you to log in.</li>
                                <li><strong>Provide Accounting Services:</strong> To enable the storing, managing, and processing of your financial data and to facilitate collaboration with Chartered Accountants.</li>
                                <li><strong>Compliance and Auditing:</strong> To help ensure your business meets its regulatory and statutory obligations.</li>
                                <li><strong>Communication:</strong> To send you administrative information, such as product, service, and new feature information, and/or information about changes to our terms, conditions, and policies.</li>
                            </ul>
                        </section>

                        <section>
                            <h2 className="text-2xl font-semibold mb-4 text-white">4. Data Sharing and Disclosure</h2>
                            <p className="mb-4">
                                We do not share, sell, rent, or trade your information with third parties for their promotional purposes. We may share information with:
                            </p>
                            <ul className="list-disc pl-6 space-y-2 text-white/70">
                                <li><strong>Collaborating Chartered Accountants:</strong> Your financial data is shared with the CAs you explicitly authorize to work on your accounts within the Platform.</li>
                                <li><strong>Service Providers:</strong> We may share your data with third-party vendors, service providers, contractors, or agents who perform services for us or on our behalf (e.g., cloud hosting, data analysis).</li>
                                <li><strong>Legal Obligations:</strong> We may disclose information where we are legally required to do so in order to comply with applicable law, governmental requests, a judicial proceeding, court order, or legal process.</li>
                            </ul>
                        </section>

                        <section>
                            <h2 className="text-2xl font-semibold mb-4 text-white">5. Data Security</h2>
                            <p>
                                We use administrative, technical, and physical security measures to help protect your personal and financial information.
                                Fynivo utilizes secure cloud infrastructure with encryption protocols to ensure your data remains safe and confidential.
                                However, please also remember that we cannot guarantee that the internet itself is 100% secure.
                            </p>
                        </section>

                        <section>
                            <h2 className="text-2xl font-semibold mb-4 text-white">6. Your Privacy Rights</h2>
                            <p>
                                You have the right to review, change, or terminate your account at any time. If you wish to delete your account or request the removal of specific data,
                                please contact our support team. Upon your request to terminate your account, we will deactivate or delete your account and information from our active databases,
                                subject to data retention required by law for financial records.
                            </p>
                        </section>

                        <section>
                            <h2 className="text-2xl font-semibold mb-4 text-white">7. Updates to This Policy</h2>
                            <p>
                                We may update this privacy policy from time to time. The updated version will be indicated by an updated "Revised" date and the updated version will be effective as soon as it is accessible.
                            </p>
                        </section>

                        <section>
                            <h2 className="text-2xl font-semibold mb-4 text-white">8. Contact Us</h2>
                            <p>
                                If you have questions or comments about this policy, you may email us at support@fynivo.com or contact us by post at:
                            </p>
                            <address className="mt-4 not-italic text-white/70">
                                Snolep Technologies<br />
                                India
                            </address>
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

export default PrivacyPolicy;
