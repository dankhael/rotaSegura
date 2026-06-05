import { afterEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";

import { AdminTabs } from "@/components/admin/admin-tabs";
import type { SupportPoint } from "@/types/support-point";

// A aba Dashboard (ativa por padrão) renderiza OccurrenceDashboard, que busca o
// resumo ao montar e mantém um refresh periódico. Aqui testamos a navegação por
// abas e a gestão de locais, então trocamos a dashboard por um stub leve para
// isolar estes testes da rede — ela tem cobertura própria em
// occurrence-dashboard.test.tsx.
vi.mock("@/components/admin/dashboard/occurrence-dashboard", () => ({
  OccurrenceDashboard: () => <div>Resumo de ocorrências</div>,
}));

const pointA: SupportPoint = {
  id: "sp-1",
  name: "Abrigo Central",
  type: "SHELTER",
  latitude: -8.057838,
  longitude: -34.88275,
  capacity: 200,
  createdAt: "2026-05-01T10:00:00.000Z",
  updatedAt: "2026-05-01T10:00:00.000Z",
};

const pointB: SupportPoint = {
  ...pointA,
  id: "sp-2",
  name: "Posto Médico Norte",
  type: "MEDICAL",
  latitude: -8.1,
  longitude: -34.95,
  capacity: 50,
};

function jsonResponse(body: unknown, status = 200) {
  return {
    ok: status >= 200 && status < 300,
    status,
    json: vi.fn().mockResolvedValue(body),
  } as unknown as Response;
}

function emptyListResponse() {
  return jsonResponse({ data: [], meta: { total: 0, page: 1, limit: 100, totalPages: 0 } });
}

function listResponse(data: SupportPoint[]) {
  return jsonResponse({ data, meta: { total: data.length, page: 1, limit: 100, totalPages: 1 } });
}

function mockFetch(
  handler: (input: RequestInfo | URL, init?: RequestInit) => Response | Promise<Response>,
) {
  const fetchMock = vi.fn(handler);
  vi.stubGlobal("fetch", fetchMock);
  return fetchMock;
}

function getJsonBody(init?: RequestInit) {
  return JSON.parse(String(init?.body ?? "{}")) as Record<string, unknown>;
}

function findFetchCall(fetchMock: ReturnType<typeof vi.fn>, method: string) {
  return fetchMock.mock.calls.find(([, init]) => init?.method === method);
}

function openLocationsTab() {
  fireEvent.click(screen.getByRole("tab", { name: "Gestão de Locais" }));
}

function fillForm(values: {
  name: string;
  type?: string;
  capacity?: string;
  latitude: string;
  longitude: string;
}) {
  fireEvent.change(screen.getByLabelText("Nome"), { target: { value: values.name } });
  if (values.type) {
    fireEvent.change(screen.getByLabelText("Tipo"), { target: { value: values.type } });
  }
  if (values.capacity !== undefined) {
    fireEvent.change(screen.getByLabelText("Capacidade"), { target: { value: values.capacity } });
  }
  fireEvent.change(screen.getByLabelText("Latitude"), { target: { value: values.latitude } });
  fireEvent.change(screen.getByLabelText("Longitude"), { target: { value: values.longitude } });
}

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe("AdminTabs", () => {
  it("mostra o Dashboard por padrão e alterna para Gestão de Locais ao clicar na aba", async () => {
    mockFetch(() => emptyListResponse());

    render(<AdminTabs />);

    expect(screen.getByRole("tab", { name: "Dashboard" })).toHaveAttribute("aria-selected", "true");
    expect(screen.getByRole("tab", { name: "Gestão de Locais" })).toHaveAttribute(
      "aria-selected",
      "false",
    );
    expect(screen.getByText("Resumo de ocorrências")).toBeInTheDocument();

    openLocationsTab();

    expect(screen.getByRole("tab", { name: "Gestão de Locais" })).toHaveAttribute(
      "aria-selected",
      "true",
    );
    expect(screen.getByRole("tab", { name: "Dashboard" })).toHaveAttribute(
      "aria-selected",
      "false",
    );
    expect(await screen.findByText("Nenhum local cadastrado")).toBeInTheDocument();
  });

  it("renderiza Dashboard ativo por padrao e lista locais ao abrir Gestao de Locais", async () => {
    mockFetch(() => listResponse([pointA]));

    render(<AdminTabs />);

    expect(screen.getByRole("tab", { name: "Dashboard" })).toHaveAttribute("aria-selected", "true");
    expect(screen.getByRole("tab", { name: "Gestão de Locais" })).toHaveAttribute(
      "aria-selected",
      "false",
    );

    openLocationsTab();

    expect(await screen.findByText("Abrigo Central")).toBeInTheDocument();
    expect(screen.getAllByText("Abrigo")).toHaveLength(2);
    expect(screen.getByText("200 pessoas")).toBeInTheDocument();
  });

  it("valida campos obrigatorios antes de cadastrar", async () => {
    const fetchMock = mockFetch(() => emptyListResponse());

    render(<AdminTabs />);
    openLocationsTab();

    await screen.findByText("Nenhum local cadastrado");
    fireEvent.click(screen.getByRole("button", { name: "Cadastrar local" }));

    expect(await screen.findByText("Informe o nome.")).toBeInTheDocument();
    expect(screen.getByText("Informe uma latitude válida.")).toBeInTheDocument();
    expect(screen.getByText("Informe uma longitude válida.")).toBeInTheDocument();
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("cadastra um novo local e atualiza a lista", async () => {
    const created: SupportPoint = {
      ...pointA,
      id: "sp-3",
      name: "Centro de Distribuicao",
      type: "SUPPLY",
      capacity: null,
    };

    const fetchMock = mockFetch((input, init) => {
      if (init?.method === "POST") return jsonResponse(created, 201);
      return emptyListResponse();
    });

    render(<AdminTabs />);
    openLocationsTab();

    await screen.findByText("Nenhum local cadastrado");
    fillForm({
      name: "Centro de Distribuicao",
      type: "SUPPLY",
      latitude: "-8.06",
      longitude: "-34.89",
    });
    fireEvent.click(screen.getByRole("button", { name: "Cadastrar local" }));

    expect(await screen.findByText("Local cadastrado com sucesso.")).toBeInTheDocument();
    expect(screen.getByText("Centro de Distribuicao")).toBeInTheDocument();

    const postCall = findFetchCall(fetchMock, "POST");
    expect(postCall?.[0]).toBe("/api/support-points");
    expect(getJsonBody(postCall?.[1])).toEqual({
      name: "Centro de Distribuicao",
      type: "SUPPLY",
      latitude: -8.06,
      longitude: -34.89,
    });
  });

  it("bloqueia coordenadas fora do intervalo e capacidade invalida antes de salvar", async () => {
    const fetchMock = mockFetch(() => emptyListResponse());

    render(<AdminTabs />);
    openLocationsTab();

    await screen.findByText("Nenhum local cadastrado");
    fillForm({
      name: "Abrigo em coordenadas invalidas",
      capacity: "0",
      latitude: "91",
      longitude: "-181",
    });
    fireEvent.click(screen.getByRole("button", { name: "Cadastrar local" }));

    expect(await screen.findByText("Latitude deve estar entre -90 e 90.")).toBeInTheDocument();
    expect(screen.getByText("Longitude deve estar entre -180 e 180.")).toBeInTheDocument();
    expect(screen.getByText("Capacidade deve ser um número inteiro positivo.")).toBeInTheDocument();
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("exibe erro de busca e permite tentar novamente pelo botao Atualizar", async () => {
    const fetchMock = mockFetch((input, init) => {
      if (!init?.method && fetchMock.mock.calls.length === 1) {
        return jsonResponse({ error: "Falha ao carregar" }, 500);
      }
      return listResponse([pointA]);
    });

    render(<AdminTabs />);
    openLocationsTab();

    expect(
      await screen.findByText("Não foi possível carregar os locais. Tente novamente."),
    ).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Atualizar" }));

    expect(await screen.findByText("Abrigo Central")).toBeInTheDocument();
  });

  it("edita um local cadastrado e reflete a alteracao na lista", async () => {
    const updated = {
      ...pointA,
      name: "Abrigo Central Atualizado",
      capacity: 250,
      latitude: -8.2,
      longitude: -35,
    };

    const fetchMock = mockFetch((input, init) => {
      if (init?.method === "PATCH") return jsonResponse(updated);
      return listResponse([pointA]);
    });

    render(<AdminTabs />);
    openLocationsTab();

    await screen.findByText("Abrigo Central");
    fireEvent.click(screen.getByRole("button", { name: "Editar Abrigo Central" }));
    fireEvent.change(screen.getByLabelText("Nome"), {
      target: { value: "Abrigo Central Atualizado" },
    });
    fireEvent.change(screen.getByLabelText("Capacidade"), { target: { value: "250" } });
    fireEvent.change(screen.getByLabelText("Latitude"), { target: { value: "-8.2" } });
    fireEvent.change(screen.getByLabelText("Longitude"), { target: { value: "-35" } });
    fireEvent.click(screen.getByRole("button", { name: "Salvar alterações" }));

    expect(await screen.findByText("Local atualizado com sucesso.")).toBeInTheDocument();
    expect(screen.getByText("Abrigo Central Atualizado")).toBeInTheDocument();
    expect(screen.getByText("250 pessoas")).toBeInTheDocument();
    expect(screen.getByText("-8.2")).toBeInTheDocument();
    expect(screen.getByText("-35")).toBeInTheDocument();

    const patchCall = findFetchCall(fetchMock, "PATCH");
    expect(patchCall?.[0]).toBe("/api/support-points/sp-1");
    expect(getJsonBody(patchCall?.[1])).toMatchObject({
      name: "Abrigo Central Atualizado",
      capacity: 250,
      latitude: -8.2,
      longitude: -35,
    });
  });

  it("exibe erro amigavel quando o salvamento falha e mantem os dados preenchidos", async () => {
    mockFetch((input, init) => {
      if (init?.method === "POST") return jsonResponse({ error: "Falha ao salvar o local." }, 500);
      return emptyListResponse();
    });

    render(<AdminTabs />);
    openLocationsTab();

    await screen.findByText("Nenhum local cadastrado");
    fillForm({
      name: "Abrigo Temporario",
      type: "SHELTER",
      capacity: "120",
      latitude: "-8.05",
      longitude: "-34.88",
    });
    fireEvent.click(screen.getByRole("button", { name: "Cadastrar local" }));

    expect(await screen.findByText("Falha ao salvar o local.")).toBeInTheDocument();
    expect(screen.getByLabelText("Nome")).toHaveValue("Abrigo Temporario");
    expect(screen.getByLabelText("Capacidade")).toHaveValue("120");
  });

  it("remove um local apos confirmacao sem afetar os demais", async () => {
    vi.stubGlobal(
      "confirm",
      vi.fn(() => true),
    );
    const fetchMock = mockFetch((input, init) => {
      if (init?.method === "DELETE") {
        return { ok: true, status: 204, json: vi.fn() } as unknown as Response;
      }
      return listResponse([pointA, pointB]);
    });

    render(<AdminTabs />);
    openLocationsTab();

    await screen.findByText("Abrigo Central");
    fireEvent.click(screen.getByRole("button", { name: "Remover Abrigo Central" }));

    await waitFor(() => expect(screen.queryByText("Abrigo Central")).not.toBeInTheDocument());
    expect(screen.getByText("Posto Médico Norte")).toBeInTheDocument();
    expect(fetchMock).toHaveBeenCalledWith("/api/support-points/sp-1", { method: "DELETE" });
  });

  it("mantem a lista intacta quando a remocao nao e confirmada", async () => {
    vi.stubGlobal(
      "confirm",
      vi.fn(() => false),
    );
    const fetchMock = mockFetch(() => listResponse([pointA, pointB]));

    render(<AdminTabs />);
    openLocationsTab();

    await screen.findByText("Abrigo Central");
    fireEvent.click(screen.getByRole("button", { name: "Remover Abrigo Central" }));

    expect(screen.getByText("Abrigo Central")).toBeInTheDocument();
    expect(screen.getByText("Posto Médico Norte")).toBeInTheDocument();
    expect(findFetchCall(fetchMock, "DELETE")).toBeUndefined();
  });
});
