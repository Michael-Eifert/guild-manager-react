import { useEffect } from "react";

const joinClasses = (...classNames) => classNames.filter(Boolean).join(" ");

const BaseModal = ({
  isOpen,
  onClose,
  children,
  overlayClassName,
  panelClassName,
  closeOnEscape = true,
  closeOnBackdrop = true,
}) => {
  useEffect(() => {
    if (!isOpen || !closeOnEscape) return undefined;

    const handleKeyDown = (event) => {
      if (event.key === "Escape") {
        onClose();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, closeOnEscape, onClose]);

  if (!isOpen) return null;

  return (
    <div
      onClick={closeOnBackdrop ? onClose : undefined}
      className={joinClasses(
        "fixed inset-0 z-50 flex items-center justify-center",
        overlayClassName,
      )}
    >
      <div onClick={(event) => event.stopPropagation()} className={panelClassName}>
        {children}
      </div>
    </div>
  );
};

export default BaseModal;
