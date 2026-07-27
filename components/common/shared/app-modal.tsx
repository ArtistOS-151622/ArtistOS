import React from "react";
import { Sparkles, X } from "lucide-react";

import { Button } from "@/components/ui/button";

type AppModalProps = {
  open: boolean;
  title: string;
  description?: string;
  icon?: React.ReactNode;
  children: React.ReactNode;
  footer?: React.ReactNode;
  onClose: () => void;
  maxWidth?: string;
};

export function AppModal({
  open,
  title,
  description,
  icon,
  children,
  footer,
  onClose,
  maxWidth = "max-w-2xl",
}: AppModalProps) {
  if (!open) return null;

  const headerIcon = icon ?? <Sparkles className="size-5 text-[#7c3aed]" />;

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/45 backdrop-blur-[2px] sm:items-center sm:p-6 animate-in fade-in duration-200">
      <div
        role="dialog"
        aria-modal="true"
        className={`flex max-h-[90vh] w-full ${maxWidth} flex-col border border-slate-200/80 bg-white shadow-2xl overflow-hidden rounded-t-[1.75rem] sm:rounded-[1.75rem] animate-in slide-in-from-bottom duration-300 ease-out`}
      >
        {/* Drag handle - mobile only */}
        <div className="flex shrink-0 justify-center pt-3 pb-1 sm:hidden">
          <div className="h-1 w-10 rounded-full bg-slate-200" />
        </div>

        {/* Modal Header - White background with Icon */}
        <div className="flex shrink-0 items-center justify-between gap-2 border-b border-slate-200/60 bg-white p-5 sm:px-6 sm:py-4">
          <div className="flex items-center gap-3.5">
            {headerIcon ? (
              <span className="flex size-12 shrink-0 items-center justify-center rounded-xl bg-purple-50 text-[#7c3aed] border border-purple-100/60 shadow-xs">
                {headerIcon}
              </span>
            ) : null}
            <div>
              <h2
                className="text-lg font-semibold text-slate-900"
                style={{ lineHeight: "16px" }}
              >
                {title}
              </h2>
              {description ? (
                <p
                  className="mt-1 text-xs text-slate-500 font-medium"
                  style={{ lineHeight: "16px" }}
                >
                  {description}
                </p>
              ) : null}
            </div>
          </div>
          <Button
            variant="ghost"
            size="icon-sm"
            onClick={onClose}
            aria-label="Close modal"
            className="rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
          >
            <X className="size-5" />
          </Button>
        </div>

        {/* Modal Content - White background, scrolls between header and footer */}
        <div className="flex-1 min-h-0 overflow-y-auto p-5 sm:p-6 bg-white">
          {children}
        </div>

        {/* Modal Footer - White background for buttons */}
        {footer ? (
          <div className="flex shrink-0 items-center justify-end gap-3 border-t border-slate-100 bg-white p-4 sm:px-6 sm:py-4">
            {footer}
          </div>
        ) : null}
      </div>
    </div>
  );
}
