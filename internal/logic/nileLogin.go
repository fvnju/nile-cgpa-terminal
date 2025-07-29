package logic

import (
	"net/http"
	"net/url"
	"strings"
)

func LoginToNileSIS(username, password, session string) error {
	form_data := url.Values{
		"username": {username},
		"password": {password},
		"LogIn":    {"LOGIN"},
	}

	req, err := http.NewRequest("POST", urls["login"], strings.NewReader(form_data.Encode()))
	if err != nil {
		return err
	}

	req.Header.Set("Content-Type", "application/x-www-form-urlencoded")
	req.AddCookie(&http.Cookie{Name: "PHPSESSID", Value: session})
	client := &http.Client{}
	resp, err := client.Do(req)
	if err != nil {
		return err
	}
	defer resp.Body.Close()
	if resp.StatusCode != 200 {
		return &sessionError{message: resp.Status}
	}
	return nil
}
