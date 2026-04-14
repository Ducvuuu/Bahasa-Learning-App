// 🇮🇩 CORE VOCABULARY DATA
// Structure: 20 words per day to match the new UI layout.

window.coreVocabulary = [
    // =========================================
    // DAY 1: The Essentials (Pronouns, Greetings, Basic Qs)
    // =========================================
    { day: 1, indo: "Saya", eng: "I / Me", emoji: "🙋‍♂️" },
    { day: 1, indo: "Kamu", eng: "You", emoji: "🫵" },
    { day: 1, indo: "Dia", eng: "He / She", emoji: "🧑" },
    { day: 1, indo: "Mereka", eng: "They", emoji: "👥" },
    { day: 1, indo: "Kita", eng: "We (inclusive)", emoji: "🤝" },
    { day: 1, indo: "Apa", eng: "What", emoji: "❓" },
    { day: 1, indo: "Siapa", eng: "Who", emoji: "👤" },
    { day: 1, indo: "Kapan", eng: "When", emoji: "⏰" },
    { day: 1, indo: "Di mana", eng: "Where", emoji: "📍" },
    { day: 1, indo: "Kenapa", eng: "Why", emoji: "🤔" },
    { day: 1, indo: "Bagaimana", eng: "How", emoji: "🛠️" },
    { day: 1, indo: "Tidak", eng: "No / Not", emoji: "❌" },
    { day: 1, indo: "Ya", eng: "Yes", emoji: "✅" },
    { day: 1, indo: "Terima kasih", eng: "Thank you", emoji: "🙏" },
    { day: 1, indo: "Sama-sama", eng: "You're welcome", emoji: "🤗" },
    { day: 1, indo: "Maaf", eng: "Sorry", emoji: "😔" },
    { day: 1, indo: "Tolong", eng: "Please / Help", emoji: "🆘" },
    { day: 1, indo: "Selamat pagi", eng: "Good morning", emoji: "☀️" },
    { day: 1, indo: "Selamat malam", eng: "Good night", emoji: "🌙" },
    { day: 1, indo: "Sampai jumpa", eng: "See you later", emoji: "👋" },

    // =========================================
    // DAY 2: Action Verbs (Daily Life)
    // =========================================
    { 
        day: 2, 
        indo: "Makan", 
        eng: "To eat", 
        emoji: "🍽️",
        // 🌳 FAMILY TREE DATA
        family: {
            root_meaning: "Consumption / Eating",
            trees: {
                "me-":   { text: "Memakan", meaning: "To eat (something specific)" },
                "di-":   { text: "Dimakan", meaning: "To be eaten (passive)" },
                "ter-":  { text: "Termakan", meaning: "Accidentally eaten / Edible" },
                "pe-":   { text: "Pemakan", meaning: "Eater (Carnivore, etc)" },
                "-an":   { text: "Makanan", meaning: "Food (The object)" },
                "pe-an": { text: "Pemakanan", meaning: "Process of eating/digestion" }
            }
        }
    },
    { day: 2, indo: "Minum", eng: "To drink", emoji: "🥤" },
    { day: 2, indo: "Tidur", eng: "To sleep", emoji: "😴" },
    { day: 2, indo: "Bangun", eng: "To wake up", emoji: "🥱" },
    { 
        day: 2, 
        indo: "Jalan", 
        eng: "To walk", 
        emoji: "🚶",
        // 🌳 FAMILY TREE DATA (Comparison: Uses Ber-, not Me-)
        family: {
            root_meaning: "Motion / Path / Way",
            trees: {
                "ber-":  { text: "Berjalan", meaning: "To walk (Intransitive)" },
                "me-":   { text: "Menjalani", meaning: "To undergo / live through" }, // Actually me-i
                "di-":   { text: "Dijalankan", meaning: "To be run/executed" }, // Actually di-kan
                "-an":   { text: "Jalanan", meaning: "Streets / Roads" },
                "pe-an": { text: "Perjalanan", meaning: "Journey / Trip" } // Irregular Pe- (Per-)
            }
        }
    },
    { day: 2, indo: "Lari", eng: "To run", emoji: "🏃" },
    { day: 2, indo: "Duduk", eng: "To sit", emoji: "🪑" },
    { day: 2, indo: "Berdiri", eng: "To stand", emoji: "🧍" },
    { day: 2, indo: "Lihat", eng: "To see", emoji: "👀" },
    { day: 2, indo: "Dengar", eng: "To hear", emoji: "👂" },
    { day: 2, indo: "Bicara", eng: "To speak", emoji: "🗣️" },
    { day: 2, indo: "Baca", eng: "To read", emoji: "📖" },
    { 
        day: 2, 
        indo: "Tulis", 
        eng: "To write", 
        emoji: "✍️",
        // 🌳 FAMILY TREE DATA
        family: {
            root_meaning: "Inscribing text",
            trees: {
                "me-":    { text: "Menulis", meaning: "To write (Active)" },
                "di-":    { text: "Ditulis", meaning: "To be written (Passive)" },
                "ter-":   { text: "Tertulis", meaning: "Written down / Recorded" },
                "pe-":    { text: "Penulis", meaning: "Writer (Author)" },
                "-an":    { text: "Tulisan", meaning: "Writing / Script / Text" },
                "pe-an":  { text: "Penulisan", meaning: "Process of writing" },
                "me-kan": { text: "Menuliskan", meaning: "To write for someone" }
            }
        }
    },
    { day: 2, indo: "Beli", eng: "To buy", emoji: "🛒" },
    { day: 2, indo: "Bayar", eng: "To pay", emoji: "💸" },
    { day: 2, indo: "Masuk", eng: "To enter", emoji: "🚪" },
    { day: 2, indo: "Keluar", eng: "To exit", emoji: "🔙" },
    { day: 2, indo: "Buka", eng: "To open", emoji: "🔓" },
    { day: 2, indo: "Tutup", eng: "To close", emoji: "🔒" },
    { day: 2, indo: "Suka", eng: "To like", emoji: "❤️" },

    // =========================================
    // DAY 3: Around the House & Numbers
    // =========================================
    { day: 3, indo: "Rumah", eng: "House", emoji: "🏠" },
    { day: 3, indo: "Kamar", eng: "Room", emoji: "🚪" },
    { day: 3, indo: "Dapur", eng: "Kitchen", emoji: "🍳" },
    { day: 3, indo: "Air", eng: "Water", emoji: "💧" },
    { day: 3, indo: "Makanan", eng: "Food", emoji: "🍱" },
    { day: 3, indo: "Buku", eng: "Book", emoji: "📚" },
    { day: 3, indo: "Uang", eng: "Money", emoji: "💵" },
    { day: 3, indo: "Satu", eng: "One", emoji: "1️⃣" },
    { day: 3, indo: "Dua", eng: "Two", emoji: "2️⃣" },
    { day: 3, indo: "Tiga", eng: "Three", emoji: "3️⃣" },
    { day: 3, indo: "Empat", eng: "Four", emoji: "4️⃣" },
    { day: 3, indo: "Lima", eng: "Five", emoji: "5️⃣" },
    { day: 3, indo: "Besar", eng: "Big", emoji: "🐘" },
    { day: 3, indo: "Kecil", eng: "Small", emoji: "🐜" },
    { day: 3, indo: "Panas", eng: "Hot", emoji: "🔥" },
    { day: 3, indo: "Dingin", eng: "Cold", emoji: "❄️" },
    { day: 3, indo: "Bagus", eng: "Good", emoji: "👍" },
    { day: 3, indo: "Jelek", eng: "Bad/Ugly", emoji: "👎" },
    { day: 3, indo: "Mahal", eng: "Expensive", emoji: "💎" },
    { day: 3, indo: "Murah", eng: "Cheap", emoji: "🏷️" }
];