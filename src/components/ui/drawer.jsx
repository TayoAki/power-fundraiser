"use client";

import * as React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";

const DrawerContext = React.createContext({});

const Drawer = ({ children, open, onOpenChange }) => {
    return (
        <DrawerContext.Provider value={{ open, onOpenChange }}>
            {children}
        </DrawerContext.Provider>
    );
};

const DrawerTrigger = React.forwardRef(({ children, className, ...props }, ref) => {
    const { onOpenChange } = React.useContext(DrawerContext);
    return (
        <button
            ref={ref}
            onClick={() => onOpenChange?.(true)}
            className={className}
            {...props}
        >
            {children}
        </button>
    );
});
DrawerTrigger.displayName = "DrawerTrigger";

const DrawerContent = React.forwardRef(
    ({ children, className, side = "right", ...props }, ref) => {
        const { open, onOpenChange } = React.useContext(DrawerContext);

        const sideVariants = {
            right: {
                initial: { x: "100%" },
                animate: { x: 0 },
                exit: { x: "100%" },
            },
            left: {
                initial: { x: "-100%" },
                animate: { x: 0 },
                exit: { x: "-100%" },
            },
        };

        const variants = sideVariants[side] || sideVariants.right;

        return (
            <AnimatePresence>
                {open && (
                    <>
                        {/* Overlay */}
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            transition={{ duration: 0.2 }}
                            className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm"
                            onClick={() => onOpenChange?.(false)}
                        />
                        {/* Drawer */}
                        <motion.div
                            ref={ref}
                            initial={variants.initial}
                            animate={variants.animate}
                            exit={variants.exit}
                            transition={{ type: "spring", damping: 30, stiffness: 300 }}
                            className={cn(
                                "fixed z-50 bg-white shadow-2xl",
                                side === "right" && "right-0 top-0 h-full w-[400px] max-w-[90vw] border-l",
                                side === "left" && "left-0 top-0 h-full w-[400px] max-w-[90vw] border-r",
                                className
                            )}
                            {...props}
                        >
                            {children}
                        </motion.div>
                    </>
                )}
            </AnimatePresence>
        );
    }
);
DrawerContent.displayName = "DrawerContent";

const DrawerHeader = ({ className, ...props }) => (
    <div
        className={cn("flex items-center justify-between p-5 border-b", className)}
        {...props}
    />
);

const DrawerTitle = React.forwardRef(({ className, ...props }, ref) => (
    <h3
        ref={ref}
        className={cn("text-lg font-semibold text-navy-700", className)}
        {...props}
    />
));
DrawerTitle.displayName = "DrawerTitle";

const DrawerClose = React.forwardRef(({ className, ...props }, ref) => {
    const { onOpenChange } = React.useContext(DrawerContext);
    return (
        <button
            ref={ref}
            onClick={() => onOpenChange?.(false)}
            className={cn(
                "rounded-full p-2 text-gray-400 hover:bg-gray-100 hover:text-gray-600 transition-colors",
                className
            )}
            {...props}
        >
            <X className="h-5 w-5" />
        </button>
    );
});
DrawerClose.displayName = "DrawerClose";

const DrawerBody = ({ className, ...props }) => (
    <div
        className={cn("flex-1 overflow-y-auto p-5", className)}
        {...props}
    />
);

const DrawerFooter = ({ className, ...props }) => (
    <div
        className={cn("flex items-center justify-end gap-3 p-5 border-t", className)}
        {...props}
    />
);

export {
    Drawer,
    DrawerTrigger,
    DrawerContent,
    DrawerHeader,
    DrawerTitle,
    DrawerClose,
    DrawerBody,
    DrawerFooter,
};
