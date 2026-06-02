import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import type { ReactNode } from "react";

vi.mock("leaflet", () => ({ default: { divIcon: vi.fn(() => ({})) } }));

vi.mock("react-leaflet-cluster", () => ({
  default: ({ children }: { children?: ReactNode }) => <div data-testid="cluster">{children}</div>,
}));

vi.mock("react-leaflet", () => ({
  Marker: ({ children }: { children?: ReactNode }) => <div data-testid="marker">{children}</div>,
  Popup: ({ children }: { children?: ReactNode }) => <div>{children}</div>,
}));

import { OccurrenceLayer } from "@/components/map/occurrence-layer";
import { makeOccurrence } from "../../factories/occurrence";

describe("OccurrenceLayer", () => {
  it("renders one marker per occurrence", () => {
    render(
      <OccurrenceLayer
        occurrences={[makeOccurrence({ id: "a" }), makeOccurrence({ id: "b", type: "FIRE" })]}
      />,
    );

    expect(screen.getAllByTestId("marker")).toHaveLength(2);
  });

  it("renders nothing when there are no occurrences", () => {
    const { container } = render(<OccurrenceLayer occurrences={[]} />);

    expect(container).toBeEmptyDOMElement();
  });
});
