<script>
  import { onMount, onDestroy } from 'svelte';
  import { goto } from '$app/navigation';
  import { supabase } from '$lib/supabaseClient';

  let user = null;
  let driverName = '';
  let driverOrders = [];
  let locationIntervalId;

  onMount(async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return goto('/login');

    user = session.user;
    driverName = user.user_metadata?.full_name || user.email;

    // Dummy data pesanan
    driverOrders = [
      {
        id: 'order-001',
        pickup: 'Jl. Cihampelas',
        destination: 'Stasiun Bandung',
        status: 'waiting'
      },
      {
        id: 'order-002',
        pickup: 'Pasteur',
        destination: 'ITB',
        status: 'waiting'
      }
    ];

    // Kirim lokasi tiap 10 menit (600000 ms)
    if ('geolocation' in navigator) {
      locationIntervalId = setInterval(() => {
        navigator.geolocation.getCurrentPosition(
          (position) => {
            const { latitude, longitude } = position.coords;
            console.log('📍 Lokasi saat ini:', latitude, longitude);
            // ← Kirim ke Supabase di sini nanti
          },
          (err) => {
            console.error('❌ Gagal ambil lokasi:', err);
          },
          {
            enableHighAccuracy: true,
            maximumAge: 10000,
            timeout: 10000
          }
        );
      }, 10000);
    } else {
      console.warn('Geolocation tidak tersedia.');
    }
  });

  onDestroy(() => {
    if (locationIntervalId) {
      clearInterval(locationIntervalId);
      console.log('🛑 Interval lokasi dihentikan.');
    }
  });

  function viewOrder(orderId) {
    goto(`/order/${orderId}`);
  }

  async function logout() {
    await supabase.auth.signOut();
    goto('/login');
  }
</script>

<style>
  .container {
    max-width: 600px;
    margin: 2rem auto;
    padding: 1rem;
    font-family: 'Inter', sans-serif;
  }
  .header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 2rem;
  }
  .logout {
    background: #dc3545;
    color: white;
    border: none;
    padding: 0.5rem 1rem;
    border-radius: 6px;
    cursor: pointer;
  }
  .order-card {
    background: #f8f9fa;
    padding: 1rem;
    border-radius: 8px;
    margin-bottom: 1rem;
    border: 1px solid #dee2e6;
  }
  .order-card button {
    margin-top: 0.5rem;
    background: #007bff;
    color: white;
    border: none;
    padding: 0.5rem 1rem;
    border-radius: 6px;
    cursor: pointer;
  }
</style>

<div class="container">
  <div class="header">
    <h2>Halo, {driverName}</h2>
    <button class="logout" on:click={logout}>Logout</button>
  </div>

  <h3>Pesanan Masuk</h3>

  {#if driverOrders.length === 0}
    <p>Tidak ada pesanan saat ini.</p>
  {:else}
    {#each driverOrders as order}
      <div class="order-card">
        <strong>Penjemputan:</strong> {order.pickup}<br>
        <strong>Tujuan:</strong> {order.destination}<br>
        <strong>Status:</strong> {order.status}<br>
        <button on:click={() => viewOrder(order.id)}>Lihat Pesanan</button>
      </div>
    {/each}
  {/if}
</div>
