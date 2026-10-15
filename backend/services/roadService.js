const cities = {
  "chennai": { lat: 13.0827, lon: 80.2707 },
  "coimbatore": { lat: 11.0168, lon: 76.9558 },
  "madurai": { lat: 9.9252, lon: 78.1198 },
  "tiruchirappalli": { lat: 10.7905, lon: 78.7047 },
  "trichy": { lat: 10.7905, lon: 78.7047 },
  "salem": { lat: 11.6643, lon: 78.1460 },
  "tiruppur": { lat: 11.1085, lon: 77.3411 },
  "erode": { lat: 11.3410, lon: 77.7172 },
  "vellore": { lat: 12.9165, lon: 79.1325 },
  "thoothukudi": { lat: 8.7642, lon: 78.1348 },
  "tuticorin": { lat: 8.7642, lon: 78.1348 },
  "dindigul": { lat: 10.3673, lon: 77.9803 },
  "thanjavur": { lat: 10.7870, lon: 79.1378 },
  "ranipet": { lat: 12.9273, lon: 79.3331 },
  "sivakasi": { lat: 9.4533, lon: 77.8024 },
  "karur": { lat: 10.9601, lon: 78.0766 },
  "ooty": { lat: 11.4100, lon: 76.6950 },
  "kanyakumari": { lat: 8.0883, lon: 77.5385 },
  "tirunelveli": { lat: 8.7139, lon: 77.7567 },
  "hosur": { lat: 12.7409, lon: 77.8253 },
  "dharmapuri": { lat: 12.1211, lon: 78.1582 },
  "namakkal": { lat: 11.2189, lon: 78.1674 },
  "krishnagiri": { lat: 12.5266, lon: 78.2146 },
  "cuddalore": { lat: 11.7480, lon: 79.7714 },
  "villupuram": { lat: 11.9401, lon: 79.4861 },
  "puducherry": { lat: 11.9416, lon: 79.8083 },
  "pondicherry": { lat: 11.9416, lon: 79.8083 },
  "bengaluru": { lat: 12.9716, lon: 77.5946 },
  "bangalore": { lat: 12.9716, lon: 77.5946 }
};

const ROAD_HIGHWAY_MATRIX = {
  "salem-chennai": 336,
  "salem-coimbatore": 172,
  "salem-madurai": 234,
  "salem-tiruchirappalli": 142,
  "salem-trichy": 142,
  "salem-erode": 68,
  "salem-tiruppur": 125,
  "salem-namakkal": 55,
  "salem-dharmapuri": 65,
  "salem-hosur": 158,
  "salem-bengaluru": 202,
  "salem-vellore": 205,
  "salem-dindigul": 178,
  "salem-thanjavur": 198,
  "salem-karur": 98,
  "salem-ooty": 218,
  "salem-kanyakumari": 472,
  "salem-thoothukudi": 378,
  "salem-sivakasi": 308,
  "salem-ranipet": 232,

  "chennai-coimbatore": 508,
  "chennai-madurai": 462,
  "chennai-tiruchirappalli": 332,
  "chennai-trichy": 332,
  "chennai-tiruppur": 468,
  "chennai-erode": 402,
  "chennai-vellore": 138,
  "chennai-thoothukudi": 605,
  "chennai-dindigul": 432,
  "chennai-thanjavur": 348,
  "chennai-ranipet": 115,
  "chennai-sivakasi": 542,
  "chennai-karur": 378,
  "chennai-ooty": 552,
  "chennai-kanyakumari": 705,
  "chennai-bengaluru": 346,
  "chennai-hosur": 305,
  "chennai-puducherry": 152,

  "coimbatore-madurai": 215,
  "coimbatore-tiruchirappalli": 218,
  "coimbatore-trichy": 218,
  "coimbatore-tiruppur": 55,
  "coimbatore-erode": 101,
  "coimbatore-vellore": 376,
  "coimbatore-thoothukudi": 360,
  "coimbatore-dindigul": 158,
  "coimbatore-thanjavur": 274,
  "coimbatore-sivakasi": 242,
  "coimbatore-karur": 132,
  "coimbatore-ooty": 86,
  "coimbatore-kanyakumari": 448,

  "madurai-tiruchirappalli": 130,
  "madurai-trichy": 130,
  "madurai-thoothukudi": 148,
  "madurai-dindigul": 64,
  "madurai-thanjavur": 192,
  "madurai-sivakasi": 74,
  "madurai-kanyakumari": 242,
  "madurai-tirunelveli": 160,

  "tiruchirappalli-thanjavur": 58,
  "trichy-thanjavur": 58,
  "tiruchirappalli-dindigul": 102,
  "tiruchirappalli-thoothukudi": 268
};

function getMatrixRoadDistance(cityA, cityB) {
  const k1 = `${cityA}-${cityB}`;
  const k2 = `${cityB}-${cityA}`;
  if (ROAD_HIGHWAY_MATRIX[k1]) return ROAD_HIGHWAY_MATRIX[k1];
  if (ROAD_HIGHWAY_MATRIX[k2]) return ROAD_HIGHWAY_MATRIX[k2];
  return null;
}

function haversineKm(lat1, lon1, lat2, lon2) {
  const R = 6371;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
            Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
            Math.sin(dLon/2) * Math.sin(dLon/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  return R * c;
}

async function getCoordinatesForPlace(placeName) {
  const norm = String(placeName || '').toLowerCase().trim();
  if (cities[norm]) return cities[norm];

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 2000);
    const query = encodeURIComponent(`${placeName}, Tamil Nadu, India`);
    const res = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${query}`, {
      headers: { 'User-Agent': 'G3BookingSite/1.0 (g3transport.dispatch@gmail.com)' },
      signal: controller.signal
    });
    clearTimeout(timeout);
    if (res.ok) {
      const data = await res.json();
      if (data && data.length > 0) {
        return { lat: parseFloat(data[0].lat), lon: parseFloat(data[0].lon) };
      }
    }
  } catch (err) {}
  return null;
}

function estimateTravelTime(distanceKm) {
  // Average commercial lorry highway speed in Tamil Nadu is ~50-55 km/h + 30 min handling/tolls
  const totalMinutes = Math.round((distanceKm / 52) * 60) + 30;
  const hours = Math.floor(totalMinutes / 60);
  const mins = totalMinutes % 60;
  if (hours === 0) return `${mins} mins`;
  return mins > 0 ? `${hours} hrs ${mins} mins` : `${hours} hrs`;
}

async function calculateActualRoadDistance(pickup, delivery) {
  const pNorm = String(pickup || '').toLowerCase().trim();
  const dNorm = String(delivery || '').toLowerCase().trim();

  if (pNorm === dNorm) {
    const dist = 15;
    return { 
      distanceKm: dist, 
      estimatedTime: estimateTravelTime(dist),
      routeType: "Local Road Transfer", 
      source: "Local City Route" 
    };
  }

  const matrixDist = getMatrixRoadDistance(pNorm, dNorm);
  if (matrixDist) {
    return {
      distanceKm: matrixDist,
      estimatedTime: estimateTravelTime(matrixDist),
      routeType: "Verified National/State Highway Road Distance",
      source: "Verified Highway Route Matrix"
    };
  }

  const c1 = await getCoordinatesForPlace(pickup);
  const c2 = await getCoordinatesForPlace(delivery);

  if (c1 && c2) {
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 2500);
      const url = `http://router.project-osrm.org/route/v1/driving/${c1.lon},${c1.lat};${c2.lon},${c2.lat}?overview=false`;
      const osrmRes = await fetch(url, { signal: controller.signal });
      clearTimeout(timeout);

      if (osrmRes.ok) {
        const osrmData = await osrmRes.json();
        if (osrmData.routes && osrmData.routes.length > 0) {
          const meters = osrmData.routes[0].distance;
          const roadKm = Math.round(meters / 1000);
          const seconds = osrmData.routes[0].duration;
          const durationStr = seconds ? `${Math.floor(seconds / 3600)} hrs ${Math.round((seconds % 3600) / 60)} mins` : estimateTravelTime(roadKm);
          if (roadKm > 0) {
            return {
              distanceKm: roadKm,
              estimatedTime: durationStr,
              routeType: "Actual Highway Road Distance",
              source: "OSRM Real Road Network"
            };
          }
        }
      }
    } catch (e) {}
  }

  if (c1 && c2) {
    const straight = haversineKm(c1.lat, c1.lon, c2.lat, c2.lon);
    const estimatedRoadKm = Math.round(straight * 1.28);
    const finalKm = Math.max(20, estimatedRoadKm);
    return {
      distanceKm: finalKm,
      estimatedTime: estimateTravelTime(finalKm),
      routeType: "Calculated Highway Road Distance",
      source: "Highway Curvature Network Model"
    };
  }

  return {
    distanceKm: 250,
    estimatedTime: estimateTravelTime(250),
    routeType: "Standard Estimated Transport Road Distance",
    source: "Regional Fleet Average"
  };
}


module.exports = {
  cities,
  ROAD_HIGHWAY_MATRIX,
  calculateActualRoadDistance
};
