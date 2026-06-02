import { Marker, Popup } from "react-leaflet";
import MarkerClusterGroup from "react-leaflet-cluster";
import L from "leaflet";
import type { Occurrence, OccurrenceStatus, OccurrenceType } from "@/types/occurrence";

// AC2: cor distinta por categoria. Os 6 valores espelham OccurrenceType
// (src/lib/validations/occurrence.ts) — manter em sincronia ao alterar o enum.
const CATEGORY_COLOR: Record<OccurrenceType, string> = {
  FLOOD: "#2563eb",
  FIRE: "#dc2626",
  LANDSLIDE: "#a16207",
  ACCIDENT: "#7c3aed",
  OBSTRUCTION: "#ea580c",
  OTHER: "#6b7280",
};

const TYPE_LABEL: Record<OccurrenceType, string> = {
  FLOOD: "Alagamento",
  FIRE: "Incêndio",
  LANDSLIDE: "Deslizamento",
  ACCIDENT: "Acidente",
  OBSTRUCTION: "Obstrução",
  OTHER: "Outro",
};

const STATUS_LABEL: Record<OccurrenceStatus, string> = {
  PENDING: "Pendente",
  CONFIRMED: "Confirmada",
};

// AC3: confirmadas têm preenchimento sólido e borda contínua; pendentes ficam
// translúcidas com borda tracejada — diferenciação visual de status.
function getOccurrenceIcon(type: OccurrenceType, status: OccurrenceStatus) {
  const color = CATEGORY_COLOR[type] ?? CATEGORY_COLOR.OTHER;
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
  return (
    <Marker
      position={[occurrence.centroidLatitude, occurrence.centroidLongitude]}
      icon={getOccurrenceIcon(occurrence.type, occurrence.status)}
    >
      <Popup>
        <strong>{TYPE_LABEL[occurrence.type]}</strong>
        <br />
        {STATUS_LABEL[occurrence.status]} · {occurrence.reportCount} relato(s)
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
