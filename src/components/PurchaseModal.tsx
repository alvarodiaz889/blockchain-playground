import { useRef } from "react";
import type { PropertyMetadata } from "../customTypes/Property";

interface IModalProps {
  property: PropertyMetadata | null;
  onSubmit: () => void;
  onClose: () => void;
}
const PurchaseModal = ({ property, onSubmit, onClose }: IModalProps) => {
  const isOpen = property !== null;

  // 1. Create a reference for the Modal Content box
  const modalRef = useRef<HTMLDivElement>(null);

  // 2. Handle the click event
  const handleOverlayClick = (e: React.MouseEvent<HTMLDivElement>) => {
    // If the click target is NOT inside the modalRef (the white box), close it
    if (modalRef.current && !modalRef.current.contains(e.target as Node)) {
      onClose();
    }
  };

  return (
    <>
      {isOpen && (
        // The Overlay: We attach the click handler here
        <div
          onClick={handleOverlayClick}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm"
        >
          {/* The Content Box: We attach the Ref here */}
          <div
            ref={modalRef}
            className="bg-white rounded-2xl shadow-2xl max-w-2/3 p-6 relative gap-4"
          >
            <h2 className="text-xl font-bold">Property Details</h2>
            <div className="inline-flex justify-between w-full">
              <div className="p-4 w-2/3">
                <img
                  src={property.image}
                  alt={property.name}
                  className="w-full h-1/2 object-cover"
                />
              </div>
              <div className="flex flex-col p-4">
                {property.attributes.map((attr) => (
                  <div className="inline-flex gap-2">
                    <label>{attr.trait_type}:</label>
                    <label>{attr.value}</label>
                  </div>
                ))}
              </div>
            </div>

            <div className="inline-flex justify-between w-full">
              <button
                onClick={onClose}
                className="bg-violet-600 text-white rounded-lg p-2"
              >
                Close
              </button>
              <button
                onClick={onSubmit}
                className="bg-violet-600 text-white rounded-lg p-2"
              >
                Purchase
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default PurchaseModal;
