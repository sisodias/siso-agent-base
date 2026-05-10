export const startupLoadingSource = `function sisoStartupEnabled() {
    return process.env.SISO_PI_STARTUP_LOADING !== "0" && String(APP_NAME).toLowerCase() === "siso";
}
function sisoStartupHeader(model) {
    const modelText = model?.id ? sisoDisplayModel(model.id, model.provider) : "model";
    return [
        theme.bold(theme.fg("accent", "SISO")),
        theme.fg("dim", \`loading workspace · \${modelText} · extensions\`),
    ].join("\\n");
}
function sisoReadyHeader(model) {
    const modelText = model?.id ? sisoDisplayModel(model.id, model.provider) : "model ready";
    return [
        theme.bold(theme.fg("accent", "SISO")),
        theme.fg("dim", \`ready · \${modelText} · workspace loaded\`),
    ].join("\\n");
}
`;
