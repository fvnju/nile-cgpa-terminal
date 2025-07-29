package server

import (
	"net/http"
	"nile-cgpa/internal/logic"

	"github.com/gin-contrib/cors"
	"github.com/gin-gonic/gin"
)

func (s *Server) RegisterRoutes() http.Handler {
	r := gin.Default()

	r.Use(cors.New(cors.Config{
		AllowOrigins:     []string{"http://localhost:5173", "https://nile-cgpa-terminal.vercel.app/"}, // Add your frontend URL
		AllowMethods:     []string{"GET", "POST", "PUT", "DELETE", "OPTIONS", "PATCH"},
		AllowHeaders:     []string{"Accept", "Authorization", "Content-Type"},
		AllowCredentials: true, // Enable cookies/auth
	}))

	r.GET("/", s.HelloWorldHandler)
	r.POST("/cgpa", s.ScrapeNileHandler)

	return r
}

func (s *Server) HelloWorldHandler(c *gin.Context) {
	resp := make(map[string]string)
	resp["message"] = "Hello Favour"

	c.JSON(http.StatusOK, resp)
}

func (s *Server) ScrapeNileHandler(c *gin.Context) {
	var requestBody struct {
		StudentID string `json:"studentId" binding:"required"`
		Password  string `json:"password" binding:"required"`
	}

	if err := c.ShouldBindJSON(&requestBody); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	// Get session token
	session, err := logic.GetSessionToken()
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to get session: " + err.Error()})
		return
	}

	// Login with credentials
	err = logic.LoginToNileSIS(requestBody.StudentID, requestBody.Password, session)
	if err != nil {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Login failed: " + err.Error()})
		return
	}

	// Scrape data with authenticated session
	resp, err := logic.Scrapper(requestBody.StudentID, session)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, resp)
}
