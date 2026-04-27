export type ContextMenuItem = {
    label: string;
    onActivate: () => void;
};

export interface PointerContextMenu {
    open(items: ContextMenuItem[]): void;
}

export interface PointerMenuShortcutManager {
    register(shortcut: string, onShortcut: () => void): void;
    unregister(): void;
}
