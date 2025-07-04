<script>
  import { goto } from '$app/navigation';
  import { supabase } from '$lib/supabaseClient';

  let email = '';
  let password = '';
  let loading = false;
  let errorMessage = '';

  // Fungsi untuk handle login
  const handleLogin = async () => {
    try {
      loading = true;
      errorMessage = '';
      const { data, error } = await supabase.auth.signInWithPassword({
        email: email,
        password: password,
      });

      if (error) throw error;
      
      // Jika berhasil, arahkan ke halaman utama
      goto('/home');
    } catch (error) {
      errorMessage = error.message;
    } finally {
      loading = false;
    }
  };

  // Fungsi untuk handle sign up
  const handleSignUp = async () => {
    try {
      loading = true;
      errorMessage = '';
      const { data, error } = await supabase.auth.signUp({
        email: email,
        password: password,
      });

      if (error) throw error;

      alert('Pendaftaran berhasil! Silakan cek email Anda untuk verifikasi.');
    } catch (error) {
      errorMessage = error.message;
    } finally {
      loading = false;
    }
  };
</script>

<style>
  .login-container {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    height: 100vh;
    padding: 20px;
  }
  .form-group {
    margin-bottom: 15px;
    width: 100%;
    max-width: 400px;
  }
  input {
    width: 100%;
    padding: 10px;
    font-size: 1rem;
  }
  .button-group {
    display: flex;
    gap: 10px;
  }
  button {
    padding: 10px 20px;
    font-size: 1rem;
    cursor: pointer;
  }
  .error {
    color: red;
    margin-top: 15px;
  }
</style>

<div class="login-container">
  <h2>Selamat Datang</h2>
  <p>Silakan login atau daftar untuk melanjutkan</p>
  
  <div class="form-group">
    <label for="email">Email</label>
    <input type="email" id="email" bind:value={email} placeholder="email@anda.com" />
  </div>
  
  <div class="form-group">
    <label for="password">Password</label>
    <input type="password" id="password" bind:value={password} placeholder="••••••••" />
  </div>

  {#if errorMessage}
    <p class="error">{errorMessage}</p>
  {/if}

  <div class="button-group">
    <button on:click={handleLogin} disabled={loading}>
      {loading ? 'Memproses...' : 'Login'}
    </button>
    <button on:click={handleSignUp} disabled={loading}>
      Daftar
    </button>
  </div>
</div>