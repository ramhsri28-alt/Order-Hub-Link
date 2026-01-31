import { MapPin, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";

interface GoogleMapProps {
  lat?: number;
  lng?: number;
  address?: string;
  className?: string;
}

export function GoogleMap({ 
  lat = 27.7172,  // Default: Kathmandu coordinates
  lng = 85.3240, 
  address = "BistroSync Restaurant, Kathmandu, Nepal",
  className = ""
}: GoogleMapProps) {
  const embedUrl = `https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3532.5!2d${lng}!3d${lat}!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x0%3A0x0!2zMjfCsDQzJzAyLjAiTiA4NcKwMTknMjYuNCJF!5e0!3m2!1sen!2snp!4v1600000000000!5m2!1sen!2snp`;
  
  const directionsUrl = `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`;

  return (
    <div className={`rounded-xl overflow-hidden border bg-card ${className}`}>
      <div className="aspect-video w-full bg-muted relative">
        <iframe
          src={embedUrl}
          width="100%"
          height="100%"
          style={{ border: 0 }}
          allowFullScreen
          loading="lazy"
          referrerPolicy="no-referrer-when-downgrade"
          title="Restaurant Location"
          className="absolute inset-0"
        />
      </div>
      <div className="p-4">
        <div className="flex items-start gap-3 mb-4">
          <div className="p-2 bg-primary/10 rounded-lg">
            <MapPin className="w-5 h-5 text-primary" />
          </div>
          <div>
            <h3 className="font-semibold">Our Location</h3>
            <p className="text-sm text-muted-foreground">{address}</p>
          </div>
        </div>
        <Button 
          variant="outline" 
          className="w-full gap-2"
          onClick={() => window.open(directionsUrl, '_blank')}
          data-testid="button-get-directions"
        >
          <ExternalLink className="w-4 h-4" />
          Get Directions
        </Button>
      </div>
    </div>
  );
}
