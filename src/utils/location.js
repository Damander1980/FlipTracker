export const getLocation = () => {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      resolve(null);
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        resolve({
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
          accuracy: pos.coords.accuracy,
          timestamp: new Date().toISOString(),
        });
      },
      (err) => {
        console.warn("GPS unavailable:", err.message);
        resolve(null);
      },
      { timeout: 8000, maximumAge: 60000 }
    );
  });
};

export const formatLocation = (loc) => {
  if (!loc) return "Location unavailable";
  return `${loc.lat.toFixed(4)}, ${loc.lng.toFixed(4)}`;
};

export const getMapsUrl = (loc) => {
  if (!loc) return null;
  return `https://maps.google.com/?q=${loc.lat},${loc.lng}`;
};
