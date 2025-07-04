<script>
  import { onMount } from 'svelte';
  import maplibregl from 'maplibre-gl';
  import 'maplibre-gl/dist/maplibre-gl.css';
  import { page } from '$app/stores';
  import { get } from 'svelte/store';
  import { goto } from '$app/navigation';

  let map;
  let eta = 'Menghitung...';
  let distance = '...';
  let pickupCoord = null;
  let driverCoord = null;
  let destinationCoord = null;
  let step = 'driverToPickup'; // 'driverToPickup' -> 'pickupToDestination' -> 'Arrived'

  const MAPTILER_KEY = 'jVkYm2XR18hGm0fCtQtg';

  async function getRoute(start, end) {
    const url = `https://router.project-osrm.org/route/v1/driving/${start[0]},${start[1]};${end[0]},${end[1]}?overview=full&geometries=geojson`;
    try {
      const res = await fetch(url);
      const data = await res.json();
      if (!data.routes.length) throw new Error('No route');

      const route = data.routes[0];
      eta = `${Math.round(route.duration / 60)} menit`;
      distance = `${(route.distance / 1000).toFixed(2)} km`;

      if (map.getLayer('route')) map.removeLayer('route');
      if (map.getSource('route')) map.removeSource('route');

      map.addSource('route', {
        type: 'geojson',
        data: {
          type: 'Feature',
          geometry: route.geometry
        }
      });

      map.addLayer({
        id: 'route',
        type: 'line',
        source: 'route',
        paint: {
          'line-color': '#007bff',
          'line-width': 5
        }
      });

      const bounds = new maplibregl.LngLatBounds();
      bounds.extend(start);
      bounds.extend(end);
      map.fitBounds(bounds, { padding: 50 });

      addMarkers(start, end);
    } catch (e) {
      console.error(e);
      eta = 'Gagal';
      distance = 'Gagal';
    }
  }

  function addMarkers(start, end) {
    document.querySelectorAll('.maplibregl-marker').forEach(m => m.remove());

    new maplibregl.Marker({ color: 'green' })
      .setLngLat(start)
      .setPopup(new maplibregl.Popup().setText(step === 'driverToPickup' ? 'Driver' : 'Pickup'))
      .addTo(map);

    new maplibregl.Marker({ color: 'blue' })
      .setLngLat(end)
      .setPopup(new maplibregl.Popup().setText(step === 'driverToPickup' ? 'Penjemputan' : 'Tujuan'))
      .addTo(map);
  }

  function simulateArrivedAtPickup() {
    step = 'pickupToDestination';
    getRoute(pickupCoord, destinationCoord);
  }

  function simulateArrivedAtDestination() {
    step = 'Arrived';
    if (map.getLayer('route')) map.removeLayer('route');
    if (map.getSource('route')) map.removeSource('route');
    document.querySelectorAll('.maplibregl-marker').forEach(m => m.remove());

    new maplibregl.Marker({ color: 'red' })
      .setLngLat(destinationCoord)
      .setPopup(new maplibregl.Popup().setText('Tujuan Akhir'))
      .addTo(map);

    map.flyTo({ center: destinationCoord, zoom: 15 });
    eta = 'Tiba';
    distance = '0 km';
  }

  const cancelOrder = () => {
    alert("Pesanan dibatalkan (dummy).")
    goto('/home');
  }

  onMount(() => {
    const url = get(page).url;
    const driverParam = url.searchParams.get('driver');
    const pickupParam = url.searchParams.get('pickupCoord');
    const destParam = url.searchParams.get('destinationCoord');

    if (!driverParam || !pickupParam || !destParam) return goto('/home');

    const driver = JSON.parse(decodeURIComponent(driverParam));
    pickupCoord = JSON.parse(decodeURIComponent(pickupParam));
    destinationCoord = JSON.parse(decodeURIComponent(destParam));
    driverCoord = [driver.lon, driver.lat];

    map = new maplibregl.Map({
      container: 'map',
      style: `https://api.maptiler.com/maps/streets-v2/style.json?key=${MAPTILER_KEY}`,
      center: pickupCoord,
      zoom: 13
    });

    map.addControl(new maplibregl.NavigationControl(), 'top-right');
    map.on('load', () => getRoute(driverCoord, pickupCoord));
  });
</script>

<style>
  .tracking-container {
    padding: 1rem;
    font-family: 'Inter', sans-serif;
    max-width: 600px;
    margin: auto;
  }
  #map {
    width: 100%;
    height: 400px;
    margin-bottom: 1rem;
    border-radius: 8px;
    box-shadow: 0 4px 6px rgba(0,0,0,0.1);
  }
  .info-panel {
    background: #f8f9fa;
    padding: 1rem;
    border-radius: 8px;
    margin-bottom: 1rem;
    text-align: center;
  }
  .dummy-button {
    background: #007bff;
    color: white;
    padding: 10px;
    border: none;
    border-radius: 8px;
    margin: 5px;
    cursor: pointer;
    width: 100%;
  }
  .dummy-button:hover {
    background: #0056b3;
  }
  .cancel-button {
    background: #dc3545;
    color: white;
  }
</style>

<div class="tracking-container">
  <div id="map"></div>

  <div class="info-panel">
    <p><strong>Status:</strong> {step}</p>
    <p><strong>Jarak:</strong> {distance}</p>
    <p><strong>ETA:</strong> {eta}</p>
  </div>

  {#if step === 'driverToPickup'}
    <button class="dummy-button" on:click={simulateArrivedAtPickup}>Simulasi: Driver Sampai Pickup</button>
  {:else if step === 'pickupToDestination'}
    <button class="dummy-button" on:click={simulateArrivedAtDestination}>Simulasi: Sampai Tujuan</button>
  {/if}

  <button class="dummy-button cancel-button" on:click={cancelOrder}>Batalkan Pesanan</button>
</div>
