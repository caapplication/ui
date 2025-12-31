import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import {
    Users,
    FileText,
    Banknote,
    Landmark,
    Plus,
    X,
} from 'lucide-react';

const GlobalFAB = () => {
    const [isFabOpen, setIsFabOpen] = useState(false);
    const navigate = useNavigate();

    const fabItems = [
        { label: "Beneficiaries", icon: Users, path: "/beneficiaries", state: { quickAction: 'add-beneficiary', returnToDashboard: true } },
        { label: "Tasks", icon: Landmark, path: "/tasks", state: { quickAction: 'add-task', returnToDashboard: true } },
        { label: "Invoices", icon: FileText, path: "/finance/invoices", state: { quickAction: 'add-invoice', returnToDashboard: true } },
        { label: "Vouchers", icon: Banknote, path: "/finance/vouchers", state: { quickAction: 'add-voucher', returnToDashboard: true } },
    ];

    return (
        <>
            <AnimatePresence>
                {isFabOpen && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={() => setIsFabOpen(false)}
                        className="fixed inset-0 z-40 bg-black/80 backdrop-blur-md"
                    />
                )}
            </AnimatePresence>
            <div className="fixed bottom-6 right-6 z-50 flex flex-col items-end gap-4 pointer-events-none">
                <div className="flex flex-col items-end gap-4 pointer-events-auto">
                    <AnimatePresence>
                        {isFabOpen && (
                            <motion.div
                                initial={{ opacity: 0, scale: 0.8, y: 20 }}
                                animate={{ opacity: 1, scale: 1, y: 0 }}
                                exit={{ opacity: 0, scale: 0.8, y: 20 }}
                                className="flex flex-col gap-3 mb-2"
                            >
                                {fabItems.map((item, index) => {
                                    const Icon = item.icon;
                                    return (
                                        <motion.button
                                            key={item.label}
                                            initial={{ opacity: 0, x: 20 }}
                                            animate={{ opacity: 1, x: 0 }}
                                            transition={{ delay: index * 0.1 }}
                                            onClick={() => {
                                                navigate(item.path, { state: item.state });
                                                setIsFabOpen(false);
                                            }}
                                            className="flex items-center gap-3 bg-white/10 backdrop-blur-md border border-white/20 p-3 rounded-full shadow-lg hover:bg-white/20 transition-all group justify-between"
                                        >
                                            <span className="text-sm font-medium text-white whitespace-nowrap px-2">
                                                {item.label}
                                            </span>
                                            <div className="bg-white/10 p-2 rounded-full group-hover:bg-white/20 transition-colors">
                                                <Icon className="w-5 h-5 text-white" />
                                            </div>
                                        </motion.button>
                                    );
                                })}
                            </motion.div>
                        )}
                    </AnimatePresence>

                    <motion.button
                        whileHover={{ scale: 1.1 }}
                        whileTap={{ scale: 0.9 }}
                        onClick={() => setIsFabOpen(!isFabOpen)}
                        className={`p-4 rounded-full shadow-lg backdrop-blur-sm transition-all duration-300 ${isFabOpen
                            ? "bg-red-500 hover:bg-red-600 rotate-90"
                            : "bg-blue-600 hover:bg-blue-700"
                            }`}
                    >
                        {isFabOpen ? (
                            <X className="w-6 h-6 text-white" />
                        ) : (
                            <Plus className="w-6 h-6 text-white" />
                        )}
                    </motion.button>
                </div>
            </div>
        </>
    );
};

export default GlobalFAB;
