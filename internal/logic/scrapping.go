package logic

import (
	"fmt"
	"net/http"
	"strconv"
	"time"

	"github.com/gocolly/colly/v2"
)

type Course struct {
	Code   string `json:"code"`
	Name   string `json:"name"`
	Grade  string `json:"grade"`
	Credit uint8  `json:"credit"`
}

func Scrapper(username, session string) ([]Course, error) {
	c := colly.NewCollector()

	c.SetCookies(urls["grades"], []*http.Cookie{
		{Name: "uname", Value: username},
		{Name: "PHPSESSID", Value: session},
	})

	var courses []Course = make([]Course, 0)

	c.OnHTML("table.table tbody tr", func(e *colly.HTMLElement) {
		// Skip rows that don't contain course data
		if e.ChildText("td:nth-child(1)") == "" {
			return
		}

		// Extract data from each column
		code := e.ChildText("td:nth-child(1)")
		name := e.ChildText("td:nth-child(2)")
		grade := e.ChildText("td:nth-child(3)")
		// section := e.ChildText("td:nth-child(4)")
		creditString := e.ChildText("td:nth-child(5)")
		// status := e.ChildText("td:nth-child(6)")

		credit, err := strconv.ParseInt(creditString, 10, 8)
		if err != nil {
			fmt.Println("Error parsing credit:", err)
			return
		}

		// Extract link and onclick attributes
		// link := e.ChildAttr("td:nth-child(2) a", "href")
		// onclick := e.ChildAttr("td:nth-child(2) a", "onclick")

		courses = append(courses,
			Course{
				Code:   code,
				Name:   name,
				Grade:  grade,
				Credit: uint8(credit),
			})
	})
	timeOut, _ := time.ParseDuration("40s")
	c.SetRequestTimeout(timeOut)

	err := c.Visit(urls["grades"])
	if err != nil {
		fmt.Println("Error visiting site:", err)
		return []Course{}, err
	}

	return courses, nil
}
