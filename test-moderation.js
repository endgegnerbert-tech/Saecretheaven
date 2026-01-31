
const supabaseUrl = 'https://jextayidnmtsoofugnig.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImpleHRheWlkbm10c29vZnVnbmlnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjkwODM1MDAsImV4cCI6MjA4NDY1OTUwMH0.vxRq32MPWyO_znst5nFCiQ7AWJtlJeOFWMY-RlZmjrs';
const functionUrl = `${supabaseUrl}/functions/v1/post-comment`;

async function testFunction() {
    console.log("1️⃣ Testing Safe Content...");
    try {
        const resSafe = await fetch(functionUrl, {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${supabaseKey}`, 'Content-Type': 'application/json' },
            body: JSON.stringify({ author_name: 'Safe User', content: 'This is a clean comment.', feature_slug: 'test' })
        });
        const dataSafe = await resSafe.json();
        if (resSafe.ok) console.log("✅ Safe content passed.");
        else console.error("❌ Safe content failed:", dataSafe);

    } catch (e) { console.error("Error safe:", e); }

    console.log("\n2️⃣ Testing Profane Content (German)...");
    try {
        const resBad = await fetch(functionUrl, {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${supabaseKey}`, 'Content-Type': 'application/json' },
            body: JSON.stringify({ author_name: 'Bad User', content: 'Du bist ein Arschloch', feature_slug: 'test' })
        });
        const dataBad = await resBad.json();
        if (resBad.status === 400) console.log("✅ Profane content blocked successfully.");
        else console.error("❌ Profane content NOT blocked or other error:", resBad.status, dataBad);

    } catch (e) { console.error("Error bad:", e); }

    console.log("\n3️⃣ Testing Creative Bypass (AI Required to Block)...");
    try {
        const resCreative = await fetch(functionUrl, {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${supabaseKey}`, 'Content-Type': 'application/json' },
            body: JSON.stringify({ author_name: 'Sneaky User', content: 'Y.o.u a.r.e s.t.u.p.i.d', feature_slug: 'test' })
        });
        const dataCreative = await resCreative.json();

        if (resCreative.ok) console.log("⚠️ Bypass passed (Expected if Gemini Key missing).");
        else console.log("✅ Bypass BLOCKED (Gemini is working!).");

    } catch (e) { console.error("Error creative:", e); }
}

testFunction();
