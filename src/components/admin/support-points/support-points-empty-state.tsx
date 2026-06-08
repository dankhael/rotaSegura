import { Plus } from "lucide-react";

import { Button } from "@/components/ui/button";

type SupportPointsEmptyStateProps = {
  onCreate: () => void;
};

export function SupportPointsEmptyState({ onCreate }: SupportPointsEmptyStateProps) {
  return (
    <div className="grid min-h-64 place-items-center px-6 py-12 text-center">
      <div>
        <h3 className="text-base font-bold text-(--ink-2)">Nenhum local cadastrado</h3>
        <p className="mt-1 max-w-sm text-sm text-(--ink-3)">
          Cadastre o primeiro ponto para manter o mapa e as rotas de apoio atualizados.
        </p>
        <Button type="button" className="mt-4" onClick={onCreate}>
          <Plus />
          Novo local
        </Button>
      </div>
    </div>
  );
}
