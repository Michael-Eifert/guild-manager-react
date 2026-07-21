import { useEffect, useRef } from "react";
import type { ReactNode } from "react";

const joinClasses = (...classNames: Array<string | undefined | false>) =>
  classNames.filter(Boolean).join(" ");

export type BaseModalProps = {
  isOpen: boolean;
  onClose?: () => void;
  children?: ReactNode;
  overlayClassName?: string;
  panelClassName?: string;
  closeOnEscape?: boolean;
  closeOnBackdrop?: boolean;
  ariaLabel?: string;
  labelledBy?: string;
};

const BaseModal = ({
  isOpen,
  onClose,
  children,
  overlayClassName,
  panelClassName,
  closeOnEscape = true,
  closeOnBackdrop = true,
  ariaLabel = "Dialog",
  labelledBy,
}: BaseModalProps) => {
  const panelRef = useRef<HTMLDivElement>(null);
  const onCloseRef = useRef(onClose);
  const closeOnEscapeRef = useRef(closeOnEscape);

  useEffect(() => {
    onCloseRef.current = onClose;
    closeOnEscapeRef.current = closeOnEscape;
  }, [closeOnEscape, onClose]);

  useEffect(() => {
    if (!isOpen) return undefined;

    const previousActiveElement = document.activeElement;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const focusableSelector =
      'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';
    const focusableElements = () =>
      Array.from(
        panelRef.current?.querySelectorAll<HTMLElement>(focusableSelector) || [],
      );

    const firstFocusable = focusableElements()[0];
    (firstFocusable || panelRef.current)?.focus();

    const handleKeyDown = (event: KeyboardEvent) => {
      if (
        event.key === "Escape" &&
        closeOnEscapeRef.current &&
        onCloseRef.current
      ) {
        event.preventDefault();
        onCloseRef.current();
      }
      if (event.key !== "Tab") return;

      const elements = focusableElements();
      if (elements.length === 0) {
        event.preventDefault();
        panelRef.current?.focus();
        return;
      }
      const first = elements[0];
      const last = elements[elements.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = previousOverflow;
      if (previousActiveElement instanceof HTMLElement) previousActiveElement.focus();
    };
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div
      onClick={closeOnBackdrop && onClose ? onClose : undefined}
      className={joinClasses(
        "fixed inset-0 z-50 flex items-center justify-center",
        overlayClassName,
      )}
    >
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-label={labelledBy ? undefined : ariaLabel}
        aria-labelledby={labelledBy}
        tabIndex={-1}
        onClick={(event) => event.stopPropagation()}
        className={panelClassName}
      >
        {children}
      </div>
    </div>
  );
};

export default BaseModal;
