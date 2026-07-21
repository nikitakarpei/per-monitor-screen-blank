export type ContextMenuItem = {
    label: string;
    onActivate: () => void;
};

export interface PointerContextMenu {
    open(items: ContextMenuItem[]): void;
}

export interface PointerMenuShortcutManager {
    register(onShortcut: () => void): void;
    unregister(): void;
}
