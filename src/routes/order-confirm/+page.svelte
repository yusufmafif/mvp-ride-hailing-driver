<script>
  import { onMount } from 'svelte';
  import { goto } from '$app/navigation';
  import { page } from '$app/stores';
  import { get } from 'svelte/store';
  import { supabase } from '$lib/supabaseClient';

  let user = null;
  let pickup = '';
  let destination = '';
  let pickupCoord = null;
  let destinationCoord = null;
  let routeInfo = null;
  let drivers = [];
  let selectedDriver = null;
  let orderConfirmedMessage = '';

  onMount(async () => {
    const { data: { session } = {} } = await supabase.auth.getSession();
    if (!session) {
      return goto('/login');
    }
    user = session.user;

    const url = get(page).url;
    const dataParam = url.searchParams.get('data');

    if (dataParam) {
      const decodedData = JSON.parse(decodeURIComponent(dataParam));
      pickup = decodedData.pickup;
      destination = decodedData.destination;
      pickupCoord = decodedData.pickupCoord;
      destinationCoord = decodedData.destinationCoord;
      routeInfo = decodedData.routeInfo;

      if (pickupCoord) {
       await generateDummyDrivers(pickupCoord);
      }
    } else {
      goto('/home');
    }
  });


const generateDummyDrivers = async (centerCoord) => {
  const [centerLon, centerLat] = centerCoord;
  const radiusKm = 1;
  const latDelta = radiusKm / 111;
  const lonDelta = radiusKm / (111 * Math.cos(centerLat * Math.PI / 180));

  // Helper: Snap ke jalan
  const snapToRoad = async (lon, lat) => {
    try {
      const res = await fetch(`https://router.project-osrm.org/nearest/v1/driving/${lon},${lat}`);
      const data = await res.json();
      if (data.waypoints?.length > 0) {
        const [snappedLon, snappedLat] = data.waypoints[0].location;
        return [snappedLon, snappedLat];
      }
    } catch (e) {
      console.warn('Snap to road failed:', e);
    }
    return [lon, lat]; // fallback
  };

  // Generate dan snap driver
  const dummyDriverPromises = Array.from({ length: 1 }, async (_, i) => {
    const driverLat = centerLat + (Math.random() * 2 - 1) * latDelta;
    const driverLon = centerLon + (Math.random() * 2 - 1) * lonDelta;

    const [snappedLon, snappedLat] = await snapToRoad(driverLon, driverLat);

    const distanceToPickup = calculateDistance(centerLat, centerLon, snappedLat, snappedLon).toFixed(2);

    return {
      id: i + 1,
      name: `Driver ${String.fromCharCode(65 + i)}`,
      vehicle: `Motor ${100 + i * 5}cc`,
      rating: (Math.random() * 1 + 4).toFixed(1),
      distance: distanceToPickup,
      eta: Math.round(Math.random() * 5 + 2),
      lat: snappedLat,
      lon: snappedLon,
    };
  });

  drivers = (await Promise.all(dummyDriverPromises)).sort((a, b) => a.distance - b.distance);

  if (drivers.length > 0) {
    selectedDriver = drivers[0];
  }
};


  const calculateDistance = (lat1, lon1, lat2, lon2) => {
    const R = 6371;
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
      Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  };

  const selectDriver = (driver) => {
    selectedDriver = driver;
  };

 const confirmOrder = async () => {
  if (!selectedDriver) {
    orderConfirmedMessage = 'Mohon pilih driver terlebih dahulu.';
    return;
  }

  orderConfirmedMessage = 'Mengirim pesanan Anda...';
  await new Promise(resolve => setTimeout(resolve, 2000));

  console.log("Order confirmed!", {
    user: user.id,
    pickup,
    destination,
    pickupCoord,
    destinationCoord,
    routeInfo,
    selectedDriverId: selectedDriver.id
  });

  // Redirect to tracking page
//  const driverParam = encodeURIComponent(JSON.stringify(selectedDriver));
// const pickupParam = encodeURIComponent(JSON.stringify(pickupCoord));
// goto(`/tracking?driver=${encodeURIComponent(JSON.stringify(selectedDriver))}&pickupCoord=${encodeURIComponent(JSON.stringify(pickupCoord))}`);

const driverParam = encodeURIComponent(JSON.stringify(selectedDriver));
const pickupParam = encodeURIComponent(JSON.stringify(pickupCoord));
const destinationParam = encodeURIComponent(JSON.stringify(destinationCoord));

goto(`/tracking?driver=${driverParam}&pickupCoord=${pickupParam}&destinationCoord=${destinationParam}`);


       
};


  const handleLogout = async () => {
    await supabase.auth.signOut();
    goto('/login');
  };
</script>


<style>
  .order-confirm-container {
    padding: 1rem;
    font-family: 'Inter', sans-serif;
    max-width: 600px;
    margin: 0 auto;
    background-color: #f8f9fa;
    min-height: 100vh;
    display: flex;
    flex-direction: column;
  }
  .header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 1.5rem;
    padding: 10px 0;
    border-bottom: 1px solid #e2e8f0;
  }
  .header strong {
    color: #343a40;
    font-size: 1.1rem;
  }
  .section-title {
    font-size: 1.2rem;
    font-weight: bold;
    margin-bottom: 1rem;
    color: #343a40;
  }
  .route-info-display {
    background-color: #e9f7ef;
    padding: 1.5rem;
    border-radius: 8px;
    margin-bottom: 1.5rem;
    box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
    border: 1px solid #d4edda;
  }
  .route-info-display p {
    margin-bottom: 0.5rem;
    color: #155724;
    font-size: 1rem;
  }
  .driver-list {
    display: grid;
    gap: 1rem;
    margin-bottom: 1.5rem;
  }
  .driver-card {
    background-color: white;
    padding: 1rem;
    border-radius: 8px;
    box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
    border: 1px solid #e2e8f0;
    cursor: pointer;
    transition: all 0.2s ease-in-out;
  }
  .driver-card:hover {
    transform: translateY(-2px);
    box-shadow: 0 4px 8px rgba(0, 0, 0, 0.15);
  }
  .driver-card.selected {
    border-color: #007bff;
    box-shadow: 0 0 0 3px rgba(0, 123, 255, 0.25);
  }
  .driver-info h3 {
    margin-top: 0;
    margin-bottom: 0.5rem;
    color: #007bff;
    font-size: 1.1rem;
  }
  .driver-info p {
    margin-bottom: 0.3rem;
    font-size: 0.9rem;
    color: #555;
  }
  .confirm-button {
    width: 100%;
    padding: 15px;
    font-size: 1.2rem;
    background-color: #28a745; /* Success green */
    color: white;
    border: none;
    border-radius: 8px;
    cursor: pointer;
    transition: background-color 0.2s ease-in-out;
    box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
  }
  .confirm-button:hover {
    background-color: #218838;
  }
  .confirm-button:disabled {
    background-color: #6c757d;
    cursor: not-allowed;
  }
  .logout-button {
    background-color: #dc3545;
    color: white;
    border: none;
    padding: 8px 12px;
    border-radius: 8px;
    cursor: pointer;
    transition: background-color 0.2s ease-in-out;
    box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
  }
  .logout-button:hover {
    background-color: #c82333;
  }
  .message {
    margin-top: 1rem;
    padding: 10px;
    border-radius: 8px;
    text-align: center;
    font-weight: 500;
  }
  .message.info {
    background-color: #fff3cd;
    color: #856404;
    border: 1px solid #ffeeba;
  }
  .message.success {
    background-color: #d4edda;
    color: #155724;
    border-color: #c3e6cb;
  }
  .message.error {
    background-color: #f8d7da;
    color: #721c24;
    border-color: #f5c6cb;
  }
</style>

{#if user}
<div class="order-confirm-container">
  <header class="header">
    <div>
      <strong>Konfirmasi Pesanan</strong>
    </div>
    <button class="logout-button" on:click={handleLogout}>Logout</button>
  </header>

  <div class="route-info-display">
    <p><strong>Penjemputan:</strong> {pickup}</p>
    <p><strong>Tujuan:</strong> {destination}</p>
    <p><strong>Jarak:</strong> {routeInfo?.distance}</p>
    <p><strong>Waktu Tempuh:</strong> {routeInfo?.duration}</p>
    <p><strong>Tarif:</strong> {routeInfo?.tarif}</p>
  </div>

  <h2 class="section-title">Driver Anda</h2>
  {#if drivers.length === 0}
    <p class="message info">Mencari driver terdekat...</p>
  {/if}
  <div class="driver-list">
    {#each drivers as driver (driver.id)}
      <div
        class="driver-card {selectedDriver && selectedDriver.id === driver.id ? 'selected' : ''}"
        on:click={() => selectDriver(driver)}
      >
        <div class="driver-info">
          <h3>{driver.name} <span style="float: right;">⭐ {driver.rating}</span></h3>
          <p>{driver.vehicle}</p>
          <p>Jarak ke Anda: <strong>{driver.distance} km</strong></p>
          <p>Estimasi tiba: <strong>{driver.eta} menit</strong></p>
        </div>
      </div>
    {/each}
  </div>

  <button class="confirm-button" on:click={confirmOrder} disabled={!selectedDriver || orderConfirmedMessage.includes('Mengirim pesanan Anda')}>
    {#if orderConfirmedMessage.includes('Mengirim pesanan Anda')}
      Mengirim Pesanan...
    {:else}
      Konfirmasi Pesanan
    {/if}
  </button>

  {#if orderConfirmedMessage}
    <div class="message {orderConfirmedMessage.includes('dikonfirmasi') ? 'success' : orderConfirmedMessage.includes('Mohon pilih') ? 'info' : 'error'}">
      {orderConfirmedMessage}
    </div>
  {/if}
</div>
{/if}