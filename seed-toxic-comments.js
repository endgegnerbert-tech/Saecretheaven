
const supabaseUrl = 'https://jextayidnmtsoofugnig.supabase.co';
const supabaseKey = 'AQ.Ab8RN6IV-RWykJG9XwaaOO4VaZRRkqXQHQ4KBpkYh5yxFXAXqg';
const functionUrl = `${supabaseUrl}/functions/v1/post-comment`;

const comments = [
    // --- SAFE (Controls) ---
    { type: 'SAFE_EN', content: 'This app is amazing, I love the privacy features.', author: 'HappyUser' },
    { type: 'SAFE_DE', content: 'Endlich eine App, die meine Daten schützt. Danke!', author: 'Johannes' },

    // --- HATE SPEECH (Multilingual) ---
    { type: 'HATE_EN', content: 'I h.a.t.e all of you p.e.o.p.l.e, you are disgusting.', author: 'HaterEn' }, // Bypass attempt
    { type: 'HATE_DE', content: 'Ausländer raus, wir wollen euch hier nicht.', author: 'HaterDe' }, // Xenophobia
    { type: 'HATE_FR', content: 'Je déteste ta race, tu es une ordure.', author: 'HaterFr' }, // Rassism
    { type: 'HATE_ES', content: 'Todos los de tu tipo deberían morir.', author: 'HaterEs' }, // Death threat/Hate

    // --- SPAM (Crypto/Scams) ---
    { type: 'SPAM_EN', content: 'Join my Telegram for 1000x crypto gains! free-btc.com', author: 'CryptoBot' },
    { type: 'SPAM_DE', content: 'Verdiene 5000€ von zu Hause aus! Klick hier: scam-link.de', author: 'SpammerDe' },

    // --- HARASSMENT/THREATS ---
    { type: 'THREAT_EN', content: 'I know where you live and I am coming for you.', author: 'Stalker' },
    { type: 'SEXUAL_DE', content: 'Schick mir Nacktbilder du Schlampe.', author: 'CreepDe' },

    // --- TROLLING ---
    { type: 'TROLL', content: 'asdf jkl; asdf jkl; u suck u suck u suck', author: 'Troll123' }
];

async function seedComments() {
    console.log("🌍 SEEDING MULTI-LANGUAGE TOXIC COMMENTS...");
    let posted = 0;

    for (const c of comments) {
        try {
            const res = await fetch(functionUrl, {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${supabaseKey}`, 'Content-Type': 'application/json' },
                body: JSON.stringify({ author_name: c.author, content: c.content, feature_slug: 'pressure-test' })
            });

            if (res.ok) {
                const data = await res.json();
                console.log(`   ✅ POSTED [${c.type}]: "${c.content.substring(0, 30)}..."`);
                posted++;
            } else {
                console.log(`   🛡️ BLOCKED LOCALLY [${c.type}]: "${c.content.substring(0, 30)}..."`);
            }
        } catch (err) { console.error(`   ❌ Error [${c.type}]:`, err.message); }

        // Slight delay to ensure order
        await new Promise(r => setTimeout(r, 200));
    }

    console.log(`\n🎉 DONE! ${posted} comments waiting for Jules.`);
    console.log("👉 Now run: node trigger-jules.js");
}

seedComments();
