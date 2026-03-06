/**
 * modules/couriers/components/shared/VehicleLabel.tsx
 * Composant réutilisable — affiche l'icône Lucide + label du véhicule
 */

import { Bike, Zap, Car, Truck } from "lucide-react";
import { getVehicleLabel }       from "@/core/entities/courier.entity";
import type { VehicleType }      from "@/core/types";

const VEHICLE_ICONS: Record<VehicleType, React.ElementType> = {
  bike:       Bike,
  motorcycle: Zap,
  car:        Car,
  truck:      Truck,
};

interface VehicleLabelProps {
  type:       VehicleType;
  className?: string;
  iconSize?:  number;
  iconOnly?:  boolean; // <-- On ajoute cette option
}

export function VehicleLabel({ 
  type, 
  className, 
  iconSize = 14, 
  iconOnly = false // Par défaut, on garde le comportement avec texte
}: VehicleLabelProps) {
  const Icon  = VEHICLE_ICONS[type] ?? Car;
  const label = getVehicleLabel(type);

  // Si on veut uniquement l'icône (pour la carte)
  if (iconOnly) {
    return (
      <Icon 
        width={iconSize} 
        height={iconSize} 
        className={className} 
        style={{ display: 'block' }} // Évite les décalages de ligne de texte
      />
    );
  }

  // Comportement standard (Icone + Texte)
  return (
    <span className={["flex items-center gap-1.5", className ?? ""].join(" ")}>
      <Icon width={iconSize} height={iconSize} className="flex-shrink-0" />
      {label}
    </span>
  );
}
