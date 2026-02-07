import React, { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import {
    Users,
    FileText,
    Banknote,
    Landmark,
    Plus,
    X,
    Bell,
} from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';

const GlobalFAB = () => {
    const { user } = useAuth();
    const role = user?.role;
    const [isFabOpen, setIsFabOpen] = useState(false);
    const [placement, setPlacement] = useState({ vertical: 'top', horizontal: 'left' });
    const containerRef = useRef(null);
    const constraintsRef = useRef(null);
    const navigate = useNavigate();

    const updatePlacement = () => {
        if (!containerRef.current) return;
        const rect = containerRef.current.getBoundingClientRect();
        const windowHeight = window.innerHeight;
        const windowWidth = window.innerWidth;

        // If the button's top is in the upper half of the screen, grow downwards
        const vertical = rect.top < windowHeight / 2 ? 'bottom' : 'top';
        // If the button's left is in the left half of the screen, show labels on the right
        const horizontal = rect.left < windowWidth / 2 ? 'right' : 'left';

        setPlacement({ vertical, horizontal });
    };

    const toggleFab = () => {
        if (!isFabOpen) {
            updatePlacement();
        }
        setIsFabOpen(!isFabOpen);
    };

    const allItems = [
        { label: "Beneficiaries", icon: Users, path: "/beneficiaries", state: { quickAction: 'add-beneficiary', returnToDashboard: true }, roles: ['CLIENT_MASTER_ADMIN', 'CLIENT_USER'] },
        { label: "Tasks", icon: Landmark, path: "/tasks", state: { quickAction: 'add-task', returnToDashboard: true }, roles: ['CA_ACCOUNTANT', 'CLIENT_MASTER_ADMIN', 'CLIENT_USER'] },
        { label: "Invoices", icon: FileText, path: "/finance/invoices", state: { quickAction: 'add-invoice', returnToDashboard: true }, roles: ['CLIENT_MASTER_ADMIN', 'CLIENT_USER'] },
        { label: "Vouchers", icon: Banknote, path: "/finance/vouchers", state: { quickAction: 'add-voucher', returnToDashboard: true }, roles: ['CLIENT_MASTER_ADMIN', 'CLIENT_USER'] },
        { label: "Notices", icon: Bell, path: "/notices", state: { quickAction: 'add-notice', returnToDashboard: true }, roles: ['CA_ACCOUNTANT'] },
    ];

    const fabItems = allItems.filter(item => item.roles.includes(role));

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
            <div ref={constraintsRef} className="fixed inset-0 pointer-events-none z-50">
                <motion.div
                    ref={containerRef}
                    drag
                    dragConstraints={constraintsRef}
                    dragMomentum={false}
                    onDrag={updatePlacement}
                    className="absolute bottom-6 right-6 pointer-events-none"
                >
                    <div className="relative pointer-events-auto select-none">
                        <AnimatePresence>
                            {isFabOpen && (
                                <motion.div
                                    initial={{ opacity: 0, scale: 0.8 }}
                                    animate={{ opacity: 1, scale: 1 }}
                                    exit={{ opacity: 0, scale: 0.8 }}
                                    className={`absolute flex flex-col gap-3 ${placement.horizontal === 'left' ? 'items-end' : 'items-start'}`}
                                    style={{
                                        bottom: placement.vertical === 'top' ? 'calc(100% + 1rem)' : 'auto',
                                        top: placement.vertical === 'bottom' ? 'calc(100% + 1rem)' : 'auto',
                                        right: placement.horizontal === 'left' ? 0 : 'auto',
                                        left: placement.horizontal === 'right' ? 0 : 'auto',
                                    }}
                                >
                                    {fabItems.map((item, index) => {
                                        const Icon = item.icon;
                                        return (
                                            <motion.button
                                                key={item.label}
                                                initial={{ opacity: 0, scale: 0.5 }}
                                                animate={{ opacity: 1, scale: 1 }}
                                                transition={{ delay: index * 0.05 }}
                                                onClick={() => {
                                                    navigate(item.path, { state: item.state });
                                                    setIsFabOpen(false);
                                                }}
                                                className={`flex ${placement.horizontal === 'left' ? 'flex-row' : 'flex-row-reverse'} items-center gap-3 bg-white/10 backdrop-blur-md border border-white/20 p-2 rounded-full shadow-lg hover:bg-white/20 transition-all group`}
                                            >
                                                <span className="text-xs font-medium text-white whitespace-nowrap px-2">
                                                    {item.label}
                                                </span>
                                                <div className="bg-white/10 p-2 rounded-full group-hover:bg-white/20 transition-colors">
                                                    <Icon className="w-4 h-4 text-white" />
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
                            onClick={toggleFab}
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
                </motion.div>
            </div>
        </>
    );
};

export default GlobalFAB;
