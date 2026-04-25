const axios = require('axios');

async function test() {
    console.log("Testing POST /api/bookings against localhost:8080...");
    try {
        const res = await axios.post('http://localhost:8080/api/bookings', {
             user: { id: 2 },
             resource: { id: 1 },
             startDateTime: '2026-05-20T09:00:00',
             endDateTime: '2026-05-20T11:00:00',
             purpose: 'Node Test',
             expectedAttendees: 5
        });
        console.log("SUCCESS:", res.status, res.data);
    } catch (err) {
        if (err.response) {
            console.error("HTTP ERROR:", err.response.status, err.response.data);
        } else {
            console.error("CONNECTION ERROR:", err.message);
        }
    }
}
test();
