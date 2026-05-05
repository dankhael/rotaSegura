"use client";

import { useState } from "react";
import { MapContainer, TileLayer, Marker, Popup, useMapEvents } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import L from "leaflet";

export const RECIFE_CENTER: [number, number] = [-8.04756, -34.877];
export const DEFAULT_ZOOM = 13;
const MAP_HEIGHT_CLASS = "h-[500px]";

// Icons live in /public/leaflet so the marker still renders when the
// upstream unpkg CDN is unreachable (offline dev / restricted networks).
// Plain string paths because Turbopack does not return StaticImageData
// for png imports from node_modules at runtime.
const defaultLeafletIcon = L.icon({
  iconUrl: "/leaflet/marker-icon.png",
  iconRetinaUrl: "/leaflet/marker-icon-2x.png",
  shadowUrl: "/leaflet/marker-shadow.png",
  iconSize: [25, 41],
  iconAnchor: [12, 41],
});

export type LatLng = { lat: number; lng: number };

type ShelterMapProps = {
  center?: [number, number];
  zoom?: number;
  onSelect?: (point: LatLng) => void;
};

/**
 * Click-to-place marker. Tracks the latest user-selected point so the parent
 * map renders a single marker that follows the most recent click and forwards
 * the lat/lng to the consumer.
 *
 * @example
 *   <SelectedPointMarker onChange={(p) => setPoint(p)} />
 */
function SelectedPointMarker({ onChange }: { onChange?: (point: LatLng) => void }) {
  const [position, setPosition] = useState<L.LatLng | null>(null);

  useMapEvents({
    click(e) {
      setPosition(e.latlng);
      onChange?.({ lat: e.latlng.lat, lng: e.latlng.lng });
    },
  });

  if (position === null) return null;
  return (
    <Marker position={position} icon={defaultLeafletIcon}>
      <Popup>
        <strong>Novo Ponto Selecionado</strong> <br />
        Lat: {position.lat.toFixed(4)} <br />
        Lng: {position.lng.toFixed(4)}
      </Popup>
    </Marker>
  );
}

/**
 * OpenStreetMap-backed map for picking emergency shelter points. Renders a
 * single marker that follows the user's latest click and reports lat/lng to
 * the parent via `onSelect`.
 *
 * @example
 *   <ShelterMap onSelect={(p) => console.log(p.lat, p.lng)} />
 */
export default function ShelterMap({
  center = RECIFE_CENTER,
  zoom = DEFAULT_ZOOM,
  onSelect,
}: ShelterMapProps) {
  return (
    <div className={`${MAP_HEIGHT_CLASS} w-full rounded-lg overflow-hidden border shadow-sm`}>
      <MapContainer center={center} zoom={zoom} style={{ height: "100%", width: "100%" }}>
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <SelectedPointMarker onChange={onSelect} />
      </MapContainer>
    </div>
  );
}
