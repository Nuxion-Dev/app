<script setup lang="ts">
const search = ref('')
const openChat = ref('')
const showDropdown = ref(false)
</script>

<template>
    <NuxtLayout>
        <div class="sub-container">
            <Sidebar page="messages" />
            <div class="content no-padding">
                <div class="messages-container">
                    <div class="contacts">
                        <h1>Chats</h1>
                        <div class="actions">
                            <div class="search">
                                <label for="search">
                                    <Icon name="mdi:magnify" />
                                </label>
                                <input type="search" v-model="search" id="search" name="search" autocomplete="off" placeholder="Search...">
                            </div>
                            <div class="add">
                                <div class="add-btn" @click="showDropdown = !showDropdown">
                                    <Icon name="mdi:account-plus" />
                                    New
                                </div>
                                <SelectFriend v-if="showDropdown" />
                            </div>
                        </div>
                        <div class="contact-list">
                            <div class="contact">
                                <div class="avatar">
                                    <img src="https://via.placeholder.com/150" alt="User avatar" />
                                </div>
                                <div class="info">
                                    <h3>John Doe</h3>
                                    <div class="last_message">
                                        <p>abadabahoy sdfhkskdfghdfjkghkdfjhgjkdfjdjkfghdfhjkdfkhjg</p>
                                    </div>
                                </div>
                                <small>12:52 PM <span class="unread"></span></small>
                            </div>
                            <div class="contact open">
                                <div class="avatar">
                                    <img src="https://via.placeholder.com/150" alt="User avatar" />
                                </div>
                                <div class="info">
                                    <h3>John Doe</h3>
                                    <div class="last_message">
                                        <p>You: hahaha</p>
                                    </div>
                                </div>
                                <small>12:02 PM</small>
                            </div>
                        </div>
                    </div>
                    <div class="message-content">
                        <div class="contact">
                            <div class="info">
                                <div class="avatar">
                                    <img src="https://via.placeholder.com/150" alt="User avatar" />
                                </div>
                                <h3>John Doe</h3>
                            </div>
                            <div class="actions">
                                <Icon name="mdi:phone" />
                                <Icon name="mdi:video" />
                            </div>
                        </div>
                        <div class="messages">
                            <div class="message received">
                                <div class="msg-content">
                                    <p>Hey</p>
                                    <small>12:00 PM</small>
                                </div>
                            </div>
                            <div class="message received">
                                <div class="msg-content">
                                    <p>How are you?</p>
                                    <small>12:00 PM</small>
                                </div>
                            </div>
                            <div class="message sent">
                                <div class="msg-content">
                                    <p>I'm good, you?</p>
                                    <small>12:01 PM • Read</small>
                                </div>
                            </div>
                            <div class="message received">
                                <div class="msg-content">
                                    <p>I'm good, thanks!</p>
                                    <small>12:01 PM</small>
                                </div>
                            </div>
                            <div class="message sent">
                                <div class="msg-content">
                                    <p>noob</p>
                                    <small>12:02 PM • Sent</small>
                                </div>
                            </div>
                            <div class="message sent">
                                <div class="msg-content">
                                    <p>hahaha</p>
                                    <small>12:02 PM • Sent</small>
                                </div>
                            </div>
                            <div class="message sent">
                                <div class="msg-content">
                                    <p>hahaha</p>
                                    <small>12:02 PM • Sent</small>
                                </div>
                            </div>
                        </div>
                        <div class="message-input">
                            <input type="text" placeholder="Type a message..." />
                            <button>
                                <Icon name="mdi:send" />
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    </NuxtLayout>
</template>

<style scoped lang="scss">
.messages-container {
    display: flex;
    height: 100%;

    .contacts {
        width: 30%;
        background-color: #242424;
        color: var(--text);
        padding: 1rem;
        border-right: solid 1px #555;

        h1 {
            font-size: 24px;
            font-weight: 700;
            margin-bottom: 20px;
            //padding: 1rem 1rem 0 1rem;
        }

        .actions {
            display: flex;
            //padding: 0 1rem;
            gap: .5em;
            width: 100%;
            margin-bottom: 20px;

            .search {
                display: flex;
                align-items: center;
                background-color: #333333;
                border-radius: 5px;
                border: solid 1px #494949;
                flex: 1;

                label {
                    display: flex;
                    align-items: center;
                    padding: 0.5rem;
                }

                input {
                    background-color: transparent;
                    border: none;
                    color: var(--text);
                    font-size: 16px;
                    width: 100%;
                    outline: none;
                    padding: 0.5rem;
                }
            }

            .add {
                position: relative;
                display: flex;

                .add-btn {
                    display: flex;
                    align-items: center;
                    gap: .5em;
                    background-color: #333;
                    border-radius: 5px;
                    padding: 0.5rem 1rem;
                    cursor: pointer;
                    transition: background-color .2s;

                    &:hover, &:active, &:focus {
                        background-color: var(--color-secondary);
                    }
                }
            }
        }

        .contact-list {
            display: flex;
            flex-direction: column;
            overflow-y: auto;
            gap: 4px;

            &::-webkit-scrollbar {
                width: 0;
            }

            .contact {
                display: flex;
                align-items: center;
                gap: 1rem;
                border-radius: 5px;
                padding: 1rem;
                cursor: pointer;
                width: 100%;

                &:hover {
                    background-color: #494949;
                }

                &.open {
                    background-color: #333;
                }

                .avatar {
                    min-width: 50px;
                    min-height: 50px;
                    max-height: 50px;
                    max-width: 50px;
                    border-radius: 50%;
                    overflow: hidden;

                    img {
                        width: 100%;
                        height: 100%;
                        object-fit: cover;
                    }
                }

                .info {
                    display: flex;
                    flex-direction: column;
                    justify-content: center;
                    width: 100%;
                    max-width: 50%;

                    h3 {
                        font-size: 18px;
                        font-weight: 700;
                        margin-bottom: 5px;
                    }

                    .last_message {
                        display: flex;
                        align-items: center;
                        gap: 0.5rem;
                        font-size: 14px;
                        color: #bebebe;
                        width: 100%;

                        p {
                            white-space: nowrap;
                            overflow: hidden;
                            text-overflow: ellipsis;
                        }
                    }
                }
                small {
                    display: flex;
                    align-items: center;
                    font-size: 12px;
                    color: #999999;
                    white-space: nowrap;
                    justify-self: flex-end;
                    gap: 0.5em;

                    .unread {
                        background-color: var(--color-secondary);
                        border-radius: 50%;
                        display: inline-block;
                        height: 10px;
                        width: 10px;
                    }
                }
            }
        }
    }

    .message-content {
        display: flex;
        flex-direction: column;
        flex: 1;
        
        .contact {
            display: flex;
            align-items: center;
            gap: 1rem;
            padding: 1rem;
            border-bottom: solid 1px #555;

            .info {
                display: flex;
                align-items: center;
                gap: 1rem;

                .avatar {
                    min-width: 50px;
                    min-height: 50px;
                    max-height: 50px;
                    max-width: 50px;
                    border-radius: 50%;
                    overflow: hidden;

                    img {
                        width: 100%;
                        height: 100%;
                        object-fit: cover;
                    }
                }

                h3 {
                    font-size: 18px;
                    font-weight: 700;
                }
            }

            .actions {
                display: flex;
                gap: 1rem;
                margin-left: auto;

                button {
                    background-color: transparent;
                    border: none;
                    cursor: pointer;
                    padding: 0.5rem;
                    border-radius: 50%;
                    transition: background-color .2s;

                    &:hover {
                        background-color: #333;
                    }
                }
            }
        }

        .messages {
            display: flex;
            flex-direction: column;
            gap: .5em;
            padding: 1rem;
            overflow-y: auto;
            flex: 1;

            &::-webkit-scrollbar {
                width: 0;
            }

            .message {
                display: flex;
                flex-direction: row;
                gap: .5em;
                background-color: #333;
                border-radius: 8px;
                max-width: 70%;
                align-self: flex-start;
                padding: .5em 1em;

                .msg-content {
                    display: flex;
                    flex-direction: column;
                    gap: 4px;
                    width: 100%;

                    p {
                        font-size: 16px;
                        color: var(--text);
                        user-select: text;
                    }

                    small {
                        font-size: 12px;
                        opacity: .8;
                        display: flex;
                        align-items: center;
                        justify-content: flex-end;
                    }
                }

                &.sent {
                    align-self: flex-end;
                    background-color: color-mix(in oklab, var(--color-secondary) 20%, var(--color-primary) 80%);
                    
                    &:has(+ .message.sent) {
                        .msg-content {
                            small {
                                display: none;
                            }
                        }
                    }
                }

                &.received:has(+ .message.received) {
                    .msg-content {
                        small {
                            display: none;
                        }
                    }
                }
            }
        }

        .message-input {
            width: 100%;
            display: flex;
            align-items: center;
            border-top: 1px solid #555;
            padding: 1em;
            gap: .5em;

            input {
                flex: 1;
                padding: 0.5rem;
                border: solid 1px #555;
                border-radius: 5px;
                background-color: #333;
                color: var(--text);
                font-size: 16px;
                outline: none;

                &::placeholder {
                    color: #a8a8a8;
                    font-size: 14px;
                }

                &:focus {
                    border-color: var(--color-secondary);
                }
            }

            button {
                display: flex;
                align-items: center;
                justify-content: center;
                background-color: var(--color-primary);
                color: #fff;
                border: none;
                width: 40px;
                height: 40px;
                border-radius: 5px;
                cursor: pointer;
                transition: background-color .2s;

                &:hover {
                    background-color: var(--color-accent);
                }
            }
        }
    }
}
</style>