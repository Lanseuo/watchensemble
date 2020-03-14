import {
    SET_PLAYBACK_STATE, SET_URL, SET_CURRENT_TIME,
    SET_TOTAL_TIME, SET_JUMP_TO_TIME_LAST_UPDATE
} from '../actionTypes/video'
import { sendMessageToWebsocket } from './websocket'
import store from '../store'

export const setPlaybackState = content => {
    switch (content) {
        case 'playing':
            sendMessageToWebsocket('play')
            break
        case 'paused':
            sendMessageToWebsocket('pause')
            break
        default:
            console.error('Playback state of unknown type', content);
    }

    return {
        type: SET_PLAYBACK_STATE,
        payload: content
    }
}

export const setVideoUrl = url => {
    sendMessageToWebsocket('setVideo', url)

    return {
        type: SET_URL,
        payload: url
    }
}

export const setVideoCurrentTime = seconds => ({
    type: SET_CURRENT_TIME,
    payload: seconds
})

export const setVideoTotalTime = seconds => ({
    type: SET_TOTAL_TIME,
    payload: seconds
})

export const jumpToTime = seconds => {
    sendMessageToWebsocket('jumpToTime', seconds.toString())

    return {
        type: SET_JUMP_TO_TIME_LAST_UPDATE,
        payload: seconds
    }
}

export const setVideoJumpToTimeLastUpdate = seconds => ({
    type: SET_JUMP_TO_TIME_LAST_UPDATE,
    payload: seconds
})

setInterval(() => {
    let { url, currentTime, playbackState } = store.getState().video

    if (!url) {
        return
    }

    sendMessageToWebsocket('reportStatus', `${currentTime}-${playbackState}`)
}, 5000)

export function handleReportStatus(timeStamp, status) {
    if (status === 'waiting') {
        return
    }

    let timeDifference = store.getState().video.currentTime - parseInt(timeStamp)
    if (Math.abs(timeDifference) < 5) {
        return
    }

    if (status === 'playing') {
        if (timeDifference > 10) {
            store.dispatch({
                type: SET_PLAYBACK_STATE,
                payload: 'waiting'
            })
        } else {
            store.dispatch({
                type: SET_PLAYBACK_STATE,
                payload: 'playing'
            })
        }
    }
}