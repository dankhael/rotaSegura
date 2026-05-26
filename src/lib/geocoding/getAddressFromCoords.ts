export async function getAddressFromCoords(lat: number, lng: number) {
  try {
    const response = await fetch(
      `/api/geocode?lat=${encodeURIComponent(lat)}&lng=${encodeURIComponent(lng)}`,
    );

    if (!response.ok) {
      return "Endereço não disponível";
    }

    const data = await response.json();

    return data.address ?? "Endereço não encontrado";
  } catch {
    return "Endereço não disponível";
  }
}
