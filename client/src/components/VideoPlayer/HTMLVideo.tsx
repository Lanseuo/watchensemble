import React, { Component } from 'react'
import { connect, ConnectedProps } from 'react-redux'
import { togglePlay, setPlaybackState, setPlaybackStateWithoutMessage, setVideoCurrentTime, setVideoTotalTime, setVideoBufferTime, setIsLoading } from '../../redux/actions/video'
import { setNotification } from '../../redux/actions/main'
import { AppState } from '../../redux/reducers'
import { PlaybackState } from '../../redux/types/video'

interface Props extends ConnectedProps<typeof connector> {
    onClick(): void
}

class Video extends Component<Props> {
    videoRef = React.createRef<HTMLVideoElement>()

    componentDidMount() {
        this.videoRef.current!.addEventListener('timeupdate', this.onTimeUpdate)
        this.videoRef.current!.addEventListener('durationchange', this.onDurationChange)
        this.videoRef.current!.addEventListener('ended', this.onVideoEnded)
        this.videoRef.current!.addEventListener('progress', this.onProgress)
        this.videoRef.current!.addEventListener('seeking', this.onLoadingStart)
        this.videoRef.current!.addEventListener('waiting', this.onLoadingStart)
        this.videoRef.current!.addEventListener('canplay', this.onLoadingEnd)

        this.handlePlaybackState(this.props.videoPlaybackState)
        this.videoRef.current!.currentTime = this.props.videoJumpToTimeLastUpdate
    }

    componentWillUnmount() {
        this.videoRef.current!.removeEventListener('timeupdate', this.onTimeUpdate)
        this.videoRef.current!.removeEventListener('durationchange', this.onDurationChange)
        this.videoRef.current!.removeEventListener('ended', this.onVideoEnded)
        this.videoRef.current!.removeEventListener('progress', this.onProgress)
        this.videoRef.current!.removeEventListener('seeking', this.onLoadingStart)
        this.videoRef.current!.removeEventListener('waiting', this.onLoadingStart)
        this.videoRef.current!.removeEventListener('canplay', this.onLoadingEnd)
    }

    handleClick = () => {
        this.props.onClick()
        if (!this.props.isTouchDevice) {
            this.props.togglePlay()
        }
    }

    onTimeUpdate = () => {
        this.props.setVideoCurrentTime(this.videoRef.current!.currentTime)
    }

    onDurationChange = () => {
        this.props.setVideoTotalTime(this.videoRef.current!.duration)
    }

    onVideoEnded = () => {
        this.props.setPlaybackStateWithoutMessage('paused')
        this.videoRef.current!.currentTime = 0
    }

    onProgress = () => {
        let video = this.videoRef.current!
        let bufferEnd;

        if (video.duration && video.buffered && video.buffered.length) {
            // Get last buffered end (new buffer object is created on every jump to time)
            bufferEnd = video.buffered.end(video.buffered.length - 1)

            // Buffered end can be bigger than duration by a very small fraction
            if (bufferEnd > video.duration) {
                bufferEnd = video.duration;
            }
        } else {
            bufferEnd = 0
        }

        this.props.setVideoBufferTime(bufferEnd)
    }

    onLoadingStart = () => {
        this.props.setIsLoading(true)
    }

    onLoadingEnd = () => {
        this.props.setIsLoading(false)
    }

    componentWillReceiveProps = (nextProps: Props) => {
        if (nextProps.language !== this.props.language) {
            let previousPlaybackState = this.props.videoPlaybackState
            let previousCurrentTime = this.videoRef.current!.currentTime
            setTimeout(() => {
                this.handlePlaybackState(previousPlaybackState)
                this.videoRef.current!.currentTime = previousCurrentTime
            }, 500)
        }

        if (nextProps.videoPlaybackState !== this.props.videoPlaybackState) {
            this.handlePlaybackState(nextProps.videoPlaybackState)
        }

        if (nextProps.videoJumpToTimeLastUpdate !== this.props.videoJumpToTimeLastUpdate) {
            this.videoRef.current!.currentTime = nextProps.videoJumpToTimeLastUpdate
        }
    }

    handlePlaybackState(state: PlaybackState) {
        switch (state) {
            case 'playing':
                this.videoRef.current!.play().catch(this.handlePlaybackError)
                break
            case 'paused':
            case 'waiting':
                this.videoRef.current!.pause()
                break
            default:
                console.error('Playback state of unknown type', state)
        }
    }

    handlePlaybackError = (error: Event) => {
        // Safari doesn't allow autoplay
        let isAutoplayNotAllowedError = `${error}`.includes('NotAllowedError: The request is not allowed by the user agent or the platform')
        if (isAutoplayNotAllowedError) {
            this.props.setNotification('error', 'Can\'t autostart video', 'Please start video using play button or allow autoplay of videos in the Safari settings')
        }
        this.props.setPlaybackStateWithoutMessage('paused')
    }

    render() {
        let videoUrl = this.props.videoDetails ? this.props.videoDetails.url[this.props.language] : ''
        return (
            <video className="video" onClick={this.handleClick} style={styles.video} src={videoUrl} ref={this.videoRef} preload="auto"></video>
        )
    }
}

const styles = {
    video: {
        width: '100%'
    }
}

const mapStateToProps = (state: AppState) => ({
    isTouchDevice: state.main.isTouchDevice,
    language: state.video.language,
    videoPlaybackState: state.video.playbackState,
    videoDetails: state.video.details,
    videoJumpToTimeLastUpdate: state.video.jumpToTimeLastUpdate
})

const mapDispatchToProps = {
    togglePlay,
    setPlaybackState,
    setPlaybackStateWithoutMessage,
    setVideoCurrentTime,
    setVideoTotalTime,
    setVideoBufferTime,
    setNotification,
    setIsLoading
}

const connector = connect(mapStateToProps, mapDispatchToProps)
export default connector(Video)