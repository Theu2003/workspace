// Titulo: geocode
// Autor: Mateus Martins Peres
// Finalidade: Modulo do backend responsavel por geocode.
export async function geocode({ street, number, neighborhood, city, state, cep }) {

  const query = [
    number ? `${number}` : '',
    street,
    neighborhood,
    city,
    state,
    cep
  ].filter(Boolean).join(', ');

  const url = `https://nominatim.openstreetmap.org/search?format=json&limit=1&q=${encodeURIComponent(query)}`;

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 8000);

  try {
    const res = await fetch(url, {
      headers: { 'User-Agent': 'ReciclaJa/1.0 (reciclagem app)' },
      signal: controller.signal
    });
    if (!res.ok) return null;
    const data = await res.json();
    if (!data || data.length === 0) return null;

    return {
      latitude: parseFloat(data[0].lat),
      longitude: parseFloat(data[0].lon)
    };
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}
