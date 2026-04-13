export function buildStateViewModel(state) {
    const map = Object.freeze({
        Disabled: { icon: 'display-symbolic', label: 'Off', accessibleName: 'Per-Monitor Screen Blank Off' },
        AutoAwake: { icon: 'display-symbolic', label: 'Auto', accessibleName: 'Per-Monitor Screen Blank Auto' },
        AutoBlack: { icon: 'display-off-symbolic', label: 'Black', accessibleName: 'Per-Monitor Screen Blank Black' },
        KeepAwake: { icon: 'preferences-system-symbolic', label: 'Keep Awake', accessibleName: 'Per-Monitor Screen Blank Keep Awake' },
        ManualBlack: { icon: 'display-off-symbolic', label: 'Manual', accessibleName: 'Per-Monitor Screen Blank Manual' },
    });
    return map[state] ?? map.Disabled;
}
