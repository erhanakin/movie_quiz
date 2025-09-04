import { generateFindCoActorQuestion } from './coStar';
import { generateChainCoActorQuestion } from './coStarChain';
import { generateFindMovieOfActorQuestion } from './findMovieOfActor';
import { generateFindActorInMovieQuestion } from './findActorInMovie';
import { generateFindMovieOfDirectorQuestion } from './findMovieOfDirector';
import { generateFindDirectorOfMovieQuestion } from './findDirectorOfMovie';
import { generateFindMovieByKeywordsQuestion } from './findMovieByKeywords';
import { generateFindMovieByPosterQuestion } from './findMovieByPoster';
import { generateOscarQuestion } from './oscarQuestions';

/**
 * Shuffles an array in place using Fisher-Yates algorithm.
 * @param {Array} array The array to shuffle.
 * @returns {Array} The shuffled array.
 */
const shuffleArray = (array) => {
    const newArray = [...array];
    for (let i = newArray.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [newArray[i], newArray[j]] = [newArray[j], newArray[i]];
    }
    return newArray;
};

/**
 * Generates a balanced list of questions, one from each category/subcategory.
 * FIXED: Better error handling, chain state management, and question validation
 * @param {Array} movieData The main movie dataset.
 * @param {Array} oscarData The dataset for Oscar winners.
 * @param {string} difficulty The selected difficulty ('easy' or 'hard').
 * @returns {Promise<Array>} A promise that resolves to a shuffled array of questions.
 */
export const getUltimateMixQuestions = async (movieData, oscarData, difficulty) => {
    console.log('Generating Ultimate Mix questions...', { difficulty, movieDataLength: movieData?.length, oscarDataLength: oscarData?.records?.length });
    
    if (!movieData || !oscarData) {
        console.error('Missing required data for Ultimate Mix');
        return [];
    }

    // Array to store successfully generated questions
    const validQuestions = [];
    
    // Define question generators with better error handling
    const questionGenerators = [
        {
            name: 'Find Co-Actor',
            generator: () => generateFindCoActorQuestion(movieData, difficulty),
            retries: 3
        },
        {
            name: 'Chain Co-Actor', 
            generator: () => generateChainCoActorQuestion(movieData, difficulty, null), // Always start fresh chain
            retries: 3
        },
        {
            name: 'Find Movie of Actor',
            generator: () => generateFindMovieOfActorQuestion(movieData, difficulty),
            retries: 3
        },
        {
            name: 'Find Actor in Movie',
            generator: () => generateFindActorInMovieQuestion(movieData, difficulty),
            retries: 3
        },
        {
            name: 'Find Movie of Director',
            generator: () => generateFindMovieOfDirectorQuestion(movieData, difficulty),
            retries: 3
        },
        {
            name: 'Find Director of Movie',
            generator: () => generateFindDirectorOfMovieQuestion(movieData, difficulty),
            retries: 3
        },
        {
            name: 'Find Movie by Keywords',
            generator: () => generateFindMovieByKeywordsQuestion(movieData, difficulty),
            retries: 3
        },
        {
            name: 'Find Movie by Poster',
            generator: async () => await generateFindMovieByPosterQuestion(movieData, difficulty),
            retries: 3,
            isAsync: true
        },
        {
            name: 'Oscar Question',
            generator: () => generateOscarQuestion(oscarData, difficulty),
            retries: 3
        }
    ];

    // Generate questions with retry logic
    for (const questionConfig of questionGenerators) {
        let question = null;
        let attempts = 0;
        
        while (!question && attempts < questionConfig.retries) {
            try {
                attempts++;
                console.log(`Generating ${questionConfig.name} (attempt ${attempts})`);
                
                if (questionConfig.isAsync) {
                    question = await questionConfig.generator();
                } else {
                    question = questionConfig.generator();
                }
                
                // Validate the question
                if (question && validateQuestion(question)) {
                    // Add category information for tracking
                    question.category = questionConfig.name;
                    validQuestions.push(question);
                    console.log(`✓ Successfully generated ${questionConfig.name}`);
                } else {
                    console.warn(`✗ Invalid question generated for ${questionConfig.name}, retrying...`);
                    question = null;
                }
            } catch (error) {
                console.error(`Error generating ${questionConfig.name} (attempt ${attempts}):`, error);
                question = null;
            }
        }
        
        if (!question) {
            console.warn(`Failed to generate question for ${questionConfig.name} after ${questionConfig.retries} attempts`);
        }
    }

    console.log(`Ultimate Mix generation complete: ${validQuestions.length}/9 questions generated`);
    
    if (validQuestions.length === 0) {
        console.error('No valid questions generated for Ultimate Mix');
        return [];
    }

    // Return the shuffled list of valid questions
    return shuffleArray(validQuestions);
};

/**
 * Validates that a question has all required properties
 * @param {Object} question The question object to validate
 * @returns {boolean} True if question is valid, false otherwise
 */
const validateQuestion = (question) => {
    if (!question || typeof question !== 'object') {
        return false;
    }
    
    // Check required properties
    const requiredProps = ['question', 'choices', 'correctAnswer', 'explanation'];
    for (const prop of requiredProps) {
        if (!question[prop]) {
            console.warn(`Question missing required property: ${prop}`);
            return false;
        }
    }
    
    // Validate choices array
    if (!Array.isArray(question.choices) || question.choices.length !== 4) {
        console.warn(`Question has invalid choices array: ${question.choices}`);
        return false;
    }
    
    // Validate that correct answer is in choices
    if (!question.choices.includes(question.correctAnswer)) {
        console.warn(`Correct answer not found in choices: ${question.correctAnswer}`);
        return false;
    }
    
    // Check for empty or invalid choice values
    for (const choice of question.choices) {
        if (!choice || typeof choice !== 'string' || choice.trim() === '') {
            console.warn(`Question has invalid choice: ${choice}`);
            return false;
        }
    }
    
    return true;
};