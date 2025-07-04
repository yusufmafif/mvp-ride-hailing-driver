<script>
  import { onMount } from 'svelte';
  import { goto } from '$app/navigation';
  import { supabase } from '$lib/supabaseClient';
  import maplibregl from 'maplibre-gl';
  // Corrected import path for MapLibre GL CSS
  import 'maplibre-gl/dist/maplibre-gl.css';

  // State variables
  let user = null;
  let pickup = '';
  let destination = '';
  let suggestionsPickup = [];
  let suggestionsDestination = [];
  let pickupCoord = null;
  let destinationCoord = null;
  let routeInfo = null;
  let map;
  let currentLocation = null;
  let isSearchingDriver = false; // New state for driver search loading
  let driverFoundMessage = ''; // New state for driver search message

  const TARIF_PER_KM = 2000; // Tariff per kilometer

  // Function to use current location as pickup
  const gunakanLokasiSekarang = async () => {
    if (!currentLocation) {
      driverFoundMessage = 'Lokasi saat ini tidak tersedia.';
      return;
    }
    const [lon, lat] = currentLocation;

    try {
      // Reverse geocoding to get address from coordinates
      const res = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lon}`);
      const data = await res.json();
      pickup = data.display_name;
      pickupCoord = [lon, lat];
      driverFoundMessage = ''; // Clear any previous messages
    } catch (error) {
      console.error("Error fetching current location address:", error);
      driverFoundMessage = 'Gagal mendapatkan alamat dari lokasi saat ini.';
    }
  };

  // Lifecycle hook: runs when the component is mounted
  onMount(async () => {
    // Check user session with Supabase
    const { data: { session } = {} } = await supabase.auth.getSession(); // Destructure with default empty object
    if (!session) {
      // If no session, redirect to login page
      return goto('/login');
    }
    user = session.user;

    // Get current geolocation
    navigator.geolocation.getCurrentPosition(pos => {
      currentLocation = [pos.coords.longitude, pos.coords.latitude];
      // Initialize MapLibre GL map
      map = new maplibregl.Map({
        container: 'map', // HTML element ID for the map
        style: 'https://api.maptiler.com/maps/streets-v2/style.json?key=sfvOnNJOOuOfsE6IJMSR', // Map style
        center: currentLocation, // Center map at current location
        zoom: 13 // Initial zoom level
      });
      // Add navigation controls to the map
      map.addControl(new maplibregl.NavigationControl(), 'top-right');
    }, err => {
      // Alert user if geolocation is not enabled
      driverFoundMessage = "Aktifkan lokasi/GPS untuk menggunakan aplikasi.";
      console.error("Geolocation error:", err);
    });
  });

  // Function to fetch address suggestions from OpenStreetMap Nominatim
  const fetchSuggestions = async (query, type) => {
    if (!currentLocation || !query) {
      if (type === 'pickup') suggestionsPickup = [];
      else suggestionsDestination = [];
      return;
    }
    const [lon, lat] = currentLocation;
    // The delta value below roughly corresponds to a 60km bounding box around the current location.
    // This helps in getting more relevant local suggestions.
    const delta = 0.54;
    const viewbox = `${lon - delta},${lat - delta},${lon + delta},${lat + delta}`; // Bounding box for search
    try {
      const res = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${query}&bounded=1&viewbox=${viewbox}&limit=5`);
      const data = await res.json();
      if (type === 'pickup') suggestionsPickup = data;
      else suggestionsDestination = data;
    } catch (error) {
      console.error("Error fetching suggestions:", error);
      if (type === 'pickup') suggestionsPickup = [];
      else suggestionsDestination = [];
    }
  };

  // Function to select a suggestion and update input fields and coordinates
  const selectSuggestion = (item, type) => {
    if (type === 'pickup') {
      pickup = item.display_name;
      pickupCoord = [parseFloat(item.lon), parseFloat(item.lat)];
      suggestionsPickup = []; // Clear suggestions after selection
    } else {
      destination = item.display_name;
      destinationCoord = [parseFloat(item.lon), parseFloat(item.lat)];
      suggestionsDestination = []; // Clear suggestions after selection
    }
  };

  // Function to find route using OSRM
  const cariRute = async () => {
    if (!pickupCoord || !destinationCoord) {
      driverFoundMessage = 'Mohon lengkapi lokasi penjemputan dan tujuan.';
      return;
    }
    driverFoundMessage = ''; // Clear previous messages
    isSearchingDriver = false; // Reset driver search state

    const url = `https://router.project-osrm.org/route/v1/driving/${pickupCoord.join(',')};${destinationCoord.join(',')}?overview=full&geometries=geojson`;
    try {
      const res = await fetch(url);
      const data = await res.json();

      if (data.routes && data.routes.length > 0) {
        const route = data.routes[0];
        const coords = route.geometry.coordinates; // Array of [lng, lat] pairs

        // --- Perbaikan di sini: Menggunakan LngLatBounds untuk fitBounds ---
        const bounds = new maplibregl.LngLatBounds();
        for (const coord of coords) {
            bounds.extend(coord);
        }
        // --- Akhir Perbaikan ---

        // Remove existing route layer if any
        if (map.getSource('route')) {
          map.removeLayer('route');
          map.removeSource('route');
        }

        // Add new route source and layer to the map
        map.addSource('route', {
          type: 'geojson',
          data: {
            type: 'Feature',
            geometry: { type: 'LineString', coordinates: coords }
          }
        });

        map.addLayer({
          id: 'route',
          type: 'line',
          source: 'route',
          layout: { 'line-join': 'round', 'line-cap': 'round' },
          paint: { 'line-color': '#ff0000', 'line-width': 4 }
        });

        // Fit map bounds to show the entire route using the calculated bounds
        map.fitBounds(bounds, { padding: 40 });

        // Calculate distance, duration, and tariff
        const jarakKm = route.distance / 1000;
        const waktu = Math.round(route.duration / 60);
        routeInfo = {
          distance: `${jarakKm.toFixed(2)} km`,
          duration: `${waktu} menit`,
          tarif: `Rp ${(jarakKm * TARIF_PER_KM).toLocaleString('id-ID')}` // Format tariff for Indonesian locale
        };
      } else {
        routeInfo = null;
        driverFoundMessage = 'Tidak dapat menemukan rute. Coba lokasi lain.';
      }
    } catch (error) {
      console.error("Error finding route:", error);
      routeInfo = null;
      driverFoundMessage = 'Terjadi kesalahan saat mencari rute.';
    }
  };

  // New function to simulate finding a driver
const cariDriver = async () => {
    if (!routeInfo) {
      driverFoundMessage = 'Mohon cari rute terlebih dahulu.';
      return;
    }

    isSearchingDriver = true;
    driverFoundMessage = 'Mencari driver terdekat...';

    // Simulate API call delay for finding driver
    await new Promise(resolve => setTimeout(resolve, 2000)); // Shortened to 2 seconds for faster transition

    isSearchingDriver = false;

    // Simulate driver found and redirect to new page
    if (Math.random() > 0.1) { // Higher chance to find a driver for demonstration
        driverFoundMessage = 'Driver ditemukan! Mengarahkan ke halaman konfirmasi...';

        // Encode data to pass via URL search params (or a more robust state management if app grows)
        const dataToPass = {
            pickup,
            destination,
            pickupCoord,
            destinationCoord,
            routeInfo
        };
        const encodedData = encodeURIComponent(JSON.stringify(dataToPass));

        // Redirect to the new order confirmation page
        goto(`/order-confirm?data=${encodedData}`);

    } else {
        driverFoundMessage = 'Maaf, tidak ada driver yang tersedia saat ini. Coba lagi nanti.';
    }
  };

  // Function to handle user logout
  const handleLogout = async () => {
    await supabase.auth.signOut();
    goto('/login'); // Redirect to login page after logout
  };
</script>

<style>
  /* Basic styling for the container */
  .home-container {
    padding: 1rem;
    font-family: 'Inter', sans-serif; /* Using Inter font */
    max-width: 600px;
    margin: 0 auto;
    background-color: #f8f9fa;
    min-height: 100vh;
    display: flex;
    flex-direction: column;
  }
  /* Header styling */
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
  /* Map placeholder styling */
  .map-placeholder {
    height: 300px;
    background-color: #e9ecef;
    display: flex;
    justify-content: center;
    align-items: center;
    border-radius: 8px;
    margin-bottom: 1.5rem;
    overflow: hidden; /* Ensure map content stays within rounded corners */
    box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
  }
  .map-placeholder p {
    color: #6c757d;
  }
  /* Form input styling */
  .order-form input {
    width: 100%;
    padding: 12px;
    margin-bottom: 1rem;
    font-size: 1rem;
    border: 1px solid #ced4da;
    border-radius: 8px; /* Rounded corners */
    box-sizing: border-box; /* Include padding in width */
    transition: border-color 0.2s ease-in-out, box-shadow 0.2s ease-in-out;
  }
  .order-form input:focus {
    border-color: #007bff;
    box-shadow: 0 0 0 0.2rem rgba(0, 123, 255, 0.25);
    outline: none;
  }
  /* Button styling */
  .button-group {
    display: flex;
    gap: 10px; /* Space between buttons */
    margin-bottom: 1rem;
  }
  .order-button, .cari-driver-button, .gunakan-lokasi-button {
    flex: 1; /* Make buttons take equal width */
    padding: 15px;
    font-size: 1.1rem;
    color: white;
    border: none;
    border-radius: 8px; /* Rounded corners */
    cursor: pointer;
    transition: background-color 0.2s ease-in-out, transform 0.1s ease-in-out;
    box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
  }
  .order-button {
    background-color: #007bff; /* Primary blue */
  }
  .order-button:hover {
    background-color: #0056b3;
    transform: translateY(-1px);
  }
  .cari-driver-button {
    background-color: #28a745; /* Success green */
  }
  .cari-driver-button:hover {
    background-color: #218838;
    transform: translateY(-1px);
  }
  .cari-driver-button:disabled {
    background-color: #6c757d; /* Grey when disabled */
    cursor: not-allowed;
  }
  .gunakan-lokasi-button {
    background-color: #6c757d; /* Secondary grey */
    padding: 10px 15px; /* Smaller padding for this button */
    font-size: 1rem;
    margin-bottom: 1rem; /* Add margin below it */
  }
  .gunakan-lokasi-button:hover {
    background-color: #5a6268;
    transform: translateY(-1px);
  }
  .logout-button {
    background-color: #dc3545; /* Danger red */
    color: white;
    border: none;
    padding: 8px 12px;
    border-radius: 8px; /* Rounded corners */
    cursor: pointer;
    transition: background-color 0.2s ease-in-out;
    box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
  }
  .logout-button:hover {
    background-color: #c82333;
  }
  /* Suggestions dropdown styling */
  .suggestions {
    background: white;
    border: 1px solid #ced4da;
    border-radius: 8px; /* Rounded corners */
    position: absolute;
    z-index: 99;
    max-height: 180px; /* Increased max-height for more suggestions */
    overflow-y: auto;
    width: calc(100% - 2rem); /* Adjust width to match input, considering padding */
    box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
    margin-top: -0.5rem; /* Adjust to overlap slightly with input */
  }
  .suggestions div {
    padding: 12px;
    cursor: pointer;
    border-bottom: 1px solid #f2f2f2;
    font-size: 0.95rem;
    color: #343a40;
  }
  .suggestions div:last-child {
    border-bottom: none;
  }
  .suggestions div:hover {
    background-color: #e9ecef;
  }
  /* Route info styling */
  .route-info {
    background-color: #e9f7ef; /* Light green background */
    padding: 1.5rem;
    border-radius: 8px;
    margin-top: 1.5rem;
    box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
    border: 1px solid #d4edda;
  }
  .route-info p {
    margin-bottom: 0.5rem;
    color: #155724; /* Dark green text */
    font-size: 1rem;
  }
  .route-info p:last-child {
    margin-bottom: 0;
  }
  /* Message display styling */
  .message {
    margin-top: 1rem;
    padding: 10px;
    border-radius: 8px;
    background-color: #fff3cd; /* Light yellow for info/warning */
    color: #856404; /* Dark yellow text */
    border: 1px solid #ffeeba;
    text-align: center;
    font-weight: 500;
  }
  .message.error {
    background-color: #f8d7da; /* Light red for errors */
    color: #721c24; /* Dark red text */
    border-color: #f5c6cb;
  }
  .message.success {
    background-color: #d4edda; /* Light green for success */
    color: #155724; /* Dark green text */
    border-color: #c3e6cb;
  }
  /* Responsive adjustments */
  @media (max-width: 600px) {
    .home-container {
      padding: 0.5rem;
    }
    .button-group {
      flex-direction: column; /* Stack buttons vertically on small screens */
    }
    .order-button, .cari-driver-button, .gunakan-lokasi-button {
      width: 100%; /* Full width for stacked buttons */
      flex: none; /* Remove flex sizing */
    }
    .suggestions {
      width: calc(100% - 1rem); /* Adjust width for smaller padding */
    }
  }
</style>

{#if user}
<div class="home-container">
  <header class="header">
    <div>
      <strong>Halo, {user.email.split('@')[0]}!</strong>
    </div>
    <button class="logout-button" on:click={handleLogout}>Logout</button>
  </header>

  <div class="map-placeholder" id="map">
    <p>Memuat peta...</p>
  </div>

  <div class="order-form" style="position: relative;">
    <input
      type="text"
      placeholder="Lokasi Penjemputan"
      bind:value={pickup}
      on:input={(e) => fetchSuggestions(e.target.value, 'pickup')}
      class="rounded-lg"
    />
    {#if suggestionsPickup.length}
      <div class="suggestions rounded-lg">
        {#each suggestionsPickup as item}
          <div on:click={() => selectSuggestion(item, 'pickup')}>{item.display_name}</div>
        {/each}
      </div>
    {/if}

    <button
      type="button"
      on:click={gunakanLokasiSekarang}
      class="gunakan-lokasi-button rounded-lg"
    >
      📍 Gunakan Lokasi Sekarang
    </button>

    <input
      type="text"
      placeholder="Lokasi Tujuan"
      bind:value={destination}
      on:input={(e) => fetchSuggestions(e.target.value, 'destination')}
      class="rounded-lg"
    />
    {#if suggestionsDestination.length}
      <div class="suggestions rounded-lg">
        {#each suggestionsDestination as item}
          <div on:click={() => selectSuggestion(item, 'destination')}>{item.display_name}</div>
        {/each}
      </div>
    {/if}

    <button class="order-button rounded-lg" on:click={cariRute}>
      Cari Rute & Estimasi
    </button>
  </div>

  {#if routeInfo}
    <div class="route-info rounded-lg">
      <p><strong>Jarak:</strong> {routeInfo.distance}</p>
      <p><strong>Waktu Tempuh:</strong> {routeInfo.duration}</p>
      <p><strong>Tarif:</strong> {routeInfo.tarif}</p>

      <button
        class="cari-driver-button rounded-lg"
        on:click={cariDriver}
        disabled={isSearchingDriver}
        style="margin-top: 1rem; width: 100%;"
      >
        {#if isSearchingDriver}
          Mencari driver...
        {:else}
          Cari Driver
        {/if}
      </button>
    </div>
  {/if}

  {#if driverFoundMessage}
    <div class="message {driverFoundMessage.includes('Driver ditemukan') ? 'success' : driverFoundMessage.includes('Aktifkan lokasi') || driverFoundMessage.includes('Mohon lengkapi') ? '' : 'error'} rounded-lg">
      {driverFoundMessage}
    </div>
  {/if}
</div>
{/if}