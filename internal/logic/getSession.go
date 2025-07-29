package logic

import (
	"net/http"
	"strings"
)

type sessionError struct {
	message string
}

func (s *sessionError) Error() string {
	return s.message
}

func GetSessionToken() (string, error) {
	resp_token, err := http.Get(urls["session"])
	if err != nil || resp_token.StatusCode != 200 {
		if err != nil {
			return "", err
		} else {
			return "", &sessionError{message: resp_token.Status}
		}
	}
	defer resp_token.Body.Close()

	read := resp_token.Header["Set-Cookie"][0]
	uncleaned_session, found := strings.CutPrefix(read, "PHPSESSID=")
	if !found {
		return "", &sessionError{message: "Could not find PHPSESSID key"}
	}
	cleaned_session, _, check := strings.Cut(uncleaned_session, "; path=/")
	if !check {
		return "", &sessionError{message: "Could not trim the end of the cookie"}
	}
	return cleaned_session, nil
}
