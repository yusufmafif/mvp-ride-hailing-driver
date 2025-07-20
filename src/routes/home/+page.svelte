<script>
  import { onMount, tick } from "svelte";
  import { goto } from "$app/navigation";
  import { supabase } from "$lib/supabaseClient";
  import maplibregl from "maplibre-gl";
  import "maplibre-gl/dist/maplibre-gl.css";
  import { Capacitor } from "@capacitor/core";
  import { registerPlugin } from "@capacitor/core";

  const BackgroundGeolocation = registerPlugin("BackgroundGeolocation");

  let lastUpdate = "";
  let user = null;
  let isOnline = false;
  let currentLocation = null;
  let map;
  let locationMarker = null;
  let watcherId;

  const toggleOnline = async () => {
    isOnline = !isOnline;

    if (isOnline) {
      startTracking();
    } else {
      stopTracking();
    }
  };

  async function startTracking() {
    try {
      console.log("Memulai tracking...");
      watcherId = await BackgroundGeolocation.addWatcher(
        {
          backgroundMessage: "Melacak lokasi Anda...",
          backgroundTitle: "Tracking Lokasi Aktif",
          requestPermissions: true,
          stale: false,
          distanceFilter: 1,
        },
        (location, error) => {
          if (error) {
            console.error("Tracking error:", error);
            return;
          }

          console.log("Lokasi diterima:", location);
          currentLocation = [location.longitude, location.latitude];
          updateLocationMarker(currentLocation);
          const now = new Date();
          lastUpdate = now.toLocaleTimeString();
        },
      );
    } catch (err) {
      console.error("Gagal memulai tracking:", err);
    }
  }

  async function stopTracking() {
    if (watcherId) {
      await BackgroundGeolocation.removeWatcher({ id: watcherId });
      watcherId = undefined;
      console.log("Tracking dihentikan");
    }
  }

  function updateLocationMarker([lon, lat]) {
    if (!map) return;

    if (locationMarker) {
      locationMarker.setLngLat([lon, lat]);
    } else {
      locationMarker = new maplibregl.Marker({ color: "#007bff" })
        .setLngLat([lon, lat])
        .addTo(map);
    }

    map.flyTo({ center: [lon, lat], zoom: 14 });
  }

  const handleLogout = async () => {
    await supabase.auth.signOut();
    goto("/login");
  };

  onMount(async () => {
    const {
      data: { session },
    } = await supabase.auth.getSession();
    if (!session) return goto("/login");
    user = session.user;

    await tick(); // Pastikan DOM siap sebelum buat map

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const coords = [pos.coords.longitude, pos.coords.latitude];
        currentLocation = coords;
        console.log("Lokasi awal:", coords);

        map = new maplibregl.Map({
          container: "map",
          style:
            "https://api.maptiler.com/maps/streets-v2/style.json?key=sfvOnNJOOuOfsE6IJMSR",
          center: coords,
          zoom: 13,
        });

        map.addControl(new maplibregl.NavigationControl(), "top-right");

        locationMarker = new maplibregl.Marker({ color: "#007bff" })
          .setLngLat(coords)
          .addTo(map);
      },
      (err) => {
        console.error("Gagal dapat lokasi awal:", err);
        const fallbackCoords = [106.816666, -6.2]; // Jakarta
        map = new maplibregl.Map({
          container: "map",
          style:
            "https://api.maptiler.com/maps/streets-v2/style.json?key=sfvOnNJOOuOfsE6IJMSR",
          center: fallbackCoords,
          zoom: 12,
        });
      },
    );
  });
</script>

<!-- HTML -->
<div class="header">
  <strong>Driver: {user?.email}</strong>
  <button class="logout-button" on:click={handleLogout}>Logout</button>
</div>

<div id="map" class="map-container"></div>

<div class="status-bar">
  <p>
    Status: <strong class={isOnline ? "online" : "offline"}>
      {isOnline ? "Online" : "Offline"}
    </strong>
  </p>
<p>Update posisi: <strong>{lastUpdate || 'Belum ada'}</strong></p>
  <button on:click={toggleOnline} class="toggle-btn">
    {isOnline ? "Go Offline" : "Go Online"}
  </button>
</div>

<style>
  .driver-form {
    position: absolute;
    top: 70px;
    left: 0;
    right: 0;
    margin: 0 auto;
    max-width: 400px;
    background: #fff;
    padding: 0.7rem 1rem;
    z-index: 10;
    border-radius: 0 0 12px 12px;
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  }

  .header {
    display: flex;
    justify-content: space-between;
    padding: 1rem;
    background: #f8f9fa;
    border-bottom: 1px solid #dee2e6;
  }

  .map-container {
    height: calc(100vh - 100px);
    width: 100%;
  }

  .status-bar {
    position: absolute;
    bottom: 0;
    left: 0;
    right: 0;
    z-index: 10;
    background: #fff;
    padding: 0.75rem 1rem;
    text-align: center;
    box-shadow: 0 -2px 5px rgba(0, 0, 0, 0.1);
    border-top: 1px solid #e2e8f0;
  }

  .status-bar p {
    margin: 0;
    font-size: 0.95rem;
    font-weight: 500;
  }

  .status-bar .online {
    color: green;
  }

  .status-bar .offline {
    color: red;
  }

  .toggle-btn {
    margin-top: 0.5rem;
    padding: 10px 16px;
    background: #007bff;
    color: #fff;
    border: none;
    border-radius: 6px;
    font-size: 1rem;
    cursor: pointer;
    width: 100%;
  }

  .logout-button {
    background: transparent;
    color: #dc3545;
    border: none;
    cursor: pointer;
  }
</style>
