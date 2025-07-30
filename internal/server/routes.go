package server

import (
	"encoding/json"
	"fmt"
	"net/http"
	"nile-cgpa/internal/logic"
	"time"

	"github.com/gin-contrib/cors"
	"github.com/gin-gonic/gin"
)

func (s *Server) RegisterRoutes() http.Handler {
	r := gin.Default()

	r.Use(cors.New(cors.Config{
		AllowOrigins:     []string{"*"}, // Add your frontend URL
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
	ctx := c.Request.Context()

	var requestBody struct {
		StudentID string `json:"studentId" binding:"required"`
		Password  string `json:"password" binding:"required"`
	}

	if err := c.ShouldBindJSON(&requestBody); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	// Generate cache key with current month/year
	now := time.Now()
	cacheKey := fmt.Sprintf("cgpa:%s:%04d-%02d", requestBody.StudentID, now.Year(), int(now.Month()))

	// Check cache first
	val, err := s.rdb.Get(ctx, cacheKey).Result()
	if err == nil {
		var courses []logic.Course
		if err := json.Unmarshal([]byte(val), &courses); err == nil {
			c.JSON(http.StatusOK, courses)
			return
		}
	}

	// Cache miss - authenticate and scrape
	session, err := logic.GetSessionToken()
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to get session: " + err.Error()})
		return
	}

	err = logic.LoginToNileSIS(requestBody.StudentID, requestBody.Password, session)
	if err != nil {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Login failed: " + err.Error()})
		return
	}

	// Scrape fresh data
	courses, err := logic.Scrapper(requestBody.StudentID, session)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	// Cache the fresh data
	if jsonData, err := json.Marshal(courses); err == nil {
		s.rdb.Set(ctx, cacheKey, jsonData, 24*time.Hour)
	}

	c.JSON(http.StatusOK, courses)
}
