"use client"

import { useState, useEffect, useMemo } from "react"
import { ThemeProvider, createTheme } from "@mui/material/styles"
import { CssBaseline, Container, Box, Grid, Paper, Button, CircularProgress, Typography } from "@mui/material"
import { ArrowBack as BackIcon } from "@mui/icons-material"
import { generateFindCoActorQuestion } from "./utils/coStar"
import { generateChainCoActorQuestion } from "./utils/coStarChain"
import { generateFindMovieOfActorQuestion } from "./utils/findMovieOfActor"
import { generateFindActorInMovieQuestion } from "./utils/findActorInMovie"
import { generateFindMovieOfDirectorQuestion } from "./utils/findMovieOfDirector"
import { generateFindDirectorOfMovieQuestion } from "./utils/findDirectorOfMovie"
import { generateFindMovieByKeywordsQuestion } from "./utils/findMovieByKeywords"
import { generateFindMovieByPosterQuestion } from "./utils/findMovieByPoster"
import "./App.css"
import { generateOscarQuestion } from "./utils/oscarQuestions"
import { getUltimateMixQuestions } from "./utils/ultimateMix"

// ADDED: Device detection hook
const useDeviceDetection = () => {
  const [deviceInfo, setDeviceInfo] = useState({
    isMobile: false,
    isTablet: false,
    isDesktop: false,
    screenWidth: 0,
    screenHeight: 0,
    hasNotch: false,
    platform: 'unknown'
  })

  useEffect(() => {
    const detectDevice = () => {
      const width = window.innerWidth
      const height = window.innerHeight
      const userAgent = navigator.userAgent
      
      const isMobile = width <= 768
      const isTablet = width > 768 && width <= 1024
      const isDesktop = width > 1024
      
      // Simple notch detection for common devices
      const hasNotch = (
        (userAgent.includes('iPhone') && (height >= 812)) ||
        (userAgent.includes('Android') && height > 750 && width < 500)
      )
      
      let platform = 'unknown'
      if (userAgent.includes('iPhone') || userAgent.includes('iPad')) {
        platform = 'ios'
      } else if (userAgent.includes('Android')) {
        platform = 'android'
      }

      setDeviceInfo({
        isMobile,
        isTablet,
        isDesktop,
        screenWidth: width,
        screenHeight: height,
        hasNotch,
        platform
      })
    }

    detectDevice()
    window.addEventListener('resize', detectDevice)
    return () => window.removeEventListener('resize', detectDevice)
  }, [])

  return deviceInfo
}

// Function to properly handle and display Unicode names
const cleanDisplayName = (name) => {
  if (!name) return ""
  return name.trim()
}

const CATEGORIES = [
  {
    name: "Actors on a Chain",
    icon: "🔗",
    subcategories: [
      { name: "Find Co-Actor", icon: "🤝", generator: generateFindCoActorQuestion },
      { name: "Chain of Co-Actors", icon: "⛓️", generator: generateChainCoActorQuestion },
    ],
  },
  {
    name: "Actors in Movies",
    icon: "🎭",
    subcategories: [
      { name: "Find Actor in Movie", icon: "🕵️", generator: generateFindActorInMovieQuestion },
      { name: "Find Movie of Actor", icon: "🎬", generator: generateFindMovieOfActorQuestion },
    ],
  },
  {
    name: "Movie Directors",
    icon: "🎬",
    subcategories: [
      { name: "Movie of Director", icon: "🎥", generator: generateFindMovieOfDirectorQuestion },
      { name: "Director of Movie", icon: "👨‍🎬", generator: generateFindDirectorOfMovieQuestion },
    ],
  },
  { name: "Oscar Winners", icon: "🏆", generator: generateOscarQuestion },
  { name: "Movies by Keywords", icon: "🏷️", generator: generateFindMovieByKeywordsQuestion },
  { name: "Movies by Posters", icon: "🖼️", generator: generateFindMovieByPosterQuestion },
  { name: "Ultimate Mix", icon: "🎲", generator: getUltimateMixQuestions },
]

const INITIAL_GAME_STATE = {
  gameState: "category",
  showSubcategories: false,
  parentCategory: null,
  selectedCategory: "",
  score: 0,
  timeLeft: 20,
  currentQuestion: null,
  answerStatus: null,
  selectedAnswer: null,
  gameOver: false,
  timeExpired: false,
}

const MovieQuizApp = () => {
  const [gameState, setGameState] = useState(INITIAL_GAME_STATE)
  const [difficulty, setDifficulty] = useState("easy")
  const [movieData, setMovieData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [chainState, setChainState] = useState(null)
  const [oscarData, setOscarData] = useState(null)
  const [mixedQuestions, setMixedQuestions] = useState([])
  const [mixIndex, setMixIndex] = useState(0)
  
  // ADDED: Device detection
  const device = useDeviceDetection()

  // ADDED: Dynamic theme based on device
  const theme = createTheme({
    palette: {
      mode: "dark",
      primary: { main: "#FFD700" },
      secondary: { main: "#1976D2" },
      background: {
        default: "#0d1117",
        paper: "#161b22",
      },
      text: {
        primary: "#ffffff",
        secondary: "#8b949e",
      },
    },
    typography: {
      fontFamily: '"Roboto", "Helvetica", "Arial", sans-serif',
      h1: {
        fontFamily: '"Bebas Neue", sans-serif',
        // SMART: Responsive font sizes based on device
        fontSize: device.isMobile ? "1.8rem" : device.isTablet ? "3rem" : "4rem",
        fontWeight: 500,
        letterSpacing: "0.1em",
        color: "#FFD700",
      },
      h2: { 
        fontFamily: '"Bebas Neue", sans-serif', 
        fontSize: device.isMobile ? "1.4rem" : device.isTablet ? "2rem" : "2.5rem", 
        fontWeight: 500, 
        letterSpacing: "0.05em" 
      },
      button: { fontSize: "1rem", fontWeight: 700, textTransform: "none" },
    },
    components: {
      MuiPaper: {
        styleOverrides: {
          root: {
            border: "1px solid #30363d",
          },
        },
      },
      MuiButton: {
        styleOverrides: {
          root: {
            borderRadius: "8px",
          },
        },
      },
    },
  })

  const filteredMovieData = useMemo(() => {
    if (!movieData) return null
    return movieData.filter((movie) => (difficulty === "hard" ? true : movie.difficulty === "Easy"))
  }, [movieData, difficulty])

  // Calculate timer progress percentage
  const timerProgress = (gameState.timeLeft / 20) * 100
  const isWarning = gameState.timeLeft <= 10 && gameState.timeLeft > 5
  const isCritical = gameState.timeLeft <= 5

  // SMART: Mobile-optimized touch handling
  useEffect(() => {
    if (device.isMobile) {
      // Set viewport for mobile devices
      const viewport = document.querySelector("meta[name=viewport]")
      if (viewport) {
        viewport.setAttribute("content", "width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no, viewport-fit=cover")
      }

      // Prevent zoom on touch
      const handleTouchStart = (e) => {
        if (e.touches.length > 1) {
          e.preventDefault()
        }
      }

      const handleTouchEnd = (e) => {
        const now = new Date().getTime()
        if (now - (window.lastTouchEnd || 0) <= 300) {
          e.preventDefault()
        }
        window.lastTouchEnd = now
      }

      document.addEventListener("touchstart", handleTouchStart, { passive: false })
      document.addEventListener("touchend", handleTouchEnd, { passive: false })

      return () => {
        document.removeEventListener("touchstart", handleTouchStart)
        document.removeEventListener("touchend", handleTouchEnd)
      }
    }
  }, [device.isMobile])

  useEffect(() => {
    fetch("/assets/movie_data.json")
      .then((response) => {
        if (!response.ok) throw new Error("Failed to load movie data")
        return response.json()
      })
      .then((data) => {
        const processedData = data.map((item) => ({
          ...item,
          movieTitle: cleanDisplayName(item.movieTitle || ""),
          referenceActor: cleanDisplayName(item.referenceActor || ""),
          directors:
            item.directors?.map((d) => ({
              ...d,
              name: cleanDisplayName(d.name || ""),
            })) || [],
          actors:
            item.actors?.map((a) => ({
              ...a,
              name: cleanDisplayName(a.name || ""),
            })) || [],
        }))
        setMovieData(processedData)
      })
      .catch((err) => {
        console.error("Error loading movie data:", err)
        setError("Failed to load movie data. Please refresh the page.")
      })

    fetch("/assets/oscar_data.json")
      .then((response) => {
        if (!response.ok) throw new Error("Failed to load Oscar data")
        return response.json()
      })
      .then((data) => {
        const processedOscarData = {
          ...data,
          records:
            data.records?.map((record) => ({
              ...record,
              names: cleanDisplayName(record.names || ""),
              film: cleanDisplayName(record.film || ""),
            })) || [],
        }
        setOscarData(processedOscarData)
        setLoading(false)
      })
      .catch((err) => {
        console.error("Error loading Oscar data:", err)
        setError("Failed to load Oscar data. Please refresh the page.")
        setLoading(false)
      })
  }, [])

  useEffect(() => {
    if (gameState.timeLeft > 0 && gameState.gameState === "quiz" && !gameState.answerStatus) {
      const timer = setTimeout(() => setGameState((prev) => ({ ...prev, timeLeft: prev.timeLeft - 1 })), 1000)
      return () => clearTimeout(timer)
    } else if (gameState.timeLeft === 0 && !gameState.gameOver) {
      setGameState((prev) => ({
        ...prev,
        gameOver: true,
        timeExpired: true,
        answerStatus: "wrong",
      }))
    }
  }, [gameState.timeLeft, gameState.gameState, gameState.answerStatus, gameState.gameOver])

  const generateQuestion = async (category) => {
    if (!movieData || !filteredMovieData) return

    if (category === "Ultimate Mix") {
      const questions = await getUltimateMixQuestions(filteredMovieData, oscarData, difficulty)
      if (questions && questions.length > 0) {
        setMixedQuestions(questions)
        setMixIndex(0)
        setGameState((prev) => ({
          ...prev,
          currentQuestion: questions[0],
          answerStatus: null,
          selectedAnswer: null,
          timeLeft: 20,
          timeExpired: false,
        }))
      } else {
        setError("Failed to generate Ultimate Mix. Please try again.")
        setGameState(INITIAL_GAME_STATE)
      }
      return
    }

    const categoryConfig = CATEGORIES.flatMap((cat) => cat.subcategories || [cat]).find((cat) => cat.name === category)

    if (!categoryConfig?.generator) return

    try {
      let question

      if (category === "Oscar Winners") {
        if (!oscarData) {
          setError("Oscar data not loaded yet. Please try again.")
          return
        }
        question = categoryConfig.generator(oscarData, difficulty)
      } else if (category === "Chain of Co-Actors") {
        question = categoryConfig.generator(filteredMovieData, difficulty, chainState)
        if (!question) return

        if (question.isNewChain) {
          setChainState(null)
        }
        setChainState({
          currentActor: question.nextActor,
          chain: question.chain,
        })
      } else if (category === "Movies by Posters") {
        question = await categoryConfig.generator(filteredMovieData, difficulty)
      } else {
        question = categoryConfig.generator(filteredMovieData, difficulty)
      }

      if (!question) {
        console.error("Failed to generate question for category:", category)
        return
      }

      setGameState((prev) => ({
        ...prev,
        currentQuestion: question,
        answerStatus: null,
        selectedAnswer: null,
        timeLeft: 20,
        timeExpired: false,
      }))
    } catch (error) {
      console.error("Error generating question:", error)
      setError("Failed to generate question. Please try again.")
    }
  }

  const handleAnswer = (answer) => {
    if (gameState.timeExpired || gameState.answerStatus) return

    const isCorrect = answer === gameState.currentQuestion.correctAnswer
    setGameState((prev) => ({
      ...prev,
      score: isCorrect ? prev.score + 1 : prev.score,
      answerStatus: isCorrect ? "correct" : "wrong",
      selectedAnswer: answer,
      gameOver: !isCorrect,
    }))
  }

  const handleNextQuestion = () => {
    if (gameState.selectedCategory === "Ultimate Mix") {
      const nextIndex = mixIndex + 1
      if (nextIndex < mixedQuestions.length) {
        setMixIndex(nextIndex)
        setGameState((prev) => ({
          ...prev,
          currentQuestion: mixedQuestions[nextIndex],
          answerStatus: null,
          selectedAnswer: null,
          timeLeft: 20,
          timeExpired: false,
        }))
      } else {
        setGameState((prev) => ({ ...prev, gameOver: true }))
      }
    } else {
      generateQuestion(gameState.selectedCategory)
    }
  }

  const resetGame = () => {
    if (gameState.selectedCategory === "Chain of Co-Actors") {
      setChainState(null)
    }
    setGameState((prev) => ({
      ...INITIAL_GAME_STATE,
      gameState: "quiz",
      selectedCategory: prev.selectedCategory,
      parentCategory: prev.parentCategory,
      showSubcategories: prev.showSubcategories,
    }))
    generateQuestion(gameState.selectedCategory)
  }

  const handleCategorySelect = (category) => {
    if (category.subcategories) {
      setGameState((prev) => ({
        ...prev,
        showSubcategories: true,
        parentCategory: category,
      }))
    } else {
      setGameState((prev) => ({
        ...prev,
        selectedCategory: category.name,
        gameState: "quiz",
      }))
      generateQuestion(category.name)
    }
  }

  const handleSubcategorySelect = (subcategory) => {
    setGameState((prev) => ({
      ...prev,
      selectedCategory: subcategory.name,
      gameState: "quiz",
    }))
    generateQuestion(subcategory.name)
  }

  const handleBackToCategories = () => {
    setGameState((prev) => ({
      ...prev,
      showSubcategories: false,
      parentCategory: null,
    }))
  }

  const handleGoToMainMenu = () => {
    setGameState(INITIAL_GAME_STATE)
    setChainState(null)
    setMixedQuestions([])
    setMixIndex(0)
  }

  const renderCategorySelection = () => (
    <Box>
      <Typography variant="h1" className="main-title" gutterBottom align="center">
        {gameState.showSubcategories ? gameState.parentCategory.name : "Choose Your Movie Challenge"}
      </Typography>

      {gameState.showSubcategories && (
        <Button startIcon={<BackIcon />} onClick={handleBackToCategories} sx={{ mb: 2, color: "primary.main" }}>
          Back to Categories
        </Button>
      )}

      <Grid 
        container 
        spacing={device.isMobile ? 2 : 4} 
        justifyContent="center" 
        className="categories-grid"
      >
        {(gameState.showSubcategories ? gameState.parentCategory.subcategories : CATEGORIES).map((category) => (
          <Grid 
            item 
            xs={12} 
            sm={device.isMobile ? 12 : 6} 
            md={device.isDesktop ? 4 : 6} 
            key={category.name}
          >
            <Paper
              elevation={3}
              className="category-card"
              onClick={() =>
                gameState.showSubcategories ? handleSubcategorySelect(category) : handleCategorySelect(category)
              }
            >
              <Box className="category-icon">{category.icon}</Box>
              <Typography className="category-name">{category.name}</Typography>
            </Paper>
          </Grid>
        ))}
      </Grid>
    </Box>
  )

  const renderQuiz = () => (
    <Box className="quiz-container">
      <Typography variant="h2" className="category-title" gutterBottom align="center">
        {gameState.selectedCategory}
      </Typography>

      <Box className="score-timer-row">
        <Box className="score-timer-content">
          <Typography className="score-text">
            Score: <span className="score-value">{gameState.score}</span>
          </Typography>
          <Typography className={`timer-text ${gameState.timeLeft <= 5 ? "timer-warning" : ""}`}>
            Time: <span className={gameState.timeLeft <= 5 ? "timer-warning" : "timer-value"}>{gameState.timeLeft}s</span>
          </Typography>
        </Box>
        
        <Box className="timer-progress-container">
          <Box className="timer-progress-bar">
            <Box 
              className={`timer-progress-fill ${isWarning ? "warning" : ""} ${isCritical ? "critical" : ""}`}
              style={{ width: `${timerProgress}%` }}
            />
          </Box>
          <Typography className={`timer-percentage ${isWarning ? "warning" : ""} ${isCritical ? "critical" : ""}`}>
            {Math.round(timerProgress)}% Complete
          </Typography>
        </Box>
      </Box>

      <Paper elevation={3} className="question-card">
        <Typography className="question-text">{gameState.currentQuestion?.question || "Loading..."}</Typography>

        {gameState.currentQuestion?.keywords && (
          <Typography className="question-keywords">{gameState.currentQuestion.keywords}</Typography>
        )}

        {gameState.currentQuestion?.posterPath && (
          <Box className="poster-container">
            <img
              src={gameState.currentQuestion.posterPath || "/placeholder.svg"}
              alt="Movie Poster"
              className="poster-image"
              loading="eager"
            />
          </Box>
        )}
      </Paper>

      <Grid container spacing={device.isMobile ? 1 : 2} className="answers-container">
        {gameState.currentQuestion?.choices.map((choice, index) => (
          <Grid item xs={12} sm={device.isMobile ? 12 : 6} key={index}>
            <button
              className={`answer-button ${
                gameState.selectedAnswer === choice
                  ? gameState.answerStatus === "correct"
                    ? "answer-correct"
                    : "answer-wrong"
                  : ""
              }`}
              onClick={() => handleAnswer(choice)}
              disabled={gameState.answerStatus !== null || gameState.timeExpired}
            >
              <span className="answer-letter">{String.fromCharCode(65 + index)}</span>
              {choice}
            </button>
          </Grid>
        ))}
      </Grid>

      {(gameState.answerStatus || gameState.timeExpired) && (
        <Paper
          elevation={6}
          className={`result-panel ${gameState.answerStatus === "correct" ? "result-correct" : "result-wrong"}`}
        >
          <Typography
            className="result-title"
            color={gameState.answerStatus === "correct" ? "success.main" : "error.main"}
          >
            {gameState.timeExpired ? "TIME'S UP!" : gameState.answerStatus === "correct" ? "CORRECT!" : "WRONG!"}
          </Typography>
          <Typography className="result-explanation">
            {gameState.timeExpired
              ? `The correct answer was: ${gameState.currentQuestion.correctAnswer}. ${gameState.currentQuestion.explanation}`
              : gameState.currentQuestion.explanation}
          </Typography>
          {gameState.answerStatus === "correct" && (
            <button className="primary-button" onClick={handleNextQuestion}>
              Next Question
            </button>
          )}
        </Paper>
      )}

      {(gameState.gameOver || gameState.timeExpired) && (
        <Box className="game-over-section">
          <Typography className="game-over-title">Game Over</Typography>
          <Typography className="final-score">Final Score: {gameState.score}</Typography>
          <Box>
            <button className="primary-button" onClick={resetGame}>
              Play Again
            </button>
            <button className="secondary-button" onClick={handleGoToMainMenu}>
              Main Menu
            </button>
          </Box>
        </Box>
      )}
    </Box>
  )

  if (loading || !movieData || !oscarData) {
    return (
      <ThemeProvider theme={theme}>
        <CssBaseline />
        <div className="app-background">
          <Box className="loading-container">
            <CircularProgress color="primary" />
            <Typography className="loading-text">Loading {!movieData ? "Movie" : "Oscar"} Data...</Typography>
          </Box>
        </div>
      </ThemeProvider>
    )
  }

  if (error) {
    return (
      <ThemeProvider theme={theme}>
        <CssBaseline />
        <div className="app-background">
          <Box sx={{ display: "flex", justifyContent: "center", alignItems: "center", height: "100vh", px: 2 }}>
            <Typography className="error-text">{error}</Typography>
          </Box>
        </div>
      </ThemeProvider>
    )
  }

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      {/* SMART: Show device info for debugging */}
      {process.env.NODE_ENV === 'development' && (
        <Box sx={{ 
          position: 'fixed', 
          top: 0, 
          right: 0, 
          backgroundColor: 'rgba(0,0,0,0.8)', 
          color: 'white', 
          padding: '8px', 
          fontSize: '10px',
          zIndex: 9999
        }}>
          {device.screenWidth}x{device.screenHeight} | {device.platform} | 
          {device.isMobile ? 'Mobile' : device.isTablet ? 'Tablet' : 'Desktop'}
          {device.hasNotch ? ' | Notch' : ''}
        </Box>
      )}
      <div className="app-background">
        <Container 
          maxWidth="md" 
          sx={{ 
            pt: device.hasNotch ? 1 : 2, 
            pb: device.hasNotch ? 1 : 4, 
            px: device.isMobile ? 1 : 2 
          }}
        >
          {gameState.gameState === "category" ? renderCategorySelection() : renderQuiz()}
        </Container>
      </div>
    </ThemeProvider>
  )
}

export default MovieQuizApp