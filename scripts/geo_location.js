(() => {
  const fetchJson = async (url) => {
    try {
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`Request failed: ${response.status}`);
      }
      return await response.json();
    } catch (error) {
      console.warn('geo_location.js:', error);
      return null;
    }
  };

  const renderLocation = (data) => {
    const container = document.getElementById('location-info');
    if (!container) return;

    if (!data) {
      container.textContent = 'Location unavailable.';
      return;
    }

    container.textContent = [data.city, data.regionName, data.country]
      .filter(Boolean)
      .join(', ');
  };

  const sendLocationData = async (data) => {
    try {
      await fetch('/log-location', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
    } catch (error) {
      console.warn('geo_location.js: failed to send location data', error);
    }
  };

  const resolveLocation = async () => {
    const container = document.getElementById('location-info');
    if (!container) return;

    const token = container.dataset.ipinfoToken;
    if (!token) {
      container.textContent = 'Set data-ipinfo-token to enable geolocation.';
      return;
    }

    const ipData = await fetchJson(`https://ipinfo.io/json?token=${token}`);
    if (!ipData || !ipData.ip) {
      renderLocation(null);
      return;
    }

    const geoData = await fetchJson(`https://ip-api.com/json/${ipData.ip}`);
    renderLocation(geoData);
    if (geoData) {
      sendLocationData(geoData);
    }
  };

  document.addEventListener('DOMContentLoaded', resolveLocation);
})();
