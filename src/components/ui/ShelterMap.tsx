"use client";
import { useEffect, useRef, useState, useMemo } from "react";
import { MapContainer, TileLayer, Marker, Popup, useMap, useMapEvents } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import L from "leaflet";

import { SupportPointEvaluationForm } from "./SupportPointEvaluationForm";

import { OccurrenceLayer } from "@/components/map/occurrence-layer";
import type { Occurrence } from "@/types/occurrence";
import type { SupportPoint, SupportPointType } from "@/types/support-point";

export const RECIFE_CENTER: [number, number] = [-8.111, -34.905];
export const DEFAULT_ZOOM = 13;
const MAP_HEIGHT_CLASS = "h-[540px]";

// Estilo por tipo de ponto de apoio: classe CSS do pin (ver globals.css),
// glyph exibido e rótulo em PT. OTHER usa um pin neutro.
const SUPPORT_POINT_STYLE: Record<
  SupportPointType,
  { cssKind: string; glyph: string; label: string }
> = {
  SHELTER: { cssKind: "shelter", glyph: "🏠", label: "Abrigo" },
  MEDICAL: { cssKind: "medical", glyph: "✚", label: "Atendimento médico" },
  SUPPLY: { cssKind: "supply", glyph: "◆", label: "Distribuição de suprimentos" },
  OTHER: { cssKind: "other", glyph: "●", label: "Ponto de apoio" },
};

function makePinIcon(cssKind: string, glyph?: string) {
  if (cssKind === "user") {
    return L.divIcon({
      className: "rs-pin",
      html: '<div class="rs-user-pin-pulse"><div class="rs-user-pin"></div></div>',
      iconSize: [22, 22],
      iconAnchor: [11, 11],
    });
  }
  return L.divIcon({
    className: "rs-pin",
    html: `<div class="rs-pin-wrap"><div class="rs-pin-bubble ${cssKind}"></div><div class="rs-pin-glyph">${glyph ?? ""}</div></div>`,
    iconSize: [28, 36],
    iconAnchor: [14, 34],
    popupAnchor: [0, -32],
  });
}

export type LatLng = { lat: number; lng: number };

export type UserMarkerSource = "device" | "ip";

type ShelterMapProps = {
  center?: [number, number];
  zoom?: number;
  onSelect?: (point: LatLng) => void;
  filter?: "all" | SupportPointType;
  userPosition?: LatLng | null;
  userAccuracy?: number | null;
  userSource?: UserMarkerSource | null;
  /**
   * Increment to request a one-shot pan to the user's location. The map only
   * recenters when this value changes, never automatically as `userPosition`
   * updates. Pending requests fire as soon as a position becomes available.
   */
  centerOnUserToken?: number;
  recenterZoom?: number;
  /** Pontos de apoio (abrigos/médico/suprimentos) vindos da API. */
  supportPoints?: SupportPoint[];
  /** Ocorrências agregadas exibidas como camada agrupada sobre o mapa (US06). */
  occurrences?: Occurrence[];
};

/**
 * One-shot recenter on demand. Watches a token rather than the position
 * itself, so the map never moves on its own as new GPS fixes arrive.
 * If the user clicks the locate button before a fix is ready, the request
 * is held until coords appear and then honored exactly once.
 */
function RecenterOnRequest({
  position,
  token,
  zoom,
}: {
  position: LatLng | null;
  token: number;
  zoom: number;
}) {
  const map = useMap();
  const lastTokenRef = useRef(token);
  const pendingRef = useRef(false);

  useEffect(() => {
    if (token !== lastTokenRef.current) {
      lastTokenRef.current = token;
      pendingRef.current = true;
    }
    if (pendingRef.current && position) {
      map.setView([position.lat, position.lng], Math.max(map.getZoom(), zoom));
      pendingRef.current = false;
    }
  }, [token, position, map, zoom]);

  return null;
}

/**
 * Click-to-place marker. Tracks the latest user-selected point so the parent
 * map renders a single marker that follows the most recent click and forwards
 * the lat/lng to the consumer.
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
    <Marker position={position} icon={makePinIcon("shelter", "+")}>
      <Popup>
        <strong>Novo ponto selecionado</strong>
        <br />
        Lat: {position.lat.toFixed(4)}
        <br />
        Lng: {position.lng.toFixed(4)}
      </Popup>
    </Marker>
  );
}

function SupportPointMarker({ point }: { point: SupportPoint }) {
  const style = SUPPORT_POINT_STYLE[point.type] ?? SUPPORT_POINT_STYLE.OTHER;
  const icon = useMemo(() => makePinIcon(style.cssKind, style.glyph), [style]);
  const [isEvaluating, setIsEvaluating] = useState(false);

  return (
    <Marker position={[point.latitude, point.longitude]} icon={icon}>
      <Popup>
        <div style={{ padding: 14, width: 240 }}>
          {!isEvaluating ? (
            <>
              <button onClick={() => setIsEvaluating(true)} style={{ width: '100%', background: 'var(--primary)', color: 'white', border: 'none', padding: 8, borderRadius: 6, cursor: 'pointer' }}>
                Avaliar Local
              </button>
            </>
          ) : (
            <SupportPointEvaluationForm 
              pointId={point.id} 
              onCancel={() => setIsEvaluating(false)} 
            />
          )}
        </div>
      </Popup>
    </Marker>
  );
}

/**
 * OpenStreetMap-backed map for the home view. Renders the visual mock
 * support points and keeps click-to-place selection so the parent can
 * persist a new point via the API.
 *
 * @example
 *   <ShelterMap onSelect={(p) => console.log(p.lat, p.lng)} />
 */
export default function ShelterMap({
  center = RECIFE_CENTER,
  zoom = DEFAULT_ZOOM,
  onSelect,
  filter = "all",
  userPosition = null,
  userAccuracy = null,
  userSource = null,
  centerOnUserToken = 0,
  recenterZoom = 14,
  supportPoints = [],
  occurrences = [],
}: ShelterMapProps) {
  const visiblePoints =
    filter === "all" ? supportPoints : supportPoints.filter((p) => p.type === filter);

  return (
    <div
      role="region"
      aria-label="Mapa de apoio e ocorrências"
      className={`${MAP_HEIGHT_CLASS} w-full overflow-hidden`}
    >
      <MapContainer
        center={center}
        zoom={zoom}
        style={{ height: "100%", width: "100%" }}
        zoomControl={false}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://carto.com/attributions">CARTO</a>'
          url="https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png"
        />
        {userPosition && (
          <Marker position={[userPosition.lat, userPosition.lng]} icon={makePinIcon("user")}>
            <Popup>
              <div style={{ padding: 14 }}>
                <div style={{ fontSize: 14, fontWeight: 700, margin: 0 }}>Você está aqui</div>
                <div
                  style={{
                    fontSize: 12,
                    color: "var(--ink-3)",
                    margin: 0,
                    lineHeight: 1.4,
                  }}
                >
                  {userPositionLabel(userSource, userAccuracy)}
                </div>
              </div>
            </Popup>
          </Marker>
        )}
        {visiblePoints.map((p) => (
          <SupportPointMarker key={p.id} point={p} />
        ))}
        <OccurrenceLayer occurrences={occurrences} />
        <SelectedPointMarker onChange={onSelect} />
        <RecenterOnRequest position={userPosition} token={centerOnUserToken} zoom={recenterZoom} />
      </MapContainer>
    </div>
  );
}

function userPositionLabel(source: UserMarkerSource | null, accuracy: number | null): string {
  if (source === "ip") return "Localização aproximada via IP";
  if (accuracy != null) return `Precisão ±${Math.round(accuracy)}m`;
  return "Posição atual";
}
