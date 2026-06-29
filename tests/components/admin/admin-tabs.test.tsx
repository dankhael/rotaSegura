import { afterEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";

import { AdminTabs } from "@/components/admin/admin-tabs";
import type { DonationPoint } from "@/types/donation";
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

const donationA: DonationPoint = {
  id: "donation-1",
  title: "Campanha Abrigo Central",
  description: "Doações para compra de alimentos, água e itens de higiene.",
  channelType: "PIX_KEY",
  channelValue: "doacoes@rotasegura.org",
  createdAt: "2026-05-01T10:00:00.000Z",
  updatedAt: "2026-05-01T10:00:00.000Z",
};

const donationB: DonationPoint = {
  ...donationA,
  id: "donation-2",
  title: "Fundo emergencial de suprimentos",
  description: "Canal para organizações apoiarem a reposição de cestas básicas.",
  channelType: "EXTERNAL_LINK",
  channelValue: "https://rotasegura.org/doar",
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

function donationListResponse(data: DonationPoint[]) {
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

function openDonationsTab() {
  fireEvent.click(screen.getByRole("tab", { name: "Gestão de Doações" }));
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

function fillDonationForm(values: {
  title: string;
  description: string;
  channelType?: string;
  channelValue: string;
}) {
  fireEvent.change(screen.getByLabelText("Título"), { target: { value: values.title } });
  fireEvent.change(screen.getByLabelText("Descrição"), {
    target: { value: values.description },
  });
  if (values.channelType) {
    fireEvent.change(screen.getByLabelText("Tipo do canal"), {
      target: { value: values.channelType },
    });
  }
  fireEvent.change(screen.getByLabelText(/chave pix|conteudo do qr code|link de doacao/i), {
    target: { value: values.channelValue },
  });
}

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
    expect(screen.getByRole("tab", { name: "Gestão de Doações" })).toHaveAttribute(
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

  it("preenche coordenadas a partir do endereco antes de cadastrar local", async () => {
    const created: SupportPoint = {
      ...pointA,
      id: "sp-4",
      name: "UPA Boa Viagem",
      type: "MEDICAL",
      latitude: -8.12,
      longitude: -34.9006,
      capacity: null,
    };

    const fetchMock = mockFetch((input, init) => {
      if (String(input).startsWith("/api/geocode")) {
        return jsonResponse({
          address: "Boa Viagem, Recife, Pernambuco",
          latitude: -8.1258,
          longitude: -34.9006,
        });
      }
      if (init?.method === "POST") return jsonResponse(created, 201);
      return emptyListResponse();
    });

    render(<AdminTabs />);
    openLocationsTab();

    await screen.findByText("Nenhum local cadastrado");
    fireEvent.change(screen.getByLabelText("Endereço"), {
      target: { value: "Boa Viagem" },
    });
    fireEvent.click(screen.getByRole("button", { name: /buscar endereço/i }));

    expect(await screen.findByLabelText("Latitude")).toHaveValue("-8.1258");
    expect(screen.getByLabelText("Longitude")).toHaveValue("-34.9006");
    expect(screen.getByText(/coordenadas preenchidas/i)).toBeInTheDocument();

    fillForm({
      name: "UPA Boa Viagem",
      type: "MEDICAL",
      latitude: "-8.12",
      longitude: "-34.9006",
    });
    fireEvent.click(screen.getByRole("button", { name: "Cadastrar local" }));

    expect(await screen.findByText("Local cadastrado com sucesso.")).toBeInTheDocument();
    expect(screen.getByText("UPA Boa Viagem")).toBeInTheDocument();

    const geocodeCall = fetchMock.mock.calls.find(([input]) =>
      String(input).startsWith("/api/geocode"),
    );
    expect(geocodeCall?.[0]).toBe("/api/geocode?q=Boa%20Viagem");

    const postCall = findFetchCall(fetchMock, "POST");
    expect(getJsonBody(postCall?.[1])).toMatchObject({
      name: "UPA Boa Viagem",
      type: "MEDICAL",
      latitude: -8.12,
      longitude: -34.9006,
    });
  });

  it("exibe erro quando o endereco do local de apoio nao e encontrado", async () => {
    const fetchMock = mockFetch((input) => {
      if (String(input).startsWith("/api/geocode")) {
        return jsonResponse({ error: "Local nao encontrado" }, 404);
      }
      return emptyListResponse();
    });

    render(<AdminTabs />);
    openLocationsTab();

    await screen.findByText("Nenhum local cadastrado");
    fireEvent.change(screen.getByLabelText("Endereço"), {
      target: { value: "Lugar inexistente" },
    });
    fireEvent.click(screen.getByRole("button", { name: /buscar endereço/i }));

    expect(await screen.findByText(/local nao encontrado/i)).toBeInTheDocument();
    expect(screen.getByLabelText("Latitude")).toHaveValue("");
    expect(screen.getByLabelText("Longitude")).toHaveValue("");
    expect(findFetchCall(fetchMock, "POST")).toBeUndefined();
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
    expect(screen.getByText("-8.200000")).toBeInTheDocument();
    expect(screen.getByText("-35.000000")).toBeInTheDocument();

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

  it("renderiza a aba Gestao de Doacoes com canais retornados pela API", async () => {
    mockFetch((input) => {
      if (String(input).startsWith("/api/donations")) {
        return donationListResponse([donationA, donationB]);
      }
      return emptyListResponse();
    });

    render(<AdminTabs />);
    openDonationsTab();

    expect(screen.getByRole("tab", { name: "Gestão de Doações" })).toHaveAttribute(
      "aria-selected",
      "true",
    );
    expect(await screen.findByText("Campanha Abrigo Central")).toBeInTheDocument();
    expect(screen.getByText("Fundo emergencial de suprimentos")).toBeInTheDocument();
    expect(screen.getAllByText("Chave PIX").length).toBeGreaterThanOrEqual(2);
    expect(screen.getAllByText("Link externo").length).toBeGreaterThanOrEqual(1);
  });

  it("valida campos obrigatorios antes de cadastrar um canal de doacao", async () => {
    const fetchMock = mockFetch((input) => {
      if (String(input).startsWith("/api/donations")) return donationListResponse([]);
      return emptyListResponse();
    });

    render(<AdminTabs />);
    openDonationsTab();
    await screen.findByText("Nenhum canal cadastrado");
    fireEvent.click(screen.getByRole("button", { name: "Cadastrar canal" }));

    expect(await screen.findByText("Informe o titulo.")).toBeInTheDocument();
    expect(screen.getByText("Informe a descricao.")).toBeInTheDocument();
    expect(screen.getByText("Informe chave pix.")).toBeInTheDocument();
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("cadastra um canal de doacao via API e atualiza a lista", async () => {
    const created: DonationPoint = {
      ...donationA,
      id: "donation-3",
      title: "Ajuda para medicamentos",
      description: "Contribuições para atendimento médico emergencial.",
      channelValue: "medicamentos@rotasegura.org",
    };

    const fetchMock = mockFetch((input, init) => {
      if (init?.method === "POST") return jsonResponse(created, 201);
      if (String(input).startsWith("/api/donations")) return donationListResponse([]);
      return emptyListResponse();
    });

    render(<AdminTabs />);
    openDonationsTab();
    await screen.findByText("Nenhum canal cadastrado");
    fillDonationForm({
      title: "Ajuda para medicamentos",
      description: "Contribuições para atendimento médico emergencial.",
      channelType: "PIX_KEY",
      channelValue: "medicamentos@rotasegura.org",
    });
    fireEvent.click(screen.getByRole("button", { name: "Cadastrar canal" }));

    expect(await screen.findByText("Canal cadastrado com sucesso.")).toBeInTheDocument();
    expect(screen.getByText("Ajuda para medicamentos")).toBeInTheDocument();
    expect(screen.getByText("medicamentos@rotasegura.org")).toBeInTheDocument();

    const postCall = findFetchCall(fetchMock, "POST");
    expect(postCall?.[0]).toBe("/api/donations");
    expect(getJsonBody(postCall?.[1])).toEqual({
      title: "Ajuda para medicamentos",
      description: "Contribuições para atendimento médico emergencial.",
      channelType: "PIX_KEY",
      channelValue: "medicamentos@rotasegura.org",
    });
  });

  it("edita um canal de doacao via API e reflete a alteracao na lista", async () => {
    const updated: DonationPoint = {
      ...donationA,
      title: "Campanha Abrigo Central Atualizada",
      channelValue: "novo-pix@rotasegura.org",
    };

    const fetchMock = mockFetch((input, init) => {
      if (init?.method === "PATCH") return jsonResponse(updated);
      if (String(input).startsWith("/api/donations")) return donationListResponse([donationA]);
      return emptyListResponse();
    });

    render(<AdminTabs />);
    openDonationsTab();

    await screen.findByText("Campanha Abrigo Central");
    fireEvent.click(screen.getByRole("button", { name: "Editar Campanha Abrigo Central" }));
    fireEvent.change(screen.getByLabelText("Título"), {
      target: { value: "Campanha Abrigo Central Atualizada" },
    });
    fireEvent.change(screen.getByLabelText("Chave PIX"), {
      target: { value: "novo-pix@rotasegura.org" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Salvar alterações" }));

    expect(await screen.findByText("Canal atualizado com sucesso.")).toBeInTheDocument();
    expect(screen.getByText("Campanha Abrigo Central Atualizada")).toBeInTheDocument();
    expect(screen.getByText("novo-pix@rotasegura.org")).toBeInTheDocument();

    const patchCall = findFetchCall(fetchMock, "PATCH");
    expect(patchCall?.[0]).toBe("/api/donations/donation-1");
  });

  it("remove um canal de doacao apos confirmacao", async () => {
    vi.stubGlobal(
      "confirm",
      vi.fn(() => true),
    );
    const fetchMock = mockFetch((input, init) => {
      if (init?.method === "DELETE") {
        return { ok: true, status: 204, json: vi.fn() } as unknown as Response;
      }
      if (String(input).startsWith("/api/donations")) {
        return donationListResponse([donationA, donationB]);
      }
      return emptyListResponse();
    });

    render(<AdminTabs />);
    openDonationsTab();

    await screen.findByText("Campanha Abrigo Central");
    fireEvent.click(screen.getByRole("button", { name: "Remover Campanha Abrigo Central" }));

    await waitFor(() =>
      expect(screen.queryByText("Campanha Abrigo Central")).not.toBeInTheDocument(),
    );
    expect(screen.getByText("Fundo emergencial de suprimentos")).toBeInTheDocument();
    expect(fetchMock).toHaveBeenCalledWith("/api/donations/donation-1", { method: "DELETE" });
  });

  it("aceita conteudo livre para QR Code", async () => {
    const created: DonationPoint = {
      ...donationA,
      id: "donation-4",
      title: "QR Code emergencial",
      description: "Canal para doar via QR Code.",
      channelType: "QR_CODE",
      channelValue: "qrcode-sem-url",
    };

    mockFetch((input, init) => {
      if (init?.method === "POST") return jsonResponse(created, 201);
      if (String(input).startsWith("/api/donations")) return donationListResponse([]);
      return emptyListResponse();
    });

    render(<AdminTabs />);
    openDonationsTab();
    await screen.findByText("Nenhum canal cadastrado");
    fillDonationForm({
      title: "QR Code emergencial",
      description: "Canal para doar via QR Code.",
      channelType: "QR_CODE",
      channelValue: "qrcode-sem-url",
    });
    fireEvent.click(screen.getByRole("button", { name: "Cadastrar canal" }));

    expect(await screen.findByText("Canal cadastrado com sucesso.")).toBeInTheDocument();
    expect(screen.getByText("QR Code emergencial")).toBeInTheDocument();
  });

  it("valida URL para link externo", async () => {
    mockFetch((input) => {
      if (String(input).startsWith("/api/donations")) return donationListResponse([]);
      return emptyListResponse();
    });

    render(<AdminTabs />);
    openDonationsTab();
    await screen.findByText("Nenhum canal cadastrado");
    fillDonationForm({
      title: "Link emergencial",
      description: "Canal para doar por link.",
      channelType: "EXTERNAL_LINK",
      channelValue: "link-sem-url",
    });
    fireEvent.click(screen.getByRole("button", { name: "Cadastrar canal" }));

    expect(
      await screen.findByText("Informe uma URL valida comecando com http ou https."),
    ).toBeInTheDocument();
  });
});
