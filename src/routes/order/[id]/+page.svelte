<script>
  import { onMount } from 'svelte';
  import { page } from '$app/stores';
  import { goto } from '$app/navigation';
  import { supabase } from '$lib/supabaseClient';
  import { get } from 'svelte/store';

  let user = null;
  let orderId = '';
  let order = null;

  const dummyOrders = {
    'order-001': {
      pickup: 'Jl. Cihampelas',
      destination: 'Stasiun Bandung',
      status: 'waiting'
    },
    'order-002': {
      pickup: 'Pasteur',
      destination: 'ITB',
      status: 'waiting'
    }
  };

  onMount(async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return goto('/login');
    user = session.user;

    orderId = get(page).params.id;
    order = dummyOrders[orderId];

    if (!order) {
      alert('Pesanan tidak ditemukan.');
      goto('/driver');
    }
  });

function acceptOrder() {
  const driver = {
    name: 'Driver A',
    lat: -6.89148,
    lon: 107.6107
  };

  const pickupCoord = [107.6107, -6.89148]; // [lon, lat]
  const destinationCoord = [107.611, -6.902]; // [lon, lat]

  goto(`/tracking?driver=${encodeURIComponent(JSON.stringify(driver))}&pickupCoord=${encodeURIComponent(JSON.stringify(pickupCoord))}&destinationCoord=${encodeURIComponent(JSON.stringify(destinationCoord))}`);
}


  function rejectOrder() {
    goto('/home');
  }
</script>

{#if order}
  <div class="container">
    <div class="card">
      <h2>Detail Pesanan</h2>
      <p><strong>ID:</strong> {orderId}</p>
      <p><strong>Penjemputan:</strong> {order.pickup}</p>
      <p><strong>Tujuan:</strong> {order.destination}</p>
      <p><strong>Status:</strong> {order.status}</p>

      <button class="btn accept" on:click={acceptOrder}>Terima Pesanan</button>
      <button class="btn reject" on:click={rejectOrder}>Tolak Pesanan</button>
    </div>
  </div>
{:else}
  <p style="text-align: center; margin-top: 2rem;">Memuat pesanan...</p>
{/if}

<style>
  .container {
    max-width: 600px;
    margin: 2rem auto;
    padding: 1rem;
    font-family: 'Inter', sans-serif;
  }
  .card {
    background: #f8f9fa;
    padding: 1.5rem;
    border-radius: 10px;
    border: 1px solid #dee2e6;
  }
  .btn {
    margin-top: 1rem;
    padding: 12px;
    width: 100%;
    font-size: 1rem;
    border: none;
    border-radius: 6px;
    cursor: pointer;
  }
  .accept {
    background: #28a745;
    color: white;
  }
  .reject {
    background: #dc3545;
    color: white;
    margin-top: 0.5rem;
  }
</style>
