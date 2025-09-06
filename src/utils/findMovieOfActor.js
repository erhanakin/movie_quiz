// FIXED: findMovieOfActor.js - Prevents duplicate movie titles
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

// Keep track of recently used actors
const recentActors = [];
const HISTORY_LENGTH = 10;

const findAllMoviesForActor = (movieData, actorImdbNumber) => {
    debugLog('Finding ALL Movies for Actor', actorImdbNumber);
    
    if (!movieData?.length || !actorImdbNumber) return [];
    
    // Get all movies where the actor appears (either as reference or in actors list)
    const movies = movieData.filter(movie => 
        movie.referenceActorIMDB === actorImdbNumber ||
        movie.actors.some(actor => actor.imdb === actorImdbNumber)
    );
    
    debugLog('ALL Movies Found for Actor', movies);
    return movies;
};

// NEW: Function to create unique movie title with year for comparison
const createMovieKey = (movie) => {
    return `${movie.movieTitle.toLowerCase().trim()}${movie.year ? `_${movie.year}` : ''}`;
};

// NEW: Function to format movie display name
const formatMovieDisplay = (movie) => {
    return `${movie.movieTitle}${movie.year ? ` (${movie.year})` : ''}`;
};

export const generateFindMovieOfActorQuestion = (movieData, difficulty = 'easy') => {
    debugLog('Generating Find Movie Question', { difficulty });

    // Get all unique actors from column B/C
    const uniqueActors = [...new Set(movieData
        .filter(movie => movie.referenceActor && movie.referenceActorIMDB)
        .map(movie => ({
            name: movie.referenceActor,
            imdb: movie.referenceActorIMDB,
            difficulty: movie.difficulty
        })))];
    
    debugLog('1. All Unique Actors', uniqueActors);

    // Filter out recently used actors and apply difficulty filter
    const eligibleActors = uniqueActors.filter(actor => 
        !recentActors.includes(actor.imdb) &&
        ((difficulty === 'easy' && actor.difficulty === 'Easy') ||
         (difficulty === 'hard' && ['Easy', 'Hard'].includes(actor.difficulty)))
    );
    
    debugLog('2. Recent Actors History', recentActors);
    debugLog('3. Eligible Actors (not recently used)', eligibleActors);

    // Select random actor
    const selectedActor = getRandomItems(
        eligibleActors.length > 0 ? eligibleActors : uniqueActors, 
        1
    )[0];
    
    debugLog('4. Selected Actor', selectedActor);

    // Update recent actors history
    recentActors.push(selectedActor.imdb);
    if (recentActors.length > HISTORY_LENGTH) {
        recentActors.shift();
    }
    
    debugLog('5. Updated Recent Actors History', recentActors);

    // Find all movies for the selected actor (List A)
    const actorMovies = findAllMoviesForActor(movieData, selectedActor.imdb);
    debugLog('6. All Actor Movies (List A)', actorMovies);

    // Filter movies based on difficulty
    const eligibleActorMovies = actorMovies.filter(movie => 
        ((difficulty === 'easy' && movie.difficulty === 'Easy') ||
         (difficulty === 'hard' && ['Easy', 'Hard'].includes(movie.difficulty)))
    );
    
    debugLog('7. Eligible Actor Movies', eligibleActorMovies);

    if (!eligibleActorMovies.length) {
        debugLog('No eligible movies found, trying again', null);
        return generateFindMovieOfActorQuestion(movieData, difficulty);
    }

    // Select random correct movie
    const correctMovie = getRandomItems(eligibleActorMovies, 1)[0];
    debugLog('8. Selected Correct Movie', correctMovie);

    // FIXED: Create a set of actor's movie keys to exclude duplicates
    const actorMovieKeys = new Set(actorMovies.map(createMovieKey));
    debugLog('9. Actor Movie Keys to Exclude', Array.from(actorMovieKeys));

    // Get all movies from column D/E (List B) - FIXED: Exclude movies with same title+year
    const allMovies = movieData.filter(movie => movie.movieIMDB);
    const eligibleOtherMovies = allMovies.filter(movie => {
        const movieKey = createMovieKey(movie);
        return !actorMovieKeys.has(movieKey) && // FIXED: Use title+year comparison
               ((difficulty === 'easy' && movie.difficulty === 'Easy') ||
                (difficulty === 'hard' && ['Easy', 'Hard'].includes(movie.difficulty)));
    });
    
    debugLog('10. Eligible Other Movies (List C)', eligibleOtherMovies);

    if (eligibleOtherMovies.length < 3) {
        debugLog('Not enough other movies for wrong answers, trying again', null);
        return generateFindMovieOfActorQuestion(movieData, difficulty);
    }

    // Select wrong answers
    const wrongAnswers = getRandomItems(eligibleOtherMovies, 3);
    debugLog('11. Selected Wrong Answers', wrongAnswers);

    // FIXED: Create choices and verify uniqueness
    const correctAnswer = formatMovieDisplay(correctMovie);
    const wrongChoices = wrongAnswers.map(formatMovieDisplay);
    
    // FIXED: Double-check for duplicates and replace if found
    const allChoices = [correctAnswer, ...wrongChoices];
    const uniqueChoices = [...new Set(allChoices)];
    
    if (uniqueChoices.length < 4) {
        debugLog('Duplicate movie titles detected, trying again', {
            originalChoices: allChoices,
            uniqueChoices: uniqueChoices
        });
        return generateFindMovieOfActorQuestion(movieData, difficulty);
    }

    // Randomize the final choices
    const choices = getRandomItems(allChoices, 4);

    const questionData = {
        question: `Which movie did ${selectedActor.name} play in?`,
        choices,
        correctAnswer,
        explanation: `${selectedActor.name} played in ${correctAnswer}${correctMovie.characterName ? ` as ${correctMovie.characterName}` : ''}`
    };

    debugLog('12. Final Question Data', questionData);
    return questionData;
};
