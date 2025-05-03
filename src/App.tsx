import React, { useState, useEffect } from "react";
import Search from "./components/Search";
import ErrorBoundary from "./components/ErrorBoundary";
import { Loader2 } from "lucide-react";
import MovieCard from "./components/MovieCard";
import { useDebounce } from "react-use";
import { getTrendingMovies, updateSearchCount } from "./appwrite";

const API_BASE_URL = "https://api.themoviedb.org/3";

const API_KEY = import.meta.env.VITE_TMDB_API_KEY;

const API_OPTIONS = {
  method: "GET",
  headers: {
    accept: "application/json",
    Authorization: `Bearer ${API_KEY}`,
  },
};

interface Movie {
  id: number;
  title: string;
  vote_average: number;
  poster_path: string;
  release_date: string;
  original_language: string;
  poster_url: string;
  $id: number;
}

const App = () => {
  const [searchTerm, setSearchTerm] = useState<string>("");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [movieList, setMovieList] = useState<Movie[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState<string>("");
  const [trendingMovies, setTrendingMovies] = useState<Movie[]>([]);
  const [isLoadingTrending, setIsLoadingTrending] = useState<boolean>(false);
  const [trendingErrorMessage, setTrendingErrorMessage] =
    useState<boolean>(false);

  useDebounce(() => setDebouncedSearchTerm(searchTerm), 500, [searchTerm]);

  const fetchMovies = async (query: string = "") => {
    setIsLoading(true);
    try {
      const endpoint = query
        ? `${API_BASE_URL}/search/movie?query=${encodeURIComponent(query)}`
        : `${API_BASE_URL}/discover/movie?sort_by=popularity.desc`;
      const response = await fetch(endpoint, API_OPTIONS);
      if (!response.ok) {
        throw new Error("Failed to fetch movies");
      }
      const data = await response.json();

      if (data.response === "False") {
        setErrorMessage(data.Error || "Failed to fetch movies.");
        setMovieList([]);
        return;
      }

      setMovieList(data.results || []);
      if (query && data.results.length > 0) {
        await updateSearchCount(query, data.results[0]);
      }
    } catch (error) {
      console.error(`Error fetching movies: ${error}`);
      setErrorMessage("Error fetching movies. Please try again later.");
    } finally {
      setIsLoading(false);
    }
  };

  const loadTrendingMovies = async () => {
    setIsLoadingTrending(true);
    try {
      const movies = await getTrendingMovies();
      if (!movies) {
        setTrendingErrorMessage(true);
      } else {
        console.log("Trending Movies Data:", movies);
        const transformedMovies = movies.map((doc) => ({
          id: doc.movie_id,
          title: doc.search_term,
          vote_average: 0, // Placeholder value
          poster_path: "", // Not used, using poster_url instead
          release_date: "", // Placeholder value
          original_language: "", // Placeholder value
          poster_url: doc.poster_url,
          $id: Number(doc.$id),
        }));
        console.log("Transformed Movies:", transformedMovies);
        setTrendingMovies([...transformedMovies]);
      }
      setIsLoadingTrending(false);
    } catch (error) {
      console.error(`Error fetching trending movies: ${error}`);
      setTrendingErrorMessage(true);
      setIsLoadingTrending(false);
    }
  };

  useEffect(() => {
    setIsLoading(true);
    setErrorMessage("");
    fetchMovies(debouncedSearchTerm);
  }, [debouncedSearchTerm]);

  useEffect(() => {
    loadTrendingMovies();
  }, []);

  return (
    <ErrorBoundary>
      <main>
        <div className="pattern" />

        <div className="wrapper">
          <header>
            <img src="/logo.png" alt="logo" className="w-24 mx-auto block" />
            <img src="/hero.png" alt="hero-banner" />
            <h1>
              Find <span className="text-gradient">Movies</span> You'll Enjoy
              Without the Hassle
            </h1>
            <Search searchTerm={searchTerm} setSearchTerm={setSearchTerm} />
          </header>

          {isLoadingTrending ? (
            <Loader2 className="text-purple-400 my-2" />
          ) : trendingErrorMessage ? (
            <p className="text-red-500 font-semibold">
              Error fetching trending movies. Please try again later.
            </p>
          ) : (
            trendingMovies.length > 0 && (
              <section className="trending">
                <h2>Trending Movies</h2>

                <ul>
                  {trendingMovies.map((movie, index) => {
                    console.log("Rendering Movie:", movie);
                    return (
                      <li key={movie.$id}>
                        <p>{index + 1}</p>
                        <img src={movie.poster_url} alt={movie.title} />
                      </li>
                    );
                  })}
                </ul>
              </section>
            )
          )}

          <section className="all-movies">
            <h2>All Movies</h2>
            {isLoading ? (
              <Loader2 className="text-purple-400 my-2" />
            ) : errorMessage ? (
              <p className="text-red-500 font-semibold">{errorMessage}</p>
            ) : (
              <ul>
                {movieList.map((movie) => (
                  <MovieCard key={movie.id} movie={movie} />
                ))}
              </ul>
            )}
          </section>
        </div>
      </main>
    </ErrorBoundary>
  );
};

export default App;
