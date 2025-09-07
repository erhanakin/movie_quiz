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

// ===========================================
// FIXED: findMovieOfDirector.js - Prevents duplicate movie titles
// ===========================================

const recentDirectors = [];
const DIRECTOR_HISTORY_LENGTH = 10;

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
    if (recentDirectors.length > DIRECTOR_HISTORY_LENGTH) {
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

    // FIXED: Create a set of director's movie keys to exclude duplicates
    const directorMovieKeys = new Set(directorMovies.map(createMovieKey));
    debugLog('9. Director Movie Keys to Exclude', Array.from(directorMovieKeys));

    // FIXED: Get all eligible movies (excluding director's movies) with duplicate prevention
    const eligibleOtherMovies = movieData.filter(movie => {
        const movieKey = createMovieKey(movie);
        return movie.movieIMDB &&
               !directorMovieKeys.has(movieKey) && // FIXED: Use title+year comparison
               ((difficulty === 'easy' && movie.difficulty === 'Easy') ||
                (difficulty === 'hard' && ['Easy', 'Hard'].includes(movie.difficulty)));
    });
    
    if (eligibleOtherMovies.length < 3) {
        debugLog('Not enough movies for wrong answers, trying again', null);
        return generateFindMovieOfDirectorQuestion(movieData, difficulty);
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
        return generateFindMovieOfDirectorQuestion(movieData, difficulty);
    }

    // Randomize the final choices
    const choices = getRandomItems(allChoices, 4);

    const questionData = {
        question: `Which movie was directed by ${selectedDirector.name}?`,
        choices,
        correctAnswer,
        explanation: `${selectedDirector.name} directed ${correctAnswer}`
    };

    debugLog('12. Final Question Data', questionData);
    return questionData;
};

// ===========================================
// ANALYSIS: Other generators that are already properly fixed
// ===========================================

/*
GOOD: findActorInMovie.js - Already has proper duplicate prevention:
- Line 129: Removes duplicates with: !unique.some(u => u.imdb === actor.imdb)
- This prevents the same actor appearing multiple times

GOOD: coStar.js - Already has proper duplicate prevention:
- Uses IMDB IDs for comparison, so same actors can't appear twice
- Wrong answers are filtered by: !coStarMap.has(actor.imdb)

GOOD: findMovieByKeywords.js - Already has proper duplicate prevention:
- Uses IMDB comparison: movie.movieIMDB !== selectedMovie.movieIMDB
- Includes years in all choices consistently

GOOD: findMovieByPoster.js - Already has proper duplicate prevention:
- Line 135: Explicit check for same titles: cleanDisplayName(m.movieTitle.toLowerCase()) !== cleanDisplayName(movie.movieTitle.toLowerCase())
- Line 154-162: Additional duplicate detection and retry logic

GOOD: oscarQuestions.js - Already has comprehensive duplicate prevention:
- Uses isSamePerson() function for name comparisons
- Multiple checks throughout to prevent duplicate nominees/winners
- Handles Unicode normalization properly

FIXED: The two generators above (findMovieOfActor.js and findMovieOfDirector.js) 
were the main culprits because they didn't account for:
1. Same movie titles with different years
2. Same movie titles appearing in different parts of the dataset
3. Proper title+year combination for uniqueness checking
*/