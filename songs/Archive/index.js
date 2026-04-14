// ==========================================
// 🎵 SONG INDEX
// ==========================================
// List all available songs here
// The app will automatically load them!

window.songList = [
  'liburan-indie'
  // Add more songs here:
  // 'another-song',
  // 'third-song',
];

// ==========================================
// 📁 DYNAMIC SONG LOADER
// ==========================================
// This will load all songs listed above

(function() {
  if (!window.songList || window.songList.length === 0) {
    console.warn('No songs found in songList');
    return;
  }
  
  // Load each song script dynamically
  window.songList.forEach(songId => {
    const script = document.createElement('script');
    script.src = `songs/${songId
      .split('-')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join('_')}.js`;
    script.onerror = function() {
      console.error(`Failed to load song: ${songId}`);
    };
    document.head.appendChild(script);
  });
})();
