// src/config/databaseConfig.js
// MANDATORY DATABASE LOADING CONFIGURATION

export const DATABASE_CONFIG = {
  // PART FILES: Add or remove parts here - the system will automatically load ALL parts
  parts: [
    'movie_data_part1.json',
    'movie_data_part2.json', 
    'movie_data_part3.json',
    'movie_data_part4.json'
    // TO ADD MORE PARTS: Simply add them to this array
    // 'movie_data_part5.json',
    // 'movie_data_part6.json',
    // etc...
  ],
  
  // BASE PATH: Where the database files are located
  basePath: '/assets/',
  
  // VALIDATION SETTINGS: Adjust these based on your actual data
  validation: {
    // Minimum records per part (set to 0 to disable per-part validation)
    minRecordsPerPart: 100,
    
    // Minimum total records across all parts (CRITICAL - app won't start if less)
    expectedTotalMinimum: 1000,
    
    // Whether ALL parts must load successfully (RECOMMENDED: true)
    requireAllParts: true,
    
    // Whether to validate data structure of sample records
    validateDataStructure: true,
    
    // Maximum allowed duplicate percentage (0.1 = 10%)
    maxDuplicatePercentage: 0.1,
    
    // Whether to warn about parts with fewer than expected records
    warnOnLowRecordCount: true
  },
  
  // LOADING BEHAVIOR
  loading: {
    // Whether to continue loading other parts if one fails (for diagnosis)
    continueOnError: true,
    
    // Whether to show detailed loading progress
    showDetailedProgress: true,
    
    // Whether to log comprehensive loading statistics
    enableDetailedLogging: true
  },
  
  // EXPECTED DATA STRUCTURE (for validation)
  expectedFields: {
    // Fields that should exist in movie records
    movieFields: ['movieTitle', 'movieIMDB'],
    
    // Fields that are recommended but not required
    recommendedFields: ['year', 'difficulty', 'actors', 'directors'],
    
    // Fields that should be arrays
    arrayFields: ['actors', 'directors', 'keywords']
  }
}

// UTILITY FUNCTIONS

/**
 * Get the total number of parts to load
 */
export const getTotalParts = () => DATABASE_CONFIG.parts.length

/**
 * Get a specific part filename by index
 */
export const getPartFilename = (index) => DATABASE_CONFIG.parts[index]

/**
 * Get the full path for a specific part
 */
export const getPartPath = (partName) => `${DATABASE_CONFIG.basePath}${partName}`

/**
 * Check if a field is required for validation
 */
export const isRequiredField = (fieldName) => {
  return DATABASE_CONFIG.expectedFields.movieFields.includes(fieldName)
}

/**
 * Check if a field should be an array
 */
export const shouldBeArray = (fieldName) => {
  return DATABASE_CONFIG.expectedFields.arrayFields.includes(fieldName)
}

/**
 * Validate a single record structure
 */
export const validateRecordStructure = (record, partName, recordIndex) => {
  const errors = []
  
  if (!record || typeof record !== 'object') {
    errors.push(`Record ${recordIndex} is not an object`)
    return errors
  }
  
  // Check required fields
  DATABASE_CONFIG.expectedFields.movieFields.forEach(field => {
    if (!record[field]) {
      errors.push(`Record ${recordIndex} missing required field: ${field}`)
    }
  })
  
  // Check array fields
  DATABASE_CONFIG.expectedFields.arrayFields.forEach(field => {
    if (record[field] && !Array.isArray(record[field])) {
      errors.push(`Record ${recordIndex} field '${field}' should be an array`)
    }
  })
  
  return errors
}

/**
 * Generate a summary of database configuration
 */
export const getConfigSummary = () => {
  return {
    totalParts: DATABASE_CONFIG.parts.length,
    partNames: DATABASE_CONFIG.parts,
    basePath: DATABASE_CONFIG.basePath,
    requireAllParts: DATABASE_CONFIG.validation.requireAllParts,
    minRecordsPerPart: DATABASE_CONFIG.validation.minRecordsPerPart,
    expectedTotalMinimum: DATABASE_CONFIG.validation.expectedTotalMinimum,
    validationEnabled: DATABASE_CONFIG.validation.validateDataStructure
  }
}

// ENHANCED VALIDATION FUNCTIONS

/**
 * Comprehensive part validation
 */
export const validatePart = (partData, partName) => {
  const validationResult = {
    isValid: true,
    errors: [],
    warnings: [],
    stats: {
      recordCount: 0,
      validRecords: 0,
      invalidRecords: 0,
      emptyFields: 0
    }
  }
  
  // Basic checks
  if (!Array.isArray(partData)) {
    validationResult.isValid = false
    validationResult.errors.push(`${partName} is not an array`)
    return validationResult
  }
  
  if (partData.length === 0) {
    validationResult.isValid = false
    validationResult.errors.push(`${partName} is empty`)
    return validationResult
  }
  
  validationResult.stats.recordCount = partData.length
  
  // Check minimum record count
  if (DATABASE_CONFIG.validation.minRecordsPerPart > 0 && 
      partData.length < DATABASE_CONFIG.validation.minRecordsPerPart) {
    if (DATABASE_CONFIG.validation.warnOnLowRecordCount) {
      validationResult.warnings.push(
        `${partName} has only ${partData.length} records (expected minimum: ${DATABASE_CONFIG.validation.minRecordsPerPart})`
      )
    }
  }
  
  // Validate individual records
  if (DATABASE_CONFIG.validation.validateDataStructure) {
    partData.forEach((record, index) => {
      const recordErrors = validateRecordStructure(record, partName, index)
      if (recordErrors.length > 0) {
        validationResult.stats.invalidRecords++
        validationResult.errors.push(...recordErrors.map(err => `${partName}: ${err}`))
      } else {
        validationResult.stats.validRecords++
      }
    })
    
    // If too many invalid records, mark as invalid
    const invalidPercentage = validationResult.stats.invalidRecords / validationResult.stats.recordCount
    if (invalidPercentage > 0.1) { // More than 10% invalid
      validationResult.isValid = false
      validationResult.errors.push(
        `${partName} has too many invalid records: ${validationResult.stats.invalidRecords}/${validationResult.stats.recordCount} (${Math.round(invalidPercentage * 100)}%)`
      )
    }
  }
  
  return validationResult
}

/**
 * Validate the entire database after loading
 */
export const validateDatabase = (allData, loadingResults) => {
  const validation = {
    isValid: true,
    errors: [],
    warnings: [],
    summary: {
      totalRecords: allData.length,
      totalParts: loadingResults.length,
      successfulParts: loadingResults.filter(r => r.loaded).length,
      failedParts: loadingResults.filter(r => !r.loaded).length,
      duplicateRecords: 0,
      uniqueRecords: 0
    }
  }
  
  // Check if all parts loaded
  if (DATABASE_CONFIG.validation.requireAllParts && validation.summary.failedParts > 0) {
    validation.isValid = false
    validation.errors.push(
      `Not all parts loaded: ${validation.summary.failedParts}/${validation.summary.totalParts} parts failed`
    )
  }
  
  // Check minimum total records
  if (allData.length < DATABASE_CONFIG.validation.expectedTotalMinimum) {
    validation.isValid = false
    validation.errors.push(
      `Insufficient total records: ${allData.length} < ${DATABASE_CONFIG.validation.expectedTotalMinimum}`
    )
  }
  
  // Check for duplicates
  const duplicateCheck = new Set()
  let duplicates = 0
  
  allData.forEach(record => {
    const key = `${record.movieIMDB}_${record.referenceActorIMDB || 'no_actor'}`
    if (duplicateCheck.has(key)) {
      duplicates++
    } else {
      duplicateCheck.add(key)
    }
  })
  
  validation.summary.duplicateRecords = duplicates
  validation.summary.uniqueRecords = allData.length - duplicates
  
  const duplicatePercentage = duplicates / allData.length
  if (duplicatePercentage > DATABASE_CONFIG.validation.maxDuplicatePercentage) {
    validation.warnings.push(
      `High duplicate count: ${duplicates}/${allData.length} records (${Math.round(duplicatePercentage * 100)}%)`
    )
  }
  
  return validation
}

export default DATABASE_CONFIG