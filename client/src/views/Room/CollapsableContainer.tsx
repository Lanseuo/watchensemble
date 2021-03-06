import React, { Component } from 'react'

import styles from './CollapsableContainer.module.css'

interface Props {
    title: String
    children: React.ReactNode
}

interface State {
    open: boolean
}

class CollapsableContainer extends Component<Props, State> {
    constructor(props: Props) {
        super(props)
        this.state = {
            open: false
        }
    }

    toggleOpen = () => {
        this.setState({
            open: !this.state.open
        })
    }

    render() {
        return (
            <section className={styles.container}>
                <h4 className={styles.toggle} onClick={this.toggleOpen}>
                    {this.props.title}
                    {this.state.open && (
                        <svg xmlns="http://www.w3.org/2000/svg" height="24" viewBox="0 0 24 24" width="24">
                            <path d="M12 8l-6 6 1.41 1.41L12 10.83l4.59 4.58L18 14z" />
                            <path d="M0 0h24v24H0z" fill="none" />
                        </svg>
                    )}
                    {!this.state.open && (
                        <svg xmlns="http://www.w3.org/2000/svg" height="24" viewBox="0 0 24 24" width="24">
                            <path d="M16.59 8.59L12 13.17 7.41 8.59 6 10l6 6 6-6z" />
                            <path d="M0 0h24v24H0z" fill="none" />
                        </svg>
                    )}
                </h4>
                {this.state.open && this.props.children}
            </section>
        )
    }
}

export default CollapsableContainer