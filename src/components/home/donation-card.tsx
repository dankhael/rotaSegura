"use client";

import { useEffect, useMemo, useState } from "react";
import { ChevronLeft, ChevronRight, ExternalLink, HeartHandshake } from "lucide-react";

import { fetchDonationPoints } from "@/lib/donations/client";
import { qrCodeSvg } from "@/lib/qr-code";
import type { DonationPoint } from "@/types/donation";

export function DonationCard() {
  const [donations, setDonations] = useState<DonationPoint[]>([]);
  const [activeIndex, setActiveIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [hasError, setHasError] = useState(false);

  useEffect(() => {
    let cancelled = false;

    fetchDonationPoints()
      .then((nextDonations) => {
        if (!cancelled) setDonations(nextDonations);
      })
      .catch(() => {
        if (!cancelled) setHasError(true);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  if (!loading && (hasError || donations.length === 0)) return null;

  const activeDonation = donations[activeIndex] ?? null;
  const hasMultipleDonations = donations.length > 1;

  function goToPrevious() {
    setActiveIndex((current) => (current === 0 ? donations.length - 1 : current - 1));
  }

  function goToNext() {
    setActiveIndex((current) => (current === donations.length - 1 ? 0 : current + 1));
  }

  return (
    <section
      aria-labelledby="donation-card-title"
      className="overflow-hidden border bg-(--surface)"
      style={{
        background: "linear-gradient(170deg, var(--surface) 0%, var(--safe-soft) 200%)",
        borderColor: "color-mix(in oklab, var(--safe) 34%, var(--line))",
        borderRadius: "var(--r-lg)",
        boxShadow: "var(--shadow-sm)",
      }}
    >
      <div
        className="border-b px-4 py-3"
        style={{
          borderColor: "color-mix(in oklab, var(--safe) 18%, var(--line))",
          background: "transparent",
        }}
      >
        <div className="flex items-center justify-start gap-2.5">
          <span
            className="grid size-9 place-items-center rounded-xl shadow-sm"
            style={{
              background: "var(--surface)",
              color: "var(--safe-ink)",
              border: "1px solid color-mix(in oklab, var(--safe) 24%, var(--line))",
            }}
            aria-hidden="true"
          >
            <HeartHandshake className="size-5" />
          </span>
          <h2 id="donation-card-title" className="text-base font-bold text-(--ink)">
            Canais de doação
          </h2>
        </div>
      </div>

      {loading ? (
        <DonationLoading />
      ) : (
        activeDonation && <DonationContent donation={activeDonation} />
      )}

      {!loading && hasMultipleDonations && (
        <DonationNavigation
          donations={donations}
          activeIndex={activeIndex}
          onSelect={setActiveIndex}
          onPrevious={goToPrevious}
          onNext={goToNext}
        />
      )}
    </section>
  );
}

function DonationLoading() {
  return (
    <div className="grid justify-items-center gap-3 px-5 py-5" role="status">
      <div className="h-4 w-2/3 animate-pulse rounded-full bg-(--line-soft)" />
      <div className="h-3 w-full animate-pulse rounded-full bg-(--line-soft)" />
      <div className="h-3 w-5/6 animate-pulse rounded-full bg-(--line-soft)" />
      <div className="mt-1 h-12 w-full animate-pulse rounded-2xl bg-(--line-soft)" />
      <span className="sr-only">Carregando canais de doação...</span>
    </div>
  );
}

function DonationContent({ donation }: { donation: DonationPoint }) {
  return (
    <div className="grid gap-4 px-5 py-5 text-center">
      <div className="mx-auto max-w-[270px]">
        <h3 className="text-lg font-bold leading-snug text-(--ink)">{donation.title}</h3>
        <p className="mt-2 text-sm leading-relaxed text-(--ink-3)">{donation.description}</p>
      </div>

      {donation.channelType === "QR_CODE" ? (
        <QrCodeDonation donation={donation} />
      ) : donation.channelType === "EXTERNAL_LINK" ? (
        <ExternalLinkDonation donation={donation} />
      ) : (
        <PixDonation donation={donation} />
      )}
    </div>
  );
}

function QrCodeDonation({ donation }: { donation: DonationPoint }) {
  const svg = useMemo(() => qrCodeSvg(donation.channelValue), [donation.channelValue]);

  return (
    <div className="grid justify-items-center">
      <div
        className="grid aspect-square h-44 place-items-center overflow-hidden rounded-2xl border bg-white p-3 shadow-sm [&_svg]:h-full [&_svg]:w-full"
        style={{ borderColor: "color-mix(in oklab, var(--safe) 22%, var(--line))" }}
        dangerouslySetInnerHTML={{ __html: svg }}
        aria-label={`QR Code para ${donation.title}`}
      ></div>
    </div>
  );
}

function ExternalLinkDonation({ donation }: { donation: DonationPoint }) {
  return (
    <div
      className="rounded-2xl border px-4 py-3 text-center text-sm shadow-sm"
      style={{
        borderColor: "color-mix(in oklab, var(--safe) 22%, var(--line))",
        background: "var(--safe-soft)",
      }}
    >
      <span className="font-semibold text-(--ink-2)">Acesse: </span>
      <a
        href={donation.channelValue}
        target="_blank"
        rel="noreferrer"
        className="inline-flex max-w-full items-center gap-1 font-semibold text-(--safe-ink) underline-offset-2 hover:underline"
      >
        <span className="truncate">{donation.channelValue}</span>
        <ExternalLink className="size-3.5 shrink-0" aria-hidden="true" />
      </a>
    </div>
  );
}

function PixDonation({ donation }: { donation: DonationPoint }) {
  return (
    <div
      className="rounded-2xl border px-4 py-3 text-center text-sm shadow-sm"
      style={{
        borderColor: "color-mix(in oklab, var(--safe) 22%, var(--line))",
        background: "var(--safe-soft)",
      }}
    >
      <div className="font-semibold text-(--ink-2)">Chave PIX:</div>
      <div className="mt-1 break-all font-semibold text-(--safe-ink)">{donation.channelValue}</div>
    </div>
  );
}

function DonationNavigation({
  donations,
  activeIndex,
  onSelect,
  onPrevious,
  onNext,
}: {
  donations: DonationPoint[];
  activeIndex: number;
  onSelect: (index: number) => void;
  onPrevious: () => void;
  onNext: () => void;
}) {
  return (
    <div
      className="flex items-center justify-center gap-2 px-4 pb-5"
      aria-label="Navegação dos canais de doação"
    >
      <button
        type="button"
        className="grid size-8 place-items-center rounded-full border bg-(--surface) shadow-sm transition-colors hover:bg-(--safe-soft)"
        style={{
          borderColor: "color-mix(in oklab, var(--safe) 20%, var(--line))",
          color: "var(--safe-ink)",
        }}
        aria-label="Canal de doação anterior"
        onClick={onPrevious}
      >
        <ChevronLeft className="size-4" />
      </button>

      <div className="flex items-center gap-2">
        {donations.map((donation, index) => (
          <button
            key={donation.id}
            type="button"
            className="size-2.5 rounded-full transition-all"
            style={{
              background: index === activeIndex ? "var(--safe)" : "var(--line)",
              boxShadow:
                index === activeIndex
                  ? "0 0 0 3px color-mix(in oklab, var(--safe) 18%, transparent)"
                  : undefined,
              transform: index === activeIndex ? "scale(1.12)" : undefined,
            }}
            aria-label={`Ver canal ${index + 1}: ${donation.title}`}
            aria-current={index === activeIndex ? "true" : undefined}
            onClick={() => onSelect(index)}
          />
        ))}
      </div>

      <button
        type="button"
        className="grid size-8 place-items-center rounded-full border bg-(--surface) shadow-sm transition-colors hover:bg-(--safe-soft)"
        style={{
          borderColor: "color-mix(in oklab, var(--safe) 20%, var(--line))",
          color: "var(--safe-ink)",
        }}
        aria-label="Próximo canal de doação"
        onClick={onNext}
      >
        <ChevronRight className="size-4" />
      </button>
    </div>
  );
}
