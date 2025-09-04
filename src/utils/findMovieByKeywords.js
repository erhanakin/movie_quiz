// src/utils/findMovieByKeywords.js

const DEBUG = true;

const debugLog = (label, data) => {
    if (!DEBUG) return;
    console.group(label);
    console.log(data);
    console.groupEnd();
};

const getRandomItems = (array, count) => {
    if (!array?.length) return [];
    return [...array]
        .sort(() => 0.5 - Math.random())
        .slice(0, Math.min(count, array.length));
};

// Function to normalize Unicode characters properly
const normalizeUnicode = (str) => {
    if (!str) return '';
    return str.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
};

// Function to properly handle and display Unicode names
const cleanDisplayName = (name) => {
    if (!name) return '';
    return name.trim();
};

// Keep track of recently used movies (last 100)
const recentMovies = [];
const HISTORY_LENGTH = 100;

const getMovieKeywords = (movie) => {
    // Check if movie has keywords array
    if (!movie?.keywords || !Array.isArray(movie.keywords)) return [];
    // Filter out empty or null keywords
    return movie.keywords.filter(keyword => keyword && keyword.trim() !== '');
};

const calculateKeywordSimilarity = (keywords1, keywords2) => {
    if (!keywords1?.length || !keywords2?.length) return 0;
    
    const commonKeywords = keywords1.filter(k1 => 
        keywords2.some(k2 => k2.toLowerCase() === k1.toLowerCase())
    );
    
    return commonKeywords.length;
};

const findDissimilarMovies = (movieData, targetMovie, count) => {
    debugLog('Finding Dissimilar Movies', { 
        targetMovie: cleanDisplayName(targetMovie.movieTitle), 
        targetKeywords: getMovieKeywords(targetMovie),
        count 
    });
    
    const targetKeywords = getMovieKeywords(targetMovie);
    debugLog('Target Movie Keywords', targetKeywords);

    // Get all movies with keywords except the target movie
    const moviesWithKeywords = movieData.filter(movie => 
        movie.movieIMDB !== targetMovie.movieIMDB && 
        getMovieKeywords(movie).length > 0
    );

    debugLog('Movies with keywords count:', moviesWithKeywords.length);

    // Calculate similarity scores
    const movieScores = moviesWithKeywords.map(movie => ({
        movie,
        similarity: calculateKeywordSimilarity(targetKeywords, getMovieKeywords(movie))
    }));

    // Sort by similarity (ascending) and then randomize within each similarity level
    const sortedMovies = movieScores
        .sort((a, b) => a.similarity - b.similarity)
        .reduce((acc, curr) => {
            if (!acc[curr.similarity]) {
                acc[curr.similarity] = [];
            }
            acc[curr.similarity].push(curr.movie);
            return acc;
        }, {});

    // Prioritize movies with lowest similarity (0 common keywords)
    const dissimilarMovies = [];
    let similarityLevel = 0;

    while (dissimilarMovies.length < count && similarityLevel <= 5) {
        if (sortedMovies[similarityLevel]) {
            const randomMovies = getRandomItems(sortedMovies[similarityLevel], 
                count - dissimilarMovies.length);
            dissimilarMovies.push(...randomMovies);
        }
        similarityLevel++;
    }

    debugLog('Selected Dissimilar Movies', dissimilarMovies.map(m => ({
        title: cleanDisplayName(m.movieTitle),
        keywords: getMovieKeywords(m)
    })));

    return dissimilarMovies;
};

export const generateFindMovieByKeywordsQuestion = (movieData, difficulty = 'easy') => {
    debugLog('Generating Movie by Keywords Question', { 
        difficulty,
        totalMovies: movieData.length,
        moviesWithKeywords: movieData.filter(m => getMovieKeywords(m).length > 0).length,
        recentlyUsedCount: recentMovies.length
    });

    // Get movies with keywords based on difficulty, excluding recently used ones
    const eligibleMovies = movieData.filter(movie => 
        movie.movieIMDB &&
        !recentMovies.includes(movie.movieIMDB) &&
        getMovieKeywords(movie).length >= 2 && // Require at least 2 keywords
        ((difficulty === 'easy' && movie.difficulty === 'Easy') ||
         (difficulty === 'hard' && ['Easy', 'Hard'].includes(movie.difficulty)))
    );
    
    debugLog('1. Eligible Movies', {
        count: eligibleMovies.length,
        sample: eligibleMovies.slice(0, 3).map(m => ({
            title: cleanDisplayName(m.movieTitle),
            keywords: getMovieKeywords(m)
        }))
    });

    // If no eligible movies are left, clear some old history
    if (!eligibleMovies.length) {
        // Remove the oldest 50% of the history to free up more movies
        const removeCount = Math.floor(recentMovies.length / 2);
        recentMovies.splice(0, removeCount);
        debugLog('Cleared old history, remaining history:', recentMovies.length);
        return generateFindMovieByKeywordsQuestion(movieData, difficulty);
    }

    // Select random movie
    const selectedMovie = getRandomItems(eligibleMovies, 1)[0];
    debugLog('3. Selected Movie', {
        title: cleanDisplayName(selectedMovie.movieTitle),
        keywords: getMovieKeywords(selectedMovie)
    });

    // Update recent movies history (maintain last 100)
    recentMovies.push(selectedMovie.movieIMDB);
    if (recentMovies.length > HISTORY_LENGTH) {
        recentMovies.shift(); // Remove oldest movie
    }

    // Get wrong answer choices
    const wrongMovies = findDissimilarMovies(movieData, selectedMovie, 3);
    if (wrongMovies.length < 3) {
        debugLog('Not enough dissimilar movies found, trying again', null);
        return generateFindMovieByKeywordsQuestion(movieData, difficulty);
    }

    // FIXED: Add years to all choices
    const choices = getRandomItems([
        `${cleanDisplayName(selectedMovie.movieTitle)}${selectedMovie.year ? ` (${selectedMovie.year})` : ''}`,
        ...wrongMovies.map(movie => 
            `${cleanDisplayName(movie.movieTitle)}${movie.year ? ` (${movie.year})` : ''}`
        )
    ], 4);

    const keywords = getMovieKeywords(selectedMovie);
    const questionData = {
        question: "Which movie matches these keywords:",
        keywords: keywords.join(", "),
        choices,
        correctAnswer: `${cleanDisplayName(selectedMovie.movieTitle)}${selectedMovie.year ? ` (${selectedMovie.year})` : ''}`,
        explanation: `${cleanDisplayName(selectedMovie.movieTitle)}${
            selectedMovie.year ? ` (${selectedMovie.year})` : ''
        } is characterized by: ${keywords.join(", ")}.`
    };

    debugLog('4. Final Question Data', questionData);
    return questionData;
};