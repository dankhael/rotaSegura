import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";

import { DonutChart } from "@/components/admin/dashboard/charts/donut-chart";
import { Sparkline } from "@/components/admin/dashboard/charts/sparkline";
import { StackedAreaChart } from "@/components/admin/dashboard/charts/stacked-area-chart";

describe("DonutChart", () => {
  it("expõe aria-label e o número central", () => {
    render(
      <DonutChart
        segments={[
          { value: 2, color: "#0a0", label: "A" },
          { value: 3, color: "#a00", label: "B" },
        ]}
        centerPrimary="5"
        centerSecondary="itens"
        ariaLabel="2 A e 3 B"
      />,
    );

    expect(screen.getByRole("img", { name: "2 A e 3 B" })).toBeInTheDocument();
    expect(screen.getByText("5")).toBeInTheDocument();
  });
});

describe("Sparkline", () => {
  it("renderiza com aria-label mesmo com valores zerados", () => {
    render(<Sparkline values={[0, 0, 0]} color="#0a0" ariaLabel="tendência" />);
    expect(screen.getByRole("img", { name: "tendência" })).toBeInTheDocument();
  });
});

describe("StackedAreaChart", () => {
  it("renderiza com aria-label", () => {
    render(
      <StackedAreaChart
        series={[
          { label: "P", color: "#0a0", values: [1, 2] },
          { label: "C", color: "#a00", values: [0, 1] },
        ]}
        ariaLabel="série diária"
      />,
    );
    expect(screen.getByRole("img", { name: "série diária" })).toBeInTheDocument();
  });
});
