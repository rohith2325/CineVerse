exports.handler = async function (event) {
    try {
        if (event.httpMethod !== "GET") {
            return {
                statusCode: 405,
                body: JSON.stringify({ error: "Method not allowed" })
            };
        }

        const prefix = "/.netlify/functions/tmdb";
        const endpoint = event.path.slice(prefix.length);

        if (!/^\/[a-zA-Z0-9_/-]+$/.test(endpoint)) {
            return {
                statusCode: 400,
                body: JSON.stringify({ error: "Invalid TMDB endpoint" })
            };
        }

        const token = process.env.TMDB_READ_ACCESS_TOKEN;

        if (!token) {
            throw new Error("TMDB token is not configured");
        }

        const url = new URL(
            `https://api.themoviedb.org/3${endpoint}`
        );

        url.search = event.rawQuery || "";

        const response = await fetch(url, {
            method: "GET",
            headers: {
                accept: "application/json",
                Authorization: `Bearer ${token}`
            }
        });

        const data = await response.text();

        return {
            statusCode: response.status,
            headers: {
                "Content-Type": "application/json"
            },
            body: data
        };

    } catch (error) {
        console.error("TMDB Function Error:", error);

        return {
            statusCode: 500,
            body: JSON.stringify({
                error: "Unable to fetch movie data"
            })
        };
    }
};