# 🌐 APIs Externas Utilizadas — ReciclaJá

> Documento de referência com **todas as APIs de terceiros** usadas no projeto, suas URLs oficiais, endpoints, limites de uso, políticas e links para documentação original.

---

## 📋 Resumo Rápido

| API | Finalidade | Onde é usada no código | Autenticação | Custo |
|-----|------------|------------------------|--------------|-------|
| **Nominatim (OpenStreetMap)** | Geocodificação endereço ↔ lat/lng | `server/src/geocode.js`, `client/src/components/AddressFields.js` | Não (User-Agent obrigatório) | Gratuita |
| **OSRM** | Rotas de carro (empresa → coleta) | `client/src/pages/MyCollections.js` | Não | Gratuita |
| **OpenStreetMap Tiles** | Mapa base (tiles PNG) | `client/src/components/MapView.js`, `client/src/pages/CollectionMap.js` | Não | Gratuita |
| **Google Fonts** | Fonte DM Sans | `client/index.html` | Não | Gratuita |

---

## 1️⃣ Nominatim (OpenStreetMap) — Geocodificação

### 📖 Documentação Oficial
- **Site principal:** <https://nominatim.org/>
- **Documentação da API:** <https://nominatim.org/release-docs/latest/api/Overview/>
- **Wiki OSM:** <https://wiki.openstreetmap.org/wiki/Nominatim>
- **Política de uso:** <https://operations.osmfoundation.org/policies/nominatim/>

### 🔗 Endpoints Utilizados

| Operação | Endpoint | Exemplo |
|----------|----------|---------|
| **Geocodificação** (endereço → coordenadas) | `https://nominatim.openstreetmap.org/search` | `?format=json&q=Av.+Paulista+1000,+São+Paulo,+SP` |
| **Geocodificação reversa** (coordenadas → endereço) | `https://nominatim.openstreetmap.org/reverse` | `?format=json&lat=-23.561684&lon=-46.655981` |

### 📝 Parâmetros Principais

| Parâmetro | Descrição | Obrigatório? |
|-----------|-----------|--------------|
| `format=json` | Formato da resposta | Sim |
| `q` | Query de busca (endereço) | Para `/search` |
| `lat`, `lon` | Coordenadas | Para `/reverse` |
| `limit=1` | Número de resultados | Não (padrão 10) |
| `addressdetails=1` | Detalhes de endereço estruturado | Não |

### ⚠️ Limites e Políticas (Obrigatório Cumprir)

| Regra | Detalhe |
|-------|---------|
| **Rate limit** | **Máx. 1 requisição por segundo** (por aplicação/IP) |
| **User-Agent** | **Obrigatório** — deve identificar sua aplicação (ex: `User-Agent: ReciclaJa/1.0`) |
| **Referer** | Recomendado enviar header `Referer` válido |
| **Cache** | Cacheie resultados sempre que possível |
| **Uso proibido** | Autocomplete client-side, bulk geocoding, scraping |
| **Atribuição** | Mostrar "© OpenStreetMap contributors" se exibir resultados |

### 💻 Como Usamos no Projeto

**Backend (`server/src/geocode.js`):**
```javascript
const url = `https://nominatim.openstreetmap.org/search?format=json&limit=1&q=${encodeURIComponent(query)}`;

const res = await fetch(url, {
  headers: { 'User-Agent': 'ReciclaJa/1.0 (reciclagem app)' },
  signal: controller.signal  // timeout 8s
});
```

**Frontend (`client/src/components/AddressFields.js`):**
- Busca de CEP/endereço ao digitar
- Botão "Usar minha localização (GPS)" → `reverse` geocode

---

## 2️⃣ OSRM (Open Source Routing Machine) — Rotas

### 📖 Documentação Oficial
- **Repositório/GitHub:** <https://github.com/Project-OSRM/osrm-backend>
- **Documentação HTTP API:** <https://github.com/Project-OSRM/osrm-backend/blob/master/docs/http.md>
- **Demo online:** <https://router.project-osrm.org/>

### 🔗 Endpoint Utilizado

| Serviço | Endpoint | Exemplo |
|---------|----------|---------|
| **Route** (rota mais rápida) | `https://router.project-osrm.org/route/v1/driving/{coordinates}` | `/route/v1/driving/-46.65,-23.56;-46.63,-23.55` |

### 📝 Parâmetros da Rota

| Parâmetro | Descrição | Valor Usado |
|-----------|-----------|-------------|
| `profile` | `driving` (carro), `walking`, `cycling` | `driving` |
| `coordinates` | `lng,lat;lng,lat...` (ordem: origem → destino) | Empresa → Coleta |
| `overview=full` | Geometria completa da rota | Sim |
| `geometries=geojson` | Formato GeoJSON | Sim |
| `steps=true` | Instruções passo a passo | Opcional |

### ⚠️ Limites e Políticas

| Regra | Detalhe |
|-------|---------|
| **Rate limit** | Não publicado oficialmente — uso razoável (não abuse) |
| **User-Agent** | Recomendado identificar aplicação |
| **Público** | Servidor de demonstração — **sem SLA**, pode cair |
| **Produção** | Para produção, **hospede seu próprio OSRM** |

### 💻 Como Usamos no Projeto

**Frontend (`client/src/pages/MyCollections.js`):**
```javascript
const url = `https://router.project-osrm.org/route/v1/driving/${companyLng},${companyLat};${collectionLng},${collectionLat}?overview=full&geometries=geojson`;

const response = await fetch(url);
const data = await response.json();
// data.routes[0].geometry → linha no mapa (Leaflet)
```

---

## 3️⃣ OpenStreetMap Tile Server — Mapa Base

### 📖 Documentação Oficial
- **Política de Tiles:** <https://operations.osmfoundation.org/policies/tiles/>
- **Diretrizes de Atribuição:** <https://wiki.osmfoundation.org/wiki/Licence/Attribution_Guidelines>
- **Copyright:** <https://www.openstreetmap.org/copyright>

### 🔗 Endpoint Utilizado

| Tipo | URL Template | Exemplo (z=15, x=17709, y=11123) |
|------|--------------|-----------------------------------|
| **Tiles PNG** | `https://tile.openstreetmap.org/{z}/{x}/{y}.png` | `https://tile.openstreetmap.org/15/17709/11123.png` |

> ⚠️ **Use exatamente este domínio** (`tile.openstreetmap.org`). Subdomínios antigos (`a.tile`, `b.tile`, `c.tile`) podem ser descontinuados.

### ⚠️ Políticas de Uso (Críticas — Leia Antes de Produção)

| Regra | Detalhe |
|-------|---------|
| **User-Agent** | **Obrigatório** — deve identificar claramente sua aplicação. User-Agents genéricos (`okhttp`, `Go-http-client`, `curl`, etc.) **são bloqueados** |
| **Referer** | **Obrigatório** para web — header `Referer` válido; não use `Referrer-Policy` restritivo |
| **HTTPS** | **Obrigatório** — HTTP não é permitido |
| **Cache** | **Respeite headers `Cache-Control`, `Expires`, `Etag`**. Se não puder ler, cache por **mínimo 7 dias**. Não envie `Cache-Control: no-cache` |
| **Proibido** | Bulk downloading, scraping, pre-seeding, offline prefetch, bots automatizados |
| **Atribuição** | **Obrigatória** no mapa: `© OpenStreetMap contributors` (link para <https://www.openstreetmap.org/copyright>) — visível, não oculto |

### 💻 Como Usamos no Projeto

**Frontend (`client/src/components/MapView.js` e `CollectionMap.js`) via Leaflet:**
```javascript
L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
  attribution: '© OpenStreetMap contributors',
  maxZoom: 19
}).addTo(map);
```

> O Leaflet envia `User-Agent` do navegador automaticamente. Em produção, considere configurar um `User-Agent` customizado no servidor proxy.

---

## 4️⃣ Google Fonts — Tipografia

### 📖 Documentação Oficial
- **Guia de início:** <https://developers.google.com/fonts/docs/getting_started>
- **Referência da API CSS:** <https://developers.google.com/fonts/docs/css2_api>
- **FAQ/Termos:** <https://developers.google.com/fonts/faq>

### 🔗 Endpoints Utilizados

| Recurso | URL |
|---------|-----|
| **CSS da fonte** | `https://fonts.googleapis.com/css2?family=DM+Sans:ital,opsz,wght@0,9..40,400;0,9..40,500;0,9..40,600;0,9..40,700;0,9..40,800;1,9..40,400&display=swap` |
| **Arquivos de fonte** | `https://fonts.gstatic.com/s/{family}/{version}/{hash}.ttf` (carregado automaticamente pelo CSS) |

### 📝 Parâmetros da URL CSS

| Parâmetro | Valor Usado | Descrição |
|-----------|-------------|-----------|
| `family` | `DM+Sans` | Nome da fonte |
| `ital` | `0,1` | Normal + itálico |
| `opsz` | `9..40` | Optical sizing (variable font) |
| `wght` | `400;500;600;700;800` | Pesos (Regular a ExtraBold) |
| `display=swap` | Sim | `font-display: swap` — texto visível durante carregamento |

### ⚠️ Limites e Políticas

| Regra | Detalhe |
|-------|---------|
| **Custo** | Gratuito, sem limite de pageviews |
| **Privacidade** | Google Fonts não usa cookies; IPs não são associados a contas Google |
| **Cache** | Headers de cache longos (1 ano) — arquivos de fonte cacheados agressivamente |
| **Auto-hospedagem** | Permitida — baixe os arquivos `.woff2` e sirva do seu domínio para privacidade total |

### 💻 Como Usamos no Projeto

**Frontend (`client/index.html`):**
```html
<link rel="preconnect" href="https://fonts.googleapis.com" />
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
<link href="https://fonts.googleapis.com/css2?family=DM+Sans:ital,opsz,wght@0,9..40,400;0,9..40,500;0,9..40,600;0,9..40,700;0,9..40,800;1,9..40,400&display=swap" rel="stylesheet" />
```

**CSS (`client/src/index.css` via Tailwind):**
```css
@theme {
  --font-sans: "DM Sans", ui-sans-serif, system-ui, sans-serif;
}
```

---

## 📊 Tabela Comparativa de Limites

| API | Rate Limit | User-Agent Obrigatório? | HTTPS Obrigatório? | Atribuição Obrigatória? | SLA |
|-----|------------|-------------------------|--------------------|------------------------|-----|
| Nominatim | 1 req/s | **Sim** | Sim | Sim (se exibir dados) | Não |
| OSRM (demo) | Não publicado | Recomendado | Sim | Não | Não |
| OSM Tiles | Não publicado | **Sim** (bloqueia genéricos) | **Sim** | **Sim** (no mapa) | Não |
| Google Fonts | Ilimitado | Não | Sim | Não | Sim (Google) |

---

## 🚀 Checklist para Produção

Antes de colocar em produção, **verifique cada item**:

### Nominatim
- [ ] User-Agent customizado configurado no backend (`ReciclaJa/1.0`)
- [ ] Rate limit respeitado (1 req/s) — implemente fila/delay se necessário
- [ ] Cache de resultados implementado (Redis, memória, localStorage)
- [ ] Atribuição "© OpenStreetMap contributors" visível se mostrar endereços

### OSRM
- [ ] Considere hospedar **próprio servidor OSRM** (Docker: `osrm/osrm-backend`)
- [ ] Se usar demo, implemente fallback/tratamento de erro
- [ ] User-Agent customizado no fetch do frontend

### OSM Tiles
- [ ] User-Agent customizado (configure no reverse proxy ou Leaflet)
- [ ] Referer header válido (domínio do seu site)
- [ ] Cache headers respeitados (não force `no-cache`)
- [ ] Atribuição visível no mapa (Leaflet faz automaticamente)
- [ ] **Alternativa forte:** Use provedor comercial (Mapbox, Stadia Maps, Thunderforest, MapTiler) para SLA

### Google Fonts
- [ ] `display=swap` ativo (já está)
- [ ] `preconnect` para `fonts.googleapis.com` e `fonts.gstatic.com` (já está)
- [ ] **Opcional (privacidade):** Auto-hospede as fontes `.woff2` no seu CDN

---

## 🔗 Links Úteis Consolidados

| Serviço | Link Principal |
|---------|----------------|
| **Nominatim API Docs** | <https://nominatim.org/release-docs/latest/api/Overview/> |
| **Nominatim Usage Policy** | <https://operations.osmfoundation.org/policies/nominatim/> |
| **OSRM HTTP API** | <https://github.com/Project-OSRM/osrm-backend/blob/master/docs/http.md> |
| **OSM Tile Policy** | <https://operations.osmfoundation.org/policies/tiles/> |
| **OSM Attribution Guidelines** | <https://wiki.osmfoundation.org/wiki/Licence/Attribution_Guidelines> |
| **Google Fonts Getting Started** | <https://developers.google.com/fonts/docs/getting_started> |
| **Google Fonts CSS2 API** | <https://developers.google.com/fonts/docs/css2_api> |
| **Leaflet (Map Library)** | <https://leafletjs.com/> |
| **React Leaflet** | <https://react-leaflet.js.org/> |

---

## 📝 Referências no Código

| Arquivo | API(s) Referenciada(s) |
|---------|------------------------|
| `server/src/geocode.js` | Nominatim (`search`, `reverse`) |
| `client/src/components/AddressFields.js` | Nominatim (`search`, `reverse`) |
| `client/src/pages/MyCollections.js` | OSRM (`route`) |
| `client/src/components/MapView.js` | OSM Tiles |
| `client/src/pages/CollectionMap.js` | OSM Tiles |
| `client/index.html` | Google Fonts |

---

> **Última atualização:** 13/11/2026 — ReciclaJá v1.0  
> **Nota:** Políticas de uso podem mudar. Consulte sempre os links oficiais antes de decisões de arquitetura.