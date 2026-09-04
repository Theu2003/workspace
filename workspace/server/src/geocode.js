// ===================================================================
// geocode.js — Módulo de geocodificação (endereço → coordenadas)
// ===================================================================
// Este arquivo converte endereços em coordenadas geográficas (latitude/longitude)
// usando a API gratuita do OpenStreetMap (Nominatim).
//
// Quando um usuário ou empresa cadastra um endereço, o sistema converte
// o endereço em coordenadas para poder:
//   - Mostrar a localização no mapa
//   - Calcular distâncias entre empresa e usuário
//   - Filtrar coletas por proximidade
//
// A API do Nominatim é gratuita e não requer chave de acesso,
// mas tem limites de uso (máx. 1 requisição por segundo).
// ===================================================================

/**
 * geocode() — Converte um endereço em coordenadas geográficas.
 * 
 * Faz uma requisição à API do Nominatim (OpenStreetMap) para obter
 * a latitude e longitude do endereço informado.
 * 
 * @param {Object} address - Componentes do endereço
 * @param {string} address.street     - Rua/Logradouro (ex: "Rua das Flores")
 * @param {string} address.number     - Número (ex: "123")
 * @param {string} address.neighborhood - Bairro (ex: "Centro")
 * @param {string} address.city       - Cidade (ex: "Uberlândia")
 * @param {string} address.state      - Estado (ex: "MG")
 * @param {string} address.cep        - CEP (ex: "38400-123")
 * 
 * @returns {Promise<Object|null>} Objeto com coordenadas ou null se falhar:
 *   { latitude: -18.9186, longitude: -48.2772 }
 *   null → se o endereço não foi encontrado ou houve erro
 * 
 * Exemplo de uso:
 *   const coords = await geocode({
 *     street: 'Rua das Flores',
 *     number: '123',
 *     neighborhood: 'Centro',
 *     city: 'Uberlândia',
 *     state: 'MG',
 *     cep: '38400-123'
 *   });
 *   // coords = { latitude: -18.9186, longitude: -48.2772 }
 */
export async function geocode({ street, number, neighborhood, city, state, cep }) {
  // Monta a query de busca concatenando os componentes do endereço
  // Ex: "123, Rua das Flores, Centro, Uberlândia, MG, 38400-123"
  const query = [
    number ? `${number}` : '',
    street,
    neighborhood,
    city,
    state,
    cep
  ].filter(Boolean).join(', ');

  // URL da API do Nominatim (OpenStreetMap)
  // format=json → retorna JSON
  // limit=1   → retorna apenas 1 resultado (o mais provável)
  // q=...     → string de busca
  const url = `https://nominatim.openstreetmap.org/search?format=json&limit=1&q=${encodeURIComponent(query)}`;

  // Timeout de 8 segundos para não bloquear o servidor se a API demorar
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 8000);

  try {
    const res = await fetch(url, {
      headers: { 'User-Agent': 'ReciclaJa/1.0 (reciclagem app)' }, // Nominatim exige User-Agent
      signal: controller.signal
    });
    if (!res.ok) return null;  // Erro HTTP
    const data = await res.json();
    if (!data || data.length === 0) return null; // Endereço não encontrado

    // Retorna as coordenadas do primeiro resultado
    return {
      latitude: parseFloat(data[0].lat),   // Latitude em graus decimais
      longitude: parseFloat(data[0].lon)   // Longitude em graus decimais
    };
  } catch {
    return null; // Timeout ou erro de rede
  } finally {
    clearTimeout(timer); // Limpa o timer para evitar memory leak
  }
}
