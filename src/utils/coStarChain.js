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

const getUniqueActors = (movieData) => {
    debugLog('Getting Unique Actors from Column B', 'Start');
    
    const uniqueActors = [...new Set(movieData
        .filter(movie => movie.referenceActor && movie.referenceActorIMDB)
        .map(movie => movie.referenceActorIMDB))]
        .map(imdb => {
            const movie = movieData.find(m => m.referenceActorIMDB === imdb);
            return {
                name: movie.referenceActor,
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
    
    // Get ALL movies where the actor appears
    const movies = movieData.filter(movie => 
        movie.referenceActorIMDB === actorImdbNumber ||
        movie.actors.some(actor => actor.imdb === actorImdbNumber)
    );
    
    debugLog('ALL Movies Found (no filtering)', movies);
    
    const coStarMap = new Map();
    
    movies.forEach(movie => {
        const movieActors = new Set();
        
        if (movie.referenceActorIMDB !== actorImdbNumber) {
            movieActors.add(JSON.stringify({ 
                name: movie.referenceActor, 
                imdb: movie.referenceActorIMDB 
            }));
        }
        
        movie.actors.forEach(actor => {
            if (actor.imdb !== actorImdbNumber) {
                movieActors.add(JSON.stringify(actor));
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
                    title: movie.movieTitle, 
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
    
    debugLog('Final Co-stars Map', Array.from(result.coStarMap.entries()));
    return result;
};

// Track used actors in chain
const usedActorsInChain = new Set();

export const generateChainCoActorQuestion = (movieData, difficulty = 'easy', chainState = null) => {
    debugLog('Generating Chain Question', { difficulty, chainState });
    
    let mainActor;
    let isNewChain = false;

    if (chainState?.currentActor) {
        mainActor = chainState.currentActor;
        debugLog('Using Previous Answer as Main Actor', mainActor);
    } else {
        // Start new chain
        const uniqueActors = getUniqueActors(movieData);
        debugLog('Starting New Chain - Eligible Main Actors', uniqueActors);
        
        const eligibleMainActors = uniqueActors.filter(actor => 
            ((difficulty === 'easy' && actor.difficulty === 'Easy') ||
             (difficulty === 'hard' && ['Easy', 'Hard'].includes(actor.difficulty)))
        );
        debugLog('Filtered by Difficulty', eligibleMainActors);
        
        mainActor = getRandomItems(eligibleMainActors, 1)[0];
        usedActorsInChain.clear();
        isNewChain = true;
        
        debugLog('Selected Initial Main Actor', mainActor);
    }

    usedActorsInChain.add(mainActor.imdb);
    debugLog('Used Actors in Chain', Array.from(usedActorsInChain));

    // Get co-stars for the main actor
    const { movies, coStarMap } = findAllMoviesAndCoStars(movieData, mainActor.imdb);
    debugLog('Movies Found for Main Actor', movies);
    debugLog('All Potential Co-stars', Array.from(coStarMap.values()));

    // Filter co-stars that are reference actors and haven't been used in the chain
    const referenceActors = new Set(movieData
        .filter(m => m.referenceActor && m.referenceActorIMDB)
        .map(m => m.referenceActorIMDB)
    );
    debugLog('Reference Actors (Column B)', Array.from(referenceActors));

    const eligibleCoStars = Array.from(coStarMap.values())
        .filter(coStar => 
            referenceActors.has(coStar.imdb) && 
            !usedActorsInChain.has(coStar.imdb)
        );
    
    debugLog('Eligible Co-stars (Not Used in Chain)', eligibleCoStars);
    
    if (!eligibleCoStars.length) {
        debugLog('No eligible co-stars found, attempting to reuse chain pattern', null);
        
        try {
            // Store the chain pattern before clearing
            const chainPattern = Array.from(usedActorsInChain);
            
            if (chainPattern.length > 0) {
                debugLog('Reusing existing chain pattern', chainPattern);
                // Clear used actors to allow reuse
                usedActorsInChain.clear();
                
                // Find the first actor from the pattern
                const firstActorMovie = movieData.find(m => m.referenceActorIMDB === chainPattern[0]);
                
                if (firstActorMovie && firstActorMovie.referenceActor) {
                    const nextActor = {
                        name: firstActorMovie.referenceActor,
                        imdb: chainPattern[0]
                    };
                    debugLog('Continuing chain with actor', nextActor);
                    return generateChainCoActorQuestion(movieData, difficulty, { currentActor: nextActor });
                }
            }
            
            // If we get here, something went wrong with reusing the pattern
            throw new Error('Failed to reuse chain pattern');
            
        } catch (error) {
            // If anything goes wrong, start a completely new chain
            debugLog('Error reusing chain pattern, starting new chain', error);
            usedActorsInChain.clear();
            return generateChainCoActorQuestion(movieData, difficulty, null);
        }
    }

    const correctCoStar = getRandomItems(eligibleCoStars, 1)[0];
    debugLog('Selected Correct Co-star', correctCoStar);
    
    // Get wrong answers from actors not in the chain
    const wrongAnswerPool = getUniqueActors(movieData)
        .filter(actor => 
            actor.imdb && 
            !coStarMap.has(actor.imdb) && 
            actor.imdb !== mainActor.imdb &&
            !usedActorsInChain.has(actor.imdb) &&
            ((difficulty === 'easy' && actor.difficulty === 'Easy') ||
             (difficulty === 'hard' && ['Easy', 'Hard'].includes(actor.difficulty)))
        );
    
    debugLog('Wrong Answer Pool', wrongAnswerPool);
    
    const wrongAnswers = getRandomItems(wrongAnswerPool, 3);
    debugLog('Selected Wrong Answers', wrongAnswers);

    const choices = getRandomItems([...wrongAnswers.map(actor => actor.name), correctCoStar.name], 4);
    debugLog('Final Randomized Choices', choices);

    const questionData = {
        question: `Which actor played with ${mainActor.name} in a movie?`,
        choices,
        correctAnswer: correctCoStar.name,
        explanation: `${correctCoStar.name} played with ${mainActor.name} in: ${correctCoStar.movies
            .map(movie => `${movie.title}${movie.year ? ` (${movie.year})` : ''}`)
            .join(', ')}`,
        isNewChain,
        nextActor: {
            name: correctCoStar.name,
            imdb: correctCoStar.imdb
        }
    };
    
    debugLog('Final Question Data', questionData);
    return questionData;
};