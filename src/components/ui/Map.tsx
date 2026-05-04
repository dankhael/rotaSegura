"use client";

import { useState } from "react";
import { MapContainer, TileLayer, Marker, Popup, useMapEvents } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import L from "leaflet";

// Configuração do ícone padrão do Leaflet
const icon = L.icon({
  iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
  iconSize: [25, 41],
  iconAnchor: [12, 41],
});

// Sub-componente para lidar com o clique no mapa
function LocationMarker() {
  const [position, setPosition] = useState<L.LatLng | null>(null);

  useMapEvents({
    click(e) {
      setPosition(e.latlng); // Define a nova posição onde o usuário clicou
    },
  });

  return position === null ? null : (
    <Marker position={position} icon={icon}>
      <Popup>
        <strong>Novo Ponto Selecionado</strong> <br />
        Lat: {position.lat.toFixed(4)} <br />
        Lng: {position.lng.toFixed(4)}
      </Popup>
    </Marker>
  );
}

export default function Map() {
  const center: [number, number] = [-8.04756, -34.877]; // Recife

  return (
    <div className="h-[500px] w-full rounded-lg overflow-hidden border shadow-sm">
      <MapContainer center={center} zoom={13} style={{ height: "100%", width: "100%" }}>
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />

        {/* Adicionamos o componente de clique aqui */}
        <LocationMarker />
      </MapContainer>
    </div>
  );
}
