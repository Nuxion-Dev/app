<script setup lang="ts">
import type User from '~~/src-old/utils/types/User';

const { create } = defineProps({
    create: {
        type: Function,
        required: true
    }
});

const auth = await useAuth();
const user = auth.user!;
const search = ref('');
const selected = ref<User | null>(null);

const friendsMapped: User[] = []
for (const friend of user.friends) {
    const u = await auth.getUser(friend);
    if (!u) continue;
    friendsMapped.push(u);
}

const friends = computed(() => {
    return friendsMapped.filter(friend => {
        return friend.displayName.toLowerCase().includes(search.value.toLowerCase());
    });
});

const borderTop = ref(false);
const borderTopReverse = ref(false);
onMounted(() => {
    const friendsList = document.querySelector('.friends-list')!;
    friendsList.addEventListener('scroll', () => {
        // check if scroll is at top
        const friendsDiv = friendsList as HTMLElement;
        if (friendsList.scrollTop === 0) {
            borderTop.value = false;
            borderTopReverse.value = true;
        } else {
            borderTop.value = true;
            borderTopReverse.value = false;
        }
    });
})

function click() {
    if (selected.value == null) return;

    create(selected.value);

}
</script>

<template>
    <div class="select-friend">
        <h2>Select a Friend</h2>
        <input type="text" v-model="search" placeholder="Search for a friend" />

        <div class="friends-list" :class="{
            borderTop,
            borderTopReverse
        }">
            <div v-for="friend in friends" :key="friend.id" class="friend" :class="{ selected: selected && selected.id === friend.id }" @click="selected = friend">
                <Image :src="auth.getPfpOfUser(friend.id)" alt="Friend Avatar" />
                <span>{{ friend.displayName }}</span>
            </div>
        </div>

        <div class="add-button" @click="click()">
            Create New Chat
        </div>
    </div>
</template>

<style scoped lang="scss">
@keyframes animateBorderTop {
    from {
        border-top: solid 1px rgba($color: #999, $alpha: 0);
    }

    to {
        border-top: solid 1px rgba($color: #999, $alpha: .4);
    }
}

@keyframes animateBorderTopReverse {
    from {
        border-top: solid 1px rgba($color: #999, $alpha: .4);
    }

    to {
        border-top: solid 1px rgba($color: #999, $alpha: 0);
    }
}

.select-friend {
    z-index: 999;
    position: absolute;
    top: calc(100% + 4px);
    width: 35svw;
    padding: 1em;
    background-color: color-mix(in oklab, var(--color-text) 12%, var(--color-sidebar) 88%);
    border-radius: 0.5em;
    box-shadow: 0 2px 4px 0 var(--color-sidebar);

    h2 {
        margin: 0;
        font-size: 1.25em;
        font-weight: 600;
        color: var(--color-text);
    }

    input {
        width: 100%;
        padding: 0.5em;
        margin-top: 0.5em;
        background-color: color-mix(in oklab, var(--color-background) 40%, var(--color-sidebar) 60%);
        color: var(--color-text);
        border: 1px solid #999;
        border-radius: 0.25em;
        outline: none;
    }

    .friends-list {
        display: flex;
        flex-direction: column;
        gap: 2px;
        margin-top: 1em;
        max-height: 25svh;
        border-bottom: solid 1px rgba($color: #999, $alpha: .4);
        overflow-y: auto;

        &::-webkit-scrollbar {
            width: 0.5em;
        }

        &::-webkit-scrollbar-thumb {
            background-color: var(--color-sidebar);
            border-radius: 0.25em;
        }

        &.borderTop {
            animation: animateBorderTop ease-in .3s forwards;
        }

        &.borderTopReverse {
            animation: animateBorderTopReverse ease-in .3s forwards;
        }

        .friend {
            display: flex;
            gap: .5em;
            align-items: center;
            padding: 0.5em;
            cursor: pointer;
            transition: background-color 0.2s;
            border-radius: 0.25em;
            margin-right: 0.5em;

            &:hover {
                background-color: color-mix(in oklab, var(--color-background) 70%, var(--color-sidebar) 30%);
            }

            img {
                width: 40px;
                height: 40px;
                border-radius: 50%;
                margin-right: 0.5em;
            }

            span {
                font-size: 1em;
                font-weight: 500;
                color: var(--color-text);
            }

            &.selected {
                background-color: var(--color-sidebar);
            }
        }
    }

    .add-button {
        margin-top: 1em;
        padding: 0.5em;
        text-align: center;
        background-color: var(--color-primary);
        color: var(--color-text);
        font-weight: 400;
        border-radius: 0.25em;
        cursor: pointer;
        transition: background-color 0.2s;

        &:hover {
            background-color: var(--color-secondary);
        }
    }
}
</style>