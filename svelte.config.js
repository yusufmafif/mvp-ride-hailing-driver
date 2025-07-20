import adapter from '@sveltejs/adapter-static';

export default {
  kit: {
    adapter: adapter({
      pages: 'build',
      assets: 'build',
      fallback: 'index.html' // penting untuk route dinamis
    }),
    prerender: {
      entries: [] // kosongkan agar tidak prerender halaman apapun
    }
  }
};
