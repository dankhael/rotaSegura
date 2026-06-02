# Teste manual do mapa (pontos de apoio + ocorrências)

Guia para popular o banco **pela API** e ver os dados aparecerem no mapa da home.
Comandos em **PowerShell** (shell padrão do projeto no Windows).

## O que aparece no mapa, e de onde vem

| Camada no mapa                                              | Fonte                       | Como criar                       |
| ----------------------------------------------------------- | --------------------------- | -------------------------------- |
| Pinos de apoio (abrigo / médico / suprimentos / outro)      | `GET /api/support-points`   | `POST /api/support-points`       |
| Marcadores de ocorrência (bolinhas coloridas por categoria) | `GET /api/occurrences`      | `POST /api/reports` (clustering) |
| Pino "Você está aqui"                                       | Geolocalização do navegador | —                                |

> Não há mais dados mockados: **tudo no mapa reflete o banco**. Mapa vazio = banco vazio.

## Pré-requisitos

```powershell
npm run db:up        # Postgres + PostGIS no Docker
npm run db:migrate   # aplica as migrations (só na 1ª vez ou após mudança de schema)
npm run dev          # sobe o Next em http://localhost:3000
```

Base usada nos exemplos:

```powershell
$base = "http://localhost:3000"
```

---

## 1. Inspecionar o banco

**Via API (o que o mapa realmente consome):**

```powershell
Invoke-RestMethod "$base/api/support-points?limit=100" | ConvertTo-Json -Depth 5
Invoke-RestMethod "$base/api/occurrences?limit=100"    | ConvertTo-Json -Depth 5
```

**Via SQL direto:**

```powershell
docker exec rotasegura-db psql -U rotasegura -d rotasegura -c 'SELECT id, name, type, capacity, latitude, longitude FROM support_points ORDER BY "createdAt" DESC;'
docker exec rotasegura-db psql -U rotasegura -d rotasegura -c 'SELECT id, type, status, "reportCount", "uniqueDeviceCount" FROM occurrences ORDER BY "lastReportedAt" DESC;'
```

**Via GUI:** `npm run db:studio` (abre o Prisma Studio no navegador).

---

## 2. Pontos de apoio

Campos: `name` (obrigatório), `type` ∈ `SHELTER | MEDICAL | SUPPLY | OTHER`,
`latitude`, `longitude` (obrigatórios), `capacity` (opcional, inteiro positivo).

### Criar (um de cada tipo, espalhados sobre o Recife)

```powershell
$pontos = @(
  @{ name = "Abrigo EE Cônego João";   type = "SHELTER"; latitude = -8.118; longitude = -34.902; capacity = 120 }
  @{ name = "UPA Boa Viagem";          type = "MEDICAL"; latitude = -8.123; longitude = -34.902; capacity = 40  }
  @{ name = "CC Brasília Teimosa";     type = "SUPPLY";  latitude = -8.082; longitude = -34.876 }
  @{ name = "Ponto de Encontro Cais";  type = "OTHER";   latitude = -8.063; longitude = -34.871 }
)

foreach ($p in $pontos) {
  Invoke-RestMethod "$base/api/support-points" -Method Post -ContentType 'application/json' -Body ($p | ConvertTo-Json)
}
```

**Verificar:** recarregue `http://localhost:3000` → 4 pinos coloridos devem aparecer,
o contador do cabeçalho vira "4 pontos ativos" e os chips de filtro (Abrigos/Médico/
Suprimentos/Outros) mostram as contagens. Clique num pino para ver nome + capacidade.

### Remover

```powershell
# pega o id do primeiro abrigo e apaga
$sp = Invoke-RestMethod "$base/api/support-points?limit=100"
$id = $sp.data[0].id
Invoke-RestMethod "$base/api/support-points/$id" -Method Delete   # 204
```

Recarregue o mapa → o pino some.

---

## 3. Ocorrências (via reports + clustering)

Não existe "criar ocorrência" direto. Você cria **reports** e o backend agrupa:

- **1º report** numa região → cria ocorrência **PENDING** → marcador **translúcido, borda tracejada**.
- **3 reports com `deviceId` distintos**, mesmo `type`, dentro de **200 m** e **120 min**
  → vira **CONFIRMED** → marcador **sólido, borda contínua**.
- `deviceId` precisa ser **UUID**; repetir o mesmo `deviceId` na mesma ocorrência é noop.

Campos do `POST /api/reports`: `type` ∈ `FLOOD | FIRE | LANDSLIDE | ACCIDENT | OBSTRUCTION | OTHER`,
`latitude`, `longitude` (obrigatórios), `deviceId` (UUID, opcional), `occurredAt` (opcional, não-futuro).

### Criar uma ocorrência PENDENTE (1 report)

```powershell
$body = @{ type = "FLOOD"; latitude = -8.11; longitude = -34.90; deviceId = [guid]::NewGuid().Guid } | ConvertTo-Json
$r = Invoke-RestMethod "$base/api/reports" -Method Post -ContentType 'application/json' -Body $body
$r.occurrence.status        # PENDING
$r.occurrence.id            # guarde para confirmar/remover
```

Recarregue o mapa → marcador azul translúcido tracejado (FLOOD) perto do centro.

### Confirmar (deixar SÓLIDO) — 3 devices distintos no mesmo ponto

```powershell
1..3 | ForEach-Object {
  $body = @{ type = "FLOOD"; latitude = -8.11; longitude = -34.90; deviceId = [guid]::NewGuid().Guid } | ConvertTo-Json
  $r = Invoke-RestMethod "$base/api/reports" -Method Post -ContentType 'application/json' -Body $body
  "status=$($r.occurrence.status) devices=$($r.occurrence.uniqueDeviceCount) promoted=$($r.clustering.promoted)"
}
```

No 3º device, `status` vira `CONFIRMED` e `promoted=True`. Recarregue → marcador sólido.

### Cores por categoria (AC2)

Crie ocorrências de tipos diferentes em pontos distantes (>200 m) para ver cores distintas:

```powershell
$tipos = @(
  @{ type="FIRE";        lat=-8.05;  lon=-34.88 }
  @{ type="LANDSLIDE";   lat=-8.04;  lon=-34.95 }
  @{ type="ACCIDENT";    lat=-8.13;  lon=-34.91 }
  @{ type="OBSTRUCTION"; lat=-8.07;  lon=-34.93 }
)
foreach ($t in $tipos) {
  $body = @{ type=$t.type; latitude=$t.lat; longitude=$t.lon; deviceId=[guid]::NewGuid().Guid } | ConvertTo-Json
  Invoke-RestMethod "$base/api/reports" -Method Post -ContentType 'application/json' -Body $body | Out-Null
}
```

FLOOD=azul, FIRE=vermelho, LANDSLIDE=âmbar, ACCIDENT=roxo, OBSTRUCTION=laranja, OTHER=cinza.

### Clustering (AC6)

Várias ocorrências próximas, ao diminuir o zoom, agrupam-se num círculo com contagem.

### Remover ocorrência

```powershell
$occ = Invoke-RestMethod "$base/api/occurrences?limit=100"
Invoke-RestMethod "$base/api/occurrences/$($occ.data[0].id)" -Method Delete   # 204, apaga reports em cascata
```

---

## 4. Cenários de erro (UI)

- **API fora do ar:** pare o banco (`npm run db:down`) e recarregue → faixas vermelhas
  "Não foi possível carregar os pontos de apoio / as ocorrências". Suba de novo com `npm run db:up`.
- **Payload inválido:** ex. `type` inexistente ou `deviceId` não-UUID → resposta `400`
  com a lista de campos inválidos.

## 5. Limpar tudo

```powershell
docker exec rotasegura-db psql -U rotasegura -d rotasegura -c 'TRUNCATE reports, occurrences, support_points CASCADE;'
```
