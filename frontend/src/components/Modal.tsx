import React, { useCallback, useEffect, useId, useRef, useState } from "react";
import { X } from "./icons";

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
  size?: "sm" | "md" | "lg" | "xl";
  className?: string;
  loading?: boolean;
  skeletonLines?: number;
  enterDelay?: number;
}

const SKELETON_LINE_PATTERNS = [
  { label: "w-20", input: "w-full" },
  { label: "w-24", input: "w-3/4" },
  { label: "w-16", input: "w-full" },
  { label: "w-28", input: "w-1/2" },
  { label: "w-20", input: "w-full" },
  { label: "w-14", input: "w-full" },
];

const SkeletonLine: React.FC<{ labelW: string; inputW: string }> = ({
  labelW,
  inputW,
}) => (
  <div className="flex flex-col gap-1.5">
    <div className={`skeleton h-3 ${labelW}`} />
    <div className={`skeleton h-9 ${inputW}`} />
  </div>
);

export const Modal: React.FC<ModalProps> = ({
  isOpen,
  onClose,
  title,
  children,
  footer,
  size = "md",
  className = "",
  loading = false,
  skeletonLines = 4,
  enterDelay = 0,
}) => {
  const [closing, setClosing] = useState(false);
  const closingRef = useRef(false);
  const titleId = useId();

  const handleClose = useCallback(() => {
    if (closingRef.current) return;
    closingRef.current = true;
    setClosing(true);
    setTimeout(() => {
      onClose();
    }, 200);
  }, [onClose]);

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
      closingRef.current = false;
      setClosing(false);
    } else {
      document.body.style.overflow = "";
      setClosing(false);
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") handleClose();
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [isOpen, handleClose]);

  if (!isOpen && !closing) return null;

  const sizeClasses = {
    sm: "modal-box-sm",
    md: "",
    lg: "modal-box-lg",
    xl: "modal-box-xl",
  };

  const delayStyle = enterDelay > 0
    ? { animationDelay: `${enterDelay}ms`, opacity: 0 }
    : undefined;

  const pattern = SKELETON_LINE_PATTERNS.slice(0, skeletonLines);

  return (
    <div
      className={`modal-backdrop${closing ? " modal-closing" : ""}`}
      onClick={handleClose}
      style={delayStyle}
      role="dialog"
      aria-modal="true"
      aria-labelledby={titleId}
    >
      <div
        className={`modal-box ${sizeClasses[size]}${closing ? " modal-box-closing" : ""} ${className}`}
        onClick={(e) => e.stopPropagation()}
        style={delayStyle}
      >
        <div className="modal-header">
          {loading ? (
            <div className="skeleton h-5 w-40" />
          ) : (
            <h3 id={titleId} className="modal-title">{title}</h3>
          )}
          <button
            onClick={handleClose}
            className="modal-close"
            aria-label="Close modal"
            disabled={loading}
            tabIndex={loading ? -1 : 0}
          >
            <X className="w-4 h-4" />
          </button>
        </div>
        <div className="modal-body">
          {loading ? (
            <div className="modal-skeleton">
              {pattern.map((p, i) => (
                <SkeletonLine key={i} labelW={p.label} inputW={p.input} />
              ))}
            </div>
          ) : (
            children
          )}
        </div>
        {footer && (
          <div className="modal-footer">
            {loading ? (
              <div className="flex gap-2 justify-end w-full">
                <div className="skeleton h-9 w-20" />
                <div className="skeleton h-9 w-24" />
              </div>
            ) : (
              footer
            )}
          </div>
        )}
      </div>
    </div>
  );
};
