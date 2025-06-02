const map = L.map('map').setView([51.505, -0.09], 17);

L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
  attribution: '&copy; OpenStreetMap contributors'
}).addTo(map);

let ratMarker = null;

map.on('click', async (e) => {
  const { lat, lng } = e.latlng;

  if (ratMarker) map.removeLayer(ratMarker);
  ratMarker = L.marker([lat, lng]).addTo(map);

  const radiusMeters = 300;

  const query = \`
    [out:json][timeout:25];
    (
      way(around:${radiusMeters},${lat},${lng})[highway];
    );
    out body;
    >;
    out skel qt;
  \`;

  const url = 'https://overpass-api.de/api/interpreter?data=' + encodeURIComponent(query);
  const response = await fetch(url);
  const data = await response.json();

  const geoJson = osmtogeojson(data);
  const pathLayer = L.geoJSON(geoJson, {
    style: { color: '#444' }
  }).addTo(map);

  explorePaths(geoJson, [lat, lng]);
});

function explorePaths(geoJson, startCoords) {
  const visited = new Set();
  const queue = [startCoords];

  const speed = 500;

  const interval = setInterval(() => {
    if (queue.length === 0) {
      clearInterval(interval);
      return;
    }

    const [lat, lng] = queue.shift();
    ratMarker.setLatLng([lat, lng]);

    geoJson.features.forEach((feature) => {
      if (feature.geometry.type === "LineString") {
        feature.geometry.coordinates.forEach(([lon, lat]) => {
          const key = \`\${lat},\${lon}\`;
          if (!visited.has(key)) {
            visited.add(key);
            queue.push([lat, lon]);
          }
        });
      }
    });
  }, speed);
}
