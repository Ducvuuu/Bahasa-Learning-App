// 📖 READING MATERIALS DATA
// Each story has a unique 'theme' object that completely styles the reader.

window.stories = [
    {
        id: "market-morning",
        title: "Pagi di Pasar (Morning at the Market)",
        difficulty: "Beginner",
        category: "Daily Life",
        coverEmoji: "🍎",
        
        // 🎨 THEME: Warm, energetic, morning vibe
        theme: {
            // Background gradient for the whole page
            bg: "bg-gradient-to-br from-orange-50 to-amber-100",
            // The main card background (Reader)
            cardBg: "bg-white",
            // Font style for the content
            font: "font-serif",
            // Text colors
            textMain: "text-amber-900",
            textMuted: "text-amber-700/60",
            // Accent color for buttons/highlights
            accent: "amber", 
            // Specific tailwind classes for the vocab highlights
            highlight: "border-b-2 border-amber-300 hover:bg-amber-100 text-amber-700"
        },
        
        // The story content with vocab tags
        content: [
            "Hari ini adalah hari <span class='vocab-word' data-id='1'>Minggu</span>. Matahari bersinar terang.",
            "Ibu dan saya pergi ke <span class='vocab-word' data-id='2'>pasar</span> tradisional. Pasar itu sangat ramai.",
            "Banyak orang <span class='vocab-word' data-id='3'>membeli</span> sayuran segar dan buah-buahan.",
            "Saya suka sekali kue pasar. Rasanya manis dan <span class='vocab-word' data-id='4'>enak</span>."
        ],
        
        // Vocabulary specific to this story
        vocabulary: [
            { id: 1, indo: "Minggu", eng: "Sunday", emoji: "📅" },
            { id: 2, indo: "Pasar", eng: "Market", emoji: "🏪" },
            { id: 3, indo: "Membeli", eng: "To buy", emoji: "🛒" },
            { id: 4, indo: "Enak", eng: "Delicious", emoji: "😋" }
        ]
    },
    
    {
        id: "ghost-night",
        title: "Malam Jumat (Friday Night)",
        difficulty: "Intermediate",
        category: "Horror / Folklore",
        coverEmoji: "👻",
        
        // 🎨 THEME: Dark, spooky, night mode vibe
        theme: {
            bg: "bg-gradient-to-b from-slate-900 to-slate-800",
            cardBg: "bg-slate-800 border border-slate-700",
            font: "font-mono", // Typewriter style
            textMain: "text-slate-200", // Light text for dark mode
            textMuted: "text-slate-400",
            accent: "purple",
            highlight: "border-b-2 border-purple-500 hover:bg-purple-900/50 text-purple-300"
        },
        
        content: [
            "Malam itu sangat <span class='vocab-word' data-id='5'>gelap</span>. Tidak ada bulan di langit.",
            "Budi berjalan sendiri di jalan sepi. Tiba-tiba, dia mendengar suara <span class='vocab-word' data-id='6'>aneh</span>.",
            "Suaranya seperti orang menangis. Budi merasa <span class='vocab-word' data-id='7'>takut</span>.",
            "Dia lari cepat sekali sampai ke rumah."
        ],
        
        vocabulary: [
            { id: 5, indo: "Gelap", eng: "Dark", emoji: "🌑" },
            { id: 6, indo: "Aneh", eng: "Strange/Weird", emoji: "❓" },
            { id: 7, indo: "Takut", eng: "Scared", emoji: "😱" }
        ]
    }
];