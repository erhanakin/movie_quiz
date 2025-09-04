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

// Keep track of recently used movies
const recentMovies = [];
const HISTORY_LENGTH = 10;

export const generateFindDirectorOfMovieQuestion = (movieData, difficulty = 'easy') => {
    debugLog('Generating Find Director Question', { difficulty });

    // Get movies with directors that are not recently used
    const eligibleMovies = movieData.filter(movie => 
        movie.movieIMDB &&
        movie.directors?.length > 0 &&
        !recentMovies.includes(movie.movieIMDB) &&
        ((difficulty === 'easy' && movie.difficulty === 'Easy') ||
         (difficulty === 'hard' && ['Easy', 'Hard'].includes(movie.difficulty)))
    );
    
    debugLog('1. Eligible Movies', eligibleMovies);
    debugLog('2. Recent Movies History', recentMovies);

    if (!eligibleMovies.length) {
        debugLog('No eligible movies left, clearing history', null);
        recentMovies.length = 0; // Clear history if we run out of movies
        return generateFindDirectorOfMovieQuestion(movieData, difficulty);
    }

    // Select random movie
    const selectedMovie = getRandomItems(eligibleMovies, 1)[0];
    debugLog('3. Selected Movie', selectedMovie);

    // Update recent movies history
    recentMovies.push(selectedMovie.movieIMDB);
    if (recentMovies.length > HISTORY_LENGTH) {
        recentMovies.shift();
    }

    // Get valid directors for the selected movie
    const movieDirectors = selectedMovie.directors.filter(d => d?.name && d?.imdb);
    
    if (!movieDirectors.length) {
        debugLog('No valid directors for selected movie, trying again', null);
        return generateFindDirectorOfMovieQuestion(movieData, difficulty);
    }

    // Select correct director
    const correctDirector = getRandomItems(movieDirectors, 1)[0];
    debugLog('5. Selected Correct Director', correctDirector);

    // Get all directors who didn't direct this movie
    const otherDirectors = movieData
        .flatMap(movie => movie.directors || [])
        .filter(director => 
            director?.name &&
            director?.imdb &&
            !movieDirectors.some(d => d.imdb === director.imdb)
        )
        .reduce((unique, director) => {
            if (!unique.some(d => d.imdb === director.imdb)) {
                unique.push(director);
            }
            return unique;
        }, []);

    if (otherDirectors.length < 3) {
        debugLog('Not enough other directors for wrong answers, trying again', null);
        return generateFindDirectorOfMovieQuestion(movieData, difficulty);
    }

    // Select wrong answers
    const wrongAnswers = getRandomItems(otherDirectors, 3);
    debugLog('7. Selected Wrong Answers', wrongAnswers);

    // Combine and randomize choices
    const choices = getRandomItems([
        correctDirector.name,
        ...wrongAnswers.map(director => director.name)
    ], 4);

    const questionData = {
        question: `Who directed ${selectedMovie.movieTitle}${
            selectedMovie.year ? ` (${selectedMovie.year})` : ''
        }?`,
        choices,
        correctAnswer: correctDirector.name,
        explanation: `${correctDirector.name} directed ${selectedMovie.movieTitle}${
            selectedMovie.year ? ` (${selectedMovie.year})` : ''
        }`
    };

    debugLog('8. Final Question Data', questionData);
    return questionData;
};