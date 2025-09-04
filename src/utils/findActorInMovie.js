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

// Function to check if actor is credited
const isActorCredited = (actor) => {
    if (!actor || !actor.name) return false;
    const name = actor.name.toLowerCase();
    return !name.includes('uncredited') && !name.includes('(uncredited)');
};

// Keep track of recently used movies
const recentMovies = [];
const HISTORY_LENGTH = 10;

const findPopularActorsInMovie = (movieData, movieImdbNumber) => {
    debugLog('Finding Popular Actors in Movie', movieImdbNumber);
    
    if (!movieData?.length || !movieImdbNumber) return [];
    
    const movie = movieData.find(m => m.movieIMDB === movieImdbNumber);
    if (!movie) return [];

    // Get all reference actors (from column B)
    const referenceActors = new Set(movieData
        .filter(m => m.referenceActor && m.referenceActorIMDB)
        .map(m => m.referenceActorIMDB)
    );

    // Find all CREDITED actors in the movie who are also reference actors
    const popularActors = [
        ...(movie.referenceActorIMDB && referenceActors.has(movie.referenceActorIMDB) 
            ? [{
                name: cleanDisplayName(movie.referenceActor),
                imdb: movie.referenceActorIMDB
              }] 
            : []
        ),
        ...movie.actors
            .filter(actor => referenceActors.has(actor.imdb) && isActorCredited(actor))
            .map(actor => ({
                name: cleanDisplayName(actor.name),
                imdb: actor.imdb
            }))
    ];

    debugLog('Popular CREDITED Actors Found in Movie', popularActors);
    return popularActors;
};

export const generateFindActorInMovieQuestion = (movieData, difficulty = 'easy') => {
    debugLog('Generating Find Actor Question', { difficulty });

    // Get movies based on difficulty
    const eligibleMovies = movieData.filter(movie => 
        movie.movieIMDB &&
        !recentMovies.includes(movie.movieIMDB) &&
        ((difficulty === 'easy' && movie.difficulty === 'Easy') ||
         (difficulty === 'hard' && ['Easy', 'Hard'].includes(movie.difficulty)))
    );
    
    debugLog('1. Eligible Movies', eligibleMovies);
    debugLog('2. Recent Movies History', recentMovies);

    // Select random movie
    const selectedMovie = getRandomItems(
        eligibleMovies.length > 0 ? eligibleMovies : movieData.filter(m => m.movieIMDB),
        1
    )[0];
    
    debugLog('3. Selected Movie', selectedMovie);

    // Update recent movies history
    recentMovies.push(selectedMovie.movieIMDB);
    if (recentMovies.length > HISTORY_LENGTH) {
        recentMovies.shift();
    }
    
    debugLog('4. Updated Recent Movies History', recentMovies);

    // Find popular CREDITED actors in the movie (List X)
    const moviePopularActors = findPopularActorsInMovie(movieData, selectedMovie.movieIMDB);
    debugLog('5. Popular CREDITED Actors in Movie (List X)', moviePopularActors);

    if (!moviePopularActors.length) {
        debugLog('No popular credited actors found in movie, trying again', null);
        return generateFindActorInMovieQuestion(movieData, difficulty);
    }

    // Select correct answer from movie's popular credited actors
    const correctActor = getRandomItems(moviePopularActors, 1)[0];
    debugLog('6. Selected Correct Actor', correctActor);

    // Get all reference actors who didn't appear in this movie (or were uncredited)
    const otherPopularActors = movieData
        .filter(movie => 
            movie.referenceActor &&
            movie.referenceActorIMDB &&
            !moviePopularActors.some(actor => actor.imdb === movie.referenceActorIMDB) &&
            ((difficulty === 'easy' && movie.difficulty === 'Easy') ||
             (difficulty === 'hard' && ['Easy', 'Hard'].includes(movie.difficulty)))
        )
        .map(movie => ({
            name: cleanDisplayName(movie.referenceActor),
            imdb: movie.referenceActorIMDB
        }));
    
    debugLog('7. Other Popular Actors', otherPopularActors);

    // Remove duplicates from other actors
    const uniqueOtherActors = otherPopularActors.reduce((unique, actor) => {
        if (!unique.some(u => u.imdb === actor.imdb)) {
            unique.push(actor);
        }
        return unique;
    }, []);

    // Select wrong answers
    const wrongAnswers = getRandomItems(uniqueOtherActors, 3);
    debugLog('8. Selected Wrong Answers', wrongAnswers);

    if (wrongAnswers.length < 3) {
        debugLog('Not enough wrong answers, trying again', null);
        return generateFindActorInMovieQuestion(movieData, difficulty);
    }

    // Combine and randomize choices
    const choices = getRandomItems([
        correctActor.name,
        ...wrongAnswers.map(actor => actor.name)
    ], 4);

    // Find character name if available
    const characterInfo = selectedMovie.actors.find(a => a.imdb === correctActor.imdb);
    const characterName = characterInfo?.characterName;

    const questionData = {
        question: `Which actor played in ${cleanDisplayName(selectedMovie.movieTitle)}${
            selectedMovie.year ? ` (${selectedMovie.year})` : ''
        }?`,
        choices,
        correctAnswer: correctActor.name,
        explanation: `${correctActor.name} played in ${cleanDisplayName(selectedMovie.movieTitle)}${
            selectedMovie.year ? ` (${selectedMovie.year})` : ''
        }${
            characterName ? ` as ${characterName}` : ''
        }.`
    };

    debugLog('9. Final Question Data', questionData);
    return questionData;
};