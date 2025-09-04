// src/utils/oscarQuestions.js - FULLY UPDATED VERSION WITH UNICODE FIXES AND MULTIPLE CORRECT ANSWER FIXES

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
    // Keep the original Unicode characters for display but ensure proper encoding
    return name.trim();
};

const getRandomItems = (array, count) => {
    if (!array?.length) return [];
    return [...array]
        .sort(() => 0.5 - Math.random())
        .slice(0, Math.min(count, array.length));
};

// Enhanced history tracking to ensure all question types are used before repeating
const questionHistory = {
    lastUsedTypes: [],
    maxHistory: 15, // Increased for better variety
    recentItems: {
        years: [],
        actors: [],
        directors: [],
        films: [],
        categories: []
    }
};

const HISTORY_LENGTH = 12; // Increased for better variety

const updateHistory = (type, item) => {
    if (!questionHistory.recentItems[type]) {
        questionHistory.recentItems[type] = [];
    }
    questionHistory.recentItems[type].push(item);
    if (questionHistory.recentItems[type].length > HISTORY_LENGTH) {
        questionHistory.recentItems[type].shift();
    }
};

const updateQuestionTypeHistory = (questionType) => {
    questionHistory.lastUsedTypes.push(questionType);
    if (questionHistory.lastUsedTypes.length > questionHistory.maxHistory) {
        questionHistory.lastUsedTypes.shift();
    }
};

// Helper function to normalize names (handle hyphens and variations)
const normalizeName = (name) => {
    if (!name) return '';
    return normalizeUnicode(name)
        .replace(/\s*-\s*/g, '-')  // Normalize hyphens
        .replace(/\s+/g, ' ')     // Normalize spaces
        .trim()
        .toLowerCase();
};

// Helper function to check if two names are the same person
const isSamePerson = (name1, name2) => {
    const normalized1 = normalizeName(name1);
    const normalized2 = normalizeName(name2);
    
    // Direct match
    if (normalized1 === normalized2) return true;
    
    // Check with/without hyphens
    const withoutHyphens1 = normalized1.replace(/-/g, ' ');
    const withoutHyphens2 = normalized2.replace(/-/g, ' ');
    
    return withoutHyphens1 === withoutHyphens2;
};

// Category mappings for cleaner question text
const CATEGORY_MAPPINGS = {
    'Actor in a Leading Role': 'Best Actor',
    'Actress in a Leading Role': 'Best Actress', 
    'Actor in a Supporting Role': 'Best Supporting Actor',
    'Actress in a Supporting Role': 'Best Supporting Actress',
    'Directing': 'Best Director',
    'Best Picture': 'Best Picture',
    'Animated Feature Film': 'Best Animated Feature Film',
    'Visual Effects': 'Best Visual Effects',
    'Cinematography': 'Best Cinematography',
    'Film Editing': 'Best Film Editing',
    'Sound Mixing': 'Best Sound Mixing',
    'Sound': 'Best Sound',
    'Writing (Original Screenplay)': 'Best Original Screenplay',
    'Writing (Adapted Screenplay)': 'Best Adapted Screenplay',
    'Music (Original Score)': 'Best Original Score',
    'Music (Original Song)': 'Best Original Song',
    'Costume Design': 'Best Costume Design',
    'Makeup and Hairstyling': 'Best Makeup and Hairstyling',
    'Production Design': 'Best Production Design',
    'Art Direction': 'Best Art Direction'
};

// Question type generators

// 1. Who won the Oscar for Best [Actor/Actress/Director] in [Year]? - ENHANCED
const generateWinnerByYearQuestion = (oscarData, difficulty = 'easy') => {
    debugLog('Generating Winner by Year Question', { difficulty });
    
    // Get eligible years (1970+, bias towards 1990+)
    const eligibleYears = [...new Set(oscarData.records
        .filter(record => record.year >= 1970 && record.status === 'Winner')
        .map(record => record.year))]
        .filter(year => !questionHistory.recentItems.years.includes(year));

    // Better bias implementation: 85% chance for 1990+, but fallback gracefully
    const recentYears = eligibleYears.filter(year => year >= 1990);
    const selectedYears = (Math.random() < 0.85 && recentYears.length > 0) 
        ? recentYears 
        : eligibleYears;
    
    if (selectedYears.length === 0) {
        // Clear some history if we're out of years
        questionHistory.recentItems.years = questionHistory.recentItems.years.slice(-5);
        return generateWinnerByYearQuestion(oscarData, difficulty);
    }
    
    const selectedYear = getRandomItems(selectedYears, 1)[0];
    updateHistory('years', selectedYear);

    // Get eligible categories
    const eligibleCategories = ['Actor in a Leading Role', 'Actress in a Leading Role', 'Directing'];
    const selectedCategory = getRandomItems(eligibleCategories, 1)[0];

    // Find winner for that year and category
    const winner = oscarData.records.find(record => 
        record.year === selectedYear && 
        record.category === selectedCategory && 
        record.status === 'Winner'
    );

    if (!winner) {
        return generateWinnerByYearQuestion(oscarData, difficulty);
    }

    // Get nominees from SAME YEAR and SAME CATEGORY first
    const sameYearNominees = oscarData.records
        .filter(record => 
            record.category === selectedCategory &&
            record.year === selectedYear &&
            record.status === 'Nominee' &&
            !isSamePerson(record.names, winner.names)
        )
        .map(record => cleanDisplayName(record.names));

    // Then add winners from OTHER YEARS if needed
    const otherYearWinners = oscarData.records
        .filter(record => 
            record.category === selectedCategory &&
            record.status === 'Winner' &&
            record.year !== selectedYear &&
            !isSamePerson(record.names, winner.names)
        )
        .map(record => cleanDisplayName(record.names));

    // Prioritize same year nominees, then fill with other year winners
    const wrongAnswerPool = [...sameYearNominees];
    if (wrongAnswerPool.length < 3) {
        wrongAnswerPool.push(...otherYearWinners);
    }

    if (wrongAnswerPool.length < 3) {
        return generateWinnerByYearQuestion(oscarData, difficulty);
    }

    const wrongChoices = getRandomItems(wrongAnswerPool, 3);
    const choices = getRandomItems([cleanDisplayName(winner.names), ...wrongChoices], 4);

    return {
        question: `Who won the Oscar for ${CATEGORY_MAPPINGS[selectedCategory]} in ${selectedYear}?`,
        choices,
        correctAnswer: cleanDisplayName(winner.names),
        explanation: `${cleanDisplayName(winner.names)} won the Oscar for ${CATEGORY_MAPPINGS[selectedCategory]} in ${selectedYear} for their performance in "${winner.film}".`
    };
};

// 2. Which film won the Oscar for Best Picture in [Year]? - ENHANCED
const generateBestPictureByYearQuestion = (oscarData, difficulty = 'easy') => {
    debugLog('Generating Best Picture by Year Question', { difficulty });
    
    const eligibleYears = [...new Set(oscarData.records
        .filter(record => 
            record.year >= 1970 && 
            record.category === 'Best Picture' && 
            record.status === 'Winner'
        )
        .map(record => record.year))]
        .filter(year => !questionHistory.recentItems.years.includes(year));

    // Better bias towards 1990+ (85%)
    const recentYears = eligibleYears.filter(year => year >= 1990);
    const selectedYears = (Math.random() < 0.85 && recentYears.length > 0) 
        ? recentYears 
        : eligibleYears;
    
    if (selectedYears.length === 0) {
        questionHistory.recentItems.years = questionHistory.recentItems.years.slice(-5);
        return generateBestPictureByYearQuestion(oscarData, difficulty);
    }
    
    const selectedYear = getRandomItems(selectedYears, 1)[0];
    updateHistory('years', selectedYear);

    const winner = oscarData.records.find(record => 
        record.year === selectedYear && 
        record.category === 'Best Picture' && 
        record.status === 'Winner'
    );

    if (!winner) {
        return generateBestPictureByYearQuestion(oscarData, difficulty);
    }

    // Get nominees from SAME YEAR first
    const sameYearNominees = oscarData.records
        .filter(record => 
            record.category === 'Best Picture' &&
            record.year === selectedYear &&
            record.status === 'Nominee' &&
            record.film !== winner.film
        )
        .map(record => record.film);

    // Then add winners from OTHER YEARS if needed
    const otherYearWinners = oscarData.records
        .filter(record => 
            record.category === 'Best Picture' &&
            record.status === 'Winner' &&
            record.year !== selectedYear &&
            record.film !== winner.film
        )
        .map(record => record.film);

    // Prioritize same year nominees, then fill with other year winners
    const wrongAnswerPool = [...sameYearNominees];
    if (wrongAnswerPool.length < 3) {
        wrongAnswerPool.push(...otherYearWinners);
    }

    if (wrongAnswerPool.length < 3) {
        return generateBestPictureByYearQuestion(oscarData, difficulty);
    }

    const wrongChoices = getRandomItems(wrongAnswerPool, 3);
    const choices = getRandomItems([winner.film, ...wrongChoices], 4);

    return {
        question: `Which film won the Oscar for Best Picture in ${selectedYear}?`,
        choices,
        correctAnswer: winner.film,
        explanation: `"${winner.film}" won the Academy Award for Best Picture in ${selectedYear}, beating other nominees in the category.`
    };
};

// 3. Which [actor/actress/director] has won the most Oscars IN SPECIFIC CATEGORY? - ENHANCED
const generateMostOscarsQuestion = (oscarData, difficulty = 'easy') => {
    debugLog('Generating Most Oscars Question', { difficulty });
    
    // Limited to ONLY these 5 categories
    const categories = [
        'Actor in a Leading Role', 
        'Actress in a Leading Role', 
        'Actor in a Supporting Role', 
        'Actress in a Supporting Role', 
        'Directing'
    ];
    const selectedCategory = getRandomItems(categories, 1)[0];
    
    // Count wins by person IN THIS SPECIFIC CATEGORY ONLY
    const winCounts = {};
    
    oscarData.records
        .filter(record => 
            record.category === selectedCategory && // ONLY this category
            record.status === 'Winner' &&
            record.year >= 1970
        )
        .forEach(record => {
            const normalized = normalizeName(record.names);
            const displayName = cleanDisplayName(record.names);
            if (!winCounts[normalized]) {
                winCounts[normalized] = {
                    count: 0,
                    displayName: displayName,
                    films: []
                };
            }
            winCounts[normalized].count += 1;
            winCounts[normalized].films.push(`${record.film} (${record.year})`);
        });

    // Get top winners
    const sortedWinners = Object.entries(winCounts)
        .sort(([,a], [,b]) => b.count - a.count)
        .filter(([normalizedName, data]) => !questionHistory.recentItems.actors.includes(data.displayName));

    if (sortedWinners.length < 4) {
        // Clear some history if needed
        questionHistory.recentItems.actors = questionHistory.recentItems.actors.slice(-6);
        return generateMostOscarsQuestion(oscarData, difficulty);
    }

    const topWinner = sortedWinners[0];
    const topWinCount = topWinner[1].count;
    
    // Make sure we have a clear winner (no ties for first place)
    const tiedWinners = sortedWinners.filter(([,data]) => data.count === topWinCount);
    if (tiedWinners.length > 1) {
        // If there's a tie, try again
        return generateMostOscarsQuestion(oscarData, difficulty);
    }

    // Get wrong answers from those with fewer wins IN THIS CATEGORY
    const wrongAnswerCandidates = sortedWinners
        .filter(([,data]) => data.count < topWinCount)
        .slice(0, 6);

    const wrongAnswers = getRandomItems(wrongAnswerCandidates, 3).map(([,data]) => data.displayName);
    
    updateHistory('actors', topWinner[1].displayName);

    const choices = getRandomItems([topWinner[1].displayName, ...wrongAnswers], 4);

    return {
        question: `Which person has won the most Oscars in the ${CATEGORY_MAPPINGS[selectedCategory]} category?`,
        choices,
        correctAnswer: topWinner[1].displayName,
        explanation: `${topWinner[1].displayName} has won ${topWinner[1].count} Oscar${topWinner[1].count > 1 ? 's' : ''} for ${CATEGORY_MAPPINGS[selectedCategory]} for: ${topWinner[1].films.join(', ')}.`
    };
};

// 5. Which of these films received the most Oscar nominations? - ENHANCED
const generateMostNominationsComparisonQuestion = (oscarData, difficulty = 'easy') => {
    debugLog('Generating Most Nominations Comparison Question', { difficulty });
    
    // Count BOTH wins AND nominees as total nominations
    const filmNominations = {};
    
    oscarData.records
        .filter(record => record.year >= 1970 && record.film)
        .forEach(record => {
            const key = `${record.film}|||${record.year}`; // Use separator to track year
            if (!filmNominations[key]) {
                filmNominations[key] = { 
                    film: record.film, 
                    year: record.year, 
                    count: 0, 
                    categories: [],
                    wins: 0,
                    nominees: 0
                };
            }
            // Count BOTH wins and nominees as nominations
            filmNominations[key].count += 1;
            filmNominations[key].categories.push(record.category);
            
            if (record.status === 'Winner') {
                filmNominations[key].wins += 1;
            } else {
                filmNominations[key].nominees += 1;
            }
        });

    const films = Object.values(filmNominations)
        .filter(film => film.count >= 5) // At least 5 total nominations
        .sort((a, b) => b.count - a.count);

    // Bias towards 1990+ (85%)
    const biasedFilms = Math.random() < 0.85 
        ? films.filter(film => film.year >= 1990)
        : films;

    const selectedFilms = getRandomItems(biasedFilms.length >= 4 ? biasedFilms : films, 4);
    
    if (selectedFilms.length < 4) {
        return generateMostNominationsComparisonQuestion(oscarData, difficulty);
    }

    const topFilm = selectedFilms.reduce((max, film) => film.count > max.count ? film : max);
    
    // FIXED: All choices now include year
    const choices = getRandomItems(
        selectedFilms.map(film => `${film.film} (${film.year})`), 
        4
    );

    return {
        question: 'Which of these films received the most Oscar nominations?',
        choices,
        correctAnswer: `${topFilm.film} (${topFilm.year})`,
        explanation: `"${topFilm.film}" (${topFilm.year}) received ${topFilm.count} Oscar nominations (${topFilm.wins} wins and ${topFilm.nominees} additional nominations) across categories including: ${topFilm.categories.slice(0, 5).join(', ')}${topFilm.categories.length > 5 ? ', and others' : ''}.`
    };
};

// 6. Which [actor/actress/director] has never won an Oscar in [SPECIFIC CATEGORY]? - ENHANCED
const generateNeverWonOscarQuestion = (oscarData, difficulty = 'easy') => {
    debugLog('Generating Never Won Oscar Question', { difficulty });
    
    // Limited to ONLY these 5 categories
    const categories = [
        'Actor in a Leading Role', 
        'Actress in a Leading Role', 
        'Actor in a Supporting Role', 
        'Actress in a Supporting Role', 
        'Directing'
    ];
    const selectedCategory = getRandomItems(categories, 1)[0];
    
    // Get all nominations and wins for THIS SPECIFIC CATEGORY ONLY
    const personStats = {};
    
    oscarData.records
        .filter(record => record.category === selectedCategory && record.names) // ONLY this category
        .forEach(record => {
            const normalized = normalizeName(record.names);
            const displayName = cleanDisplayName(record.names);
            if (!personStats[normalized]) {
                personStats[normalized] = { 
                    nominations: 0, 
                    wins: 0, 
                    displayName: displayName,
                    films: []
                };
            }
            personStats[normalized].nominations += 1;
            personStats[normalized].films.push(`${record.film} (${record.year})`);
            if (record.status === 'Winner') {
                personStats[normalized].wins += 1;
            }
        });

    // Find people with nominations but NO WINS in this category
    const neverWonners = Object.entries(personStats)
        .filter(([normalized, stats]) => stats.wins === 0 && stats.nominations >= 2)
        .sort(([,a], [,b]) => b.nominations - a.nominations)
        .filter(([normalized, stats]) => !questionHistory.recentItems.actors.includes(stats.displayName));

    if (neverWonners.length < 1) {
        return generateNeverWonOscarQuestion(oscarData, difficulty);
    }

    const correctAnswer = neverWonners[0];
    
    // Get wrong answers: people who HAVE won in this category
    const winners = Object.entries(personStats)
        .filter(([normalized, stats]) => stats.wins > 0)
        .map(([normalized, stats]) => stats.displayName);
    
    if (winners.length < 3) {
        return generateNeverWonOscarQuestion(oscarData, difficulty);
    }
    
    const wrongAnswers = getRandomItems(winners, 3);
    updateHistory('actors', correctAnswer[1].displayName);

    const choices = getRandomItems([correctAnswer[1].displayName, ...wrongAnswers], 4);

    return {
        question: `Which of the following has never won an Oscar in the ${CATEGORY_MAPPINGS[selectedCategory]} category?`,
        choices,
        correctAnswer: correctAnswer[1].displayName,
        explanation: `${correctAnswer[1].displayName} has ${correctAnswer[1].nominations} Oscar nominations for ${CATEGORY_MAPPINGS[selectedCategory]} but has never won. Nominations were for: ${correctAnswer[1].films.slice(0, 3).join(', ')}${correctAnswer[1].films.length > 3 ? ', and others' : ''}.`
    };
};

// 7. For which film did [Actor/Actress/Director] receive their first Oscar nomination in [CATEGORY]? - ENHANCED
const generateFirstNominationQuestion = (oscarData, difficulty = 'easy') => {
    debugLog('Generating First Nomination Question', { difficulty });
    
    // Limited to ONLY these 5 categories
    const categories = [
        'Actor in a Leading Role', 
        'Actress in a Leading Role', 
        'Actor in a Supporting Role', 
        'Actress in a Supporting Role', 
        'Directing'
    ];
    const selectedCategory = getRandomItems(categories, 1)[0];
    
    // Get people with multiple nominations IN THIS CATEGORY
    const actorNominations = {};
    
    oscarData.records
        .filter(record => record.category === selectedCategory && record.names && record.film)
        .forEach(record => {
            const normalized = normalizeName(record.names);
            const displayName = cleanDisplayName(record.names);
            if (!actorNominations[normalized]) {
                actorNominations[normalized] = {
                    displayName: displayName,
                    nominations: []
                };
            }
            actorNominations[normalized].nominations.push({
                year: record.year,
                film: record.film,
                status: record.status
            });
        });

    // Filter people with multiple nominations and find their first
    const eligiblePeople = Object.entries(actorNominations)
        .filter(([normalized, data]) => 
            data.nominations.length >= 2 && 
            !questionHistory.recentItems.actors.includes(data.displayName)
        )
        .map(([normalized, data]) => ({
            normalized,
            displayName: data.displayName,
            nominations: data.nominations.sort((a, b) => a.year - b.year),
            firstNomination: data.nominations.sort((a, b) => a.year - b.year)[0]
        }));

    if (eligiblePeople.length < 1) {
        return generateFirstNominationQuestion(oscarData, difficulty);
    }

    const selectedPerson = getRandomItems(eligiblePeople, 1)[0];
    updateHistory('actors', selectedPerson.displayName);

    // Get wrong answers from other films the person was nominated for (with years)
    const otherNominations = selectedPerson.nominations.slice(1).map(nom => `${nom.film} (${nom.year})`);
    
    // Add some random films from the same time period if needed (with years)
    const timePeriodFilms = oscarData.records
        .filter(record => 
            record.category === selectedCategory &&
            Math.abs(record.year - selectedPerson.firstNomination.year) <= 5 &&
            record.film !== selectedPerson.firstNomination.film &&
            !selectedPerson.nominations.some(nom => nom.film === record.film) // Not any of this person's films
        )
        .map(record => `${record.film} (${record.year})`);

    const allWrongAnswers = [...otherNominations, ...timePeriodFilms];
    
    // Remove duplicates
    const uniqueWrongAnswers = [...new Set(allWrongAnswers)];
    const wrongAnswers = getRandomItems(uniqueWrongAnswers, 3);

    if (wrongAnswers.length < 3) {
        return generateFirstNominationQuestion(oscarData, difficulty);
    }

    // FIXED: Include year in correct answer and all choices
    const correctAnswerWithYear = `${selectedPerson.firstNomination.film} (${selectedPerson.firstNomination.year})`;
    const choices = getRandomItems([correctAnswerWithYear, ...wrongAnswers], 4);

    return {
        question: `For which film did ${selectedPerson.displayName} receive their first Oscar nomination in the ${CATEGORY_MAPPINGS[selectedCategory]} category?`,
        choices,
        correctAnswer: correctAnswerWithYear,
        explanation: `${selectedPerson.displayName} received their first Oscar nomination for ${CATEGORY_MAPPINGS[selectedCategory]} in ${selectedPerson.firstNomination.year} for "${selectedPerson.firstNomination.film}". They have since received ${selectedPerson.nominations.length - 1} additional nomination${selectedPerson.nominations.length > 2 ? 's' : ''} in this category.`
    };
};

// 8. In which category did [Movie Title] win an Oscar? - FIXED
const generateMovieWinCategoryQuestion = (oscarData, difficulty = 'easy') => {
    debugLog('Generating Movie Win Category Question', { difficulty });
    
    // Get movies that won at least one Oscar from 1970+
    const movieWins = oscarData.records
        .filter(record => 
            record.year >= 1970 && 
            record.status === 'Winner' && 
            record.film &&
            !questionHistory.recentItems.films.includes(record.film)
        );

    // Bias towards 1990+ (85%)
    const biasedMovies = Math.random() < 0.85 
        ? movieWins.filter(record => record.year >= 1990)
        : movieWins;

    const selectedMovie = getRandomItems(biasedMovies.length ? biasedMovies : movieWins, 1)[0];
    
    if (!selectedMovie) {
        return generateMovieWinCategoryQuestion(oscarData, difficulty);
    }

    updateHistory('films', selectedMovie.film);

    // Get ALL categories this movie won in that year
    const movieWinCategories = oscarData.records
        .filter(record => 
            record.film === selectedMovie.film &&
            record.year === selectedMovie.year &&
            record.status === 'Winner'
        )
        .map(record => record.category);

    // If movie won multiple Oscars, pick one randomly
    const correctCategory = getRandomItems(movieWinCategories, 1)[0];

    // FIXED: Get wrong answer categories that this movie did NOT win
    const commonCategories = [
        'Best Picture',
        'Actor in a Leading Role',
        'Actress in a Leading Role', 
        'Actor in a Supporting Role',
        'Actress in a Supporting Role',
        'Directing',
        'Visual Effects',
        'Cinematography',
        'Film Editing',
        'Sound Mixing',
        'Sound',
        'Writing (Original Screenplay)',
        'Writing (Adapted Screenplay)',
        'Music (Original Score)',
        'Music (Original Song)',
        'Costume Design',
        'Makeup and Hairstyling',
        'Production Design',
        'Art Direction',
        'Animated Feature Film'
    ];

    // CRITICAL FIX: Filter out ALL categories this movie won, not just the selected one
    const availableWrongAnswers = commonCategories.filter(cat => 
        !movieWinCategories.includes(cat)
    );

    if (availableWrongAnswers.length < 3) {
        // If not enough wrong answers available, try another movie
        debugLog('Not enough wrong categories available for movie, trying another', {
            movie: selectedMovie.film,
            wonCategories: movieWinCategories,
            availableWrong: availableWrongAnswers
        });
        return generateMovieWinCategoryQuestion(oscarData, difficulty);
    }

    const wrongAnswers = getRandomItems(availableWrongAnswers, 3);
    const choices = getRandomItems([
        CATEGORY_MAPPINGS[correctCategory] || correctCategory,
        ...wrongAnswers.map(cat => CATEGORY_MAPPINGS[cat] || cat)
    ], 4);

    return {
        question: `In which category did "${selectedMovie.film}" (${selectedMovie.year}) win an Oscar?`,
        choices,
        correctAnswer: CATEGORY_MAPPINGS[correctCategory] || correctCategory,
        explanation: `"${selectedMovie.film}" (${selectedMovie.year}) won the Academy Award for ${CATEGORY_MAPPINGS[correctCategory] || correctCategory}. ${movieWinCategories.length > 1 ? `The film won a total of ${movieWinCategories.length} Oscars that year.` : 'This was the film\'s only Oscar win that year.'}`
    };
};

// 9. Which film won Best Visual Effects in [Year]? - ENHANCED
const generateVisualEffectsWinnerQuestion = (oscarData, difficulty = 'easy') => {
    debugLog('Generating Visual Effects Winner Question', { difficulty });
    
    const visualEffectsWinners = oscarData.records
        .filter(record => 
            record.year >= 1970 &&
            record.category === 'Visual Effects' &&
            record.status === 'Winner' &&
            !questionHistory.recentItems.years.includes(record.year)
        );

    // Bias towards 1990+ (85%)
    const biasedWinners = Math.random() < 0.85 
        ? visualEffectsWinners.filter(record => record.year >= 1990)
        : visualEffectsWinners;

    const selectedWinner = getRandomItems(biasedWinners.length ? biasedWinners : visualEffectsWinners, 1)[0];
    
    if (!selectedWinner) {
        return generateVisualEffectsWinnerQuestion(oscarData, difficulty);
    }

    updateHistory('years', selectedWinner.year);

    // Get nominees from SAME YEAR first  
    const sameYearNominees = oscarData.records
        .filter(record => 
            record.category === 'Visual Effects' &&
            record.year === selectedWinner.year &&
            record.status === 'Nominee' &&
            record.film !== selectedWinner.film
        )
        .map(record => record.film);

    // Then add winners from OTHER YEARS if needed
    const otherYearWinners = oscarData.records
        .filter(record => 
            record.category === 'Visual Effects' &&
            record.status === 'Winner' &&
            record.year !== selectedWinner.year &&
            record.film !== selectedWinner.film
        )
        .map(record => record.film);

    // Prioritize same year nominees, then fill with other year winners
    const wrongAnswerPool = [...sameYearNominees];
    if (wrongAnswerPool.length < 3) {
        wrongAnswerPool.push(...otherYearWinners);
    }

    const wrongChoices = getRandomItems(wrongAnswerPool, 3);
    const choices = getRandomItems([selectedWinner.film, ...wrongChoices], 4);

    return {
        question: `Which film won the Oscar for Best Visual Effects in ${selectedWinner.year}?`,
        choices,
        correctAnswer: selectedWinner.film,
        explanation: `"${selectedWinner.film}" won the Academy Award for Best Visual Effects in ${selectedWinner.year}, recognized for its outstanding achievement in visual effects artistry.`
    };
};

// 10. In [Year], which film won the most Oscars overall? - FIXED
const generateMostOscarsInYearQuestion = (oscarData, difficulty = 'easy') => {
    debugLog('Generating Most Oscars in Year Question', { difficulty });
    
    // Get years from 1970+ with multiple films winning Oscars
    const yearlyWins = oscarData.records
        .filter(record => 
            record.year >= 1970 && 
            record.status === 'Winner' && 
            record.film &&
            !questionHistory.recentItems.years.includes(record.year)
        )
        .reduce((yearly, record) => {
            if (!yearly[record.year]) {
                yearly[record.year] = {};
            }
            if (!yearly[record.year][record.film]) {
                yearly[record.year][record.film] = {
                    count: 0,
                    categories: []
                };
            }
            yearly[record.year][record.film].count += 1;
            yearly[record.year][record.film].categories.push(record.category);
            return yearly;
        }, {});

    // Find years where at least one film won multiple Oscars and there are at least 4 different films
    const eligibleYears = Object.entries(yearlyWins)
        .filter(([year, films]) => {
            const maxWins = Math.max(...Object.values(films).map(f => f.count));
            const filmCount = Object.keys(films).length;
            return maxWins >= 2 && filmCount >= 4; // Need clear winner and enough films for options
        })
        .map(([year]) => parseInt(year));

    // Bias towards 1990+ (85%)
    const biasedYears = Math.random() < 0.85 
        ? eligibleYears.filter(year => year >= 1990)
        : eligibleYears;

    const selectedYear = getRandomItems(biasedYears.length ? biasedYears : eligibleYears, 1)[0];
    
    if (!selectedYear) {
        return generateMostOscarsInYearQuestion(oscarData, difficulty);
    }

    updateHistory('years', selectedYear);

    // Find the film with most wins that year
    const yearFilms = yearlyWins[selectedYear];
    const sortedFilms = Object.entries(yearFilms)
        .sort(([,a], [,b]) => b.count - a.count);
    
    const topFilm = sortedFilms[0];
    const topWinCount = topFilm[1].count;
    
    // Make sure there's a clear winner (no ties for first place)
    const tiedFilms = sortedFilms.filter(([,data]) => data.count === topWinCount);
    if (tiedFilms.length > 1) {
        // If there's a tie for first place, try another year
        return generateMostOscarsInYearQuestion(oscarData, difficulty);
    }

    // Get other films from that year with fewer wins
    const otherFilms = sortedFilms
        .filter(([filmName, data]) => filmName !== topFilm[0] && data.count < topWinCount)
        .map(([filmName]) => filmName);

    if (otherFilms.length < 3) {
        return generateMostOscarsInYearQuestion(oscarData, difficulty);
    }

    const wrongAnswers = getRandomItems(otherFilms, 3);
    const choices = getRandomItems([topFilm[0], ...wrongAnswers], 4);

    return {
        question: `In ${selectedYear}, which film won the most Oscars overall?`,
        choices,
        correctAnswer: topFilm[0],
        explanation: `"${topFilm[0]}" won ${topFilm[1].count} Oscar${topFilm[1].count > 1 ? 's' : ''} in ${selectedYear}, winning in the following categories: ${topFilm[1].categories.map(cat => CATEGORY_MAPPINGS[cat] || cat).join(', ')}.`
    };
};

// 11. Who won Best Supporting Actor/Actress for [MOVIE]? - FIXED
const generateSupportingActorByMovieQuestion = (oscarData, difficulty = 'easy') => {
    debugLog('Generating Supporting Actor by Movie Question', { difficulty });
    
    // Select category (Supporting Actor or Supporting Actress)
    const categories = ['Actor in a Supporting Role', 'Actress in a Supporting Role'];
    const selectedCategory = getRandomItems(categories, 1)[0];
    
    // Get all supporting actor/actress wins from 1970+
    const supportingWins = oscarData.records
        .filter(record => 
            record.year >= 1970 &&
            record.category === selectedCategory &&
            record.status === 'Winner' &&
            record.film &&
            !questionHistory.recentItems.films.includes(record.film)
        );

    // Bias towards 1990+ (85%)
    const biasedWins = Math.random() < 0.85 
        ? supportingWins.filter(record => record.year >= 1990)
        : supportingWins;

    const selectedWin = getRandomItems(biasedWins.length ? biasedWins : supportingWins, 1)[0];
    
    if (!selectedWin) {
        return generateSupportingActorByMovieQuestion(oscarData, difficulty);
    }

    updateHistory('films', selectedWin.film);

    // FIXED: Get wrong answers from supporting actors who won for DIFFERENT movies in the SAME category
    const wrongAnswers = oscarData.records
        .filter(record => 
            record.category === selectedCategory &&
            record.status === 'Winner' &&
            !isSamePerson(record.names, selectedWin.names) &&
            record.film !== selectedWin.film // Different movie
        )
        .map(record => cleanDisplayName(record.names));

    // Remove duplicates
    const uniqueWrongAnswers = [...new Set(wrongAnswers)];
    
    if (uniqueWrongAnswers.length < 3) {
        return generateSupportingActorByMovieQuestion(oscarData, difficulty);
    }

    const wrongChoices = getRandomItems(uniqueWrongAnswers, 3);
    const choices = getRandomItems([cleanDisplayName(selectedWin.names), ...wrongChoices], 4);

    const categoryName = selectedCategory.includes('Actor') ? 'Supporting Actor' : 'Supporting Actress';

    return {
        question: `Who won the Oscar for Best ${categoryName} in "${selectedWin.film}" (${selectedWin.year})?`,
        choices,
        correctAnswer: cleanDisplayName(selectedWin.names),
        explanation: `${cleanDisplayName(selectedWin.names)} won the Academy Award for Best ${categoryName} for their performance in "${selectedWin.film}" (${selectedWin.year}).`
    };
};

// 12. For which movie did [Actor/Actress] win Best Supporting Actor/Actress? - FIXED
const generateMovieForSupportingActorQuestion = (oscarData, difficulty = 'easy') => {
    debugLog('Generating Movie for Supporting Actor Question', { difficulty });
    
    // Get all supporting actor/actress wins from 1970+
    const supportingWins = oscarData.records
        .filter(record => 
            record.year >= 1970 &&
            (record.category === 'Actor in a Supporting Role' || 
             record.category === 'Actress in a Supporting Role') &&
            record.status === 'Winner' &&
            record.film &&
            record.names &&
            !questionHistory.recentItems.actors.includes(cleanDisplayName(record.names))
        );

    // Bias towards 1990+ (85%)
    const biasedWins = Math.random() < 0.85 
        ? supportingWins.filter(record => record.year >= 1990)
        : supportingWins;

    const selectedWin = getRandomItems(biasedWins.length ? biasedWins : supportingWins, 1)[0];
    
    if (!selectedWin) {
        return generateMovieForSupportingActorQuestion(oscarData, difficulty);
    }

    updateHistory('actors', cleanDisplayName(selectedWin.names));

    const categoryName = selectedWin.category.includes('Actor') ? 'Supporting Actor' : 'Supporting Actress';

    // FIXED: Get wrong answers from movies where OTHER people won supporting roles in SAME category
    const wrongAnswerMovies = oscarData.records
        .filter(record => 
            record.category === selectedWin.category && // Same category
            record.status === 'Winner' &&
            record.film !== selectedWin.film &&
            !isSamePerson(record.names, selectedWin.names) && // Different person
            Math.abs(record.year - selectedWin.year) <= 10 // Similar time period
        )
        .map(record => `${record.film} (${record.year})`);

    // Remove duplicates
    const uniqueWrongMovies = [...new Set(wrongAnswerMovies)];
    
    if (uniqueWrongMovies.length < 3) {
        return generateMovieForSupportingActorQuestion(oscarData, difficulty);
    }

    const wrongChoices = getRandomItems(uniqueWrongMovies, 3);
    const correctChoice = `${selectedWin.film} (${selectedWin.year})`;
    const choices = getRandomItems([correctChoice, ...wrongChoices], 4);

    return {
        question: `For which movie did ${cleanDisplayName(selectedWin.names)} win the Oscar for Best ${categoryName}?`,
        choices,
        correctAnswer: correctChoice,
        explanation: `${cleanDisplayName(selectedWin.names)} won the Academy Award for Best ${categoryName} for their performance in "${selectedWin.film}" (${selectedWin.year}).`
    };
};

// 13. Which animated feature film won Oscar in [YEAR]? - ENHANCED
const generateAnimatedFeatureWinnerQuestion = (oscarData, difficulty = 'easy') => {
    debugLog('Generating Animated Feature Winner Question', { difficulty });
    
    const animatedWinners = oscarData.records
        .filter(record => 
            record.year >= 2001 && // Animated Feature category started in 2001
            record.category === 'Animated Feature Film' &&
            record.status === 'Winner' &&
            !questionHistory.recentItems.years.includes(record.year)
        );

    if (animatedWinners.length === 0) {
        // If no animated winners found, try clearing history
        questionHistory.recentItems.years = [];
        return generateAnimatedFeatureWinnerQuestion(oscarData, difficulty);
    }

    // Bias towards recent years (2010+) - 85%
    const biasedWinners = Math.random() < 0.85 
        ? animatedWinners.filter(record => record.year >= 2010)
        : animatedWinners;

    const selectedWinner = getRandomItems(biasedWinners.length ? biasedWinners : animatedWinners, 1)[0];
    
    if (!selectedWinner) {
        return generateAnimatedFeatureWinnerQuestion(oscarData, difficulty);
    }

    updateHistory('years', selectedWinner.year);

    // Get wrong answers from nominees of the same year first
    const sameYearNominees = oscarData.records
        .filter(record => 
            record.category === 'Animated Feature Film' &&
            record.year === selectedWinner.year &&
            record.status === 'Nominee' &&
            record.film !== selectedWinner.film
        )
        .map(record => record.film);

    // Then add winners from other years if needed
    const otherYearWinners = oscarData.records
        .filter(record => 
            record.category === 'Animated Feature Film' &&
            record.status === 'Winner' &&
            record.year !== selectedWinner.year &&
            record.film !== selectedWinner.film
        )
        .map(record => record.film);

    // Prioritize same year nominees, then fill with other year winners
    const wrongAnswerPool = [...sameYearNominees];
    if (wrongAnswerPool.length < 3) {
        wrongAnswerPool.push(...otherYearWinners);
    }

    const wrongChoices = getRandomItems(wrongAnswerPool, 3);
    const choices = getRandomItems([selectedWinner.film, ...wrongChoices], 4);

    return {
        question: `Which animated feature film won the Oscar for Best Animated Feature Film in ${selectedWinner.year}?`,
        choices,
        correctAnswer: selectedWinner.film,
        explanation: `"${selectedWinner.film}" won the Academy Award for Best Animated Feature Film in ${selectedWinner.year}.`
    };
};

// Main generator function with improved question type cycling
export const generateOscarQuestion = (oscarData, difficulty = 'easy') => {
    debugLog('Generating Oscar Question', { difficulty });
    
    if (!oscarData || !oscarData.records || oscarData.records.length === 0) {
        throw new Error('Oscar data not available');
    }

    // Available question types (13 types total)
    const questionTypes = [
        { name: 'winnerByYear', generator: generateWinnerByYearQuestion, weight: 15 },
        { name: 'bestPictureByYear', generator: generateBestPictureByYearQuestion, weight: 12 },
        { name: 'mostOscars', generator: generateMostOscarsQuestion, weight: 10 },
        { name: 'mostNominationsComparison', generator: generateMostNominationsComparisonQuestion, weight: 8 },
        { name: 'neverWonOscar', generator: generateNeverWonOscarQuestion, weight: 8 },
        { name: 'firstNomination', generator: generateFirstNominationQuestion, weight: 8 },
        { name: 'movieWinCategory', generator: generateMovieWinCategoryQuestion, weight: 12 },
        { name: 'visualEffectsWinner', generator: generateVisualEffectsWinnerQuestion, weight: 9 },
        { name: 'mostOscarsInYear', generator: generateMostOscarsInYearQuestion, weight: 8 },
        { name: 'supportingActorByMovie', generator: generateSupportingActorByMovieQuestion, weight: 10 },
        { name: 'movieForSupportingActor', generator: generateMovieForSupportingActorQuestion, weight: 10 },
        { name: 'animatedFeatureWinner', generator: generateAnimatedFeatureWinnerQuestion, weight: 9 }
    ];

    // Improved type selection to ensure variety
    let availableTypes = questionTypes.filter(type => 
        !questionHistory.lastUsedTypes.slice(-5).includes(type.name) // Check last 5 types
    );

    // If all recent types have been used, allow any type
    if (availableTypes.length === 0) {
        availableTypes = questionTypes;
        // Clear some history to ensure future variety
        questionHistory.lastUsedTypes = questionHistory.lastUsedTypes.slice(-8);
    }

    // Select question type based on weights
    const totalWeight = availableTypes.reduce((sum, type) => sum + type.weight, 0);
    let random = Math.random() * totalWeight;
    
    for (const questionType of availableTypes) {
        random -= questionType.weight;
        if (random <= 0) {
            try {
                const question = questionType.generator(oscarData, difficulty);
                if (question && question.choices && question.choices.length === 4) {
                    // Update question type history
                    updateQuestionTypeHistory(questionType.name);
                    debugLog('Generated Question', question);
                    return question;
                }
            } catch (error) {
                debugLog('Error generating question, trying another type', error);
            }
        }
    }

    // Fallback to simple winner question
    const fallbackQuestion = generateWinnerByYearQuestion(oscarData, difficulty);
    updateQuestionTypeHistory('winnerByYear');
    return fallbackQuestion;
};