(() => {
  const fetchJson = async (url) => {
    try {
      const response = await fetch(url);
      if (!response.ok) throw new Error(`Request failed: ${response.status}`);
      return await response.json();
    } catch (error) {
      console.warn('geo_location.js:', error);
      return null;
    }
  };

  const resolveLocation = async () => {
    const container = document.getElementById('location-info');
    if (!container) return;

    const token = container.dataset.ipinfoToken;
    if (!token) return; 

    const ipData = await fetchJson(`https://ipinfo.io/json?token=${token}`);
    if (!ipData || !ipData.ip) return;

    const geoData = await fetchJson(`https://ip-api.com/json/${ipData.ip}`);
    if (!geoData) return;

    const logs = JSON.parse(localStorage.getItem('locationLogs') || '[]');
    logs.push({ ...geoData, timestamp: new Date().toISOString() });
    localStorage.setItem('locationLogs', JSON.stringify(logs));

  };

  document.addEventListener('DOMContentLoaded', resolveLocation);
})();
