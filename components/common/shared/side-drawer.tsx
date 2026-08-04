"use client";

import React from "react";
import { FolderPlus, X } from "lucide-react";
import { Button } from "@/components/ui/button";

type SideDrawerProps = {
  open: boolean;
  title: string;
  description?: string;
  icon?: React.ReactNode;
  children: React.ReactNode;
  footer?: React.ReactNode;
  onClose: () => void;
  side?: "left" | "right";
  maxWidth?: string;
};

export function SideDrawer({
  open,
  title,
  description,
  icon,
  children,
  footer,
  onClose,
  side = "right",
  maxWidth = "max-w-md sm:max-w-lg",
}: SideDrawerProps) {
  if (!open) return null;

  const headerIcon = icon ?? <FolderPlus className="size-5 text-white" />;
  const slideAnimation =
    side === "left" ? "slide-in-from-left" : "slide-in-from-right";
  const roundedCorners =
    side === "right" ? "rounded-l-[2rem] rounded-r-none" : "rounded-r-[2rem] rounded-l-none";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center animate-in fade-in duration-200">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-slate-950/50 backdrop-blur-xs transition-opacity"
        onClick={onClose}
      />

      {/* Drawer Container (70% Screen Height, Flush to Edge) */}
      <div
        className={`fixed top-1/2 -translate-y-1/2 ${side}-0 z-50 flex h-[70vh] w-full ${maxWidth} flex-col ${roundedCorners} border-y border-${side === "right" ? "l" : "r"} border-slate-200/80 bg-white shadow-2xl overflow-hidden animate-in ${slideAnimation} duration-300 ease-out`}
      >
        {/* Header */}
        <div className="flex shrink-0 items-center justify-between gap-3 border-b border-slate-100 bg-slate-50/60 p-5 sm:px-6 sm:py-5 backdrop-blur-md">
          <div className="flex items-center gap-3.5">
            {headerIcon && (
              <span className="flex size-12 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-[#8b5cf6] to-[#7c3aed] text-white shadow-md shadow-purple-600/25">
                {headerIcon}
              </span>
            )}
            <div>
              <h2 className="text-base sm:text-lg font-extrabold text-slate-900 leading-snug">
                {title}
              </h2>
              {description && (
                <p className="mt-0.5 text-xs text-slate-500 font-medium leading-relaxed">
                  {description}
                </p>
              )}
            </div>
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={onClose}
            aria-label="Close drawer"
            className="size-9 rounded-2xl text-slate-400 hover:text-slate-700 hover:bg-slate-200/60 transition-colors shrink-0"
          >
            <X className="size-4" />
          </Button>
        </div>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto p-5 sm:p-6 bg-slate-50/30 space-y-6">
          {children}
        </div>

        {/* Footer */}
        {footer && (
          <div className="flex shrink-0 items-center justify-end gap-3 border-t border-slate-100 bg-white p-4 sm:px-6 sm:py-4">
            {footer}
          </div>
        )}
      </div>
    </div>
  );
}
