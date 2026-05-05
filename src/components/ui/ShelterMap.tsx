"use client";

import { useState } from "react";
import { MapContainer, TileLayer, Marker, Popup, useMapEvents } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import L from "leaflet";

import {
  MOCK_POINTS,
  type MockPoint,
  type MockPointKind,
  type MockPointStatus,
} from "@/components/home/map-mock-points";

export const RECIFE_CENTER: [number, number] = [-8.111, -34.905];
export const DEFAULT_ZOOM = 13;
const MAP_HEIGHT_CLASS = "h-[540px]";

const KIND_GLYPH: Record<MockPointKind, string> = {
  shelter: "🏠",
  medical: "✚",
  supply: "◆",
};

function makePinIcon(kind: MockPointKind | "user", glyph?: string) {
  if (kind === "user") {
    return L.divIcon({
      className: "rs-pin",
      html: '<div class="rs-user-pin-pulse"><div class="rs-user-pin"></div></div>',
      iconSize: [22, 22],
      iconAnchor: [11, 11],
    });
  }
  return L.divIcon({
    className: "rs-pin",
    html: `<div class="rs-pin-wrap"><div class="rs-pin-bubble ${kind}"></div><div class="rs-pin-glyph">${glyph ?? ""}</div></div>`,
    iconSize: [28, 36],
    iconAnchor: [14, 34],
    popupAnchor: [0, -32],
  });
}

const STATUS_LABEL: Record<MockPointStatus, string> = {
  open: "Aberto",
  full: "Lotado",
  partial: "Limitado",
};

const STATUS_STYLE: Record<MockPointStatus, { bg: string; fg: string }> = {
  open: { bg: "var(--safe-soft)", fg: "var(--safe-ink)" },
  full: { bg: "var(--emergency-soft)", fg: "var(--emergency-ink)" },
  partial: { bg: "var(--warn-soft)", fg: "var(--warn-ink)" },
};

export type LatLng = { lat: number; lng: number };

type ShelterMapProps = {
  center?: [number, number];
  zoom?: number;
  onSelect?: (point: LatLng) => void;
  filter?: "all" | MockPointKind;
};

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

function MockPointMarker({ point }: { point: MockPoint }) {
  const status = STATUS_STYLE[point.status];
  const icon = makePinIcon(point.kind, KIND_GLYPH[point.kind]);
  return (
    <Marker position={point.coords} icon={icon}>
      <Popup>
        <div style={{ padding: 14 }}>
          <div style={{ marginBottom: 8 }}>
            <span
              style={{
                fontSize: 10,
                fontWeight: 600,
                padding: "2px 6px",
                borderRadius: 4,
                textTransform: "uppercase",
                letterSpacing: "0.04em",
                background: status.bg,
                color: status.fg,
              }}
            >
              {STATUS_LABEL[point.status]}
            </span>
          </div>
          <div
            style={{
              fontSize: 14,
              fontWeight: 700,
              letterSpacing: "-0.01em",
              color: "var(--ink)",
              margin: "0 0 4px",
            }}
          >
            {point.name}
          </div>
          <div
            style={{
              fontSize: 12,
              color: "var(--ink-3)",
              margin: "0 0 10px",
              lineHeight: 1.4,
            }}
          >
            {point.addr}
          </div>
          <div
            style={{
              display: "flex",
              gap: 12,
              padding: "8px 0",
              borderTop: "1px solid var(--line-soft)",
              borderBottom: "1px solid var(--line-soft)",
              marginBottom: 10,
            }}
          >
            {point.stats.map((s) => (
              <div key={s.l} style={{ flex: 1 }}>
                <div
                  style={{
                    fontSize: 14,
                    fontWeight: 700,
                    letterSpacing: "-0.01em",
                  }}
                >
                  {s.n}
                </div>
                <div
                  style={{
                    fontSize: 10,
                    color: "var(--ink-3)",
                    textTransform: "uppercase",
                    letterSpacing: "0.04em",
                    marginTop: 1,
                    fontWeight: 500,
                  }}
                >
                  {s.l}
                </div>
              </div>
            ))}
          </div>
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
}: ShelterMapProps) {
  const visiblePoints =
    filter === "all" ? MOCK_POINTS : MOCK_POINTS.filter((p) => p.kind === filter);

  return (
    <div className={`${MAP_HEIGHT_CLASS} w-full overflow-hidden`}>
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
        <Marker position={center} icon={makePinIcon("user")}>
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
                Boa Viagem · precisão ±15m
              </div>
            </div>
          </Popup>
        </Marker>
        {visiblePoints.map((p) => (
          <MockPointMarker key={p.name} point={p} />
        ))}
        <SelectedPointMarker onChange={onSelect} />
      </MapContainer>
    </div>
  );
}
