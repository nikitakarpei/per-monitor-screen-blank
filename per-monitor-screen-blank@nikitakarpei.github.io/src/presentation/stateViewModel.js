export function buildStateViewModel(state) {
    const map = Object.freeze({
        Disabled: { icon: 'display-symbolic' },
        AutoAwake: { icon: 'display-symbolic' },
        AutoBlack: { icon: 'display-off-symbolic' },
        KeepAwake: { icon: 'preferences-system-symbolic' },
        ManualBlack: { icon: 'display-off-symbolic' },
    });
    return map[state] ?? map.Disabled;
}
