import { Marker, Popup } from "react-leaflet";
import MarkerClusterGroup from "react-leaflet-cluster";
import L from "leaflet";
import type { Occurrence, OccurrenceStatus, OccurrenceType } from "@/types/occurrence";
import {
  OCCURRENCE_STATUS_LABEL,
  OCCURRENCE_TYPE_LABEL,
  SEVERITY_LABEL,
  SEVERITY_TONE,
} from "@/lib/occurrences/labels";
import { occurrenceSeverity } from "@/lib/occurrences/severity";
import { OCCURRENCE_TYPE_COLOR } from "@/lib/occurrences/type-visuals";

// AC3: confirmadas têm preenchimento sólido e borda contínua; pendentes ficam
// translúcidas com borda tracejada — diferenciação visual de status.
function getOccurrenceIcon(type: OccurrenceType, status: OccurrenceStatus) {
  const color = OCCURRENCE_TYPE_COLOR[type] ?? OCCURRENCE_TYPE_COLOR.OTHER;
  const confirmed = status === "CONFIRMED";
  const border = confirmed ? "3px solid #fff" : "2px dashed #fff";
  const style = `background-color:${color};opacity:${confirmed ? 1 : 0.55};width:14px;height:14px;border-radius:50%;border:${border};box-shadow:0 0 4px rgba(0,0,0,0.3)`;
  return L.divIcon({
    className: "occurrence-marker",
    html: `<div style="${style}"></div>`,
    iconSize: [18, 18],
    iconAnchor: [9, 9],
  });
}

function OccurrenceMarker({ occurrence }: { occurrence: Occurrence }) {
  // Gravidade derivada (US10 v2) — não há campo no modelo; ver lib/occurrences/severity.ts.
  const severity = occurrenceSeverity({
    type: occurrence.type,
    status: occurrence.status,
    reportCount: occurrence.reportCount,
    uniqueDeviceCount: occurrence.uniqueDeviceCount,
  });
  const tone = SEVERITY_TONE[severity];

  return (
    <Marker
      position={[occurrence.centroidLatitude, occurrence.centroidLongitude]}
      icon={getOccurrenceIcon(occurrence.type, occurrence.status)}
    >
      <Popup>
        <strong>{OCCURRENCE_TYPE_LABEL[occurrence.type]}</strong>{" "}
        <span
          style={{
            background: tone.background,
            border: `1px solid ${tone.border}`,
            color: tone.ink,
            borderRadius: 6,
            padding: "0 6px",
            fontSize: 11,
            fontWeight: 600,
          }}
        >
          {SEVERITY_LABEL[severity]}
        </span>
        <br />
        {OCCURRENCE_STATUS_LABEL[occurrence.status]} · {occurrence.reportCount} relato(s)
        <br />
        Último relato: {new Date(occurrence.lastReportedAt).toLocaleString("pt-BR")}
      </Popup>
    </Marker>
  );
}

/**
 * Camada de ocorrências consumida pelo ShelterMap. Renderiza marcadores
 * agrupados por proximidade (AC6), coloridos por categoria (AC2) e
 * diferenciados por status (AC3). Precisa estar dentro de um <MapContainer>.
 *
 * @example
 *   <OccurrenceLayer occurrences={occurrences} />
 */
export function OccurrenceLayer({ occurrences }: { occurrences: Occurrence[] }) {
  if (occurrences.length === 0) return null;
  return (
    <MarkerClusterGroup chunkedLoading>
      {occurrences.map((occ) => (
        <OccurrenceMarker key={occ.id} occurrence={occ} />
      ))}
    </MarkerClusterGroup>
  );
}
