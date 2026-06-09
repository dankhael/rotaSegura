import { describe, expect, it } from "vitest";

import { qrCodeSvg } from "@/lib/qr-code";

describe("qrCodeSvg", () => {
  it("gera QR Code de versao 10 com contador de 16 bits", () => {
    const svg = qrCodeSvg("a".repeat(271));

    expect(svg).toContain('viewBox="0 0 65 65"');
    expect(svg).toContain("<svg");
  });

  it("rejeita conteudo acima da capacidade suportada", () => {
    expect(() => qrCodeSvg("a".repeat(272))).toThrow("Conte");
  });
});
