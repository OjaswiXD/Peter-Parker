import React, { useState, useEffect, useRef } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap, useMapEvents } from 'react-leaflet'; // Added useMapEvents import
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import axios from 'axios';

// Fix for default marker icon
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
    iconRetinaUrl: require('leaflet/dist/images/marker-icon-2x.png'),
    iconUrl: require('leaflet/dist/images/marker-icon.png'),
    shadowUrl: require('leaflet/dist/images/marker-shadow.png')
});

// Component to handle map click and drag events
function MapController({ onLocationSelect, onCenterChange, centerPosition }) {
  const [position, setPosition] = useState(null);
  const map = useMap();

  // Update map center when centerPosition changes
  useEffect(() => {
    if (centerPosition) {
      map.setView(centerPosition, map.getZoom());
      setPosition(centerPosition);
    }
  }, [centerPosition, map]);

  // Handle click and drag events
  useMapEvents({
    click(e) {
      const { lat, lng } = e.latlng;
      setPosition(e.latlng);
      if (onLocationSelect) {
        onLocationSelect({ latitude: lat, longitude: lng });
      }
    },
    dragend() {
      const center = map.getCenter();
      if (onCenterChange) {
        onCenterChange({ latitude: center.lat, longitude: center.lng });
      }
    },
  });

  return position === null ? null : (
    <Marker position={position}>
      <Popup>Selected Location</Popup>
    </Marker>
  );
}

function Map({ spots, center = [20.5937, 78.9629], zoom = 5, onLocationSelect, onCenterChange, centerPosition }) {
  return (
    <MapContainer 
      center={center} 
      zoom={zoom} 
      style={{ height: '400px', width: '100%', marginBottom: '20px' }}
      attributionControl={true}
    >
      <TileLayer
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        attribution='© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
      />
      {spots && spots.map((spot) => (
        <Marker 
          key={spot._id} 
          position={[spot.latitude || 20.5937, spot.longitude || 78.9629]}
        >
          <Popup>
            <div>
              <h3>{spot.location}</h3>
              <p>Cars: {spot.car_slots} (${spot.car_cost}/hr)</p>
              <p>Bikes: {spot.bike_slots} (${spot.bike_cost}/hr)</p>
            </div>
          </Popup>
        </Marker>
      ))}
      <MapController 
        onLocationSelect={onLocationSelect} 
        onCenterChange={onCenterChange} 
        centerPosition={centerPosition}
      />
    </MapContainer>
  );
}

export default Map;