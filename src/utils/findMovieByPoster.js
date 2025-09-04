// src/utils/findMovieByPoster.js - FIXED DIFFICULTY FILTERING

const DEBUG = true;

const debugLog = (label, data) => {
    if (!DEBUG) return;
    console.group(label);
    console.log(data);
    console.groupEnd();
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

// Simple but effective shuffle function
const shuffle = (array) => {
    const newArray = [...array];
    for (let i = newArray.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * Date.now()) % (i + 1);
        [newArray[i], newArray[j]] = [newArray[j], newArray[i]];
    }
    return newArray;
};

const getRandomItems = (array, count) => {
    if (!array?.length) return [];
    return shuffle(array).slice(0, Math.min(count, array.length));
};

// Keep track of recently used posters (last 200)
const recentPosters = [];
const HISTORY_LENGTH = 200;

const checkPosterExists = async (basePath, imdbId) => {
    const extensions = ['jpg', 'jpeg', 'png'];
    
    for (const ext of extensions) {
        const path = `${basePath}/${imdbId}.${ext}`;
        
        try {
            const response = await fetch(path);
            if (response.ok) {
                return { exists: true, path, extension: ext };
            }
        } catch (error) {
            continue;
        }
    }
    
    return { exists: false, path: null, extension: null };
};

export const generateFindMovieByPosterQuestion = async (movieData, difficulty = 'easy') => {
    debugLog('Generating Find Movie by Poster Question', {
        difficulty,
        recentPostersCount: recentPosters.length,
        totalMovies: movieData.length
    });

    // FIXED: Include ALL movies marked as Easy OR Hard, exclude empty/null difficulty
    const eligibleMovies = movieData.filter(movie => 
        movie.movieIMDB && // Must have IMDB ID
        !recentPosters.includes(movie.movieIMDB) && // Not recently used
        // FIXED: Include both Easy and Hard, exclude empty/null difficulty
        (movie.difficulty === 'Easy' || movie.difficulty === 'Hard')
    );

    debugLog('1. Difficulty Filtering Results:', {
        totalMovies: movieData.length,
        eligibleMovies: eligibleMovies.length,
        filterRule: 'Easy OR Hard (excluding empty difficulty)',
        sampleEligible: eligibleMovies.slice(0, 3).map(m => ({
            title: m.movieTitle,
            year: m.year,
            difficulty: m.difficulty,
            imdb: m.movieIMDB
        }))
    });

    // If no eligible movies left, clear some history
    if (eligibleMovies.length < 4) {
        const removeCount = Math.floor(recentPosters.length / 2);
        recentPosters.splice(0, removeCount);
        debugLog('Cleared history, remaining:', recentPosters.length);
        return generateFindMovieByPosterQuestion(movieData, difficulty);
    }

    // Shuffle and try movies until we find one with a poster
    const shuffledMovies = shuffle(eligibleMovies);
    debugLog('2. Shuffled Movies for Poster Check:', {
        count: shuffledMovies.length,
        first5: shuffledMovies.slice(0, 5).map(m => ({
            title: m.movieTitle,
            year: m.year,
            difficulty: m.difficulty,
            imdb: m.movieIMDB
        }))
    });
    
    for (const movie of shuffledMovies) {
        debugLog('3. Checking Poster for Movie:', {
            title: movie.movieTitle,
            year: movie.year,
            difficulty: movie.difficulty,
            imdb: movie.movieIMDB
        });

        const posterCheck = await checkPosterExists('/assets/posters', movie.movieIMDB);

        if (posterCheck.exists) {
            debugLog('4. Poster Found! Generating Wrong Answers...', {
                movie: movie.movieTitle,
                posterPath: posterCheck.path
            });

            // FIXED: Get wrong answers from movies with Easy OR Hard difficulty (not empty)
            const wrongMovies = getRandomItems(
                eligibleMovies.filter(m => 
                    m.movieIMDB !== movie.movieIMDB &&
                    cleanDisplayName(m.movieTitle.toLowerCase()) !== cleanDisplayName(movie.movieTitle.toLowerCase()) && // PREVENT SAME TITLE
                    // FIXED: Include both Easy and Hard movies for wrong answers
                    (m.difficulty === 'Easy' || m.difficulty === 'Hard')
                ),
                3
            );

            debugLog('5. Wrong Movies Selected:', wrongMovies.map(m => ({
                title: m.movieTitle,
                year: m.year,
                difficulty: m.difficulty,
                imdb: m.movieIMDB
            })));

            if (wrongMovies.length < 3) {
                debugLog('Not enough valid wrong answers, trying next movie');
                continue;
            }

            // Update recent posters history
            recentPosters.push(movie.movieIMDB);
            if (recentPosters.length > HISTORY_LENGTH) {
                recentPosters.shift();
            }

            // Create answer choices with years
            const correctAnswer = `${cleanDisplayName(movie.movieTitle)}${movie.year ? ` (${movie.year})` : ''}`;
            const wrongAnswers = wrongMovies.map(m => 
                `${cleanDisplayName(m.movieTitle)}${m.year ? ` (${m.year})` : ''}`
            );

            // Double-check for any remaining duplicates and replace if found
            const allChoices = [correctAnswer, ...wrongAnswers];
            const uniqueChoices = [...new Set(allChoices)];
            
            if (uniqueChoices.length < 4) {
                debugLog('6. Duplicate titles detected even after filtering, trying another movie', {
                    originalChoices: allChoices,
                    uniqueChoices: uniqueChoices
                });
                continue;
            }

            const choices = shuffle(allChoices);

            const questionData = {
                question: "Which movie is shown in this poster?",
                posterPath: posterCheck.path,
                choices,
                correctAnswer,
                explanation: `This is the movie poster for ${correctAnswer}.`
            };

            debugLog('7. Final Question Generated:', {
                correctMovie: {
                    title: movie.movieTitle,
                    year: movie.year,
                    difficulty: movie.difficulty,
                    imdb: movie.movieIMDB
                },
                choices: choices,
                correctAnswer: correctAnswer,
                posterPath: posterCheck.path
            });
            
            return questionData;
        } else {
            debugLog('No poster found for:', {
                title: movie.movieTitle,
                imdb: movie.movieIMDB
            });
        }
    }

    // If we get here, we couldn't find a movie with a valid poster
    debugLog('8. No valid posters found in eligible movies, clearing history and trying again');
    recentPosters.length = 0;
    return generateFindMovieByPosterQuestion(movieData, difficulty);
};