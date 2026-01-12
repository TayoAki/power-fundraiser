"use client";

import * as React from "react";
import * as DropdownMenuPrimitive from "@radix-ui/react-dropdown-menu";
import { cn } from "@/lib/utils";
import { ChevronDown } from "lucide-react";

const Select = React.forwardRef(
    ({ children, value, onValueChange, placeholder = "Select...", className, ...props }, ref) => {
        return (
            <DropdownMenuPrimitive.Root>
                <DropdownMenuPrimitive.Trigger
                    ref={ref}
                    className={cn(
                        "flex h-10 w-full items-center justify-between rounded-lg border border-gray-200 bg-white px-4 py-2 text-sm text-gray-900 transition-all duration-200 placeholder:text-gray-400 focus:border-gold-500 focus:outline-none focus:ring-2 focus:ring-gold-500/20 disabled:cursor-not-allowed disabled:opacity-50",
                        className
                    )}
                    {...props}
                >
                    <span className={!value ? "text-gray-400" : ""}>
                        {value || placeholder}
                    </span>
                    <ChevronDown className="h-4 w-4 text-gray-400" />
                </DropdownMenuPrimitive.Trigger>
                <DropdownMenuPrimitive.Portal>
                    <DropdownMenuPrimitive.Content
                        className="z-50 min-w-[8rem] overflow-hidden rounded-lg border bg-white shadow-lg data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95"
                        sideOffset={4}
                    >
                        {children}
                    </DropdownMenuPrimitive.Content>
                </DropdownMenuPrimitive.Portal>
            </DropdownMenuPrimitive.Root>
        );
    }
);
Select.displayName = "Select";

const SelectItem = React.forwardRef(
    ({ children, className, onSelect, ...props }, ref) => {
        return (
            <DropdownMenuPrimitive.Item
                ref={ref}
                className={cn(
                    "relative flex cursor-pointer select-none items-center px-4 py-2 text-sm text-gray-700 outline-none transition-colors focus:bg-gold-50 focus:text-gold-700 data-[disabled]:pointer-events-none data-[disabled]:opacity-50",
                    className
                )}
                onSelect={onSelect}
                {...props}
            >
                {children}
            </DropdownMenuPrimitive.Item>
        );
    }
);
SelectItem.displayName = "SelectItem";

export { Select, SelectItem };
