import type { PropertyMetadata } from "../customTypes/Property";

interface PropertyListProps {
  properties: PropertyMetadata[];
  onSelected: (prop: PropertyMetadata) => void;
}
const PropertyList = ({ properties, onSelected }: PropertyListProps) => (
  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6 p-6">
    {properties.map((property, index) => (
      <div
        key={index}
        className="aspect-square w-full bg-white rounded-xl shadow-md overflow-hidden border border-gray-200 hover:shadow-lg transition-shadow"
        onClick={() => onSelected(property)}
      >
        {/* Image Section */}
        <div className="h-2/3 w-full relative">
          <img
            src={property.image}
            alt={property.name}
            className="w-full h-full object-cover"
          />
          <div className="absolute top-2 right-2 bg-blue-600 text-white px-2 py-1 rounded text-sm font-bold">
            {
              property.attributes.find((a) => a.trait_type === "Purchase Price")
                ?.value
            }{" "}
            ETH
          </div>
        </div>

        {/* Content Section */}
        <div className="p-4">
          <h3 className="font-bold text-lg truncate">{property.name}</h3>
          <p className="text-gray-500 text-sm truncate">{property.address}</p>
          <button className="mt-2 w-full bg-slate-800 text-white py-2 rounded-lg hover:bg-slate-700 transition-colors">
            View Details
          </button>
        </div>
      </div>
    ))}
  </div>
);
export default PropertyList;
