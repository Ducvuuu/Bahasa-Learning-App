// ==========================================
// 📊 DATA & STATE
// ==========================================

const CORE_KEY         = 'indoAdventure_coreKnown';
const SONGS_KEY        = 'indoAdventure_songProgress';
const STORIES_KEY      = 'indoAdventure_storyProgress';
const TIMESTAMP_KEY    = 'indoAdventure_timestamps';
const MNEMONICS_KEY    = 'indoAdventure_mnemonics';
const CUSTOM_WORDS_KEY = 'indoAdventure_customWords';
const CUSTOM_KNOWN_KEY = 'indoAdventure_customKnown';
const HIDDEN_CORE_KEY  = 'indoAdventure_hiddenCore';
const DELETED_DECKS_KEY = 'indoAdventure_deletedDecks';
const USER_DECKS_KEY    = 'indoAdventure_userDecks';


let coreKnown = [];
let songProgress = {};
let storyProgress = {};
let masteryTimestamps = { core: {}, songs: {}, stories: {} };
let mnemonics = {};
let customWords = {};   // { dayNum: [{id, indo, eng, emoji}] }
let customKnown = [];   // array of known custom word IDs
let hiddenCoreWords = []; // array of originalIndex values hidden by user
let deletedDecks = [];    // array of dayNum values for fully deleted decks
let userDecks = [];       // [{id, title, icon, desc, colorIdx}]
let pendingImportWords = [];

let currentTab = 'core';
let currentSong = null;
let currentStory = null;

let audioPlayer = null;
let isPlaying = false;
let currentLyricIndex = -1;
let targetEndTime = null; 
let clickTimer = null; 
let clickCount = 0;

// Storage for local JSON stories
let localStories = []; 

const accents = [
    { bg: 'bg-indigo-100', text: 'text-indigo-700' },
    { bg: 'bg-emerald-100', text: 'text-emerald-700' },
    { bg: 'bg-amber-100', text: 'text-amber-700' },
    { bg: 'bg-rose-100', text: 'text-rose-700' },
    { bg: 'bg-purple-100', text: 'text-purple-700' },
    { bg: 'bg-cyan-100', text: 'text-cyan-700' },
    { bg: 'bg-pink-100', text: 'text-pink-700' },
    { bg: 'bg-lime-100', text: 'text-lime-700' },
    { bg: 'bg-orange-100', text: 'text-orange-700' },
    { bg: 'bg-teal-100', text: 'text-teal-700' }
];

// Initializing empty (populated by folder)
window.coreVocabulary = window.coreVocabulary || [];

// ==========================================
// 🔥 FIREBASE & AUTH
// ==========================================

const firebaseConfig = {
    apiKey: "AIzaSyCwkCTqEeKuHlzzFI1QoVZY9NUlzeeA0Bg",
    authDomain: "bahasa-learning-app-3bfd2.firebaseapp.com",
    projectId: "bahasa-learning-app-3bfd2",
    storageBucket: "bahasa-learning-app-3bfd2.firebasestorage.app",
    messagingSenderId: "555945714591",
    appId: "1:555945714591:web:e5a89b6ceee2366fd493aa"
};

firebase.initializeApp(firebaseConfig);
const auth = firebase.auth();
const db = firebase.firestore();

let currentUser = null;
let saveTimer = null;

function signInWithGoogle() {
    const provider = new firebase.auth.GoogleAuthProvider();
    auth.signInWithPopup(provider).catch(err => console.error('Sign-in failed:', err));
}

function signOutUser() {
    auth.signOut();
}

function clearAllUserData() {
    // Clear localStorage
    localStorage.removeItem(CORE_KEY);
    localStorage.removeItem(SONGS_KEY);
    localStorage.removeItem(STORIES_KEY);
    localStorage.removeItem(TIMESTAMP_KEY);
    localStorage.removeItem(MNEMONICS_KEY);
    localStorage.removeItem(CUSTOM_WORDS_KEY);
    localStorage.removeItem(CUSTOM_KNOWN_KEY);
    localStorage.removeItem(GEMINI_KEY_STORAGE);
    // Reset in-memory state
    coreKnown = [];
    songProgress = {};
    storyProgress = {};
    masteryTimestamps = { core: {}, songs: {}, stories: {} };
    mnemonics = {};
    customWords = {};
    customKnown = [];
}

auth.onAuthStateChanged(async (user) => {
    currentUser = user;
    if (user) {
        document.getElementById('btn-signin').classList.add('hidden');
        document.getElementById('user-info').classList.remove('hidden');
        document.getElementById('user-avatar').src = user.photoURL || '';
        document.getElementById('user-name').textContent = user.displayName || user.email;
        clearAllUserData(); // always wipe before loading new user's data
        await loadProgressFromFirestore(user.uid);
        renderDecksOverview();
        if (currentSong) { renderSongLyrics(); renderSongVocabList(); }
        if (currentStory) loadStory(currentStory.id);
        updateStats();
        showSyncIndicator();
    } else {
        clearAllUserData();
        document.getElementById('btn-signin').classList.remove('hidden');
        document.getElementById('user-info').classList.add('hidden');
        renderDecksOverview();
        updateStats();
    }
});

async function loadProgressFromFirestore(uid) {
    try {
        const docSnap = await db.collection('users').doc(uid).get();
        if (docSnap.exists) {
            const data = docSnap.data();
            if (data.coreKnown) coreKnown = data.coreKnown;
            if (data.songProgress) songProgress = data.songProgress;
            if (data.storyProgress) storyProgress = data.storyProgress;
            if (data.mnemonics) mnemonics = data.mnemonics;
            if (data.masteryTimestamps) masteryTimestamps = data.masteryTimestamps;
            if (data.hiddenCoreWords) hiddenCoreWords = data.hiddenCoreWords;
            if (data.deletedDecks) deletedDecks = data.deletedDecks;
            if (data.userDecks) userDecks = data.userDecks;
            if (data.customWords) customWords = data.customWords;
            if (data.customKnown) customKnown = data.customKnown;
            localStorage.setItem(HIDDEN_CORE_KEY, JSON.stringify(hiddenCoreWords));
            localStorage.setItem(DELETED_DECKS_KEY, JSON.stringify(deletedDecks));
            localStorage.setItem(USER_DECKS_KEY, JSON.stringify(userDecks));
            localStorage.setItem(CUSTOM_WORDS_KEY, JSON.stringify(customWords));
            localStorage.setItem(CUSTOM_KNOWN_KEY, JSON.stringify(customKnown));
            if (!masteryTimestamps.core) masteryTimestamps.core = {};
            if (!masteryTimestamps.songs) masteryTimestamps.songs = {};
            if (!masteryTimestamps.stories) masteryTimestamps.stories = {};
            localStorage.setItem(CORE_KEY, JSON.stringify(coreKnown));
            localStorage.setItem(SONGS_KEY, JSON.stringify(songProgress));
            localStorage.setItem(STORIES_KEY, JSON.stringify(storyProgress));
            localStorage.setItem(TIMESTAMP_KEY, JSON.stringify(masteryTimestamps));
            localStorage.setItem(MNEMONICS_KEY, JSON.stringify(mnemonics));
            // Restore Gemini key across devices
            if (data.geminiApiKey && !localStorage.getItem(GEMINI_KEY_STORAGE)) {
                localStorage.setItem(GEMINI_KEY_STORAGE, data.geminiApiKey);
            }
        }
    } catch (err) {
        console.error('Failed to load from Firestore:', err);
    }
}

function saveProgress() {
    localStorage.setItem(CORE_KEY, JSON.stringify(coreKnown));
    localStorage.setItem(SONGS_KEY, JSON.stringify(songProgress));
    localStorage.setItem(STORIES_KEY, JSON.stringify(storyProgress));
    localStorage.setItem(TIMESTAMP_KEY, JSON.stringify(masteryTimestamps));
    localStorage.setItem(MNEMONICS_KEY, JSON.stringify(mnemonics));
    if (!currentUser) return;
    clearTimeout(saveTimer);
    saveTimer = setTimeout(async () => {
        try {
            await db.collection('users').doc(currentUser.uid).set({
                coreKnown,
                songProgress,
                storyProgress,
                masteryTimestamps,
                mnemonics,
                hiddenCoreWords,
                deletedDecks,
                userDecks,
                customWords,
                customKnown,
                updatedAt: new Date().toISOString()
            });
            showSyncIndicator();
        } catch (err) {
            console.error('Firestore save failed:', err);
        }
    }, 1500);
}

function showSyncIndicator() {
    const el = document.getElementById('sync-indicator');
    if (!el) return;
    el.classList.remove('hidden');
    clearTimeout(el._hideTimer);
    el._hideTimer = setTimeout(() => el.classList.add('hidden'), 3000);
}

// ==========================================
// 📦 CONTENT LOADING (via fetch)
// ==========================================

async function loadAllContent() {
    try {
        const manifest = await fetch('manifest.json').then(r => r.json());

        window.coreVocabulary = [];
        const coreData = await Promise.all(manifest.coreFiles.map(f => fetch(f).then(r => r.json()).catch(() => [])));
        coreData.forEach(dayData => { if (Array.isArray(dayData)) window.coreVocabulary.push(...dayData); });

        localStories = [];
        const storyData = await Promise.all(manifest.storyFiles.map(f => fetch(f).then(r => r.json()).catch(() => null)));
        storyData.forEach(story => { if (story && story.id && story.content) localStories.push(story); });

        window.songs = {};
        const songData = await Promise.all(manifest.songFiles.map(f => fetch(f).then(r => r.json()).catch(() => null)));
        songData.forEach(song => {
            if (song && song.id) {
                song.audioFile = `songs/${song.audioFileName}`;
                window.songs[song.id] = song;
            }
        });
    } catch (err) {
        console.error('Failed to load content:', err);
    }
}

// ==========================================
// 💾 PERSISTENCE & INIT
// ==========================================

async function init() {
    await loadAllContent();

    const savedCore = localStorage.getItem(CORE_KEY);
    const savedSongs = localStorage.getItem(SONGS_KEY);
    const savedStories = localStorage.getItem(STORIES_KEY);
    const savedTimestamps = localStorage.getItem(TIMESTAMP_KEY);
    const savedMnemonics = localStorage.getItem(MNEMONICS_KEY);

    if (savedCore) coreKnown = JSON.parse(savedCore);
    if (savedSongs) songProgress = JSON.parse(savedSongs);
    if (savedStories) storyProgress = JSON.parse(savedStories);
    if (savedMnemonics) mnemonics = JSON.parse(savedMnemonics);
    if (savedTimestamps) {
        masteryTimestamps = JSON.parse(savedTimestamps);
        if (!masteryTimestamps.core) masteryTimestamps.core = {};
        if (!masteryTimestamps.songs) masteryTimestamps.songs = {};
        if (!masteryTimestamps.stories) masteryTimestamps.stories = {};
    }

    loadCustomWords();
    setupCoreToggle();
    setupSongReviewToggle();
    setupStoryReviewToggle();
    setupAudioPlayer();
    renderDecksOverview();
    setupSongSelector();
    setTimeout(renderLibrary, 100);
    updateStats();
}


// ==========================================
// 🎨 UI LOGIC
// ==========================================

window.switchTab = function(tab) {
    // Close deck detail if navigating away from core
    if (tab !== 'core' && currentDeckDay !== null) closeDeckDetail();

    currentTab = tab;
    ['core', 'songs', 'inventory', 'read', 'tree', 'practice'].forEach(t => {
        const view = document.getElementById(`view-${t}`);
        const btn = document.getElementById(`tab-${t}`);
        if(view) view.classList.toggle('hidden', t !== tab);
        if(btn) btn.classList.toggle('active', t === tab);
    });

    const coreWrapper = document.getElementById('core-toggle-wrapper');
    const songWrapper = document.getElementById('song-toggle-wrapper');
    const storyWrapper = document.getElementById('story-toggle-wrapper');
    const fab = document.getElementById('deck-fab');

    coreWrapper.classList.add('hidden');
    songWrapper.classList.add('hidden');
    storyWrapper.classList.add('hidden');

    // Show FAB only on core/decks tab on mobile
    if (fab) fab.classList.toggle('hidden', tab !== 'core');

    if (tab === 'songs') {
        songWrapper.classList.remove('hidden');
        const gate = document.getElementById('song-signin-gate');
        const content = document.getElementById('song-main-content');
        if (currentUser) {
            gate.classList.add('hidden');
            content.classList.remove('hidden');
        } else {
            gate.classList.remove('hidden');
            content.classList.add('hidden');
        }
    }
    if (tab === 'inventory') renderInventory();
    if (tab === 'read') renderLibrary();
    if (tab === 'practice') initPracticeTab();

    if (tab !== 'songs' && audioPlayer) pauseAudio();
    if (tab !== 'read') resetTheme();

    updateStats();
}

function setupCoreToggle() {
    const toggle = document.getElementById('review-toggle');
    const container = document.getElementById('days-container');
    toggle.addEventListener('change', (e) => {
        e.target.checked ? container.classList.add('review-active') : container.classList.remove('review-active');
    });
}

// ==========================================
// 📖 STORY / READING LOGIC
// ==========================================

function renderLibrary() {
    const container = document.getElementById('library-grid');
    if (!currentUser) {
        container.innerHTML = `
        <div class="col-span-3 flex flex-col items-center justify-center py-24 gap-4 text-center">
            <div class="text-5xl mb-2">🔒</div>
            <h3 class="text-xl font-bold text-slate-700">Sign in to read stories</h3>
            <p class="text-sm text-slate-400 max-w-xs">Your reading progress is saved to your account.</p>
            <button onclick="signInWithGoogle()" class="mt-2 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold px-6 py-2.5 rounded-xl text-sm transition-colors shadow-md shadow-indigo-200">Sign in with Google</button>
        </div>`;
        return;
    }
    // COMBINE: Built-in Window Stories + Local File Stories
    const builtIn = window.stories || [];
    const library = [...builtIn, ...localStories];
    
    // Remove duplicates by ID (prefer local if collision)
    const uniqueLib = [];
    const seenIds = new Set();
    library.forEach(s => {
        if(!seenIds.has(s.id)) {
            seenIds.add(s.id);
            uniqueLib.push(s);
        }
    });
    
    if(uniqueLib.length === 0) {
        container.innerHTML = `<div class="col-span-3 text-center py-12 text-slate-400">No stories found. Try linking a folder!</div>`;
        return;
    }
    
    container.innerHTML = uniqueLib.map(story => {
        const knownCount = (storyProgress[story.id] || []).length;
        const totalCount = story.vocabulary ? story.vocabulary.length : 0;
        const percent = totalCount === 0 ? 0 : Math.round((knownCount/totalCount)*100);
        
        return `
        <div onclick="loadStory('${story.id}')" class="library-card p-6 cursor-pointer group hover:border-indigo-100 transition-all relative">
            <div class="flex justify-between items-start mb-4">
                <div class="text-4xl group-hover:scale-110 transition-transform">${story.coverEmoji || '📖'}</div>
                <div class="flex items-center gap-2">
                    <span class="text-xs font-bold px-2 py-1 bg-slate-100 rounded text-slate-500">${story.difficulty || 'Easy'}</span>
                    ${knownCount > 0 ? `<button onclick="event.stopPropagation(); resetStory('${story.id}')" title="Reset progress" class="text-xs font-bold px-2 py-1 bg-rose-50 hover:bg-rose-100 text-rose-400 hover:text-rose-600 rounded transition-colors">↺ Reset</button>` : ''}
                </div>
            </div>
            <h3 class="text-xl font-bold text-slate-800 mb-1 group-hover:text-indigo-600 transition-colors">${story.title}</h3>
            <p class="text-sm text-slate-400 mb-4">${story.category || 'General'}</p>

            <!-- Mini Progress Bar -->
            <div class="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden">
                <div class="h-full bg-indigo-500" style="width: ${percent}%"></div>
            </div>
            <div class="text-xs text-slate-400 mt-2 text-right">${knownCount}/${totalCount} Words</div>
        </div>
        `;
    }).join('');
}

window.loadStory = function(storyId) {
    const builtIn = window.stories || [];
    const library = [...builtIn, ...localStories];
    const story = library.find(s => s.id === storyId);
    if (!story) return;
    
    currentStory = story;
    const theme = story.theme || { bg: "bg-slate-50", cardBg: "bg-white", font: "font-sans", textMain: "text-slate-800", highlight: "bg-yellow-100" };
    
    // 1. Switch Views
    document.getElementById('library-view').classList.add('hidden');
    document.getElementById('reader-view').classList.remove('hidden');
    document.getElementById('story-toggle-wrapper').classList.remove('hidden');

    window.scrollTo(0, 0);

    // 2. Apply Theme
    const body = document.body;
    body.className = `min-h-screen pb-20 transition-colors duration-500 ${theme.bg}`;
    
    const card = document.getElementById('reader-card');
    const panel = document.getElementById('story-vocab-panel');
    card.className = `library-card p-8 md:p-12 min-h-[500px] transition-colors duration-500 ${theme.cardBg} ${theme.textMain} ${theme.font}`;
    panel.className = `library-card p-6 sticky-panel transition-colors duration-500 ${theme.cardBg} ${theme.textMain}`;

    // 3. Render Title & Badges
    document.getElementById('reader-title').textContent = story.title;
    const diffBadge = document.getElementById('reader-difficulty');
    diffBadge.textContent = story.difficulty || 'Reader';
    diffBadge.className = `px-2 py-1 text-xs font-bold uppercase tracking-wider rounded border ${theme.textMuted || 'text-slate-500'} bg-transparent border-current opacity-60`;

    const catBadge = document.getElementById('reader-category');
    if(story.category) {
        catBadge.textContent = story.category;
        catBadge.className = `px-2 py-1 text-xs font-bold uppercase tracking-wider rounded border ml-2 ${theme.textMuted || 'text-slate-500'} bg-transparent border-current opacity-60`;
        catBadge.classList.remove('hidden');
    } else {
        catBadge.classList.add('hidden');
    }

    // 4. Render Content with Images
    const contentDiv = document.getElementById('reader-content');
    let htmlContent = '';
    
    // A. Hero Image
    if (story.images) {
        const heroImg = story.images.find(img => img.position === "top");
        if (heroImg) {
            htmlContent += `
            <figure class="mb-8 rounded-2xl overflow-hidden shadow-lg border border-slate-100/50">
                <img src="${heroImg.url}" alt="${heroImg.alt}" class="w-full h-64 md:h-80 object-cover">
                <figcaption class="text-xs text-center ${theme.textMuted || 'text-slate-400'} mt-2 italic">${heroImg.description}</figcaption>
            </figure>`;
        }
    }

    // B. Paragraphs & Inline Images
    story.content.forEach((para, index) => {
        htmlContent += `<p class="story-paragraph ${theme.textMain}">${para}</p>`;
        
        // Check for image after this paragraph
        if (story.images) {
            const inlineImg = story.images.find(img => img.position === `after-paragraph-${index + 1}`);
            if (inlineImg) {
                htmlContent += `
                <figure class="my-8 rounded-xl overflow-hidden shadow-md border border-slate-100/50 max-w-2xl mx-auto">
                    <img src="${inlineImg.url}" alt="${inlineImg.alt}" class="w-full h-auto max-h-72 object-cover">
                    <figcaption class="text-xs text-center ${theme.textMuted || 'text-slate-400'} p-2 bg-white/50 italic">${inlineImg.description}</figcaption>
                </figure>`;
            }
        }
    });

    // C. Cultural Notes Section
    if (story.culturalNotes && story.culturalNotes.points && story.culturalNotes.points.length > 0) {
        htmlContent += `
        <div class="mt-12 p-6 rounded-2xl bg-amber-50/80 border border-amber-100 text-amber-900 backdrop-blur-sm">
            <h3 class="font-bold text-xl mb-4 flex items-center gap-2">
                <span>🇮🇩</span> 
                ${story.culturalNotes.title || 'Cultural Insights'}
            </h3>
            <ul class="list-disc pl-5 space-y-2">
                ${story.culturalNotes.points.map(p => {
                    // Replace bold markdown with strong tag
                    return `<li>${p.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')}</li>`;
                }).join('')}
            </ul>
        </div>
        `;
    }

    // D. Reflection Prompts
    if (story.reflectionPrompts && story.reflectionPrompts.length > 0) {
        htmlContent += `
        <div class="mt-8 p-6 rounded-2xl bg-indigo-50/80 border border-indigo-100 text-indigo-900 backdrop-blur-sm">
            <h3 class="font-bold text-xl mb-4 flex items-center gap-2">
                <span>🤔</span> Reflection
            </h3>
            <ul class="space-y-4">
                ${story.reflectionPrompts.map(p => `
                    <li class="flex gap-3">
                        <span class="text-indigo-400 font-bold">•</span>
                        <span class="font-medium italic">"${p}"</span>
                    </li>
                `).join('')}
            </ul>
        </div>
        `;
    }
    
    // E. Vocabulary Review Groups (Optional)
    if (story.vocabularyReview && story.vocabularyReview.categories) {
        htmlContent += `
        <div class="mt-8 p-6 rounded-2xl bg-slate-50/80 border border-slate-100 text-slate-700 backdrop-blur-sm">
            <h3 class="font-bold text-lg mb-4 text-slate-800">Review by Category</h3>
            <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                ${Object.entries(story.vocabularyReview.categories).map(([catName, words]) => `
                    <div>
                        <h4 class="text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">${catName}</h4>
                        <div class="flex flex-wrap gap-2">
                            ${words.map(w => `<span class="bg-white border border-slate-200 px-2 py-1 rounded text-sm">${w}</span>`).join('')}
                        </div>
                    </div>
                `).join('')}
            </div>
        </div>
        `;
    }

    contentDiv.innerHTML = htmlContent;

    // 5. Interactive Vocab Setup
    const vocabSpans = contentDiv.querySelectorAll('.vocab-word');
    vocabSpans.forEach(span => {
         span.className = `vocab-word transition-all cursor-pointer ${theme.highlight}`;
         span.onclick = (e) => {
             e.stopPropagation();
             const id = parseInt(span.dataset.id);
             openStoryModal(id);
         };
         
         const id = parseInt(span.dataset.id);
         const knownIds = storyProgress[story.id] || [];
         if(knownIds.includes(id)) {
             span.style.opacity = '0.6';
             span.style.textDecoration = 'line-through';
             span.style.textDecorationColor = 'currentColor';
         }
    });

    renderStoryVocabPanel();
}

function renderStoryVocabPanel() {
    const list = document.getElementById('story-vocab-list');
    const knownIds = storyProgress[currentStory.id] || [];
    const theme = currentStory.theme || {};
    
    document.getElementById('story-vocab-title').className = `font-bold text-lg border-b pb-4 mb-4 ${theme.textMain} border-current opacity-80`;
    document.getElementById('story-progress-text').textContent = `${knownIds.length}/${currentStory.vocabulary.length} Words`;

    list.innerHTML = currentStory.vocabulary.map(word => {
        const isKnown = knownIds.includes(word.id);
        const btnStyle = isKnown ? `opacity-50` : `hover:scale-105`;
        
        return `
        <div onclick="openStoryModal(${word.id})" 
             class="story-item group flex items-center justify-between p-3 rounded-lg border border-transparent hover:border-current hover:bg-black/5 cursor-pointer transition-all ${btnStyle}">
            <div class="flex items-center gap-3">
                <span class="text-xl">${word.emoji}</span>
                <div>
                    <div class="font-bold leading-tight ${theme.textMain}">${word.indo}</div>
                    <div class="eng-text text-xs ${theme.textMuted || 'opacity-70'} transition-all duration-300">${word.eng}</div>
                </div>
            </div>
            ${isKnown ? '✅' : ''}
        </div>
        `;
    }).join('');
}

window.closeStory = function() {
    document.getElementById('reader-view').classList.add('hidden');
    document.getElementById('library-view').classList.remove('hidden');
    document.getElementById('story-toggle-wrapper').classList.add('hidden'); // Hide Toggle
    resetTheme();
    renderLibrary(); 
}

function resetTheme() {
    document.body.className = "min-h-screen text-slate-600 pb-20";
    document.body.style.backgroundImage = ""; 
}

window.openStoryModal = function(vocabId) {
    const word = currentStory.vocabulary.find(w => w.id === vocabId);
    if(!word) return;
    document.getElementById('modal-indo').innerText = word.indo;
    document.getElementById('modal-eng').innerText = word.eng;
    
    // --- CULTURAL NOTE HANDLING ---
    const noteEl = document.getElementById('modal-note');
    if (word.cultural_note) {
        noteEl.innerHTML = `
            <div class="text-sm bg-amber-50 text-amber-900 p-3 rounded-lg mt-3 border border-amber-100 flex gap-2 text-left">
                <span class="text-lg">💡</span>
                <span class="italic leading-snug">${word.cultural_note}</span>
            </div>
        `;
        noteEl.classList.remove('hidden');
    } else {
        noteEl.classList.add('hidden');
    }
    // -----------------------------
    
    // Display mnemonic image
    displayMnemonicInModal(vocabId);

    const btn = document.getElementById('modal-action-btn');
    const knownIds = storyProgress[currentStory.id] || [];
    updateModalButton(btn, knownIds.includes(vocabId));
    document.getElementById('modal-delete-word-btn').classList.add('hidden');
    document.getElementById('word-modal').classList.add('active');
    document.getElementById('word-modal-overlay').classList.add('active');
    btn.onclick = function() { toggleStoryWord(vocabId); closeModal(); };
}

window.toggleStoryWord = function(vocabId) {
    const sId = currentStory.id;
    if(!storyProgress[sId]) storyProgress[sId] = [];
    if(!masteryTimestamps.stories[sId]) masteryTimestamps.stories[sId] = {}; // Ensure obj

    const idx = storyProgress[sId].indexOf(vocabId);
    if(idx > -1) {
        // Removing
        storyProgress[sId].splice(idx, 1);
        delete masteryTimestamps.stories[sId][vocabId]; // Cleanup timestamp
    } else {
        // Adding / Ticking
        storyProgress[sId].push(vocabId);
        masteryTimestamps.stories[sId][vocabId] = new Date().toISOString(); // Timestamp
    }
    
    localStorage.setItem(STORIES_KEY, JSON.stringify(storyProgress));
    localStorage.setItem(TIMESTAMP_KEY, JSON.stringify(masteryTimestamps));
    saveProgress();
    loadStory(sId);
}

// ==========================================
// 🎒 INVENTORY (Unified)
// ==========================================

window.renderInventory = function() {
    const container = document.getElementById('inventory-grid');
    const searchInput = document.getElementById('inventory-search');
    const query = searchInput.value.toLowerCase().trim();
    const emptyState = document.getElementById('inventory-empty');
    const countLabel = document.getElementById('inventory-count');
    
    let allMastered = coreVocabulary
        .map((word, index) => ({...word, originalIndex: index, type: 'core'}))
        .filter(word => coreKnown.includes(word.originalIndex));

    if (window.songs) {
        Object.values(window.songs).forEach(song => {
            const knownIds = songProgress[song.id] || [];
            if (knownIds.length > 0 && song.vocabulary) {
                const songWords = song.vocabulary.filter(w => knownIds.includes(w.id)).map(w => ({...w, type: 'song', source: song.title}));
                allMastered = allMastered.concat(songWords);
            }
        });
    }
    
    // Combine Built-in and Local Stories
    const library = [...(window.stories||[]), ...localStories];
    library.forEach(story => {
        const knownIds = storyProgress[story.id] || [];
        if (knownIds.length > 0) {
             const storyWords = story.vocabulary.filter(w => knownIds.includes(w.id)).map(w => ({...w, type: 'story', source: story.title}));
             allMastered = allMastered.concat(storyWords);
        }
    });

    const uniqueMastered = [];
    const seenIndo = new Set();
    allMastered.forEach(word => {
        const key = word.indo.toLowerCase().trim();
        if (!seenIndo.has(key)) { seenIndo.add(key); uniqueMastered.push(word); }
    });
    
    let filtered = uniqueMastered;
    if (query) {
        filtered = uniqueMastered.filter(w => w.indo.toLowerCase().includes(query) || w.eng.toLowerCase().includes(query));
    }
    
    countLabel.textContent = `${filtered.length} unique words`;
    if (filtered.length === 0 && !query) { container.innerHTML = ''; emptyState.classList.remove('hidden'); return; }
    emptyState.classList.add('hidden');
    
    const html = filtered.map(word => {
        let badge = '';
        if(word.type === 'song') badge = '<span class="source-badge">🎵 Song</span>';
        if(word.type === 'story') badge = '<span class="source-badge">📖 Story</span>';
        
        // 🟢 CHECK FOR FAMILY DATA (Tree Badge)
        let treeBadge = '';
        let clickAction = '';
        if(word.type === 'core' && word.family) {
            treeBadge = `
                <div class="tree-badge">
                    <span>🌳</span> Tree
                </div>
            `;
            clickAction = `onclick="event.stopPropagation(); openTree(${word.originalIndex})"`;
        }

        return `
        <div ${clickAction} class="sticker-card bg-white border border-slate-200 rounded-2xl p-4 flex flex-col items-center justify-center text-center gap-2 aspect-[4/3] shadow-sm transition-all">
            ${badge}
            <div class="sticker-visible flex flex-col items-center gap-2 transition-all duration-300">
                <div class="text-3xl">${word.emoji}</div>
                <div class="font-bold text-slate-800 text-lg leading-tight">${word.indo}</div>
            </div>
            <div class="sticker-hidden rounded-2xl">
                <div class="text-center px-2">
                    <div class="text-2xl mb-1">${word.emoji}</div>
                    <span class="uppercase tracking-wide text-sm">${word.eng}</span>
                </div>
            </div>
            ${treeBadge}
        </div>`;
    }).join('');
    container.innerHTML = html;
}

// ==========================================
// 🌳 TREE VIEW LOGIC
// ==========================================

const AFFIX_MASTER_LIST = [
   { id: 'me-', label: 'Me-', type: 'verb' },
   { id: 'ber-', label: 'Ber-', type: 'verb' },
   { id: 'di-', label: 'Di-', type: 'verb' },
   { id: 'ter-', label: 'Ter-', type: 'verb' },
   { id: 'pe-', label: 'Pe-', type: 'noun' },
   { id: '-an', label: '-an', type: 'noun' },
   { id: 'pe-an', label: 'Pe-...-an', type: 'abstract' },
   { id: 'ke-an', label: 'Ke-...-an', type: 'abstract' },
   { id: 'me-kan', label: 'Me-...-kan', type: 'causative' },
   { id: 'me-i', label: 'Me-...-i', type: 'causative' }
];

window.openTree = function(index) {
    const word = coreVocabulary[index];
    if(!word || !word.family) return;

    const container = document.getElementById('tree-canvas');
    container.innerHTML = '';

    // 1. Render ROOT Node
    const rootNode = document.createElement('div');
    rootNode.className = 'tree-node root';
    rootNode.innerHTML = `
        <div class="text-3xl mb-1">${word.emoji}</div>
        <div class="node-word text-2xl">${word.indo}</div>
        <div class="node-meaning text-indigo-500 font-medium">${word.family.root_meaning}</div>
    `;
    container.appendChild(rootNode);

    // 2. Render Branches based on Master List
    AFFIX_MASTER_LIST.forEach(affix => {
        const branchData = word.family.trees[affix.id];
        const node = document.createElement('div');
        
        if (branchData) {
            // Active Branch (True)
            node.className = 'tree-node active';
            node.innerHTML = `
                <div class="node-affix">${affix.label}</div>
                <div class="node-word">${branchData.text}</div>
                <div class="node-meaning">${branchData.meaning}</div>
            `;
        } else {
            // Dead Branch (False/Implied)
            node.className = 'tree-node dead';
            node.innerHTML = `
                <div class="node-affix">${affix.label}</div>
                <div class="node-word text-slate-300">---</div>
            `;
        }
        container.appendChild(node);
    });

    switchTab('tree');
}


// Shared Logic
window.openCoreModal = function(index) {
    const word = coreVocabulary.find(w => w.originalIndex === index);
    if(!word) return;
    
    document.getElementById('modal-indo').innerText = word.indo;
    document.getElementById('modal-eng').innerText = word.eng;
    
    // Hide cultural note for core vocab
    document.getElementById('modal-note').classList.add('hidden');
    
    // Display mnemonic image
    displayMnemonicInModal(index);
    
    const btn = document.getElementById('modal-action-btn');
    const isKnown = coreKnown.includes(index);
    updateModalButton(btn, isKnown);
    const delBtn = document.getElementById('modal-delete-word-btn');
    delBtn.textContent = 'Remove Word';
    delBtn.classList.remove('hidden');
    delBtn.onclick = function() { removeCoreWord(index); };
    document.getElementById('word-modal').classList.add('active');
    document.getElementById('word-modal-overlay').classList.add('active');
    btn.onclick = function() { toggleCoreWord(index); closeModal(); };
}

window.openCustomWordModal = function(id) {
    const dayNum = Object.keys(customWords).find(d => (customWords[d] || []).some(w => w.id === id));
    const word = dayNum ? (customWords[dayNum] || []).find(w => w.id === id) : null;
    if (!word) return;

    document.getElementById('modal-indo').innerText = word.indo;
    document.getElementById('modal-eng').innerText = word.eng || '';
    document.getElementById('modal-note').classList.add('hidden');

    displayMnemonicInModal(id);

    const btn = document.getElementById('modal-action-btn');
    const isKnown = customKnown.includes(id);
    updateModalButton(btn, isKnown);

    const delBtn = document.getElementById('modal-delete-word-btn');
    delBtn.classList.remove('hidden');
    delBtn.onclick = function() { deleteCustomWord(id); };

    document.getElementById('word-modal').classList.add('active');
    document.getElementById('word-modal-overlay').classList.add('active');
    btn.onclick = function() { toggleCustomWord(id); closeModal(); };
}

window.toggleCoreWord = function(index) {
    const el = document.getElementById(`word-card-${index}`);
    if (coreKnown.includes(index)) { 
        // Removing
        coreKnown = coreKnown.filter(i => i !== index); 
        delete masteryTimestamps.core[index]; // Remove timestamp
        if(el) el.classList.remove('checked'); 
    } else { 
        // Adding / Ticking
        coreKnown.push(index); 
        masteryTimestamps.core[index] = new Date().toISOString(); // Timestamp
        if(el) el.classList.add('checked'); 
        if(el) el.classList.add('anim-squish'); 
        setTimeout(() => { if(el) el.classList.remove('anim-squish'); }, 300); 
    }
    localStorage.setItem(CORE_KEY, JSON.stringify(coreKnown));
    localStorage.setItem(TIMESTAMP_KEY, JSON.stringify(masteryTimestamps));
    saveProgress();
    if (currentDeckDay !== null) {
        renderDeckWordList(currentDeckDay);
        const deckWords = coreVocabulary.filter(w => w.day === currentDeckDay);
        const knownCount = deckWords.filter(w => coreKnown.includes(w.originalIndex)).length;
        document.getElementById('detail-deck-progress').textContent = `${knownCount}/${deckWords.length} Mastered`;
    } else {
        renderDecksOverview();
    }
    if(currentTab === 'core') updateStats();
}

// ==========================================
// 📦 CUSTOM WORDS — LOAD & PERSIST
// ==========================================

function loadCustomWords() {
    try {
        const c = localStorage.getItem(CUSTOM_WORDS_KEY);
        if (c) customWords = JSON.parse(c);
    } catch(e) { customWords = {}; }
    try {
        const k = localStorage.getItem(CUSTOM_KNOWN_KEY);
        if (k) customKnown = JSON.parse(k);
    } catch(e) { customKnown = []; }
    try {
        const h = localStorage.getItem(HIDDEN_CORE_KEY);
        if (h) hiddenCoreWords = JSON.parse(h);
    } catch(e) { hiddenCoreWords = []; }
    try {
        const d = localStorage.getItem(DELETED_DECKS_KEY);
        if (d) deletedDecks = JSON.parse(d);
    } catch(e) { deletedDecks = []; }
    try {
        const u = localStorage.getItem(USER_DECKS_KEY);
        if (u) userDecks = JSON.parse(u);
    } catch(e) { userDecks = []; }
}

function saveCustomWords() {
    localStorage.setItem(CUSTOM_WORDS_KEY, JSON.stringify(customWords));
    localStorage.setItem(CUSTOM_KNOWN_KEY, JSON.stringify(customKnown));
    localStorage.setItem(HIDDEN_CORE_KEY, JSON.stringify(hiddenCoreWords));
    localStorage.setItem(DELETED_DECKS_KEY, JSON.stringify(deletedDecks));
    localStorage.setItem(USER_DECKS_KEY, JSON.stringify(userDecks));
}

// Immediately flush customKnown + customWords to Firestore (no debounce).
// Called after marking words known/unknown so a quick refresh doesn't lose data.
function saveCustomKnownNow() {
    if (!currentUser) return;
    db.collection('users').doc(currentUser.uid).update({
        customKnown,
        customWords,
        updatedAt: new Date().toISOString()
    }).catch(err => console.error('Firestore customKnown save failed:', err));
}

function removeCoreWord(index) {
    if (!hiddenCoreWords.includes(index)) hiddenCoreWords.push(index);
    coreKnown = coreKnown.filter(i => i !== index);
    delete masteryTimestamps.core[index];
    saveCustomWords();
    saveProgress();
    closeModal();
    if (currentDeckDay !== null) {
        renderDeckWordList(currentDeckDay);
        const visibleCore = coreVocabulary.filter(w => w.day === currentDeckDay && !hiddenCoreWords.includes(w.originalIndex));
        const custom = customWords[currentDeckDay] || [];
        const total = visibleCore.length + custom.length;
        const known = visibleCore.filter(w => coreKnown.includes(w.originalIndex)).length
                    + custom.filter(w => customKnown.includes(w.id)).length;
        document.getElementById('detail-deck-progress').textContent = `${known}/${total} Mastered`;
    } else {
        renderDecksOverview();
    }
    updateStats();
}

function resetDeck(dayNum) {
    const customIds = (customWords[dayNum] || []).map(w => w.id);
    customWords[dayNum] = [];
    customKnown = customKnown.filter(k => !customIds.includes(k));

    const userDeck = userDecks.find(d => d.id === dayNum);
    if (userDeck) {
        // Remove the user-created deck entirely
        userDecks = userDecks.filter(d => d.id !== dayNum);
    } else {
        // Hide core deck from overview and clear its progress
        const dayIndices = coreVocabulary.filter(w => w.day === dayNum).map(w => w.originalIndex);
        coreKnown = coreKnown.filter(i => !dayIndices.includes(i));
        dayIndices.forEach(i => delete masteryTimestamps.core[i]);
        hiddenCoreWords = hiddenCoreWords.filter(i => !dayIndices.includes(i));
        if (!deletedDecks.includes(dayNum)) deletedDecks.push(dayNum);
    }
    saveCustomWords();
    saveProgress();
    closeDeckModal();
    closeDeckDetail();
    renderDecksOverview();
    updateStats();
}

function resetStory(storyId) {
    storyProgress[storyId] = [];
    if (masteryTimestamps.stories) delete masteryTimestamps.stories[storyId];
    saveProgress();
    renderLibrary();
    updateStats();
}

function deleteCustomWord(id) {
    const dayNum = Object.keys(customWords).find(d => (customWords[d] || []).some(w => w.id === id));
    if (!dayNum) return;
    customWords[dayNum] = (customWords[dayNum] || []).filter(w => w.id !== id);
    customKnown = customKnown.filter(k => k !== id);
    saveCustomWords();
    saveProgress();
    closeModal();
    if (currentDeckDay !== null) {
        renderDeckWordList(currentDeckDay);
        const total = (coreVocabulary.filter(w => w.day === currentDeckDay).length) + (customWords[currentDeckDay] || []).length;
        const known = coreVocabulary.filter(w => w.day === currentDeckDay && coreKnown.includes(w.originalIndex)).length
                    + (customWords[currentDeckDay] || []).filter(w => customKnown.includes(w.id)).length;
        document.getElementById('detail-deck-progress').textContent = `${known}/${total} Mastered`;
    } else {
        renderDecksOverview();
    }
    updateStats();
}

function deleteDeckCustomWords(dayNum) {
    const words = customWords[dayNum] || [];
    if (words.length === 0) { closeDeckModal(); return; }
    const ids = words.map(w => w.id);
    customWords[dayNum] = [];
    customKnown = customKnown.filter(k => !ids.includes(k));
    saveCustomWords();
    saveProgress();
    closeDeckModal();
    renderDeckWordList(dayNum);
    const total = coreVocabulary.filter(w => w.day === dayNum).length;
    const known = coreVocabulary.filter(w => w.day === dayNum && coreKnown.includes(w.originalIndex)).length;
    document.getElementById('detail-deck-progress').textContent = `${known}/${total} Mastered`;
    updateStats();
}

function toggleCustomWord(id) {
    const el = document.getElementById(`word-card-${id}`);
    const idx = customKnown.indexOf(id);
    if (idx > -1) {
        customKnown.splice(idx, 1);
        if (el) el.classList.remove('checked');
    } else {
        customKnown.push(id);
        if (el) { el.classList.add('checked'); el.classList.add('anim-squish'); setTimeout(() => el.classList.remove('anim-squish'), 300); }
    }
    saveCustomWords();
    saveProgress();
    saveCustomKnownNow();
    // update hero progress count
    if (currentDeckDay !== null) {
        const total = (coreVocabulary.filter(w => w.day === currentDeckDay).length) + (customWords[currentDeckDay]||[]).length;
        const known = coreVocabulary.filter(w => w.day === currentDeckDay && coreKnown.includes(w.originalIndex)).length
                    + (customWords[currentDeckDay]||[]).filter(w => customKnown.includes(w.id)).length;
        document.getElementById('detail-deck-progress').textContent = `${known}/${total} Mastered`;
    }
    updateStats();
}

// ==========================================
// 📂 ADD WORD PANEL — UI & IMPORT LOGIC
// ==========================================

function switchPanelTab(tab) {
    const isImport = tab === 'import';
    document.getElementById('panel-view-import').classList.toggle('hidden', !isImport);
    document.getElementById('panel-view-single').classList.toggle('hidden', isImport);
    document.getElementById('panel-tab-import').className = `flex-1 py-2 text-sm font-bold rounded-lg transition-all ${isImport ? 'bg-white shadow-sm text-slate-700' : 'text-slate-400 hover:text-slate-600'}`;
    document.getElementById('panel-tab-single').className = `flex-1 py-2 text-sm font-bold rounded-lg transition-all ${!isImport ? 'bg-white shadow-sm text-slate-700' : 'text-slate-400 hover:text-slate-600'}`;
}

function toggleImportInstructions() {
    const el = document.getElementById('import-instructions');
    const ch = document.getElementById('import-instr-chevron');
    el.classList.toggle('hidden');
    ch.style.transform = el.classList.contains('hidden') ? '' : 'rotate(180deg)';
}

function handleImportDrop(event) {
    const file = event.dataTransfer.files[0];
    if (file) processImportFile(file);
}

function handleImportFileInput(input) {
    if (input.files[0]) processImportFile(input.files[0]);
}

function processImportFile(file) {
    const reader = new FileReader();
    reader.onload = (e) => {
        try {
            const data = JSON.parse(e.target.result);
            if (!Array.isArray(data)) throw new Error('File must be a JSON array.');
            const words = data.map((w, i) => {
                if (!w.indo || !w.eng) throw new Error(`Item ${i+1} is missing "indo" or "eng" field.`);
                return { id: `custom_${currentDeckDay}_${Date.now()}_${i}`, indo: String(w.indo).trim(), eng: String(w.eng).trim(), emoji: String(w.emoji || '📝').trim() };
            });
            if (words.length === 0) throw new Error('No words found in file.');
            showImportPreview(words);
        } catch(err) {
            alert(`Could not read file:\n${err.message}`);
        }
    };
    reader.readAsText(file);
}

function showImportPreview(words) {
    pendingImportWords = words;
    document.getElementById('import-preview-count').textContent = `${words.length} word${words.length !== 1 ? 's' : ''} ready to import`;
    document.getElementById('import-preview-list').innerHTML = words.map(w => `
        <tr class="hover:bg-slate-50">
            <td class="px-4 py-2 text-xl">${w.emoji}</td>
            <td class="px-4 py-2 font-semibold text-slate-800">${w.indo}</td>
            <td class="px-4 py-2 text-slate-500">${w.eng}</td>
        </tr>`).join('');
    document.getElementById('confirm-import-btn').textContent = `Add ${words.length} word${words.length !== 1 ? 's' : ''} to Deck`;
    document.getElementById('import-preview').classList.remove('hidden');
}

function clearImportPreview() {
    pendingImportWords = [];
    document.getElementById('import-preview').classList.add('hidden');
    document.getElementById('import-file-input').value = '';
}

function confirmImport() {
    if (!pendingImportWords.length || currentDeckDay === null) return;
    if (!customWords[currentDeckDay]) customWords[currentDeckDay] = [];
    customWords[currentDeckDay].push(...pendingImportWords);
    saveCustomWords();
    saveProgress();
    clearImportPreview();
    toggleAddWordPanel();
    renderDeckWordList(currentDeckDay);
    // update hero progress
    const allWords = coreVocabulary.filter(w => w.day === currentDeckDay);
    const custom   = customWords[currentDeckDay] || [];
    const total    = allWords.length + custom.length;
    const known    = allWords.filter(w => coreKnown.includes(w.originalIndex)).length
                   + custom.filter(w => customKnown.includes(w.id)).length;
    document.getElementById('detail-deck-progress').textContent = `${known}/${total} Mastered`;
    document.getElementById('detail-word-count').textContent    = `Vocabulary (${total})`;
}

function saveSingleWord() {
    const indo  = document.getElementById('add-indo-word-input').value.trim();
    const emoji = document.getElementById('add-output-emoji').value.trim() || '📝';
    const eng   = document.getElementById('add-output-eng').value.trim();
    if (!indo || !eng) {
        alert('Please fill in both the Indonesian word and English meaning.');
        return;
    }
    const word = { id: `custom_${currentDeckDay}_${Date.now()}_0`, indo, eng, emoji };
    if (!customWords[currentDeckDay]) customWords[currentDeckDay] = [];
    customWords[currentDeckDay].push(word);
    saveCustomWords();
    saveProgress();
    document.getElementById('add-indo-word-input').value = '';
    document.getElementById('add-output-emoji').value    = '';
    document.getElementById('add-output-eng').value      = '';
    toggleAddWordPanel();
    renderDeckWordList(currentDeckDay);
}

// ==========================================
// 🗂️ DECKS VIEW LOGIC
// ==========================================

let currentDeckDay = null;

const deckAccentColors = [
    { bg: 'bg-indigo-50',  border: 'border-indigo-100',  text: 'text-indigo-700',  bar: 'bg-indigo-500'  },
    { bg: 'bg-emerald-50', border: 'border-emerald-100', text: 'text-emerald-700', bar: 'bg-emerald-500' },
    { bg: 'bg-amber-50',   border: 'border-amber-100',   text: 'text-amber-700',   bar: 'bg-amber-500'   },
    { bg: 'bg-rose-50',    border: 'border-rose-100',    text: 'text-rose-700',    bar: 'bg-rose-500'    },
    { bg: 'bg-purple-50',  border: 'border-purple-100',  text: 'text-purple-700',  bar: 'bg-purple-500'  },
    { bg: 'bg-cyan-50',    border: 'border-cyan-100',    text: 'text-cyan-700',    bar: 'bg-cyan-500'    },
    { bg: 'bg-pink-50',    border: 'border-pink-100',    text: 'text-pink-700',    bar: 'bg-pink-500'    },
];

function renderDecksOverview() {
    const container = document.getElementById('decks-grid');
    if (!container) return;

    if (!currentUser) {
        container.innerHTML = `
        <div class="col-span-4 flex flex-col items-center justify-center py-24 gap-4 text-center">
            <div class="text-5xl mb-2">🔒</div>
            <h3 class="text-xl font-bold text-slate-700">Sign in to access your decks</h3>
            <p class="text-sm text-slate-400 max-w-xs">Your progress, custom words, and settings are saved to your account.</p>
            <button onclick="signInWithGoogle()" class="mt-2 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold px-6 py-2.5 rounded-xl text-sm transition-colors shadow-md shadow-indigo-200">Sign in with Google</button>
        </div>`;
        return;
    }

    const groupedByDay = {};
    coreVocabulary.forEach((word, index) => {
        word.originalIndex = index;
        if (!groupedByDay[word.day]) groupedByDay[word.day] = [];
        groupedByDay[word.day].push(word);
    });

    const days = Object.keys(groupedByDay).map(Number).sort((a, b) => a - b).filter(d => !deletedDecks.includes(d));

    container.innerHTML = days.length === 0 ? '' : days.map((dayNum, idx) => {
        const words = groupedByDay[dayNum].filter(w => !hiddenCoreWords.includes(w.originalIndex));
        const total = words.length;
        const known = words.filter(w => coreKnown.includes(w.originalIndex)).length;
        const percent = total === 0 ? 0 : Math.round((known / total) * 100);
        const accent = deckAccentColors[idx % deckAccentColors.length];
        const firstEmoji = words[0]?.emoji || '📚';

        let statusLabel, statusClass;
        if (known === total && total > 0) {
            statusLabel = '✅ Mastered'; statusClass = 'text-emerald-600 bg-emerald-50';
        } else if (known > 0) {
            statusLabel = 'In Progress'; statusClass = `${accent.text} ${accent.bg}`;
        } else {
            statusLabel = 'New'; statusClass = 'text-slate-500 bg-slate-100';
        }

        return `
        <div onclick="openDeckDetail(${dayNum})" class="deck-card bg-white border border-slate-100 rounded-2xl p-5 cursor-pointer relative overflow-hidden group">
            <div class="absolute bottom-0 left-0 h-1 ${accent.bar} transition-all" style="width:${percent}%"></div>
            <div class="flex justify-between items-start mb-4">
                <div class="w-12 h-12 rounded-xl ${accent.bg} ${accent.border} border flex items-center justify-center text-2xl shadow-inner">${firstEmoji}</div>
                <span class="bg-slate-100 text-slate-500 text-[10px] font-bold px-2 py-1 rounded uppercase tracking-wider">Day ${dayNum}</span>
            </div>
            <h3 class="text-lg font-bold text-slate-800 mb-1 group-hover:text-indigo-600 transition-colors">Day ${dayNum} Vocab</h3>
            <p class="text-xs text-slate-500 mb-4">${total} words to master</p>
            <div class="flex justify-between items-center text-xs font-semibold">
                <span class="${statusClass} px-2 py-0.5 rounded">${statusLabel}</span>
                <span class="text-slate-400">${known}/${total} words</span>
            </div>
        </div>`;
    }).join('');

    // Append user-created deck cards
    container.innerHTML += userDecks.map(deck => {
        const custom  = customWords[deck.id] || [];
        const total   = custom.length;
        const known   = custom.filter(w => customKnown.includes(w.id)).length;
        const percent = total === 0 ? 0 : Math.round((known / total) * 100);
        const accent  = deckAccentColors[deck.colorIdx % deckAccentColors.length];
        let statusLabel, statusClass;
        if (total === 0)                   { statusLabel = 'Empty';       statusClass = 'text-slate-400 bg-slate-100'; }
        else if (known === total)           { statusLabel = '✅ Mastered'; statusClass = 'text-emerald-600 bg-emerald-50'; }
        else if (known > 0)                { statusLabel = 'In Progress'; statusClass = `${accent.text} ${accent.bg}`; }
        else                               { statusLabel = 'New';         statusClass = 'text-slate-500 bg-slate-100'; }
        return `
        <div onclick="openUserDeckDetail('${deck.id}')" class="deck-card bg-white border border-slate-100 rounded-2xl p-5 cursor-pointer relative overflow-hidden group">
            <div class="absolute bottom-0 left-0 h-1 ${accent.bar} transition-all" style="width:${percent}%"></div>
            <div class="flex justify-between items-start mb-4">
                <div class="w-12 h-12 rounded-xl ${accent.bg} ${accent.border} border flex items-center justify-center text-2xl shadow-inner">${deck.icon || '📚'}</div>
                <span class="bg-slate-100 text-slate-500 text-[10px] font-bold px-2 py-1 rounded uppercase tracking-wider">Custom</span>
            </div>
            <h3 class="text-lg font-bold text-slate-800 mb-1 group-hover:text-indigo-600 transition-colors">${deck.title}</h3>
            <p class="text-xs text-slate-500 mb-4">${deck.desc || `${total} words`}</p>
            <div class="flex justify-between items-center text-xs font-semibold">
                <span class="${statusClass} px-2 py-0.5 rounded">${statusLabel}</span>
                <span class="text-slate-400">${known}/${total} words</span>
            </div>
        </div>`;
    }).join('');
}

function openDeckDetail(dayNum) {
    currentDeckDay = dayNum;
    const words = coreVocabulary.filter(w => w.day === dayNum);
    const total = words.length;
    const known = words.filter(w => coreKnown.includes(w.originalIndex)).length;
    const days = [...new Set(coreVocabulary.map(w => w.day))].sort((a, b) => a - b);
    const idx = days.indexOf(dayNum);
    const accent = deckAccentColors[idx % deckAccentColors.length];
    const firstEmoji = words[0]?.emoji || '📚';

    const iconEl = document.getElementById('detail-deck-icon');
    iconEl.textContent = firstEmoji;
    iconEl.className = `w-24 h-24 rounded-3xl ${accent.bg} ${accent.border} border flex items-center justify-center text-5xl shadow-inner flex-shrink-0`;
    document.getElementById('detail-deck-title').textContent = `Day ${dayNum} Vocabulary`;
    document.getElementById('detail-deck-desc').textContent = `${total} words from your Day ${dayNum} learning session.`;
    document.getElementById('detail-deck-progress').textContent = `${known}/${total} Mastered`;

    renderDeckWordList(dayNum);

    document.getElementById('view-decks-overview').classList.add('hidden');
    document.getElementById('view-deck-detail').classList.remove('hidden');
    document.getElementById('core-toggle-wrapper').classList.add('hidden');

    const toggle = document.getElementById('deck-review-toggle');
    toggle.checked = false;
    toggleDeckReviewMode(toggle);

    window.scrollTo({ top: 0, behavior: 'smooth' });
}

function renderDeckWordList(dayNum) {
    const container = document.getElementById('deck-word-list');
    const words = coreVocabulary.filter(w => w.day === dayNum && !hiddenCoreWords.includes(w.originalIndex));
    const custom = customWords[dayNum] || [];
    const total = words.length + custom.length;

    document.getElementById('detail-word-count').textContent = `Vocabulary (${total})`;

    let html = words.map(word => {
        const isChecked = coreKnown.includes(word.originalIndex);
        return `
        <div id="word-card-${word.originalIndex}" onclick="openCoreModal(${word.originalIndex})"
             class="word-item ${isChecked ? 'checked' : ''} cursor-pointer rounded-2xl p-3 flex items-center justify-between group bg-white border border-slate-100">
            <div class="flex items-center gap-3">
                <div class="emoji-icon text-2xl transition-transform duration-300">${word.emoji}</div>
                <div>
                    <div class="font-bold text-slate-800 leading-tight">${word.indo}</div>
                    <div class="eng-text text-xs font-medium text-slate-400 mt-0.5 transition-all duration-300">${word.eng}</div>
                </div>
            </div>
            <div class="check-circle w-6 h-6 rounded-full border-2 border-slate-200 flex items-center justify-center bg-white shadow-sm flex-shrink-0">
                <svg class="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="3"><path stroke-linecap="round" stroke-linejoin="round" d="M5 13l4 4L19 7"></path></svg>
            </div>
        </div>`;
    }).join('');

    html += custom.map(word => {
        const isChecked = customKnown.includes(word.id);
        return `
        <div id="word-card-${word.id}" onclick="openCustomWordModal('${word.id}')"
             class="word-item ${isChecked ? 'checked' : ''} cursor-pointer rounded-2xl p-3 flex items-center justify-between group bg-white border border-indigo-100">
            <div class="flex items-center gap-3">
                <div class="emoji-icon text-2xl transition-transform duration-300">${word.emoji || '📝'}</div>
                <div>
                    <div class="font-bold text-slate-800 leading-tight">${word.indo}</div>
                    <div class="eng-text text-xs font-medium text-slate-400 mt-0.5 transition-all duration-300">${word.eng || ''}</div>
                </div>
            </div>
            <div class="flex items-center gap-2">
                <span class="text-xs text-indigo-300 font-medium">custom</span>
                <div class="check-circle w-6 h-6 rounded-full border-2 border-slate-200 flex items-center justify-center bg-white shadow-sm flex-shrink-0">
                    <svg class="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="3"><path stroke-linecap="round" stroke-linejoin="round" d="M5 13l4 4L19 7"></path></svg>
                </div>
            </div>
        </div>`;
    }).join('');

    html += `
    <div onclick="toggleAddWordPanel()" class="border-2 border-dashed border-slate-200 hover:border-indigo-300 hover:bg-indigo-50/30 rounded-2xl p-3 flex items-center justify-center gap-2 cursor-pointer transition-colors text-slate-400 hover:text-indigo-600">
        <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"></path></svg>
        <span class="font-bold text-sm">Add Word to Deck</span>
    </div>`;

    container.innerHTML = html;
}

function closeDeckDetail() {
    document.getElementById('view-deck-detail').classList.add('hidden');
    document.getElementById('view-decks-overview').classList.remove('hidden');
    currentDeckDay = null;
    const toggle = document.getElementById('deck-review-toggle');
    toggle.checked = false;
    toggleDeckReviewMode(toggle);
    document.getElementById('core-toggle-wrapper').classList.remove('hidden');
}

function toggleDeckReviewMode(checkbox) {
    const container = document.getElementById('deck-word-list');
    if (!container) return;
    checkbox.checked ? container.classList.add('review-active') : container.classList.remove('review-active');
}

function toggleAddWordPanel() {
    const panel   = document.getElementById('add-word-panel');
    const overlay = document.getElementById('add-word-overlay');
    if (!panel) return;
    if (panel.classList.contains('closed')) {
        // Set deck label
        const labelEl = document.getElementById('add-panel-deck-label');
        if (labelEl) {
            if (currentDeckDay !== null) {
                const ud = userDecks.find(d => d.id === currentDeckDay);
                labelEl.textContent = ud ? ud.title : `Day ${currentDeckDay} Deck`;
            } else {
                labelEl.textContent = 'to current deck';
            }
        }
        // Reset to Import tab
        switchPanelTab('import');
        clearImportPreview();
        panel.classList.replace('closed', 'open');
        overlay.classList.remove('opacity-0', 'pointer-events-none');
        overlay.classList.add('opacity-100', 'pointer-events-auto');
    } else {
        panel.classList.replace('open', 'closed');
        overlay.classList.add('opacity-0', 'pointer-events-none');
        overlay.classList.remove('opacity-100', 'pointer-events-auto');
    }
}

function openDeckModal(mode) {
    const overlay  = document.getElementById('deck-modal-overlay');
    const modal    = document.getElementById('deck-modal');
    const titleEl  = document.getElementById('deck-modal-title');
    const saveBtn  = document.getElementById('deck-modal-save');
    const deleteBtn = document.getElementById('deck-modal-delete');
    if (mode === 'create') {
        titleEl.textContent = 'Create New Deck';
        saveBtn.textContent = 'Create Deck';
        deleteBtn.classList.add('hidden');
        deleteBtn.onclick = null;
        document.getElementById('deck-input-title').value = '';
        document.getElementById('deck-input-icon').value  = '';
        document.getElementById('deck-input-desc').value  = '';
    } else if (mode === 'edit') {
        titleEl.textContent = 'Edit Deck';
        saveBtn.textContent = 'Save';
        deleteBtn.classList.remove('hidden');
        deleteBtn.textContent = 'Delete Deck';
        deleteBtn.onclick = () => resetDeck(currentDeckDay);
        // Populate form if editing a user deck
        const userDeck = userDecks.find(d => d.id === currentDeckDay);
        if (userDeck) {
            document.getElementById('deck-input-title').value = userDeck.title || '';
            document.getElementById('deck-input-icon').value  = userDeck.icon  || '';
            document.getElementById('deck-input-desc').value  = userDeck.desc  || '';
            const colorBtns = document.querySelectorAll('.deck-color-btn');
            colorBtns.forEach((b, i) => {
                b.classList.remove('ring-2','ring-offset-2','ring-slate-400','scale-110');
                if (i === (userDeck.colorIdx ?? 0)) b.classList.add('ring-2','ring-offset-2','ring-slate-400','scale-110');
            });
        } else {
            document.getElementById('deck-input-title').value = '';
            document.getElementById('deck-input-icon').value  = '';
            document.getElementById('deck-input-desc').value  = '';
        }
    }
    overlay.classList.remove('opacity-0', 'pointer-events-none');
    overlay.classList.add('opacity-100', 'pointer-events-auto');
    modal.classList.remove('opacity-0', 'pointer-events-none', 'scale-95');
    modal.classList.add('opacity-100', 'pointer-events-auto', 'scale-100');
}

function closeDeckModal() {
    const overlay = document.getElementById('deck-modal-overlay');
    const modal   = document.getElementById('deck-modal');
    overlay.classList.add('opacity-0', 'pointer-events-none');
    overlay.classList.remove('opacity-100', 'pointer-events-auto');
    modal.classList.add('opacity-0', 'pointer-events-none', 'scale-95');
    modal.classList.remove('opacity-100', 'pointer-events-auto', 'scale-100');
}

function selectDeckColor(btn) {
    document.querySelectorAll('.deck-color-btn').forEach(b =>
        b.classList.remove('ring-2', 'ring-offset-2', 'ring-slate-400', 'scale-110'));
    btn.classList.add('ring-2', 'ring-offset-2', 'ring-slate-400', 'scale-110');
}

function getSelectedDeckColorIndex() {
    const colorNames = ['bg-indigo-500','bg-emerald-500','bg-amber-500','bg-rose-500','bg-cyan-500'];
    const selected = document.querySelector('.deck-color-btn.ring-2');
    if (!selected) return 0;
    return colorNames.findIndex(c => selected.classList.contains(c)) ?? 0;
}

function saveUserDeck() {
    const title = document.getElementById('deck-input-title').value.trim();
    if (!title) {
        const inp = document.getElementById('deck-input-title');
        inp.classList.add('ring-2','ring-rose-300','border-rose-300');
        setTimeout(() => inp.classList.remove('ring-2','ring-rose-300','border-rose-300'), 1500);
        return;
    }
    const icon     = document.getElementById('deck-input-icon').value.trim() || '📚';
    const desc     = document.getElementById('deck-input-desc').value.trim();
    const colorIdx = getSelectedDeckColorIndex();
    const isUserDeck = typeof currentDeckDay === 'string';

    if (isUserDeck) {
        // Edit existing user deck
        const deck = userDecks.find(d => d.id === currentDeckDay);
        if (deck) { deck.title = title; deck.icon = icon; deck.desc = desc; deck.colorIdx = colorIdx; }
        saveCustomWords();
        saveProgress();
        closeDeckModal();
        openUserDeckDetail(currentDeckDay);
    } else {
        // Create new deck
        const id = `deck_${Date.now()}`;
        userDecks.push({ id, title, icon, desc, colorIdx });
        saveCustomWords();
        saveProgress();
        closeDeckModal();
        renderDecksOverview();
    }
}

function openUserDeckDetail(deckId) {
    const deck = userDecks.find(d => d.id === deckId);
    if (!deck) return;
    currentDeckDay = deckId;
    const accent = deckAccentColors[deck.colorIdx % deckAccentColors.length];
    const custom = customWords[deckId] || [];
    const known  = custom.filter(w => customKnown.includes(w.id)).length;

    const iconEl = document.getElementById('detail-deck-icon');
    iconEl.textContent = deck.icon || '📚';
    iconEl.className = `w-24 h-24 rounded-3xl ${accent.bg} ${accent.border} border flex items-center justify-center text-5xl shadow-inner flex-shrink-0`;
    document.getElementById('detail-deck-title').textContent = deck.title;
    document.getElementById('detail-deck-desc').textContent  = deck.desc || '';
    document.getElementById('detail-deck-progress').textContent = `${known}/${custom.length} Mastered`;

    renderDeckWordList(deckId);
    document.getElementById('view-decks-overview').classList.add('hidden');
    document.getElementById('view-deck-detail').classList.remove('hidden');
    document.getElementById('core-toggle-wrapper').classList.add('hidden');
    const toggle = document.getElementById('deck-review-toggle');
    toggle.checked = false;
    toggleDeckReviewMode(toggle);
    window.scrollTo({ top: 0, behavior: 'smooth' });
}

async function autoFillWordMeaning() {
    const wordInput = document.getElementById('add-indo-word-input');
    const word = wordInput.value.trim();
    if (!word) {
        wordInput.focus();
        wordInput.classList.add('ring-2', 'ring-rose-300', 'border-rose-300');
        setTimeout(() => wordInput.classList.remove('ring-2', 'ring-rose-300', 'border-rose-300'), 1500);
        return;
    }

    const key = localStorage.getItem(GEMINI_KEY_STORAGE);
    if (!key) {
        alert('No Gemini API key found. Go to the Practice tab to save your key first.');
        return;
    }

    const btn     = document.getElementById('add-ai-generate-btn');
    const btnText = document.getElementById('add-ai-btn-text');
    btn.disabled  = true;
    btnText.textContent = 'Thinking...';

    try {
        const call = (prompt, maxTokens) => fetch(getGeminiUrl(), {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                contents: [{ role: 'user', parts: [{ text: prompt }] }],
                generationConfig: { temperature: 0.1, maxOutputTokens: maxTokens }
            })
        }).then(r => r.json()).then(d => {
            if (d.error) throw new Error(d.error.message);
            return (d.candidates?.[0]?.content?.parts?.[0]?.text || '').trim();
        });

        const [emoji, english] = await Promise.all([
            call(`The following is an Indonesian word or phrase: "${word}". Reply with ONE emoji that best represents its meaning. Only the emoji character, nothing else.`, 5),
            call(`The following is an Indonesian word or phrase: "${word}". Translate it from Indonesian to English. Reply with only the English translation, nothing else.`, 20)
        ]);

        document.getElementById('add-output-emoji').value = emoji   || '✨';
        document.getElementById('add-output-eng').value   = english || '';

        btnText.textContent = '✓ Generated!';
        setTimeout(() => { btnText.textContent = 'Auto-fill Meaning & Emoji'; }, 2000);
    } catch (err) {
        console.error('Auto-fill error:', err);
        btnText.textContent = `Error: ${err.message.slice(0, 40)}`;
        setTimeout(() => { btnText.textContent = 'Auto-fill Meaning & Emoji'; }, 3000);
    }
    btn.disabled = false;
}

window.toggleWeek = function(weekNum) { document.getElementById(`week-container-${weekNum}`).classList.toggle('active'); }
function renderCoreDays() {
    const container = document.getElementById('days-container');
    const openWeeks = Array.from(document.querySelectorAll('.week-container.active')).map(el => el.id);
    container.innerHTML = '';
    const groupedByWeek = {};
    let maxWeek = 0;
    coreVocabulary.forEach((word, index) => {
        word.originalIndex = index; const weekNum = Math.ceil(word.day / 7); if (weekNum > maxWeek) maxWeek = weekNum;
        if (!groupedByWeek[weekNum]) groupedByWeek[weekNum] = []; groupedByWeek[weekNum].push(word);
    });
    Object.keys(groupedByWeek).forEach((weekNumStr) => {
        const weekNum = parseInt(weekNumStr); const wordsInWeek = groupedByWeek[weekNum];
        const totalInWeek = wordsInWeek.length; const knownInWeek = wordsInWeek.filter(w => coreKnown.includes(w.originalIndex)).length;
        const isComplete = knownInWeek === totalInWeek; let isActive = openWeeks.length > 0 ? openWeeks.includes(`week-container-${weekNum}`) : (weekNum === maxWeek);
        const groupedDays = wordsInWeek.reduce((acc, word) => { if (!acc[word.day]) acc[word.day] = []; acc[word.day].push(word); return acc; }, {});
        const weekDiv = document.createElement('div'); weekDiv.id = `week-container-${weekNum}`; weekDiv.className = `week-container ${isActive ? 'active' : ''}`;
        const progressColor = isComplete ? 'text-emerald-600 bg-emerald-50' : 'text-slate-500 bg-slate-100';
        let html = `<div class="week-header p-5 flex items-center justify-between" onclick="toggleWeek(${weekNum})"><div class="flex items-center gap-4"><h3 class="text-xl font-bold text-slate-800">Week ${weekNum}</h3><span class="text-xs font-bold px-3 py-1 rounded-full ${progressColor}">${knownInWeek}/${totalInWeek} Mastered</span></div><div class="week-chevron text-slate-400"><svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" /></svg></div></div><div class="week-content px-4 md:px-6"><div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">`;
        Object.keys(groupedDays).forEach((dayNum) => {
            const words = groupedDays[dayNum]; const accent = accents[(dayNum - 1) % accents.length];
            const halfPoint = Math.ceil(words.length / 2); const showHalftime = words.length > 12;
            html += `<div class="day-card p-5 flex flex-col h-full"><div class="flex items-center justify-between mb-4"><div class="flex items-center gap-3"><span class="${accent.bg} ${accent.text} text-xs font-bold px-3 py-1.5 rounded-full uppercase tracking-wider">Day ${dayNum}</span></div><span class="text-xs font-semibold text-slate-400">${words.length} words</span></div><div class="grid grid-cols-1 xl:grid-cols-2 gap-x-3 gap-y-2 flex-1">`;
            words.forEach((word, index) => {
                if (showHalftime && index === halfPoint) { html += `<div class="col-span-1 xl:col-span-2 py-2 flex items-center gap-3 opacity-60"><div class="h-px bg-slate-200 flex-1"></div><span class="text-[10px] font-bold uppercase tracking-widest text-slate-400">Rest Stop</span><div class="h-px bg-slate-200 flex-1"></div></div>`; }
                const isChecked = coreKnown.includes(word.originalIndex);
                html += `<div id="word-card-${word.originalIndex}" onclick="event.stopPropagation(); openCoreModal(${word.originalIndex})" class="word-item ${isChecked ? 'checked' : ''} cursor-pointer rounded-xl p-2 flex items-center justify-between group"><div class="flex items-center gap-3"><div class="emoji-icon text-xl transition-transform duration-300">${word.emoji}</div><div><div class="font-semibold text-sm text-slate-800 leading-tight">${word.indo}</div><div class="eng-text text-xs font-medium text-slate-400 mt-0.5 transition-all duration-300">${word.eng}</div></div></div><div class="check-circle w-5 h-5 rounded-full border-2 border-slate-200 flex items-center justify-center bg-white shadow-sm flex-shrink-0"><svg class="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="3"><path stroke-linecap="round" stroke-linejoin="round" d="M5 13l4 4L19 7"></path></svg></div></div>`;
            });
            html += `</div></div>`;
        });
        html += `</div></div>`; weekDiv.innerHTML = html; container.appendChild(weekDiv);
    });
}

function setupAudioPlayer() { 
    audioPlayer = document.getElementById('audio-player');
    audioPlayer.addEventListener('timeupdate', () => { if (audioPlayer.duration) { const progress = (audioPlayer.currentTime / audioPlayer.duration) * 100; document.getElementById('progress-bar-fill').style.width = progress + '%'; document.getElementById('current-time').textContent = formatTime(audioPlayer.currentTime); highlightCurrentLine(); if (targetEndTime !== null && audioPlayer.currentTime >= targetEndTime) { pauseAudio(); targetEndTime = null; } } });
    audioPlayer.addEventListener('loadedmetadata', () => { document.getElementById('total-time').textContent = formatTime(audioPlayer.duration); });
    audioPlayer.addEventListener('ended', () => { isPlaying = false; document.getElementById('play-icon').classList.remove('hidden'); document.getElementById('pause-icon').classList.add('hidden'); clearActiveLine(); targetEndTime = null; });
}
function togglePlayPause() { if (isPlaying) pauseAudio(); else playAudio(); } 
function playAudio() { if (audioPlayer && audioPlayer.src) { audioPlayer.play(); isPlaying = true; document.getElementById('play-icon').classList.add('hidden'); document.getElementById('pause-icon').classList.remove('hidden'); } } 
function pauseAudio() { if (audioPlayer) { audioPlayer.pause(); isPlaying = false; document.getElementById('play-icon').classList.remove('hidden'); document.getElementById('pause-icon').classList.add('hidden'); } } 
function seekAudio(event) { if (!audioPlayer || !audioPlayer.duration) return; const progressBar = event.currentTarget; const clickX = event.offsetX; const width = progressBar.offsetWidth; const percentage = clickX / width; audioPlayer.currentTime = percentage * audioPlayer.duration; }
function setPlaybackSpeed(speed) { if (audioPlayer) { audioPlayer.playbackRate = speed; document.querySelectorAll('.speed-button').forEach(btn => { btn.classList.remove('active'); if (parseFloat(btn.dataset.speed) === speed) btn.classList.add('active'); }); } }
function formatTime(seconds) { if (isNaN(seconds)) return '0:00'; const mins = Math.floor(seconds / 60); const secs = Math.floor(seconds % 60); return `${mins}:${secs.toString().padStart(2, '0')}`; }
function highlightCurrentLine() { if (!currentSong || !currentSong.lyrics) return; const currentTime = audioPlayer.currentTime; let activeIndex = -1; for (let i = 0; i < currentSong.lyrics.length; i++) { const lyric = currentSong.lyrics[i]; if (currentTime >= lyric.startTime && currentTime < lyric.endTime) { activeIndex = i; break; } } if (activeIndex !== currentLyricIndex) { clearActiveLine(); currentLyricIndex = activeIndex; if (activeIndex >= 0) { const lineEl = document.getElementById(`lyric-line-${activeIndex}`); if (lineEl) { lineEl.classList.add('active'); lineEl.scrollIntoView({ behavior: 'smooth', block: 'center' }); } } } }
function clearActiveLine() { document.querySelectorAll('.lyric-line').forEach(line => { line.classList.remove('active'); }); currentLyricIndex = -1; }
function playFromLine(lineIndex, isSingleClick) { if (!currentSong || !audioPlayer || !audioPlayer.src) return; const lyric = currentSong.lyrics[lineIndex]; if (lyric && lyric.startTime !== undefined) { audioPlayer.currentTime = lyric.startTime; if (isSingleClick) { targetEndTime = lyric.endTime; } else { targetEndTime = null; } playAudio(); } }
function handleLineClick(lineIndex) { clickCount++; if (clickCount === 1) { clickTimer = setTimeout(() => { playFromLine(lineIndex, true); clickCount = 0; }, 300); } else if (clickCount === 2) { clearTimeout(clickTimer); playFromLine(lineIndex, false); clickCount = 0; } }
function setupSongSelector() { const selector = document.getElementById('song-select'); if (!window.songs) return; Object.values(window.songs).forEach(song => { const option = document.createElement('option'); option.value = song.id; option.text = `${song.title} - ${song.artist}`; selector.appendChild(option); }); }

function setupSongReviewToggle() { 
    const toggle = document.getElementById('song-review-toggle'); 
    const listContainer = document.getElementById('song-vocab-list'); 
    toggle.addEventListener('change', (e) => { 
        e.target.checked ? listContainer.classList.add('review-active') : listContainer.classList.remove('review-active'); 
    }); 
}

function setupStoryReviewToggle() {
    const toggle = document.getElementById('story-review-toggle');
    const listContainer = document.getElementById('story-vocab-list');
    toggle.addEventListener('change', (e) => {
        e.target.checked ? listContainer.classList.add('review-active') : listContainer.classList.remove('review-active');
    });
}

function changeSong(songId) { 
    if (!songId) { 
        document.getElementById('now-playing-badge').className = 'inline-block bg-slate-100 text-slate-400 px-4 py-1.5 rounded-full text-sm font-bold mb-3'; 
        document.getElementById('now-playing-badge').textContent = 'Select a Song'; 
        document.getElementById('song-title').textContent = 'Choose Your Learning Track'; 
        document.getElementById('song-artist').textContent = 'Pick a song from the dropdown'; 
        document.getElementById('audio-controls').classList.add('hidden'); 
        document.getElementById('song-content').classList.add('hidden'); 
        pauseAudio(); 
        currentSong = null; 
        return; 
    } 
    
    currentSong = window.songs[songId]; 
    if(!currentSong) return; 
    
    const imgEl = document.getElementById('song-image'); 
    if (imgEl) imgEl.src = currentSong.image || ''; 
    
    document.getElementById('now-playing-badge').className = 'inline-block bg-indigo-50 text-indigo-600 px-4 py-1.5 rounded-full text-sm font-bold mb-3'; 
    document.getElementById('now-playing-badge').textContent = 'Now Playing'; 
    document.getElementById('song-title').innerText = currentSong.title; 
    document.getElementById('song-artist').innerText = "by " + currentSong.artist; 
    document.getElementById('song-content').classList.remove('hidden'); 
    
    // Handle both string URLs and Blob URLs for audio
    if (currentSong.audioFile) { 
        audioPlayer.src = currentSong.audioFile; 
        document.getElementById('audio-controls').classList.remove('hidden'); 
        pauseAudio(); 
    } 
    
    renderSongLyrics(); 
    renderSongVocabList(); 
    updateStats(); 
}

function renderSongLyrics() { const container = document.getElementById('lyrics-container'); const songId = currentSong.id; const knownIds = songProgress[songId] || []; let html = ''; currentSong.lyrics.forEach((lineData, lineIndex) => { if (lineData.tokens.length === 0) { html += '<div class="h-6"></div>'; return; } html += `<div class="lyric-line" id="lyric-line-${lineIndex}" onclick="handleLineClick(${lineIndex})" style="cursor: pointer;">`; lineData.tokens.forEach(token => { if (token.vocabId) { const isKnown = knownIds.includes(token.vocabId); html += `<span class="lyric-word vocab ${isKnown ? 'known' : ''}" onclick="event.stopPropagation(); openSongModal(${token.vocabId}, this)" id="lyric-vocab-${token.vocabId}" data-id="${token.vocabId}">${token.text}</span> `; } else { html += `<span class="lyric-word">${token.text}</span> `; } }); html += '</div>'; }); container.innerHTML = html; }
function renderSongVocabList() { const container = document.getElementById('song-vocab-list'); const songId = currentSong.id; const knownIds = songProgress[songId] || []; if(!currentSong.vocabulary || currentSong.vocabulary.length === 0) { container.innerHTML = '<div class="text-slate-400 text-center">No vocabulary found.</div>'; return; } document.getElementById('vocab-count').textContent = `${currentSong.vocabulary.length} words`; let html = ''; currentSong.vocabulary.forEach(word => { const isKnown = knownIds.includes(word.id); html += `<div id="panel-vocab-${word.id}" onclick="openSongModal(${word.id})" class="word-item ${isKnown ? 'checked' : ''} cursor-pointer rounded-xl p-3 flex items-center justify-between group border border-slate-50 shadow-sm mb-2"><div class="flex items-center gap-3"><div class="text-2xl">${word.emoji || '🎵'}</div><div><div class="font-semibold text-slate-800 leading-tight">${word.indo}</div><div class="eng-text text-xs font-medium text-slate-400 mt-0.5 transition-all duration-300">${word.eng}</div></div></div><div class="check-circle w-5 h-5 rounded-full border-2 border-slate-200 flex items-center justify-center bg-white shadow-sm flex-shrink-0"><svg class="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="3"><path stroke-linecap="round" stroke-linejoin="round" d="M5 13l4 4L19 7"></path></svg></div></div>`; }); container.innerHTML = html; }
function openSongModal(vocabId, element) { 
    const wordData = currentSong.vocabulary.find(w => w.id === vocabId); 
    if(!wordData) return; 
    const songId = currentSong.id; 
    const isKnown = (songProgress[songId] || []).includes(vocabId); 
    document.getElementById('modal-indo').innerText = wordData.indo; 
    document.getElementById('modal-eng').innerText = wordData.eng; 
    
    // Hide cultural note section for songs
    document.getElementById('modal-note').classList.add('hidden');
    
    // Display mnemonic image
    displayMnemonicInModal(vocabId);
    
    const btn = document.getElementById('modal-action-btn');
    updateModalButton(btn, isKnown);
    document.getElementById('modal-delete-word-btn').classList.add('hidden');
    document.getElementById('word-modal').classList.add('active');
    document.getElementById('word-modal-overlay').classList.add('active');
    btn.onclick = function() { toggleSongWord(vocabId); closeModal(); };
}
function toggleSongWord(vocabId) { 
    const songId = currentSong.id; 
    if (!songProgress[songId]) songProgress[songId] = []; 
    if(!masteryTimestamps.songs[songId]) masteryTimestamps.songs[songId] = {}; // Ensure obj

    const index = songProgress[songId].indexOf(vocabId); 
    const isKnown = index > -1; 
    if (isKnown) { 
        // Removing
        songProgress[songId].splice(index, 1); 
        delete masteryTimestamps.songs[songId][vocabId]; // Remove timestamp
    } else { 
        // Adding
        songProgress[songId].push(vocabId); 
        masteryTimestamps.songs[songId][vocabId] = new Date().toISOString(); // Timestamp
    } 
    localStorage.setItem(SONGS_KEY, JSON.stringify(songProgress)); 
    localStorage.setItem(TIMESTAMP_KEY, JSON.stringify(masteryTimestamps));
    saveProgress(); 
    
    const lyricEls = document.querySelectorAll(`#lyric-vocab-${vocabId}`); 
    lyricEls.forEach(el => el.classList.toggle('known', !isKnown)); 
    const panelEl = document.getElementById(`panel-vocab-${vocabId}`); 
    if(panelEl) { 
        panelEl.classList.toggle('checked', !isKnown); 
        if(!isKnown) { panelEl.classList.add('anim-squish'); setTimeout(() => panelEl.classList.remove('anim-squish'), 300); } 
    } 
    updateStats(); 
}
function updateModalButton(btn, isKnown) { if (isKnown) { btn.innerText = "Mark as Unknown"; btn.className = "w-full py-3 rounded-xl font-bold text-white transition-transform active:scale-95 bg-slate-500 hover:bg-slate-600 shadow-lg shadow-slate-200"; } else { btn.innerText = "Mark as Known"; btn.className = "w-full py-3 rounded-xl font-bold text-white transition-transform active:scale-95 bg-indigo-500 hover:bg-indigo-600 shadow-lg shadow-indigo-200"; } }

// ==========================================
// 🖼️ MNEMONIC IMAGE FUNCTIONS
// ==========================================

let currentVocabId = null; // Track which word is currently in the modal

function displayMnemonicInModal(vocabId) {
    currentVocabId = vocabId;
    const imageUrl = mnemonics[vocabId];
    const container = document.getElementById('mnemonic-image-container');
    const dropLabel = document.getElementById('mnemonic-drop-label');
    const removeBtn = document.getElementById('mnemonic-remove-btn');
    document.getElementById('mnemonic-file-input').value = '';

    if (imageUrl) {
        container.innerHTML = `
            <div class="rounded-lg overflow-hidden border border-slate-200 bg-slate-50 mb-2">
                <img src="${imageUrl}" alt="Mnemonic" class="w-full max-h-48 object-contain"
                     onerror="this.parentElement.innerHTML='<div class=\\'p-4 text-center text-slate-400 text-sm\\'>Image failed to load</div>'">
            </div>
        `;
        dropLabel.textContent = 'Drop to replace image';
        removeBtn.classList.remove('hidden');
    } else {
        container.innerHTML = '';
        dropLabel.textContent = 'Drop image here';
        removeBtn.classList.add('hidden');
    }
}

function resizeImageToBase64(file, maxW, maxH, quality) {
    return new Promise((resolve) => {
        const reader = new FileReader();
        reader.onload = (e) => {
            const img = new Image();
            img.onload = () => {
                let { width, height } = img;
                const ratio = Math.min(maxW / width, maxH / height, 1);
                width = Math.round(width * ratio);
                height = Math.round(height * ratio);
                const canvas = document.createElement('canvas');
                canvas.width = width;
                canvas.height = height;
                canvas.getContext('2d').drawImage(img, 0, 0, width, height);
                resolve(canvas.toDataURL('image/jpeg', quality));
            };
            img.src = e.target.result;
        };
        reader.readAsDataURL(file);
    });
}

async function handleMnemonicFile(file) {
    if (!file || !file.type.startsWith('image/')) return;
    const base64 = await resizeImageToBase64(file, 600, 400, 0.82);
    mnemonics[currentVocabId] = base64;
    localStorage.setItem(MNEMONICS_KEY, JSON.stringify(mnemonics));
    saveProgress();
    displayMnemonicInModal(currentVocabId);
}

function removeMnemonic() {
    if (!confirm('Remove this mnemonic image?')) return;
    
    delete mnemonics[currentVocabId];
    localStorage.setItem(MNEMONICS_KEY, JSON.stringify(mnemonics));
    saveProgress();
    displayMnemonicInModal(currentVocabId);
}

function closeModal() { document.getElementById('word-modal').classList.remove('active'); document.getElementById('word-modal-overlay').classList.remove('active'); }

function updateStats() {
    let total = 0, known = 0;
    if (currentTab === 'core') { total = coreVocabulary.length; known = coreKnown.length; }
    else if (currentTab === 'songs') { if(currentSong) { total = currentSong.vocabulary.length; known = (songProgress[currentSong.id]||[]).length; } }
    else { // Inventory & Stories: Show Global
        const coreT = coreVocabulary.length; const coreK = coreKnown.length;
        let songT = 0, songK = 0, storyT = 0, storyK = 0;
        if(window.songs) Object.values(window.songs).forEach(s => { if(s.vocabulary) { songT += s.vocabulary.length; songK += (songProgress[s.id]||[]).length; } });
        const library = [...(window.stories||[]), ...localStories];
        library.forEach(s => { storyT += s.vocabulary.length; storyK += (storyProgress[s.id]||[]).length; });
        total = coreT + songT + storyT; known = coreK + songK + storyK;
    }
    
    const percent = total === 0 ? 0 : Math.round((known / total) * 100);
    document.getElementById('progress-bar').style.width = `${percent}%`;
    document.getElementById('progress-text').innerText = `${percent}%`;
    
    const labels = {core:'Core Mastery', songs:'Song Mastery', inventory:'Global Mastery', read:'Global Mastery'};
    document.getElementById('progress-label').innerText = labels[currentTab] || 'Mastery';
}

// ==========================================
// 🎵 SONG FOLDER LOGIC (Dynamic MP3 Loading)
// ==========================================

// ==========================================
// 🤖 PRACTICE TAB — GEMINI
// ==========================================

const GEMINI_KEY_STORAGE = 'indoAdventure_geminiKey';
const GEMINI_MODEL = 'gemini-2.5-flash';
function getGeminiUrl() {
    const key = localStorage.getItem(GEMINI_KEY_STORAGE);
    return `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${key}`;
}

function saveGeminiKey() {
    const input = document.getElementById('gemini-key-input');
    const key = input.value.trim();
    if (!key) return;
    localStorage.setItem(GEMINI_KEY_STORAGE, key);
    // Sync to Firestore so it's available on all devices
    if (currentUser) {
        db.collection('users').doc(currentUser.uid)
          .set({ geminiApiKey: key }, { merge: true })
          .catch(console.error);
    }
    input.value = '';
    initPracticeTab();
}

function clearGeminiKey() {
    if (!confirm('Remove your saved API key?')) return;
    localStorage.removeItem(GEMINI_KEY_STORAGE);
    if (currentUser) {
        db.collection('users').doc(currentUser.uid)
          .set({ geminiApiKey: firebase.firestore.FieldValue.delete() }, { merge: true })
          .catch(console.error);
    }
    practiceActive = false;
    initPracticeTab();
}

let practiceConversation = [];
let currentPracticeSessionId = null;
let practiceWords = null;
let practiceActive = false;

function getPracticeWords() {
    const now = Date.now(), DAY = 86400000;
    const newWords = [], reviewWords = [], oldWords = [];

    const bucket = (word, tsKey, tsSource) => {
        const ts = masteryTimestamps[tsSource]?.[tsKey];
        const age = ts ? now - new Date(ts).getTime() : Infinity;
        if (age < 7 * DAY) newWords.push(word);
        else if (age < 30 * DAY) reviewWords.push(word);
        else oldWords.push(word);
    };

    coreKnown.forEach(idx => {
        const w = coreVocabulary[idx];
        if (w) bucket({ indo: w.indo, eng: w.eng, emoji: w.emoji || '📝' }, idx, 'core');
    });
    Object.entries(songProgress).forEach(([songId, ids]) => {
        const song = window.songs?.[songId];
        if (!song) return;
        ids.forEach(id => {
            const w = song.vocabulary?.find(v => v.id === id);
            if (w) bucket({ indo: w.indo, eng: w.eng, emoji: w.emoji || '🎵' }, id, 'songs');
        });
    });
    Object.entries(storyProgress).forEach(([storyId, ids]) => {
        const story = localStories.find(s => s.id === storyId);
        if (!story) return;
        ids.forEach(id => {
            const w = story.vocabulary?.find(v => v.id === id);
            if (w) bucket({ indo: w.indo, eng: w.eng, emoji: w.emoji || '📖' }, id, 'stories');
        });
    });

    const shuffle = a => [...a].sort(() => Math.random() - 0.5);
    const selected = [
        ...shuffle(newWords).slice(0, 8),
        ...shuffle(reviewWords).slice(0, 4),
        ...shuffle(oldWords).slice(0, 2)
    ];

    return { selected, newCount: Math.min(newWords.length, 8), reviewCount: Math.min(reviewWords.length, 4), hasWords: selected.length > 0 };
}

function buildSystemPrompt(words) {
    const list = words.map(w => `${w.emoji} ${w.indo} = "${w.eng}"`).join('\n');
    return `You are Kak Indo, an encouraging Bahasa Indonesia tutor for Anh — a Vietnamese student living in Jakarta at beginner level.

STUDENT CONTEXT:
- Name: Anh (Vietnamese, living in Jakarta)
- Level: Beginner (~120 core words learned)
- Always communicate with Anh in ENGLISH, even when the exercises are in Indonesian

TODAY'S WORDS:
${list}

EXERCISE PROGRESSION (follow this order every session):
1. VOCABULARY QUIZ — Indo → English, to check recognition (1–2 rounds max)
2. FILL-IN-THE-GAP — short sentences with a blank, Anh fills in the correct Indonesian word
3. ACTIVE PRODUCTION (most important — spend the most time here):
   - Give an English sentence, Anh translates it to Indonesian
   - Ask open-ended questions that Anh must answer in Indonesian
   - Give a vocabulary word, ask Anh to construct his own sentence using it

RULES:
- Start immediately with the first question — no preamble
- After each answer: one line of feedback (✓ correct / ✗ + brief correction with explanation), then next question
- Prioritise active production exercises over passive recognition
- Do NOT rely on multiple choice — Anh must construct his own answers
- Grammar tolerance: don't penalise minor grammar mistakes early on; focus on vocabulary use and sentence construction
- Keep responses SHORT: feedback + next question in 3–4 sentences max
- Occasional encouragement in Indonesian is fine: "Bagus!", "Hampir!" (almost!), "Luar biasa!"
- Start with the newest/most recently learned words, then cycle to older ones
- After ~12 exchanges, offer to wrap up or keep going`;
}

async function callGemini(userText) {
    practiceConversation.push({ role: 'user', parts: [{ text: userText }] });
    const res = await fetch(getGeminiUrl(), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            system_instruction: { parts: [{ text: buildSystemPrompt(practiceWords.selected) }] },
            contents: practiceConversation,
            generationConfig: { temperature: 0.75, maxOutputTokens: 400 }
        })
    });
    if (!res.ok) { const err = await res.json(); throw new Error(err.error?.message || res.status); }
    const data = await res.json();
    const reply = data.candidates[0].content.parts[0].text;
    practiceConversation.push({ role: 'model', parts: [{ text: reply }] });
    return reply;
}

function practiceScrollBottom() {
    const c = document.getElementById('practice-chat');
    if (c) c.scrollTop = c.scrollHeight;
}

function appendPracticeMessage(role, text, chips) {
    const isUser = role === 'user';
    const escaped = text.replace(/</g, '&lt;').replace(/\n/g, '<br>').replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
    const avatarUrl = (isUser && currentUser?.photoURL) ? currentUser.photoURL : null;
    const userAvatar = avatarUrl
        ? `<img src="${avatarUrl}" class="w-8 h-8 rounded-full border border-slate-200 flex-shrink-0 mt-1">`
        : `<div class="w-8 h-8 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-600 font-bold text-xs flex-shrink-0 mt-1">Me</div>`;

    const chipsHtml = (!isUser && chips?.length) ? `
        <div class="mt-3 flex flex-wrap gap-2">
            ${chips.map(c => `<button onclick="sendSuggestion('${c.text.replace(/'/g,"\\\'")}')" class="bg-white border border-indigo-200 text-indigo-600 hover:bg-indigo-600 hover:text-white text-[10px] md:text-xs font-bold px-3 py-1.5 rounded-full transition-colors">${c.label}</button>`).join('')}
        </div>` : '';

    const div = document.createElement('div');
    div.className = `flex items-start gap-2 md:gap-3 ${isUser ? 'self-end flex-row-reverse max-w-[90%] md:max-w-[80%]' : 'max-w-[90%] md:max-w-[80%]'}`;
    div.innerHTML = isUser ? `
        ${userAvatar}
        <div class="flex flex-col gap-1 items-end">
            <span class="text-[10px] md:text-xs font-semibold text-slate-400 mr-1">You</span>
            <div class="bg-indigo-600 text-white px-4 md:px-5 py-2.5 md:py-3 rounded-2xl rounded-tr-sm shadow-md leading-relaxed text-sm md:text-base">${escaped}</div>
        </div>` : `
        <div class="w-8 h-8 flex-shrink-0 rounded-full bg-gradient-to-br from-indigo-400 to-purple-500 flex items-center justify-center text-white text-sm shadow-sm mt-1">🤖</div>
        <div class="flex flex-col gap-1">
            <span class="text-[10px] md:text-xs font-semibold text-slate-400 ml-1">Guru Bot</span>
            <div class="bg-indigo-50 border border-indigo-100 text-slate-700 px-4 md:px-5 py-2.5 md:py-3 rounded-2xl rounded-tl-sm shadow-sm leading-relaxed text-sm md:text-base">${escaped}${chipsHtml}</div>
        </div>`;

    document.getElementById('practice-messages').appendChild(div);
    practiceScrollBottom();
    return div;
}

function sendSuggestion(text) {
    document.getElementById('practice-input').value = text;
    sendPracticeMessage();
}

function showTypingIndicator() {
    const div = document.createElement('div');
    div.id = 'practice-typing';
    div.className = 'flex items-start gap-2 md:gap-3 max-w-[90%]';
    div.innerHTML = `
        <div class="w-8 h-8 flex-shrink-0 rounded-full bg-gradient-to-br from-indigo-400 to-purple-500 flex items-center justify-center text-white text-sm shadow-sm mt-1">🤖</div>
        <div class="flex flex-col gap-1">
            <span class="text-[10px] md:text-xs font-semibold text-slate-400 ml-1">Guru Bot</span>
            <div class="bg-indigo-50 border border-indigo-100 px-4 py-3.5 rounded-2xl rounded-tl-sm flex items-center gap-1">
                <div class="w-2 h-2 bg-indigo-400 rounded-full typing-dot"></div>
                <div class="w-2 h-2 bg-indigo-400 rounded-full typing-dot"></div>
                <div class="w-2 h-2 bg-indigo-400 rounded-full typing-dot"></div>
            </div>
        </div>`;
    document.getElementById('practice-messages').appendChild(div);
    practiceScrollBottom();
    return div;
}

function setPracticeInputLock(locked) {
    document.getElementById('practice-input').disabled = locked;
    document.getElementById('practice-send-btn').disabled = locked;
}

async function sendPracticeMessage() {
    const input = document.getElementById('practice-input');
    const text = input.value.trim();
    if (!text || !practiceActive) return;
    input.value = '';
    setPracticeInputLock(true);
    appendPracticeMessage('user', text);
    const typing = showTypingIndicator();
    if (currentUser && currentPracticeSessionId) savePracticeMessage('user', text);
    try {
        const reply = await callGemini(text);
        typing.remove();
        appendPracticeMessage('model', reply);
        if (currentUser && currentPracticeSessionId) savePracticeMessage('model', reply);
    } catch (err) {
        typing.remove();
        appendPracticeMessage('model', `⚠️ Gemini error: ${err.message}. Please try again.`);
    }
    setPracticeInputLock(false);
    input.focus();
}

async function startNewPracticeSession() {
    practiceConversation = [];
    practiceActive = true;
    practiceWords = getPracticeWords();
    document.getElementById('practice-messages').innerHTML = '';

    const totalMastered = coreKnown.length + Object.values(songProgress).flat().length + Object.values(storyProgress).flat().length;
    document.getElementById('practice-word-count-badge').textContent = `${totalMastered} Words Mastered`;
    const summary = document.getElementById('practice-word-summary');
    if (!practiceWords.hasWords) {
        summary.textContent = 'No mastered words yet — mark some words as known first!';
        appendPracticeMessage('model', "Looks like you haven't mastered any words yet! 📚 Head to **Core Words**, **Stories**, or **Songs** and mark some words as known — then come back to practice.");
        return;
    }
    summary.textContent = `Testing ${practiceWords.newCount} new · ${practiceWords.reviewCount} review · ${practiceWords.selected.length} total`;

    if (currentUser) {
        currentPracticeSessionId = Date.now().toString();
        db.collection('users').doc(currentUser.uid).collection('practiceHistory').doc(currentPracticeSessionId).set({
            createdAt: new Date().toISOString(),
            messages: [],
            wordsTested: practiceWords.selected.map(w => ({ indo: w.indo, eng: w.eng })),
            newCount: practiceWords.newCount,
            reviewCount: practiceWords.reviewCount
        }).catch(console.error);
    }

    setPracticeInputLock(true);
    const typing = showTypingIndicator();
    try {
        // Kickoff: hidden system message to trigger first question
        const res = await fetch(getGeminiUrl(), {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                system_instruction: { parts: [{ text: buildSystemPrompt(practiceWords.selected) }] },
                contents: [{ role: 'user', parts: [{ text: 'Ready! Ask me the first question.' }] }],
                generationConfig: { temperature: 0.75, maxOutputTokens: 300 }
            })
        });
        const data = await res.json();
        console.log('Gemini response:', JSON.stringify(data));
        if (!res.ok || !data.candidates?.[0]) {
            const msg = data.error?.message || `HTTP ${res.status}`;
            throw new Error(msg);
        }
        const firstQ = data.candidates[0].content.parts[0].text;
        // Seed conversation with this exchange
        practiceConversation = [
            { role: 'user', parts: [{ text: 'Ready! Ask me the first question.' }] },
            { role: 'model', parts: [{ text: firstQ }] }
        ];
        typing.remove();
        const chips = [
            { label: '🏪 Roleplay Market Scene', text: 'Let\'s roleplay a market scene!' },
            { label: '🔄 Review Recent Words',   text: 'Quiz me on my most recent words.' },
            { label: '🗣️ Translate Sentences',   text: 'Give me sentences to translate.' }
        ];
        appendPracticeMessage('model', firstQ, chips);
        if (currentUser && currentPracticeSessionId) savePracticeMessage('model', firstQ);
    } catch (err) {
        typing.remove();
        appendPracticeMessage('model', `⚠️ Could not connect to Gemini: ${err.message}`);
    }
    setPracticeInputLock(false);
    document.getElementById('practice-input').focus();
    if (currentUser) loadPastSessions();
}

async function savePracticeMessage(role, text) {
    if (!currentUser || !currentPracticeSessionId) return;
    db.collection('users').doc(currentUser.uid)
        .collection('practiceHistory').doc(currentPracticeSessionId)
        .update({ messages: firebase.firestore.FieldValue.arrayUnion({ role, text, timestamp: new Date().toISOString() }) })
        .catch(() => {});
}

async function loadPastSessions() {
    if (!currentUser) return;
    const container = document.getElementById('past-sessions-list');
    container.innerHTML = '<p class="text-xs text-slate-400 py-4 text-center">Loading…</p>';
    try {
        const snap = await db.collection('users').doc(currentUser.uid)
            .collection('practiceHistory').orderBy('createdAt', 'desc').limit(5).get();
        if (snap.empty) { container.innerHTML = '<p class="text-xs text-slate-400 py-4 text-center">No past sessions yet.</p>'; return; }
        const now = Date.now();
        container.innerHTML = snap.docs.map((doc, i) => {
            const d = doc.data();
            const ts = new Date(d.createdAt);
            const diffDays = Math.floor((now - ts.getTime()) / 86400000);
            const label = diffDays === 0 ? 'Today' : diffDays === 1 ? 'Yesterday' : ts.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
            const isToday = diffDays === 0;
            const preview = d.messages?.find(m => m.role === 'model')?.text?.slice(0, 80) || '—';
            return `<div class="p-4 rounded-2xl border ${isToday ? 'border-indigo-100 bg-indigo-50/30 hover:border-indigo-300 hover:bg-indigo-50' : 'border-slate-100 bg-white hover:border-indigo-200 hover:bg-indigo-50/50'} cursor-pointer transition-all group">
                <div class="flex justify-between items-start mb-2">
                    <div class="font-bold ${isToday ? 'text-indigo-900' : 'text-slate-800'} group-hover:text-indigo-700 text-sm flex items-center gap-2">
                        <span>${['🗣️','🔄','📝','🎯','✏️'][i % 5]}</span> Session ${i === 0 ? '(Current)' : `#${snap.docs.length - i}`}
                    </div>
                    <span class="text-[10px] font-bold ${isToday ? 'text-indigo-500 bg-indigo-100' : 'text-slate-400 bg-slate-100'} px-2 py-1 rounded-md uppercase tracking-wider">${label}</span>
                </div>
                <p class="text-sm text-slate-500 line-clamp-2">${preview.replace(/</g,'&lt;')}</p>
                <p class="text-[10px] text-slate-400 mt-2">${d.wordsTested?.length || 0} words · ${d.messages?.length || 0} messages</p>
            </div>`;
        }).join('');
    } catch (e) { container.innerHTML = '<p class="text-xs text-red-400 py-4 text-center">Failed to load sessions.</p>'; }
}

function togglePastSessions() {
    const panel   = document.getElementById('sessions-panel');
    const overlay = document.getElementById('sessions-overlay');
    const isOpen  = panel.classList.contains('open');
    if (isOpen) {
        panel.classList.replace('open', 'closed');
        overlay.classList.add('opacity-0', 'pointer-events-none');
        overlay.classList.remove('opacity-100', 'pointer-events-auto');
    } else {
        panel.classList.replace('closed', 'open');
        overlay.classList.remove('opacity-0', 'pointer-events-none');
        overlay.classList.add('opacity-100', 'pointer-events-auto');
        loadPastSessions();
    }
}

async function initPracticeTab() {
    const noAuth = document.getElementById('practice-no-auth');
    const noKey  = document.getElementById('practice-no-key');
    const main   = document.getElementById('practice-interface');
    noAuth.classList.add('hidden');
    noKey.classList.add('hidden');
    main.classList.add('hidden');

    if (!currentUser) { noAuth.classList.remove('hidden'); return; }
    if (!localStorage.getItem(GEMINI_KEY_STORAGE)) { noKey.classList.remove('hidden'); return; }

    main.classList.remove('hidden');
    if (!practiceActive) await startNewPracticeSession();
}

// ==========================================
// 🚀 BOOT
// ==========================================

init();
