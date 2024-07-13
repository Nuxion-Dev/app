<script setup lang="ts">
import { window } from '@tauri-apps/api';
import { isRegistered, register, unregister } from '@tauri-apps/plugin-global-shortcut';

let appWindow = window.getCurrent();
const close = async () => {
    if (appWindow) appWindow.hide();
}

if (!(await isRegistered("Escape"))) await register("Escape", async () => {
    close();
    await unregister("Escape");
});

onMounted(() => {
    const cards = document.querySelectorAll('.card');

    cards.forEach((card: any) => {
        const dragArea = card.querySelector('.drag-area');
        const content = card.querySelector('.content');

        dragArea.addEventListener('mousedown', (e: any) => {
            let offsetX = e.clientX - card.getBoundingClientRect().left;
            let offsetY = e.clientY - card.getBoundingClientRect().top;
            let isDragging = true;

            cards.forEach((c: any) => c.style.zIndex = 0);
            card.style.zIndex = 1;

            document.addEventListener('mousemove', (e: any) => {
                if (!isDragging) return;
                card.style.left = e.clientX - offsetX + 'px';
                card.style.top = e.clientY - offsetY + 'px';
            });

            document.addEventListener('mouseup', () => {
                document.removeEventListener('mousemove', () => {});
                document.removeEventListener('mouseup', () => {});

                isDragging = false;
            });
        });
    });
})
</script>

<template>
    <div id="overlay">
        <div class="overlay">
            <div class="close" @click="close">
                <Icon name="codicon:chrome-close" />
            </div>
            
            <div class="cards">
                <div class="card">
                    <div class="drag-area">
                        <span class="line"></span>
                    </div>
                    
                    <div class="content">
                        <h2>Card 1</h2>
                        <p>Content 1</p>
                    </div>
                </div>
                <div class="card">
                    <div class="drag-area">
                        <span class="line"></span>
                    </div>
                    
                    <div class="content">
                        <h2>Card 2</h2>
                        <p>Content 2</p>
                    </div>
                </div>
                <div class="card">
                    <div class="drag-area">
                        <span class="line"></span>
                    </div>
                    
                    <div class="content">
                        <h2>Card 3</h2>
                        <p>Content 3</p>
                    </div>
                </div>
            </div>
        </div>
    </div>
</template>

<style lang="scss">
.overlay {
    background-color: rgba(0, 0, 0, 0.4);
    position: fixed;
    top: 0;
    left: 0;
    bottom: 0;
    right: 0;
    width: 100%;
    height: 100%;
    z-index: 1000;
    color: white;
    font-weight: 500;

    .close {
        position: absolute;
        top: 10px;
        right: 10px;
        cursor: pointer;
        width: 40px;
        height: 40px;
        border-radius: 5px;
        background-color: #444;
        font-size: 20px;
        color: #ccc;
        display: flex;
        justify-content: center;
        align-items: center;
        z-index: 1001;

        &:hover {
            background-color: #333;
            color: white;
        }
    }

    .cards {
        .card {
            position: absolute;
            top: 0;
            left: 0;

            width: 300px;
            height: 200px;
            background-color: var(--color-background);
            color: var(--color-text);
            border-radius: 5px;
            box-shadow: 0 4px 5px 0 rgba(0, 0, 0, 0.5); 

            .drag-area {
                display: flex;
                justify-content: center;
                align-items: center;
                height: 2em;
                cursor: move;
                background-color: var(--color-sidebar);
                border-radius: 5px 5px 0 0;
                box-shadow: 0 2px 5px rgba(0, 0, 0, 0.2);

                .line {
                    width: 50%;
                    height: 2px;
                    background-color: var(--color-text);
                }
            }

            .content {
                padding: .5em 1em;

                h2 {
                    font-size: 1.5rem;
                    font-weight: 700;
                }

                p {
                    font-size: 1rem;
                    font-weight: 500;
                }
            }
        }
    }
}
</style>