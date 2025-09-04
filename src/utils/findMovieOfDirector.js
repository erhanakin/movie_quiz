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

// Keep track of recently used directors
const recentDirectors = [];
const HISTORY_LENGTH = 10;

const findAllMoviesForDirector = (movieData, directorImdb) => {
    debugLog('Finding ALL Movies for Director', directorImdb);
    
    if (!movieData?.length || !directorImdb) return [];
    
    // Get all movies where the person appears as director
    const movies = movieData.filter(movie => 
        movie.directors?.some(director => director.imdb === directorImdb)
    );
    
    debugLog('ALL Movies Found for Director', movies);
    return movies;
};

export const generateFindMovieOfDirectorQuestion = (movieData, difficulty = 'easy') => {
    debugLog('Generating Find Movie Question', { difficulty });

    // Get all unique directors from movies with proper difficulty
    const uniqueDirectors = [...new Set(movieData
        .filter(movie => 
            ((difficulty === 'easy' && movie.difficulty === 'Easy') ||
             (difficulty === 'hard' && ['Easy', 'Hard'].includes(movie.difficulty)))
        )
        .flatMap(movie => movie.directors || [])
        .filter(director => director?.imdb && director?.name)
        .map(director => JSON.stringify({ name: director.name, imdb: director.imdb })))]
        .map(JSON.parse);
    
    debugLog('1. All Unique Directors', uniqueDirectors);

    // Filter out recently used directors
    const eligibleDirectors = uniqueDirectors.filter(director => 
        !recentDirectors.includes(director.imdb)
    );
    
    debugLog('2. Recent Directors History', recentDirectors);
    debugLog('3. Eligible Directors (not recently used)', eligibleDirectors);

    if (!eligibleDirectors.length) {
        debugLog('No eligible directors found, starting over', null);
        recentDirectors.length = 0; // Clear history if we run out of directors
        return generateFindMovieOfDirectorQuestion(movieData, difficulty);
    }

    // Select random director
    const selectedDirector = getRandomItems(eligibleDirectors, 1)[0];
    debugLog('4. Selected Director', selectedDirector);

    // Update recent directors history
    recentDirectors.push(selectedDirector.imdb);
    if (recentDirectors.length > HISTORY_LENGTH) {
        recentDirectors.shift();
    }

    // Find all movies for the selected director
    const directorMovies = findAllMoviesForDirector(movieData, selectedDirector.imdb);
    debugLog('6. All Director Movies', directorMovies);

    // Filter movies based on difficulty
    const eligibleDirectorMovies = directorMovies.filter(movie => 
        ((difficulty === 'easy' && movie.difficulty === 'Easy') ||
         (difficulty === 'hard' && ['Easy', 'Hard'].includes(movie.difficulty)))
    );
    
    if (!eligibleDirectorMovies.length) {
        debugLog('No eligible movies found for director, trying another', null);
        return generateFindMovieOfDirectorQuestion(movieData, difficulty);
    }

    // Select random correct movie
    const correctMovie = getRandomItems(eligibleDirectorMovies, 1)[0];
    debugLog('8. Selected Correct Movie', correctMovie);

    // Get all eligible movies (excluding director's movies)
    const eligibleOtherMovies = movieData.filter(movie => 
        movie.movieIMDB &&
        !directorMovies.some(m => m.movieIMDB === movie.movieIMDB) &&
        ((difficulty === 'easy' && movie.difficulty === 'Easy') ||
         (difficulty === 'hard' && ['Easy', 'Hard'].includes(movie.difficulty)))
    );
    
    if (eligibleOtherMovies.length < 3) {
        debugLog('Not enough movies for wrong answers, trying again', null);
        return generateFindMovieOfDirectorQuestion(movieData, difficulty);
    }

    // Select wrong answers
    const wrongAnswers = getRandomItems(eligibleOtherMovies, 3);
    debugLog('11. Selected Wrong Answers', wrongAnswers);

    // Combine and randomize choices
    const choices = getRandomItems([
        `${correctMovie.movieTitle}${correctMovie.year ? ` (${correctMovie.year})` : ''}`,
        ...wrongAnswers.map(movie => 
            `${movie.movieTitle}${movie.year ? ` (${movie.year})` : ''}`
        )
    ], 4);

    const questionData = {
        question: `Which movie was directed by ${selectedDirector.name}?`,
        choices,
        correctAnswer: `${correctMovie.movieTitle}${correctMovie.year ? ` (${correctMovie.year})` : ''}`,
        explanation: `${selectedDirector.name} directed ${correctMovie.movieTitle}${
            correctMovie.year ? ` (${correctMovie.year})` : ''}`
    };

    debugLog('12. Final Question Data', questionData);
    return questionData;
};