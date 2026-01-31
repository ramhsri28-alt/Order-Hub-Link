import { useEffect, useRef, useState } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { Button } from "@/components/ui/button";
import { MapPin, Navigation, Crosshair } from "lucide-react";

interface LocationPickerProps {
  latitude?: string;
  longitude?: string;
  onLocationChange: (lat: string, lng: string) => void;
}

export function LocationPicker({ latitude, longitude, onLocationChange }: LocationPickerProps) {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const markerRef = useRef<L.Marker | null>(null);
  const [isLocating, setIsLocating] = useState(false);

  // Default to Kathmandu, Nepal
  const defaultLat = 27.7172;
  const defaultLng = 85.324;

  useEffect(() => {
    if (!mapRef.current || mapInstanceRef.current) return;

    // Fix Leaflet default icon issue
    delete (L.Icon.Default.prototype as any)._getIconUrl;
    L.Icon.Default.mergeOptions({
      iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
      iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
      shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
    });

    const initialLat = latitude ? parseFloat(latitude) : defaultLat;
    const initialLng = longitude ? parseFloat(longitude) : defaultLng;

    const map = L.map(mapRef.current).setView([initialLat, initialLng], 14);
    
    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
    }).addTo(map);

    // Add marker if we have coordinates
    if (latitude && longitude) {
      const marker = L.marker([parseFloat(latitude), parseFloat(longitude)], { draggable: true }).addTo(map);
      markerRef.current = marker;
      
      marker.on("dragend", () => {
        const pos = marker.getLatLng();
        onLocationChange(pos.lat.toString(), pos.lng.toString());
      });
    }

    // Click to place/move marker
    map.on("click", (e) => {
      const { lat, lng } = e.latlng;
      
      if (markerRef.current) {
        markerRef.current.setLatLng([lat, lng]);
      } else {
        const marker = L.marker([lat, lng], { draggable: true }).addTo(map);
        markerRef.current = marker;
        
        marker.on("dragend", () => {
          const pos = marker.getLatLng();
          onLocationChange(pos.lat.toString(), pos.lng.toString());
        });
      }
      
      onLocationChange(lat.toString(), lng.toString());
    });

    mapInstanceRef.current = map;

    return () => {
      map.remove();
      mapInstanceRef.current = null;
      markerRef.current = null;
    };
  }, []);

  const handleGetCurrentLocation = () => {
    if (!navigator.geolocation) {
      alert("Geolocation is not supported by your browser");
      return;
    }

    setIsLocating(true);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const { latitude: lat, longitude: lng } = position.coords;
        
        if (mapInstanceRef.current) {
          mapInstanceRef.current.setView([lat, lng], 16);
          
          if (markerRef.current) {
            markerRef.current.setLatLng([lat, lng]);
          } else {
            const marker = L.marker([lat, lng], { draggable: true }).addTo(mapInstanceRef.current);
            markerRef.current = marker;
            
            marker.on("dragend", () => {
              const pos = marker.getLatLng();
              onLocationChange(pos.lat.toString(), pos.lng.toString());
            });
          }
        }
        
        onLocationChange(lat.toString(), lng.toString());
        setIsLocating(false);
      },
      (error) => {
        console.error("Error getting location:", error);
        setIsLocating(false);
        alert("Could not get your location. Please select manually on the map.");
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <MapPin className="w-4 h-4" />
          <span>Tap on map or drag pin to set location</span>
        </div>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={handleGetCurrentLocation}
          disabled={isLocating}
          className="gap-2"
          data-testid="button-get-location"
        >
          {isLocating ? (
            <Crosshair className="w-4 h-4 animate-pulse" />
          ) : (
            <Navigation className="w-4 h-4" />
          )}
          {isLocating ? "Locating..." : "Use My Location"}
        </Button>
      </div>
      
      <div 
        ref={mapRef} 
        className="h-[200px] rounded-lg border overflow-hidden z-0"
        data-testid="map-location-picker"
      />
      
      {latitude && longitude && (
        <div className="flex items-center gap-2 text-xs text-muted-foreground bg-muted/50 rounded px-3 py-2">
          <MapPin className="w-3 h-3 text-primary" />
          <span>Location set: {parseFloat(latitude).toFixed(6)}, {parseFloat(longitude).toFixed(6)}</span>
        </div>
      )}
    </div>
  );
}
