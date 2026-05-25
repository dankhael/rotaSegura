export async function getAddressFromCoords(lat: number, lng: number) {
  try {
    const res = await fetch(
      `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}`,
    );

    const data = await res.json();

    return data?.display_name ?? "Endereço não encontrado";
  } catch {
    return "Endereço não disponível";
  }
}
