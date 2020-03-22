import React, { Component } from 'react'
import { connect } from 'react-redux'
import PubSub from 'pubsub-js'
import screenfull from 'screenfull'

import styles from './MainPart.module.css'
import './MainPart.css'
import Video from './Video'
import Controls from './Controls'
import VideoDetails from './VideoDetails'
import ChooseLanguageModal from './ChooseLanguageModal'

class MainPart extends Component {
    constructor() {
        super()
        this.state = {
            showControls: false
        }
    }

    componentDidMount() {
        let timer
        document.addEventListener('mousemove', () => {
            if (this.props.isTouchDevice) return

            if (screenfull.isFullscreen) {
                this.setState({ showControls: true })
                clearTimeout(timer)
                timer = setTimeout(() => {
                    this.setState({ showControls: false })
                }, 750)
            }
        })
    }

    openSetVideoModal() {
        PubSub.publish('openSetVideoModal')
    }

    handleVideoClick = () => {
        if (this.props.isTouchDevice) {
            this.setState({ showControls: !this.state.showControls })
        }
    }

    render() {
        let showControlsClassName = this.state.showControls ? 'show-controls' : ''
        return (
            <div className={styles.container}>
                <div className={styles.inner}>
                    {this.props.videoDetails === null && (
                        <div>
                            <p className={styles.selectInstructions}>Select a video to start watching</p>
                            <div className="button-wrapper">
                                <button onClick={this.openSetVideoModal}>Select New Video</button>
                            </div>
                        </div>
                    )}

                    {this.props.videoDetails !== null && (
                        <div className={`${styles.player} player ${showControlsClassName}`}>
                            <Video onClick={this.handleVideoClick} className={`styles.video`} />
                            <Controls className={styles.controls} />
                        </div>
                    )}
                    <ChooseLanguageModal />
                    <VideoDetails />
                </div>
            </div>
        )
    }
}

const mapStateToProps = state => ({
    isTouchDevice: state.main.isTouchDevice,
    videoDetails: state.video.details
})

export default connect(mapStateToProps)(MainPart)