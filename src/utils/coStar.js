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

// Function to check if actor is credited
const isActorCredited = (actor) => {
    if (!actor || !actor.name) return false;
    const name = actor.name.toLowerCase();
    return !name.includes('uncredited') && !name.includes('(uncredited)');
};

const getUniqueActors = (movieData) => {
    debugLog('Getting Unique Actors from Column B', 'Start');
    
    const uniqueActors = [...new Set(movieData
        .filter(movie => movie.referenceActor && movie.referenceActorIMDB)
        .map(movie => movie.referenceActorIMDB))]
        .map(imdb => {
            const movie = movieData.find(m => m.referenceActorIMDB === imdb);
            return {
                name: normalizeUnicode(movie.referenceActor),
                imdb: movie.referenceActorIMDB,
                difficulty: movie.difficulty
            };
        });
        
    debugLog('Unique Actors Found', uniqueActors);
    return uniqueActors;
};

const findAllMoviesAndCoStars = (movieData, actorImdbNumber) => {
    debugLog('Finding ALL Movies and Co-stars for', actorImdbNumber);
    
    if (!movieData?.length || !actorImdbNumber) return { movies: [], coStarMap: new Map() };
    
    // Get ALL movies where the actor appears, either as main or supporting, no difficulty filter
    const movies = movieData.filter(movie => 
        movie.referenceActorIMDB === actorImdbNumber ||
        movie.actors.some(actor => actor.imdb === actorImdbNumber && isActorCredited(actor))
    );
    
    debugLog('ALL Movies Found (no filtering)', movies);
    
    const coStarMap = new Map();
    
    movies.forEach(movie => {
        const movieActors = new Set();
        
        // Add ALL co-stars, no filtering, but check if credited
        if (movie.referenceActorIMDB !== actorImdbNumber) {
            movieActors.add(JSON.stringify({ 
                name: normalizeUnicode(movie.referenceActor), 
                imdb: movie.referenceActorIMDB 
            }));
        }
        
        movie.actors.forEach(actor => {
            if (actor.imdb !== actorImdbNumber && isActorCredited(actor)) {
                movieActors.add(JSON.stringify({
                    name: normalizeUnicode(actor.name),
                    imdb: actor.imdb
                }));
            }
        });

        Array.from(movieActors).map(JSON.parse).forEach(actor => {
            if (!actor.imdb || !actor.name) return;
            
            if (!coStarMap.has(actor.imdb)) {
                coStarMap.set(actor.imdb, {
                    name: actor.name,
                    imdb: actor.imdb,
                    movies: new Set()
                });
            }
            
            coStarMap.get(actor.imdb).movies.add(
                JSON.stringify({ 
                    title: normalizeUnicode(movie.movieTitle), 
                    year: movie.year 
                })
            );
        });
    });
    
    const result = {
        movies,
        coStarMap: new Map(
            Array.from(coStarMap.entries()).map(([key, value]) => [
                key,
                {
                    ...value,
                    movies: Array.from(value.movies).map(JSON.parse)
                }
            ])
        )
    };
    
    debugLog('Final Co-stars Map (ALL movies)', Array.from(result.coStarMap.entries()));
    return result;
};

// Keep track of recently used main actors
const recentMainActors = [];
const HISTORY_LENGTH = 10;

const generateFindCoActorQuestion = (movieData, difficulty = 'easy') => {
    debugLog('Generating New Question', 'Start');
    
    const uniqueActors = getUniqueActors(movieData);
    debugLog('1. All Unique Actors', uniqueActors);
    
    // Apply difficulty filter only for selecting main actor
    const eligibleMainActors = uniqueActors.filter(actor => 
        !recentMainActors.includes(actor.imdb) &&
        ((difficulty === 'easy' && actor.difficulty === 'Easy') ||
         (difficulty === 'hard' && ['Easy', 'Hard'].includes(actor.difficulty)))
    );
    
    debugLog('2. Recent Main Actors History', recentMainActors);
    debugLog('3. Eligible Main Actors (not recently used)', eligibleMainActors);

    const mainActor = getRandomItems(
        eligibleMainActors.length > 0 ? eligibleMainActors : uniqueActors, 
        1
    )[0];
    
    debugLog('4. Selected Main Actor', mainActor);

    recentMainActors.push(mainActor.imdb);
    if (recentMainActors.length > HISTORY_LENGTH) {
        recentMainActors.shift();
    }
    
    debugLog('5. Updated Recent Actors History', recentMainActors);

    // Get ALL movies and co-stars without any filtering
    const { movies, coStarMap } = findAllMoviesAndCoStars(movieData, mainActor.imdb);
    debugLog('6. ALL Movies Found', movies);
    debugLog('7. ALL Co-stars Found', Array.from(coStarMap.entries()));

    // Filter co-stars only by Column B presence
    const referenceActors = new Set(movieData
        .filter(m => m.referenceActor && m.referenceActorIMDB)
        .map(m => m.referenceActorIMDB)
    );

    const eligibleCoStars = Array.from(coStarMap.values())
        .filter(coStar => referenceActors.has(coStar.imdb));
    
    debugLog('8. Eligible Co-stars (Column B only)', eligibleCoStars);
    
    if (!eligibleCoStars.length) {
        debugLog('No eligible co-stars found, trying again', null);
        return generateFindCoActorQuestion(movieData, difficulty);
    }

    const correctCoStar = getRandomItems(eligibleCoStars, 1)[0];
    debugLog('9. Selected Correct Co-star', correctCoStar);
    
    // Apply difficulty filter only for wrong answers
    const wrongAnswerPool = uniqueActors.filter(actor => 
        actor.imdb && 
        !coStarMap.has(actor.imdb) && 
        actor.imdb !== mainActor.imdb &&
        ((difficulty === 'easy' && actor.difficulty === 'Easy') ||
         (difficulty === 'hard' && ['Easy', 'Hard'].includes(actor.difficulty)))
    );
    
    debugLog('10. Wrong Answer Pool', wrongAnswerPool);
    const wrongAnswers = getRandomItems(wrongAnswerPool, 3);
    debugLog('11. Selected Wrong Answers', wrongAnswers);

    const choices = getRandomItems([...wrongAnswers.map(actor => actor.name), correctCoStar.name], 4);
    
    const questionData = {
        question: `Which actor played with ${mainActor.name} in a movie?`,
        choices,
        correctAnswer: correctCoStar.name,
        explanation: `${correctCoStar.name} played with ${mainActor.name} in: ${correctCoStar.movies
            .map(movie => `${movie.title}${movie.year ? ` (${movie.year})` : ''}`)
            .join(', ')}`
    };

    debugLog('12. Final Question Data', questionData);
    
    return questionData;
};

export { generateFindCoActorQuestion };