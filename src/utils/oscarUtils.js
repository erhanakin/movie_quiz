// src/utils/oscarUtils.js
// Additional utilities for Oscar questions

export const OSCAR_CATEGORIES = {
    // Acting categories
    BEST_ACTOR: 'Actor in a Leading Role',
    BEST_ACTRESS: 'Actress in a Leading Role',
    BEST_SUPPORTING_ACTOR: 'Actor in a Supporting Role',
    BEST_SUPPORTING_ACTRESS: 'Actress in a Supporting Role',
    
    // Technical categories
    BEST_DIRECTOR: 'Directing',
    BEST_PICTURE: 'Best Picture',
    BEST_ANIMATED: 'Animated Feature Film',
    BEST_VFX: 'Visual Effects',
    BEST_CINEMATOGRAPHY: 'Cinematography',
    BEST_EDITING: 'Film Editing',
    BEST_SOUND: 'Sound Mixing',
    BEST_SCREENPLAY_ORIGINAL: 'Writing (Original Screenplay)',
    BEST_SCREENPLAY_ADAPTED: 'Writing (Adapted Screenplay)',
    
    // Music categories
    BEST_ORIGINAL_SCORE: 'Music (Original Score)',
    BEST_ORIGINAL_SONG: 'Music (Original Song)',
    
    // Other categories
    BEST_COSTUME: 'Costume Design',
    BEST_MAKEUP: 'Makeup and Hairstyling',
    BEST_PRODUCTION_DESIGN: 'Production Design',
    BEST_INTERNATIONAL: 'International Feature Film'
};

export const DISPLAY_NAMES = {
    [OSCAR_CATEGORIES.BEST_ACTOR]: 'Best Actor',
    [OSCAR_CATEGORIES.BEST_ACTRESS]: 'Best Actress',
    [OSCAR_CATEGORIES.BEST_SUPPORTING_ACTOR]: 'Best Supporting Actor',
    [OSCAR_CATEGORIES.BEST_SUPPORTING_ACTRESS]: 'Best Supporting Actress',
    [OSCAR_CATEGORIES.BEST_DIRECTOR]: 'Best Director',
    [OSCAR_CATEGORIES.BEST_PICTURE]: 'Best Picture',
    [OSCAR_CATEGORIES.BEST_ANIMATED]: 'Best Animated Feature Film',
    [OSCAR_CATEGORIES.BEST_VFX]: 'Best Visual Effects',
    [OSCAR_CATEGORIES.BEST_CINEMATOGRAPHY]: 'Best Cinematography',
    [OSCAR_CATEGORIES.BEST_EDITING]: 'Best Film Editing',
    [OSCAR_CATEGORIES.BEST_SOUND]: 'Best Sound Mixing',
    [OSCAR_CATEGORIES.BEST_SCREENPLAY_ORIGINAL]: 'Best Original Screenplay',
    [OSCAR_CATEGORIES.BEST_SCREENPLAY_ADAPTED]: 'Best Adapted Screenplay',
    [OSCAR_CATEGORIES.BEST_ORIGINAL_SCORE]: 'Best Original Score',
    [OSCAR_CATEGORIES.BEST_ORIGINAL_SONG]: 'Best Original Song',
    [OSCAR_CATEGORIES.BEST_COSTUME]: 'Best Costume Design',
    [OSCAR_CATEGORIES.BEST_MAKEUP]: 'Best Makeup and Hairstyling',
    [OSCAR_CATEGORIES.BEST_PRODUCTION_DESIGN]: 'Best Production Design',
    [OSCAR_CATEGORIES.BEST_INTERNATIONAL]: 'Best International Feature Film'
};

// Helper function to get clean person names (handles multiple names in one field)
export const cleanPersonName = (nameString) => {
    if (!nameString) return '';
    
    // Handle cases like "Producer 1, Producer 2 and Producer 3, Producers"
    // We want just the first name for questions
    const parts = nameString.split(',');
    return parts[0].trim();
};

// Helper function to format film title with year
export const formatFilmTitle = (film, year) => {
    if (!film) return '';
    return year ? `${film} (${year})` : film;
};

// Helper function to check if a year should have bias towards 1990+
export const shouldBiasTowards1990 = () => {
    return Math.random() < 0.7; // 70% chance to bias towards 1990+
};

// Helper function to get records in time range with bias
export const getRecordsWithTimeBias = (records, minYear = 1970) => {
    const after1970 = records.filter(record => record.year >= minYear);
    
    if (shouldBiasTowards1990()) {
        const after1990 = after1970.filter(record => record.year >= 1990);
        return after1990.length > 0 ? after1990 : after1970;
    }
    
    return after1970;
};

// Helper function to find unique films by year (handles duplicate titles)
export const getUniqueFilms = (records) => {
    const filmMap = new Map();
    
    records.forEach(record => {
        if (record.film && record.year) {
            const key = `${record.film}|${record.year}`;
            if (!filmMap.has(key)) {
                filmMap.set(key, {
                    film: record.film,
                    year: record.year,
                    displayTitle: formatFilmTitle(record.film, record.year)
                });
            }
        }
    });
    
    return Array.from(filmMap.values());
};

// Helper function to count nominations/wins by person
export const getPersonStats = (records, category = null) => {
    const stats = new Map();
    
    records
        .filter(record => !category || record.category === category)
        .forEach(record => {
            if (!record.names) return;
            
            const name = cleanPersonName(record.names);
            if (!stats.has(name)) {
                stats.set(name, {
                    name,
                    nominations: 0,
                    wins: 0,
                    categories: new Set(),
                    films: new Set()
                });
            }
            
            const personStats = stats.get(name);
            personStats.nominations += 1;
            personStats.categories.add(record.category);
            
            if (record.film) {
                personStats.films.add(formatFilmTitle(record.film, record.year));
            }
            
            if (record.status === 'Winner') {
                personStats.wins += 1;
            }
        });
    
    // Convert sets to arrays for easier use
    stats.forEach(stat => {
        stat.categories = Array.from(stat.categories);
        stat.films = Array.from(stat.films);
    });
    
    return stats;
};

// Helper function to get films with nomination counts
export const getFilmNominationCounts = (records, minYear = 1970) => {
    const filmStats = new Map();
    
    records
        .filter(record => record.year >= minYear && record.film)
        .forEach(record => {
            const key = formatFilmTitle(record.film, record.year);
            
            if (!filmStats.has(key)) {
                filmStats.set(key, {
                    film: record.film,
                    year: record.year,
                    displayTitle: key,
                    nominations: 0,
                    wins: 0,
                    categories: new Set()
                });
            }
            
            const stats = filmStats.get(key);
            stats.nominations += 1;
            stats.categories.add(record.category);
            
            if (record.status === 'Winner') {
                stats.wins += 1;
            }
        });
    
    // Convert categories set to array
    filmStats.forEach(stat => {
        stat.categories = Array.from(stat.categories);
    });
    
    return Array.from(filmStats.values());
};

// Helper function to validate question data
export const validateQuestion = (question) => {
    if (!question) return false;
    if (!question.question || typeof question.question !== 'string') return false;
    if (!question.choices || !Array.isArray(question.choices)) return false;
    if (question.choices.length !== 4) return false;
    if (!question.correctAnswer) return false;
    if (!question.choices.includes(question.correctAnswer)) return false;
    if (!question.explanation || typeof question.explanation !== 'string') return false;
    
    return true;
};

// Helper function to get smart wrong answers (similar time period, category, etc.)
export const getSmartWrongAnswers = (correctAnswer, allAnswers, options = {}) => {
    const {
        count = 3,
        excludeRecent = [],
        preferSimilarYear = null,
        preferSameCategory = null
    } = options;
    
    let candidates = allAnswers.filter(answer => 
        answer !== correctAnswer && 
        !excludeRecent.includes(answer)
    );
    
    // If we have year preference, sort by year proximity
    if (preferSimilarYear && candidates.length > count) {
        candidates = candidates.sort((a, b) => {
            const aYear = parseInt(a.match(/\((\d{4})\)/)?.[1] || '0');
            const bYear = parseInt(b.match(/\((\d{4})\)/)?.[1] || '0');
            
            const aDiff = Math.abs(aYear - preferSimilarYear);
            const bDiff = Math.abs(bYear - preferSimilarYear);
            
            return aDiff - bDiff;
        });
    }
    
    // Return random selection from candidates
    return candidates
        .sort(() => 0.5 - Math.random())
        .slice(0, count);
};

// Enhanced logging for development
export const oscarDebugLog = (category, data, level = 'info') => {
    if (process.env.NODE_ENV !== 'development') return;
    
    const timestamp = new Date().toISOString().split('T')[1].split('.')[0];
    const prefix = `[OSCAR-${level.toUpperCase()}] ${timestamp}`;
    
    console.group(`${prefix} ${category}`);
    
    if (typeof data === 'object') {
        console.table(data);
    } else {
        console.log(data);
    }
    
    console.groupEnd();
};

// Question difficulty analyzer
export const analyzeQuestionDifficulty = (question, oscarData) => {
    let difficulty = 0;
    
    // Year factor (older = harder)
    if (question.includes('19')) {
        const year = parseInt(question.match(/19\d{2}/)?.[0] || '1990');
        if (year < 1980) difficulty += 30;
        else if (year < 1990) difficulty += 20;
        else if (year < 2000) difficulty += 10;
    }
    
    // Category factor (technical categories = harder)
    const technicalCategories = [
        'Visual Effects', 'Cinematography', 'Film Editing', 
        'Sound', 'Makeup', 'Costume Design'
    ];
    
    if (technicalCategories.some(cat => question.includes(cat))) {
        difficulty += 15;
    }
    
    // Name recognition factor could be added here
    // (checking against popular actors/directors)
    
    return Math.min(100, difficulty);
};

export default {
    OSCAR_CATEGORIES,
    DISPLAY_NAMES,
    cleanPersonName,
    formatFilmTitle,
    shouldBiasTowards1990,
    getRecordsWithTimeBias,
    getUniqueFilms,
    getPersonStats,
    getFilmNominationCounts,
    validateQuestion,
    getSmartWrongAnswers,
    oscarDebugLog,
    analyzeQuestionDifficulty
};