import {
    MainState, MainActionTypes,
    SET_SHOW_LANGUAGE_MODAL, SET_IS_TOUCH_DEVICE, SET_USER_NAME, SET_NOTIFICATION, SET_CLIENTS
} from "../types/main"

const initialState: MainState = {
    showLanguageModal: false,
    isTouchDevice: false,
    userName: null,
    notification: null,
    clients: []
}

export default function (state = initialState, action: MainActionTypes): MainState {
    switch (action.type) {
        case SET_SHOW_LANGUAGE_MODAL:
            return {
                ...state,
                showLanguageModal: action.payload
            }

        case SET_IS_TOUCH_DEVICE:
            return {
                ...state,
                isTouchDevice: action.payload
            }

        case SET_USER_NAME:
            return {
                ...state,
                userName: action.payload
            }

        case SET_NOTIFICATION:
            return {
                ...state,
                notification: action.payload
            }

        case SET_CLIENTS:
            return {
                ...state,
                clients: action.payload
            }

        default:
            return state
    }
}
