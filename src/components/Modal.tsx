import React, { ReactNode } from "react";
import { X } from "lucide-react";

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  children: ReactNode;
}

export default function Modal({ isOpen, onClose, children }: ModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-gradient-to-br from-nuvia-deep/80 via-nuvia-mauve/70 to-nuvia-rose/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-2xl max-w-md w-full max-h-[90vh] overflow-y-auto relative shadow-nuvia-strong border border-nuvia-peach/20">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-nuvia-mauve hover:text-nuvia-deep hover:bg-nuvia-peach/10 rounded-full p-1 z-10 transition-all duration-300"
        >
          <X className="w-6 h-6" />
        </button>
        {children}
      </div>
    </div>
  );
}
