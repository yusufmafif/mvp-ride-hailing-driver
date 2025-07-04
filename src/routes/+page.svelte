<script>
  import { onMount } from 'svelte';
  import { goto } from '$app/navigation';
  import { supabase } from '$lib/supabaseClient';

  onMount(() => {
    // Tampilkan splash screen selama 2 detik
    setTimeout(async () => {
      // Cek sesi pengguna di Supabase
      const { data: { session } } = await supabase.auth.getSession();

      if (session) {
        // Jika ada sesi (sudah login), arahkan ke halaman utama
        goto('/home');
      } else {
        // Jika tidak ada sesi, arahkan ke halaman login
        goto('/login');
      }
    }, 2000);
  });
</script>

<style>
  .splash-container {
    display: flex;
    justify-content: center;
    align-items: center;
    height: 100vh;
    background-color: #f8f9fa;
    flex-direction: column;
  }

  h1 {
    font-size: 2.5rem;
    color: #333;
  }
</style>

<div class="splash-container">
  <h1>Nama Aplikasi Anda</h1>
  <p>Loading...</p>
</div>