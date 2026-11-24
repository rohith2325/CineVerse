const API_BASE_URL = "/.netlify/functions/tmdb";
const TMDB_READ_ACCESS_TOKEN = "";

const movieContainer = document.getElementById("movieContainer");
const trendingContainer = document.getElementById("trendingContainer");
const trendingDayBtn = document.getElementById("trendingDayBtn");
const trendingWeekBtn = document.getElementById("trendingWeekBtn");
const upcomingContainer = document.getElementById("upcomingContainer");
const similarMoviesContainer = document.getElementById("similarMoviesContainer");
const featuredMovie = document.getElementById("featuredMovie");
const featuredTitle = document.getElementById("featuredTitle");
const featuredRating = document.getElementById("featuredRating");
const featuredOverview = document.getElementById("featuredOverview");
const featuredDetailsBtn = document.getElementById("featuredDetailsBtn");
const featuredTrailerBtn = document.getElementById("featuredTrailerBtn");

let featuredMovieId = null;
const showMoreMoviesBtn = document.getElementById("showMoreMoviesBtn");
const searchInput = document.getElementById("searchInput");
const searchBtn = document.getElementById("searchBtn");

// Pagination variables
let currentPage = 1;
let totalPages = 1;
let currentView = "popular";

// Load popular movies
async function getPopularMovies(page = 1) {
    try {
        currentView = "popular";
        currentPage = page;

        movieContainer.innerHTML = "<p>Loading movies...</p>";

        const response = await fetch(
            `${API_BASE_URL}/movie/popular?language=en-US&page=${page}`,
            {
                headers: {
                    accept: "application/json",
                    Authorization: "Bearer " + TMDB_READ_ACCESS_TOKEN
                }
            }
        );

        if (!response.ok) {
            throw new Error("Unable to fetch movies");
        }

        const data = await response.json();

        totalPages = data.total_pages;

        displayMovies(data.results);
        updatePagination();

    } catch (error) {
        console.error(error);
        movieContainer.innerHTML =
            "<p>Unable to load movies. Please try again.</p>";
    }
    showMoreMoviesBtn.style.display =
    currentPage >= totalPages ? "none" : "block";
}

// Display movies
function displayMovies(movies) {
    movieContainer.innerHTML = "";

    movies.forEach((movie) => {
        const movieCard = document.createElement("div");
        movieCard.classList.add("movie-card");
        movieCard.addEventListener("click", function (event) {

    // Don't open details when clicking an action button
    if (event.target.closest("button")) {
        return;
    }

    showMovieDetails(movie.id);
});

        const poster = movie.poster_path
            ? `https://image.tmdb.org/t/p/w500${movie.poster_path}`
            : "";

       
        movieCard.innerHTML = `
    <img src="${poster}" alt="${movie.title} poster">

    <div class="movie-info">
        <h3>${movie.title}</h3>

        <p>⭐ ${movie.vote_average.toFixed(1)} / 10</p>

        <p>${movie.release_date || "Release date unavailable"}</p>

        <button class="trailer-btn"
            onclick="playTrailer(${movie.id})">
            ▶ Watch Trailer
        </button>

        <button class="full-movie-btn"
        onclick="playAuthorizedMovie(${movie.id}, '${movie.title.replace(/'/g, "\\'")}')">
        ▶ Watch Full Movie
        </button>

        <button class="watchlist-btn"
            onclick="addToWatchlist(${movie.id})">
            ❤️ Add to Watchlist
        </button>

    </div>
`;

        movieContainer.appendChild(movieCard);
    });
}

// Search movies
async function searchMovies(page = 1) {
    const searchTerm = searchInput.value.trim();

    if (searchTerm === "") {
        getPopularMovies(page);
        return;
    }

    try {
        currentView = "search";
        currentPage = page;

        movieContainer.innerHTML = "<p>Searching movies...</p>";

        const response = await fetch(
            `${API_BASE_URL}/search/movie?query=${encodeURIComponent(searchTerm)}&page=${page}`,
            {
                headers: {
                    accept: "application/json",
                    Authorization: "Bearer " + TMDB_READ_ACCESS_TOKEN
                }
            }
        );

        if (!response.ok) {
            throw new Error("Movie search failed");
        }

        const data = await response.json();

        totalPages = data.total_pages;

        displayMovies(data.results);
        updatePagination();

    } catch (error) {
        console.error(error);
        movieContainer.innerHTML =
            "<p>Unable to search movies. Please try again.</p>";
    }
}

searchBtn.addEventListener("click", searchMovies);

searchInput.addEventListener("keydown", (event) => {
    if (event.key === "Enter") {
        searchMovies();
    }
});

// Start the application
getPopularMovies();

async function playTrailer(movieId) {
    try {
        const response = await fetch(
            `${API_BASE_URL}/movie/${movieId}/videos?language=en-US`,
            {
                headers: {
                    accept: "application/json",
                    Authorization: "Bearer " + TMDB_READ_ACCESS_TOKEN
                }
            }
        );

        if (!response.ok) {
            throw new Error("Unable to load trailer");
        }

        const data = await response.json();

        const trailer = data.results.find(video =>
            video.site === "YouTube" &&
            video.type === "Trailer" &&
            video.official === true
        );

        if (trailer) {
            openTrailerPlayer(trailer.key, "CineVerse Movie");
        } else {
            alert("Official trailer is not available for this movie.");
        }

    } catch (error) {
        console.error(error);
        alert("Unable to load trailer. Please try again.");
    }
}

// Show Movie Details
async function showMovieDetails(movieId) {

    const modal = document.getElementById("movieModal");

    try {
        const response = await fetch(
            `${API_BASE_URL}/movie/${movieId}?append_to_response=credits&language=en-US`,
            {
                headers: {
                    accept: "application/json",
                    Authorization: "Bearer " + TMDB_READ_ACCESS_TOKEN
                }
            }
        );

        if (!response.ok) {
            throw new Error("Unable to load movie details");
        }

        const movie = await response.json();

        document.getElementById("detailPoster").src =
            movie.poster_path
                ? `https://image.tmdb.org/t/p/w500${movie.poster_path}`
                : "";

        document.getElementById("detailTitle").textContent = movie.title;

        document.getElementById("detailRating").textContent =
            "⭐ Rating: " + movie.vote_average.toFixed(1) + "/10";

        document.getElementById("detailRelease").textContent =
            "Release Date: " + (movie.release_date || "Unknown");

        document.getElementById("detailGenres").textContent =
            "Genres: " + movie.genres.map(g => g.name).join(", ");

        document.getElementById("detailOverview").textContent =
            movie.overview || "No overview available.";

        const cast = movie.credits?.cast
            ?.slice(0, 5)
            .map(actor => actor.name)
            .join(", ");

        document.getElementById("detailCast").textContent =
            cast || "Cast information unavailable.";

        // OTT Providers
        const providersContainer =
            document.getElementById("watchProviders");

        providersContainer.innerHTML =
            "<p>Checking available platforms...</p>";

        try {
            const providerResponse = await fetch(
                `${API_BASE_URL}/movie/${movieId}/watch/providers`,
                {
                    headers: {
                        Authorization: "Bearer " + TMDB_READ_ACCESS_TOKEN
                    }
                }
            );

            if (!providerResponse.ok) {
                throw new Error("Unable to load providers");
            }

            const providerData = await providerResponse.json();
            const indiaProviders = providerData.results?.IN;

            if (!indiaProviders) {
                providersContainer.innerHTML =
                    "<p>No streaming information available.</p>";
            } else {
                const providers = [
                    ...(indiaProviders.flatrate || []),
                    ...(indiaProviders.rent || []),
                    ...(indiaProviders.buy || [])
                ];

                if (providers.length === 0) {
                    providersContainer.innerHTML =
                        "<p>No streaming platforms currently listed.</p>";
                } else {
                    providersContainer.innerHTML = `
                        <p>Available platforms in India:</p>

                        <div class="provider-list">
                            ${providers.map(provider => `
                                <span class="provider-name">
                                    ${provider.provider_name}
                                </span>
                            `).join("")}
                        </div>

                        ${
                            indiaProviders.link
                                ? `<a href="${indiaProviders.link}"
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    class="play-full-movie-btn">
                                    ▶ Watch Now
                                   </a>`
                                : "<p>Official watch link unavailable.</p>"
                        }
                    `;
                }
            }

        } catch (error) {
            console.error("Provider Error:", error);
            providersContainer.innerHTML =
                "<p>Unable to load streaming information.</p>";
        }

        getSimilarMovies(movieId);
        modal.style.display = "flex";

    } catch (error) {
        console.error(error);
        alert("Unable to load movie details.");
    }
}

// Close Movie Details
document.getElementById("closeModal").addEventListener("click", () => {
    document.getElementById("movieModal").style.display = "none";
});

// Close popup when clicking outside
document.getElementById("movieModal").addEventListener("click", (event) => {
    if (event.target.id === "movieModal") {
        event.target.style.display = "none";
    }
});

// Get saved watchlist
function getWatchlist() {
    return JSON.parse(localStorage.getItem("cineVerseWatchlist")) || [];
}

// Add movie to watchlist
async function addToWatchlist(movieId) {
    try {
        const watchlist = getWatchlist();

        if (watchlist.some(movie => movie.id === movieId)) {
            alert("This movie is already in your watchlist!");
            return;
        }

        const response = await fetch(
            `${API_BASE_URL}/movie/${movieId}?language=en-US`,
            {
                headers: {
                    accept: "application/json",
                    Authorization: "Bearer " + TMDB_READ_ACCESS_TOKEN
                }
            }
        );

        if (!response.ok) {
            throw new Error("Unable to get movie information");
        }

        const movie = await response.json();

        watchlist.push({
            id: movie.id,
            title: movie.title,
            poster_path: movie.poster_path,
            vote_average: movie.vote_average,
            release_date: movie.release_date
        });

        localStorage.setItem(
            "cineVerseWatchlist",
            JSON.stringify(watchlist)
        );

        alert("Movie added to your watchlist! ❤️");

        displayWatchlist();

    } catch (error) {
        console.error(error);
        alert("Unable to add movie to watchlist.");
    }
}

// Display saved movies
function displayWatchlist() {
    const container = document.getElementById("watchlistContainer");
    const watchlist = getWatchlist();

    if (watchlist.length === 0) {
        container.innerHTML = "<p>Your watchlist is empty.</p>";
        return;
    }

    container.innerHTML = "";

    watchlist.forEach(movie => {
        const card = document.createElement("div");
        card.classList.add("movie-card");
        card.addEventListener("click", function (event) {
    if (event.target.closest("button")) {
        return;
    }

    showMovieDetails(movie.id);
});
        

        const poster = movie.poster_path
            ? `https://image.tmdb.org/t/p/w500${movie.poster_path}`
            : "";

        card.innerHTML = `
            <img src="${poster}" alt="${movie.title} poster">

            <div class="movie-info">
                <h3>${movie.title}</h3>
                <p>⭐ ${movie.vote_average.toFixed(1)} / 10</p>

                <button class="remove-btn"
                    onclick="removeFromWatchlist(${movie.id})">
                    Remove ❤️
                </button>
            </div>
        `;

        container.appendChild(card);
    });
}

// Remove movie
function removeFromWatchlist(movieId) {
    const updatedWatchlist = getWatchlist().filter(
        movie => movie.id !== movieId
    );

    localStorage.setItem(
        "cineVerseWatchlist",
        JSON.stringify(updatedWatchlist)
    );

    displayWatchlist();
}

// Load watchlist when website opens
displayWatchlist();

const genreFilter = document.getElementById("genreFilter");
const yearFilter = document.getElementById("yearFilter");
const ratingFilter = document.getElementById("ratingFilter");
const sortFilter = document.getElementById("sortFilter");
const languageFilter = document.getElementById("languageFilter");
const clearFiltersBtn = document.getElementById("clearFiltersBtn");

// Load movie genres from TMDB
async function loadGenres() {
    try {
        const response = await fetch(
            `${API_BASE_URL}/genre/movie/list?language=en`,
            {
                headers: {
                    accept: "application/json",
                    Authorization: "Bearer " + TMDB_READ_ACCESS_TOKEN
                }
            }
        );

        if (!response.ok) {
            throw new Error("Unable to load genres");
        }

        const data = await response.json();

        data.genres.forEach(genre => {
            const option = document.createElement("option");
            option.value = genre.id;
            option.textContent = genre.name;
            genreFilter.appendChild(option);
        });

    } catch (error) {
        console.error(error);
    }
}

// Filter movies by genre, year and rating
async function filterMoviesByGenre(page = 1) {
    const genreId = genreFilter.value;
    const year = yearFilter.value;
    const rating = ratingFilter.value;
    const language = languageFilter.value;

    try {
        currentView = "discover";
        currentPage = page;

        movieContainer.innerHTML = "<p>Loading movies...</p>";

        const params = new URLSearchParams({
            sort_by: sortFilter.value,
            language: "en-US",
            page: String(page)
        });

        console.log("Selected Genre:", genreFilter.value);
console.log("Selected Year:", yearFilter.value);
console.log("Selected Rating:", ratingFilter.value);
console.log("Selected Language:", languageFilter.value);
console.log("TMDB Request:", params.toString());

        // Apply genre only when a specific genre is selected
        if (genreId !== "") {
            params.append("with_genres", genreId);
        }

        if (year !== "") {
            params.append("primary_release_year", year);
        }

        if (rating !== "") {
            params.append("vote_average.gte", rating);
        }

        if (language !== "") {
            params.append("with_original_language", language);
        }

        const response = await fetch(
            `${API_BASE_URL}/discover/movie?${params.toString()}`,
            {
                headers: {
                    accept: "application/json",
                    Authorization: "Bearer " + TMDB_READ_ACCESS_TOKEN
                }
            }
        );

        if (!response.ok) {
            throw new Error("Unable to filter movies");
        }

        const data = await response.json();

        totalPages = data.total_pages;

        displayMovies(data.results);
        updatePagination();

    } catch (error) {
        console.error(error);
        movieContainer.innerHTML =
            "<p>Unable to load movies. Please try again.</p>";
    }
}

yearFilter.addEventListener("change", () => filterMoviesByGenre(1));
ratingFilter.addEventListener("change", () => filterMoviesByGenre(1));
genreFilter.addEventListener("change", () => filterMoviesByGenre(1));
sortFilter.addEventListener("change", () => filterMoviesByGenre(1));
languageFilter.addEventListener("change", () => filterMoviesByGenre(1));

// Update pagination buttons
function updatePagination() {
    const prevPageBtn = document.getElementById("prevPageBtn");
    const nextPageBtn = document.getElementById("nextPageBtn");
    const pageInfo = document.getElementById("pageInfo");

    pageInfo.textContent = `Page ${currentPage} of ${totalPages}`;

    prevPageBtn.disabled = currentPage <= 1;

    nextPageBtn.disabled = currentPage >= totalPages;
}

// Previous page
document.getElementById("prevPageBtn").addEventListener("click", () => {
    if (currentPage > 1) {
        loadPage(currentPage - 1);
    }
});

// Next page
document.getElementById("nextPageBtn").addEventListener("click", () => {
    if (currentPage < totalPages) {
        loadPage(currentPage + 1);
    }
});

// Load the selected page
function loadPage(page) {
    if (currentView === "popular") {
        getPopularMovies(page);
    } else if (currentView === "search") {
        searchMovies(page);
    } else if (currentView === "discover") {
        filterMoviesByGenre(page);
    }
}

// Clear all movie filters
function clearAllFilters() {
    genreFilter.value = "";
    yearFilter.value = "";
    ratingFilter.value = "";
    sortFilter.value = "popularity.desc";
    languageFilter.value = "";

    searchInput.value = "";

    currentPage = 1;

    getPopularMovies(1);
}

// Clear filters button event
clearFiltersBtn.addEventListener("click", clearAllFilters);

// Dark and Light Mode
const themeToggle = document.getElementById("themeToggle");

themeToggle.addEventListener("click", () => {
    document.body.classList.toggle("light-mode");

    if (document.body.classList.contains("light-mode")) {
        themeToggle.textContent = "🌙 Dark Mode";
        localStorage.setItem("cineVerseTheme", "light");
    } else {
        themeToggle.textContent = "☀️ Light Mode";
        localStorage.setItem("cineVerseTheme", "dark");
    }
});

// Load saved theme
const savedTheme = localStorage.getItem("cineVerseTheme");

if (savedTheme === "light") {
    document.body.classList.add("light-mode");
    themeToggle.textContent = "🌙 Dark Mode";
}

// Back to Top Button
const backToTopBtn = document.getElementById("backToTop");

// Show button when scrolling down
window.addEventListener("scroll", () => {
    if (window.scrollY > 300) {
        backToTopBtn.style.display = "block";
    } else {
        backToTopBtn.style.display = "none";
    }
});

// Scroll to top when clicked
backToTopBtn.addEventListener("click", () => {
    window.scrollTo({
        top: 0,
        behavior: "smooth"
    });
});

async function getTrendingMovies(timeWindow = "day") {
    try {
        trendingContainer.innerHTML = "<p>Loading trending movies...</p>";

        const response = await fetch(
            `${API_BASE_URL}/trending/movie/${timeWindow}?language=en-US&page=1`,
            {
                headers: {
                    Authorization: "Bearer " + TMDB_READ_ACCESS_TOKEN
                }
            }
        );

        if (!response.ok) {
            throw new Error("Unable to load trending movies");
        }

        const data = await response.json();

        trendingContainer.innerHTML = "";

        data.results.forEach((movie) => {
            const poster = movie.poster_path
                ? `https://image.tmdb.org/t/p/w500${movie.poster_path}`
                : "";

            const movieCard = document.createElement("div");
            movieCard.className = "movie-card";
            movieCard.addEventListener("click", function (event) {

            if (event.target.closest("button")) {
                return;
            }

            showMovieDetails(movie.id);
            });

            movieCard.innerHTML = `
                <img
                    src="${poster}"
                    alt="${movie.title}"
                >

                <div class="movie-info">
                    <h3>${movie.title}</h3>

                    <p>⭐ ${movie.vote_average.toFixed(1)}</p>

                    <p>${movie.release_date || "Release date unavailable"}</p>

                    <button class="trailer-btn"
                        onclick="playTrailer(${movie.id})">
                        ▶ Watch Trailer
                    </button>

                    <button class="details-btn"
                        onclick="showMovieDetails(${movie.id})">
                        View Details
                    </button>

                    <button class="watchlist-btn"
                        onclick="addToWatchlist(${movie.id})">
                        ❤️ Add to Watchlist
                    </button>
                </div>
            `;

            trendingContainer.appendChild(movieCard);
        });

    } catch (error) {
        console.error(error);
        trendingContainer.innerHTML =
            "<p>Unable to load trending movies. Please try again.</p>";
    }
}

trendingDayBtn.addEventListener("click", () => {
    trendingDayBtn.classList.add("active");
    trendingWeekBtn.classList.remove("active");

    getTrendingMovies("day");
});

trendingWeekBtn.addEventListener("click", () => {
    trendingWeekBtn.classList.add("active");
    trendingDayBtn.classList.remove("active");

    getTrendingMovies("week");
});
getTrendingMovies("day");

async function getUpcomingMovies() {
    try {
        upcomingContainer.innerHTML =
            "<p>Loading upcoming movies...</p>";

        const response = await fetch(
            `${API_BASE_URL}/movie/upcoming?language=en-US&page=1&region=IN`,
            {
                headers: {
                    Authorization: "Bearer " + TMDB_READ_ACCESS_TOKEN
                }
            }
        );

        if (!response.ok) {
            throw new Error("Unable to load upcoming movies");
        }

        const data = await response.json();

        upcomingContainer.innerHTML = "";

        data.results.forEach((movie) => {
            const poster = movie.poster_path
                ? `https://image.tmdb.org/t/p/w500${movie.poster_path}`
                : "";

            const movieCard = document.createElement("div");
            movieCard.className = "movie-card";
            movieCard.addEventListener("click", function (event) {

            if (event.target.closest("button")) {
                return;
            }

            showMovieDetails(movie.id);
            });

            movieCard.innerHTML = `
                <img src="${poster}" alt="${movie.title}">

                <div class="movie-info">
                    <h3>${movie.title}</h3>

                    <p>⭐ ${movie.vote_average.toFixed(1)}</p>

                    <p>Release: ${movie.release_date || "To be announced"}</p>

                    <button class="trailer-btn"
                        onclick="playTrailer(${movie.id})">
                        ▶ Watch Trailer
                    </button>

                    <button class="details-btn"
                        onclick="showMovieDetails(${movie.id})">
                        View Details
                    </button>

                    <button class="watchlist-btn"
                        onclick="addToWatchlist(${movie.id})">
                        ❤️ Add to Watchlist
                    </button>
                </div>
            `;

            upcomingContainer.appendChild(movieCard);
        });

    } catch (error) {
        console.error(error);

        upcomingContainer.innerHTML =
            "<p>Unable to load upcoming movies. Please try again.</p>";
    }
}

getUpcomingMovies();

async function getSimilarMovies(movieId) {
    try {
        similarMoviesContainer.innerHTML =
            "<p>Loading recommendations...</p>";

        const response = await fetch(
            `${API_BASE_URL}/movie/${movieId}/similar?language=en-US&page=1`,
            {
                headers: {
                    Authorization: "Bearer " + TMDB_READ_ACCESS_TOKEN
                }
            }
        );

        if (!response.ok) {
            throw new Error("Unable to load similar movies");
        }

        const data = await response.json();

        similarMoviesContainer.innerHTML = "";

        const movies = data.results.slice(0, 6);

        if (movies.length === 0) {
            similarMoviesContainer.innerHTML =
                "<p>No similar movies found.</p>";
            return;
        }

        movies.forEach((movie) => {
            const poster = movie.poster_path
                ? `https://image.tmdb.org/t/p/w342${movie.poster_path}`
                : "";

            const card = document.createElement("div");
            card.className = "similar-movie-card";

            card.innerHTML = `
                <img src="${poster}" alt="${movie.title}">

                <h4>${movie.title}</h4>

                <p>⭐ ${movie.vote_average.toFixed(1)}</p>

                <button onclick="showMovieDetails(${movie.id})">
                    View Details
                </button>
            `;

            similarMoviesContainer.appendChild(card);
        });

    } catch (error) {
        console.error(error);

        similarMoviesContainer.innerHTML =
            "<p>Unable to load recommendations.</p>";
    }
}
  

async function getFeaturedMovie() {
    try {
        const response = await fetch(
            `${API_BASE_URL}/movie/popular?language=en-US&page=1`,
            {
                headers: {
                    Authorization: "Bearer " + TMDB_READ_ACCESS_TOKEN
                }
            }
        );

        if (!response.ok) {
            throw new Error("Unable to load featured movie");
        }

        // Convert API response into JSON
        const data = await response.json();

        // Select a random movie
        const eligibleMovies = data.results.filter(
            item => item.backdrop_path && item.overview
        );

        if (eligibleMovies.length === 0) {
            throw new Error("No featured movie available");
        }

        const randomIndex = Math.floor(
            Math.random() * eligibleMovies.length
        );

        const movie = eligibleMovies[randomIndex];

        featuredMovieId = movie.id;

        featuredMovie.style.backgroundImage =
            `linear-gradient(to right, rgba(0,0,0,0.95), rgba(0,0,0,0.2)), url(https://image.tmdb.org/t/p/original${movie.backdrop_path})`;

        featuredTitle.textContent = movie.title;

        featuredRating.textContent =
            "⭐ Rating: " + movie.vote_average.toFixed(1) + "/10";

        featuredOverview.textContent = movie.overview;

    } catch (error) {
        console.error(error);
        featuredTitle.textContent = "Featured movie unavailable";
        featuredOverview.textContent =
            "Please try again later.";
    }
}

featuredDetailsBtn.addEventListener("click", function () {
    console.log("Featured Details clicked:", featuredMovieId);

    if (featuredMovieId !== null) {
        showMovieDetails(featuredMovieId);
    } else {
        alert("Featured movie is still loading. Please try again.");
    }
});

featuredTrailerBtn.addEventListener("click", function () {
    console.log("Featured Trailer clicked:", featuredMovieId);

    if (featuredMovieId !== null) {
        playTrailer(featuredMovieId);
    } else {
        alert("Featured movie is still loading. Please try again.");
    }
});

showMoreMoviesBtn.addEventListener("click", function () {
    getPopularMovies(currentPage + 1);
});

getFeaturedMovie();
featuredMovie.addEventListener("click", function (event) {

    // Ignore clicks on buttons
    if (event.target.closest("button")) {
        return;
    }

    if (featuredMovieId !== null) {
        showMovieDetails(featuredMovieId);
    }
});

// =====================================
// CINEVERSE INTEGRATED MOVIE PLAYER
// =====================================

const cinePlayerModal = document.getElementById("cinePlayerModal");
const cinePlayerTitle = document.getElementById("cinePlayerTitle");

const trailerPlayer = document.getElementById("trailerPlayer");
const trailerPlayerContainer = document.getElementById("trailerPlayerContainer");

const fullMoviePlayer = document.getElementById("fullMoviePlayer");
const fullMoviePlayerContainer = document.getElementById("fullMoviePlayerContainer");
// Initialize Video.js
let cineVideoJsPlayer = null;

if (typeof videojs === "function") {
    cineVideoJsPlayer = videojs("fullMoviePlayer", {
        controls: true,
        responsive: true,
        fluid: true,
        preload: "metadata"
    });

    console.log("CineVerse Video.js player initialized");

    // =====================================
// CINEVERSE AUDIO LANGUAGE SELECTOR
// =====================================

const audioLanguageSelect = document.getElementById(
    "audioLanguageSelect"
);

const subtitleLanguageSelect = document.getElementById(
    "subtitleLanguageSelect"
);

function updateAudioLanguages() {

    if (!cineVideoJsPlayer || !audioLanguageSelect) return;

    const audioTracks = cineVideoJsPlayer.audioTracks();

    audioLanguageSelect.innerHTML =
        '<option value="-1">Default Audio</option>';

    if (audioTracks.length === 0) return;

    const languageNames = {
        en: "English",
        te: "Telugu",
        hi: "Hindi",
        ta: "Tamil",
        ml: "Malayalam",
        kn: "Kannada"
    };

    let activeAudioIndex = -1;

    for (let i = 0; i < audioTracks.length; i++) {

        const track = audioTracks[i];

        const option = document.createElement("option");

        option.value = String(i);

        const languageCode = (track.language || "")
            .toLowerCase()
            .split("-")[0];

        option.textContent =
            track.label ||
            languageNames[languageCode] ||
            track.language ||
            `Audio Track ${i + 1}`;

        audioLanguageSelect.appendChild(option);

        if (track.enabled) {
            activeAudioIndex = i;
        }
    }

    audioLanguageSelect.value = String(activeAudioIndex);
}

// =====================================
// CINEVERSE SUBTITLE LANGUAGE SELECTOR
// =====================================

function updateSubtitleLanguages() {

    if (!cineVideoJsPlayer || !subtitleLanguageSelect) return;

    const textTracks = cineVideoJsPlayer.textTracks();

    subtitleLanguageSelect.innerHTML =
        '<option value="-1">Subtitles Off</option>';

    for (let i = 0; i < textTracks.length; i++) {

        const track = textTracks[i];

        if (track.kind !== "subtitles" && track.kind !== "captions") {
            continue;
        }

        const option = document.createElement("option");

        option.value = String(i);
        option.textContent =
            track.label ||
            track.language ||
            `Subtitle Track ${i + 1}`;

        subtitleLanguageSelect.appendChild(option);

        if (track.mode === "showing") {
            subtitleLanguageSelect.value = String(i);
        }
    }
}

if (cineVideoJsPlayer) {

   cineVideoJsPlayer.on("loadedmetadata", updateAudioLanguages);
   // Detect subtitle tracks
const cineTextTracks = cineVideoJsPlayer.textTracks();

cineTextTracks.on("addtrack", updateSubtitleLanguages);
cineTextTracks.on("change", updateSubtitleLanguages);

cineVideoJsPlayer.on("loadedmetadata", updateSubtitleLanguages);
cineVideoJsPlayer.on("loadeddata", updateSubtitleLanguages);

cineVideoJsPlayer.on("loadeddata", updateAudioLanguages);

const cineAudioTracks = cineVideoJsPlayer.audioTracks();

cineAudioTracks.on("addtrack", updateAudioLanguages);

cineAudioTracks.on("change", updateAudioLanguages); 

    cineVideoJsPlayer.on("loadstart", () => {
        if (audioLanguageSelect) {
            audioLanguageSelect.innerHTML =
                '<option value="-1">Default Audio</option>';
        }
    });
}

if (audioLanguageSelect) {

    audioLanguageSelect.addEventListener("change", function () {

        if (!cineVideoJsPlayer) return;

        const audioTracks = cineVideoJsPlayer.audioTracks();
        const selectedIndex = Number(this.value);

        if (selectedIndex === -1) return;

        for (let i = 0; i < audioTracks.length; i++) {
            audioTracks[i].enabled = (i === selectedIndex);
        }
    });
}
}

// Subtitle selection
if (subtitleLanguageSelect) {

    subtitleLanguageSelect.addEventListener("change", function () {

        if (!cineVideoJsPlayer) return;

        const textTracks = cineVideoJsPlayer.textTracks();
        const selectedIndex = Number(this.value);

        for (let i = 0; i < textTracks.length; i++) {

            const track = textTracks[i];

            if (track.kind === "subtitles" || track.kind === "captions") {
                track.mode = (i === selectedIndex)
                    ? "showing"
                    : "disabled";
            }
        }
    });
}

const closeCinePlayer = document.getElementById("closeCinePlayer");


// Open trailer inside CineVerse
function openTrailerPlayer(videoKey, movieTitle) {

    if (!videoKey) {
        alert("Trailer is not available.");
        return;
    }

    fullMoviePlayer.pause();
    fullMoviePlayer.removeAttribute("src");
    fullMoviePlayer.load();

    fullMoviePlayerContainer.classList.remove("active");
    trailerPlayerContainer.classList.add("active");

    cinePlayerTitle.textContent = movieTitle + " - Official Trailer";

    trailerPlayer.src =
        "https://www.youtube-nocookie.com/embed/" +
        encodeURIComponent(videoKey) +
        "?autoplay=1&rel=0";

    cinePlayerModal.classList.add("active");
}


// Open full movie inside CineVerse
function openFullMoviePlayer(videoUrl, movieTitle) {

    if (!videoUrl) {
        alert("Movie video is not available.");
        return;
    }

    trailerPlayer.src = "";
    trailerPlayerContainer.classList.remove("active");

    fullMoviePlayerContainer.classList.add("active");

    cinePlayerTitle.textContent = movieTitle;

    cinePlayerModal.classList.add("active");

    if (cineVideoJsPlayer) {
            const videoType = videoUrl.includes(".m3u8")
            ? "application/x-mpegURL"
            : "video/mp4";

        cineVideoJsPlayer.src({
            src: videoUrl,
            type: videoType
        });

        cineVideoJsPlayer.play().catch(error => {
            console.log("Playback requires user interaction:", error);
        });

    } else {
        fullMoviePlayer.src = videoUrl;

        fullMoviePlayer.play().catch(error => {
            console.log("Playback requires user interaction:", error);
        });
    }
}

// Close CineVerse player
function closeMoviePlayer() {

    trailerPlayer.src = "";

    fullMoviePlayer.pause();
    fullMoviePlayer.removeAttribute("src");
    fullMoviePlayer.load();

    cinePlayerModal.classList.remove("active");

    trailerPlayerContainer.classList.remove("active");
    fullMoviePlayerContainer.classList.remove("active");
}


// Close button
closeCinePlayer.addEventListener("click", closeMoviePlayer);


// Close when clicking outside the player
cinePlayerModal.addEventListener("click", function(event) {

    if (event.target === cinePlayerModal) {
        closeMoviePlayer();
    }

});

// =====================================
// PLAY FULL MOVIE FROM VIDEO URL
// =====================================

function playMovieFromUrl() {

    const movieUrlInput = document.getElementById("movieUrlInput");
    const movieTitleInput = document.getElementById("movieTitleInput");

    const videoUrl = movieUrlInput.value.trim();
    const movieTitle = movieTitleInput.value.trim();

    if (!videoUrl) {
        alert("Please enter a movie video URL.");
        return;
    }

    if (!movieTitle) {
        alert("Please enter the movie title.");
        return;
    }

    try {
        const parsedUrl = new URL(videoUrl);

        if (!["https:", "http:"].includes(parsedUrl.protocol)) {
            throw new Error("Invalid video URL");
        }

        openFullMoviePlayer(videoUrl, movieTitle);

    } catch (error) {
        alert("Please enter a valid video URL.");
    }
}

// =====================================
// PUBLIC-DOMAIN MOVIE CATALOGUE
// INTERNET ARCHIVE
// =====================================

async function loadPublicDomainMovies() {

    const container = document.getElementById(
        "publicDomainMoviesContainer"
    );

    container.innerHTML = "<p>Loading classic films...</p>";

    try {
        const searchUrl =
    "https://archive.org/advancedsearch.php" +
    "?q=mediatype%3Amovies" +
    "&fl%5B%5D=identifier" +
    "&fl%5B%5D=title" +
    "&fl%5B%5D=year" +
    "&rows=30&output=json";

        const response = await fetch(searchUrl);

        if (!response.ok) {
            throw new Error("Unable to search Internet Archive");
        }

        const data = await response.json();
        const movies = data.response?.docs || [];

        if (movies.length === 0) {
            throw new Error("No films found");
        }

        container.innerHTML = "";

        for (const movie of movies) {

            const card = document.createElement("div");
            card.className = "full-movie-card";

            const info = document.createElement("div");
            info.className = "full-movie-info";

            const title = document.createElement("h3");
            title.textContent = movie.title || "Classic Film";

            const year = document.createElement("p");
            year.textContent = "Year: " + (movie.year || "Unknown");

            const source = document.createElement("p");
            source.textContent = "Source: Internet Archive";

            const playButton = document.createElement("button");
            playButton.className = "play-full-movie-btn";
            playButton.textContent = "Play Movie";

            playButton.addEventListener("click", async () => {

                playButton.textContent = "Loading...";
                playButton.disabled = true;

                try {
                    const metadataResponse = await fetch(
                        `https://archive.org/metadata/${encodeURIComponent(movie.identifier)}`
                    );

                    if (!metadataResponse.ok) {
                        throw new Error("Unable to load movie files");
                    }

                    const metadata = await metadataResponse.json();

                    const videoFile = metadata.files?.find(file =>
                        /\.(mp4|webm|ogv)$/i.test(file.name || "") &&
                        !file.name.toLowerCase().includes("thumb")
                    );

                    if (!videoFile) {
                        throw new Error("No playable video file found");
                    }

                    const videoUrl =
                        `https://archive.org/download/${encodeURIComponent(movie.identifier)}/` +
                        encodeURIComponent(videoFile.name);

                    openFullMoviePlayer(videoUrl, movie.title);

                } catch (error) {
                    console.error(error);
                    alert("This film does not have a playable video file.");
                } finally {
                    playButton.textContent = "Play Movie";
                    playButton.disabled = false;
                }

            });

            const archiveLink = document.createElement("a");
            archiveLink.href =
                `https://archive.org/details/${encodeURIComponent(movie.identifier)}`;
            archiveLink.target = "_blank";
            archiveLink.rel = "noopener noreferrer";
            archiveLink.textContent = "View source and rights information";
            archiveLink.style.color = "#e50914";

            info.append(title, year, source, playButton, archiveLink);
            card.appendChild(info);
            container.appendChild(card);
        }

    } catch (error) {
        console.error("Classic Films Error:", error);

        container.innerHTML =
            "<p>Unable to load classic films. Please try again.</p>";
    }
}

// =====================================
// AUTHORIZED FULL MOVIE PLAYBACK
// =====================================

// Add only movie streams that you have
// verified are authorized for embedding.

const AUTHORIZED_MOVIE_STREAMS = {
    // Example:
    // "TMDB_MOVIE_ID": "DIRECT_AUTHORIZED_VIDEO_URL"
};


async function playAuthorizedMovie(movieId, movieTitle) {

    alert("Searching for an authorized full movie...");

    try {
        const query = encodeURIComponent(
            `mediatype:movies AND title:"${movieTitle}"`
        );

        const response = await fetch(
            `https://archive.org/advancedsearch.php?q=${query}&fl[]=identifier&fl[]=title&rows=10&output=json`
        );

        if (!response.ok) {
            throw new Error("Movie search failed");
        }

        const data = await response.json();
        const movies = data.response?.docs || [];

        for (const movie of movies) {

            const metadataResponse = await fetch(
                `https://archive.org/metadata/${encodeURIComponent(movie.identifier)}`
            );

            if (!metadataResponse.ok) continue;

            const metadata = await metadataResponse.json();

            const license = (
                metadata.metadata?.licenseurl || ""
            ).toLowerCase();

            const rights = (
                metadata.metadata?.rights || ""
            ).toLowerCase();

            const authorized =
                license.includes("publicdomain") ||
                license.includes("creativecommons.org/publicdomain") ||
                rights.includes("public domain");

            if (!authorized) continue;

            const videoFile = metadata.files?.find(file =>
                /\.(mp4|webm|ogv)$/i.test(file.name || "") &&
                !file.name.toLowerCase().includes("thumb")
            );

            if (!videoFile) {
                continue;
            }

            const videoUrl =
                `https://archive.org/download/${encodeURIComponent(movie.identifier)}/${encodeURIComponent(videoFile.name)}`;
            console.log("Archive ID:", movie.identifier);
            console.log("Video file:", videoFile.name);
            console.log("Audio language metadata:", metadata.metadata?.language);
            openFullMoviePlayer(videoUrl, movieTitle);
            return;
        }

        alert("No verified public-domain full movie was found for this title.");

    } catch (error) {
        console.error(error);
        alert("Unable to find a playable movie. Please try again.");
    }
}

    
// Load genres when the page starts
loadGenres();

