package server

import (
	"fmt"
	"watchensemble/pkg/sources"
)

func join(msg Message) {
	fmt.Printf("Client %v joined as '%v'\n", msg.ClientID, msg.Text)
	for _, client := range clients {
		if client.clientID == msg.ClientID {
			client.name = msg.Text
		}
	}

	notificationMsg := Message{
		Type: "clientJoined",
		Text: msg.Text,
	}

	sendMessageToAllClientsExcept(notificationMsg, msg.ClientID)
	setClientList()
}

func clientLeftRoom(clientID string) {
	fmt.Printf("Client %v left\n", clientID)
	var clientName string

	for _, client := range clients {
		if client.clientID == clientID {
			clientName = client.name
			break
		}
	}

	notificationMsg := Message{
		Type: "clientLeft",
		Text: clientName,
	}

	sendMessageToAllClientsExcept(notificationMsg, clientID)
}

func setClientList() {
	var clientList []string
	for _, client := range clients {
		clientList = append(clientList, client.name)
	}

	msg := Message{
		Type:       "setClientList",
		ClientList: clientList,
	}

	sendMessageToAllClients(msg)
}

func setPlaybackState(msg Message) {
	sendMessageToAllClientsExcept(msg, msg.ClientID)
}

func requestVideo(msg Message) {
	details, err := sources.GetVideoDetails(msg.Text)
	if err != nil {
		fmt.Println("Error:", err)
		sendMessageToClient(clients[msg.ClientID], Message{
			Type: "error",
			Text: err.Error(),
		})
		return
	}
	lastVideoDetails = details

	resetLastStatuses()

	sendMessageToAllClients(Message{
		Type:         "setVideoDetails",
		VideoDetails: &details,
	})
}

func jumpToTime(msg Message) {
	resetLastStatuses()
	sendMessageToAllClientsExcept(msg, msg.ClientID)
}

func chatMessage(msg Message) {
	var sourceClientName string
	for _, client := range clients {
		if client.clientID == msg.ClientID {
			sourceClientName = client.name
			break
		}
	}

	notificationMsg := Message{
		Type:         "chatMessage",
		Text:         msg.Text,
		SourceClient: sourceClientName,
	}
	sendMessageToAllClientsExcept(notificationMsg, msg.ClientID)
}
