package logic

import (
	"net/http"
)

func logOut(username, session string) error {
	req, err := http.NewRequest("GET", urls["logout"], nil)
	if err != nil {
		return err
	}
	req.Header.Set("User-Agent", "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/133.0.0.0 Safari/537.36 Edg/133.0.0.0")
	req.AddCookie(&http.Cookie{Name: "PHPSESSID", Value: session})
	req.AddCookie(&http.Cookie{Name: "uname", Value: username})
	req.AddCookie(&http.Cookie{Name: "perf_dv6Tr4n", Value: "1"})
	client := &http.Client{}
	resp, err := client.Do(req)
	if err != nil {
		return err
	}
	defer resp.Body.Close()

	return nil
}
