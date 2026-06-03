import { describe, it, expect, beforeEach, vi } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";

const { pushMock, refreshMock } = vi.hoisted(() => ({
  pushMock: vi.fn(),
  refreshMock: vi.fn(),
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: pushMock, refresh: refreshMock }),
}));

import { LogoutButton } from "@/components/admin/logout-button";

describe("LogoutButton", () => {
  beforeEach(() => {
    pushMock.mockReset();
    refreshMock.mockReset();
    global.fetch = vi.fn().mockResolvedValue(new Response(null, { status: 204 }));
  });

  it("chama POST /api/auth/logout e redireciona para /login", async () => {
    render(<LogoutButton />);

    fireEvent.click(screen.getByRole("button", { name: /sair/i }));

    await waitFor(() => expect(global.fetch).toHaveBeenCalledTimes(1));
    expect(global.fetch).toHaveBeenCalledWith("/api/auth/logout", { method: "POST" });

    await waitFor(() => expect(pushMock).toHaveBeenCalledWith("/login"));
  });

  it("redireciona para /login mesmo se o fetch falhar (best-effort)", async () => {
    global.fetch = vi.fn().mockRejectedValue(new Error("network down"));

    render(<LogoutButton />);
    fireEvent.click(screen.getByRole("button", { name: /sair/i }));

    await waitFor(() => expect(pushMock).toHaveBeenCalledWith("/login"));
  });
});
