<script lang="ts">
    import { createEventDispatcher, onMount, onDestroy } from "svelte";

    export let items: string[] = [];
    export let selectedIndex: number = 0;
    export let placeholder: string = "";

    const dispatch = createEventDispatcher();

    let open = false;
    let selectEl: HTMLDivElement;

    function toggle() {
        if (items.length > 0) {
            open = !open;
        }
    }

    function select(index: number) {
        selectedIndex = index;
        open = false;
        dispatch("selectedIndex", index);
    }

    function handleClickOutside(e: MouseEvent) {
        if (selectEl && !selectEl.contains(e.target as Node)) {
            open = false;
        }
    }

    onMount(() => {
        document.addEventListener("click", handleClickOutside);
    });

    onDestroy(() => {
        document.removeEventListener("click", handleClickOutside);
    });
</script>

<div class="custom-select" bind:this={selectEl}>
    <button
        class="custom-select-trigger"
        class:open
        on:click={toggle}
        type="button"
    >
        <span class="custom-select-value">
            {items[selectedIndex] ?? placeholder}
        </span>
        <span class="custom-select-arrow">▾</span>
    </button>
    {#if open}
        <div class="custom-select-dropdown">
            {#each items as item, index}
                <div
                    class="custom-select-option"
                    class:selected={index === selectedIndex}
                    on:click={() => select(index)}
                    on:keydown={(e) => e.key === "Enter" && select(index)}
                    role="option"
                    aria-selected={index === selectedIndex}
                    tabindex="0"
                >
                    {item}
                </div>
            {/each}
        </div>
    {/if}
</div>

<style>
    .custom-select {
        position: relative;
        display: inline-block;
        min-width: 0;
        width: 100%;
    }

    .custom-select-trigger {
        display: flex;
        align-items: center;
        justify-content: space-between;
        width: 100%;
        padding: 4px 18px 4px 6px;
        background: var(--b3-theme-background);
        border: 1px solid var(--b3-border-color);
        border-radius: 3px;
        font-size: 13px;
        cursor: pointer;
        color: var(--b3-theme-on-background);
        transition: all 0.3s ease;
        gap: 8px;
    }

    .custom-select-trigger:hover {
        border-color: var(--b3-theme-primary);
    }

    .custom-select-trigger.open {
        border-color: var(--b3-theme-primary);
        box-shadow: 0 0 0 2px rgba(var(--b3-theme-primary-rgb), 0.2);
    }

    .custom-select-value {
        flex: 1;
        text-align: left;
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
    }

    .custom-select-arrow {
        font-size: 8px;
        color: var(--b3-theme-on-surface);
        transition: transform 0.2s;
        line-height: 1;
        flex-shrink: 0;
    }

    .open .custom-select-arrow {
        transform: rotate(180deg);
    }

    .custom-select-dropdown {
        position: absolute;
        top: 100%;
        left: 0;
        right: 0;
        z-index: 9999;
        margin-top: 2px;
        background: var(--b3-theme-background);
        border: 1px solid var(--b3-border-color);
        border-radius: 4px;
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
        max-height: 200px;
        overflow-y: auto;
    }

    .custom-select-option {
        padding: 6px 8px;
        cursor: pointer;
        transition: background 0.15s;
        color: var(--b3-theme-on-background);
        font-size: 13px;
    }

    .custom-select-option:hover {
        background: var(--b3-theme-hover);
    }

    .custom-select-option.selected {
        background: var(--b3-theme-primary-lightest, rgba(var(--b3-theme-primary-rgb), 0.1));
        color: var(--b3-theme-primary);
    }
</style>
