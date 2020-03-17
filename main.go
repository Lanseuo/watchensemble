package main

import (
	"encoding/json"
	"errors"
	"fmt"
	"log"
	"net/http"
	"regexp"

	"github.com/gorilla/websocket"
)

var clients = make(map[string]*Client) // connected clients
var broadcast = make(chan Message)     // broadcast channel
var upgrader = websocket.Upgrader{}
var lastVideoDetails VideoDetails

type Client struct {
	clientID   string
	ws         *websocket.Conn
	lastStatus Status
}

type Message struct {
	Type         string        `json:"type"`
	Text         string        `json:"text"`
	VideoDetails *VideoDetails `json:"videoDetails,omitempty"`
	Seconds      int           `json:"seconds,omitempty"`
	Status       *Status       `json:"status,omitempty"`
	ClientID     string        `json:"clientId,omitempty"`
	Date         int           `json:"date"`
}

type VideoDetails struct {
	Title       map[string]string `json:"title"`
	Description map[string]string `json:"description"`
	URL         map[string]string `json:"url"`
	Languages   []string          `json:"languages"`
}

type Status struct {
	PlaybackState string `json:"playbackState"`
	CurrentTime   int    `json:"currentTime"`
}

func wsEndpoint(w http.ResponseWriter, r *http.Request) {
	clientIDs, ok := r.URL.Query()["clientId"]
	if !ok || len(clientIDs) == 0 {
		fmt.Println("Parameter 'clientId' not present in websocket url")
		w.WriteHeader(400)
		return
	}
	clientID := clientIDs[0]

	upgrader.CheckOrigin = func(r *http.Request) bool { return true }

	ws, err := upgrader.Upgrade(w, r, nil)
	if err != nil {
		log.Println(err)
		return
	}
	defer ws.Close()

	log.Printf("Client %v successfully connected", clientID)
	client := &Client{
		clientID: clientID,
		ws:       ws,
	}
	clients[clientID] = client

	if len(lastVideoDetails.URL) != 0 {
		sendMessageToClient(client, Message{
			Type:         "setVideoDetails",
			VideoDetails: &lastVideoDetails,
			ClientID:     "server",
			Date:         0, // TODO
		})
	}

	for {
		var msg Message
		err := ws.ReadJSON(&msg)
		if err != nil {
			log.Println(err)
			delete(clients, clientID)
			break
		}
		log.Printf("New message: %+v", msg)
		broadcast <- msg
	}
}

func handleMessages() {
	for {
		msg := <-broadcast

		switch msg.Type {
		case "setPlaybackState":
			sendMessageToAllClients(msg)

		case "requestVideo":
			details, err := getVideoDetailsFromArte(msg.Text)
			if err != nil {
				fmt.Println("Error:", err)
			}
			lastVideoDetails = details
			sendMessageToAllClients(Message{
				Type:         "setVideoDetails",
				VideoDetails: &details,
				ClientID:     "server",
				Date:         0, // TODO
			})

		case "jumpToTime":
			sendMessageToAllClients(msg)

		case "reportStatus":
			handleReportStatus(msg)

		default:
			fmt.Printf("Error: Unknown message type '%v'\n", msg.Type)
		}
	}
}

func sendMessageToAllClients(msg Message) {
	for _, client := range clients {
		// TODO: Except to message sender
		sendMessageToClient(client, msg)
	}
}

func sendMessageToClient(client *Client, msg Message) {
	err := client.ws.WriteJSON(msg)
	if err != nil {
		log.Println(err)
		client.ws.Close()
		delete(clients, client.clientID)
	}
}

func handleReportStatus(msg Message) {
	fmt.Printf("\nmsg.Status %v: %v\n", msg.ClientID, msg.Status)

	clients[msg.ClientID].lastStatus = *msg.Status

	for _, client := range clients {
		// Don't compare with itself
		if client.clientID == msg.ClientID {
			continue
		}

		fmt.Printf("client %v: %v\n", client.clientID, client.lastStatus)

		timeDifference := msg.Status.CurrentTime - client.lastStatus.CurrentTime

		if msg.Status.PlaybackState == "playing" {
			if client.lastStatus.PlaybackState == "playing" {
				if timeDifference > 15 {
					// Message sender waits
					fmt.Println("Message sender waits")
					sendMessageToClient(clients[msg.ClientID], Message{
						Type:     "setPlaybackState",
						Text:     "waiting",
						ClientID: "server",
						Date:     0,
					})
				} else if timeDifference < -15 {
					// client waits
					fmt.Printf("Client %v waits\n", client.clientID)
					sendMessageToClient(client, Message{
						Type:     "setPlaybackState",
						Text:     "waiting",
						ClientID: "server",
						Date:     0,
					})
				}
			} else if client.lastStatus.PlaybackState == "paused" {
				// not possible
			} else if client.lastStatus.PlaybackState == "waiting" {
				if timeDifference > -5 {
					// client can play
					fmt.Printf("Client %v can play\n", client.clientID)
					sendMessageToClient(client, Message{
						Type:     "setPlaybackState",
						Text:     "playing",
						ClientID: "server",
						Date:     0,
					})
				}
			}
		} else if msg.Status.PlaybackState == "paused" {
			if client.lastStatus.PlaybackState == "playing" {
				// not possible
			} else if client.lastStatus.PlaybackState == "paused" {
				// nothing
			} else if client.lastStatus.PlaybackState == "waiting" {
				// nothing
			}
		} else if msg.Status.PlaybackState == "waiting" {
			if client.lastStatus.PlaybackState == "playing" {
				if timeDifference < 5 {
					// Message sender can play
					fmt.Println("Message sender can play")
					sendMessageToClient(clients[msg.ClientID], Message{
						Type:     "setPlaybackState",
						Text:     "playing",
						ClientID: "server",
						Date:     0,
					})
				}
			} else if client.lastStatus.PlaybackState == "paused" {
				// not possible
			} else if client.lastStatus.PlaybackState == "waiting" {
				// not possible
			}
		}
	}
}

func getVideoDetailsFromArte(url string) (details VideoDetails, err error) {
	details.Title = make(map[string]string)
	details.Description = make(map[string]string)
	details.URL = make(map[string]string)

	r, _ := regexp.Compile(`\d+-\d+-A`)
	videoID := r.FindString(url)

	if videoID == "" {
		return details, errors.New("Can't find video")
	}

	for _, language := range []string{"de", "fr"} {
		apiURL := fmt.Sprintf("https://api.arte.tv/api/player/v1/config/%s/%s?platform=ARTE_NEXT", language, videoID)
		resp, err := http.Get(apiURL)
		if err != nil {
			return details, err
		}

		defer resp.Body.Close()

		type responseMediaVersion struct {
			URL string `json:"url"`
		}
		type responseVideoJSONPlayer struct {
			Title       string                          `json:"VTI"`
			Description string                          `json:"VDE"`
			VSR         map[string]responseMediaVersion `json:"VSR"`
		}
		type responseStruct struct {
			Details responseVideoJSONPlayer `json:"videoJsonPlayer"`
		}
		var response responseStruct
		json.NewDecoder(resp.Body).Decode(&response)

		details.Title[language] = response.Details.Title
		details.Description[language] = response.Details.Description
		details.URL[language] = response.Details.VSR["HTTPS_SQ_1"].URL
		details.Languages = append(details.Languages, language)
	}

	return details, nil
}

func main() {
	go handleMessages()

	fs := http.FileServer(http.Dir("./static"))
	http.Handle("/", fs)
	http.HandleFunc("/ws", wsEndpoint)

	log.Println("Server running on http://localhost:8080")
	log.Fatalln(http.ListenAndServe(":8080", nil))
}
