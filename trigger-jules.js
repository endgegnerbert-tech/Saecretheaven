
const supabaseUrl = 'https://jextayidnmtsoofugnig.supabase.co';
const supabaseKey = 'AQ.Ab8RN6IV-RWykJG9XwaaOO4VaZRRkqXQHQ4KBpkYh5yxFXAXqg';
const batchUrl = `${supabaseUrl}/functions/v1/moderate-batch`;

async function triggerJules() {
    console.log("🤖 WAKING UP JULES (MANUAL TRIGGER)...");

    try {
        const res = await fetch(batchUrl, {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${supabaseKey}`, 'Content-Type': 'application/json' },
            body: JSON.stringify({ debug: true }) // Request debug info
        });

        if (!res.ok) {
            console.log(`❌ Error: ${res.status} ${res.statusText}`);
            console.log(await res.text());
            return;
        }

        const data = await res.json();
        console.log(`\n✅ EXECUTION COMPLETE`);
        console.log(`   Processed: ${data.processed}`);

        if (data.details && data.details.length > 0) {
            console.log("\n   📝 REPORT:");
            data.details.forEach(d => {
                const icon = d.action === 'deleted' ? '🛡️ DELETED' : (d.action === 'approved' ? '✅ APPROVED' : '⚠️ ' + d.action);
                const error = d.error ? ` (Error: ${d.error})` : '';
                console.log(`   - ID ${d.id}: ${icon}${error}`);
            });
        } else {
            console.log("   (No comments processed. Maybe queue is empty or error occurred?)");
        }

    } catch (e) {
        console.error("❌ Network Error:", e);
    }
}

triggerJules();
