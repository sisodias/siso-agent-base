export const animationHelpersBlockSource = `    startSisoAnimation() {
        if (this.animationInterval) return;
        this.animationInterval = setInterval(() => {
            if (!this.executionStarted || (!this.isPartial && this.result)) {
                this.stopSisoAnimation();
                return;
            }
            this.animationPhase = (this.animationPhase + 1) % 4;
            this.updateDisplay();
            this.ui.requestRender();
        }, 180);
    }
    stopSisoAnimation() {
        if (!this.animationInterval) return;
        clearInterval(this.animationInterval);
        this.animationInterval = undefined;
        this.animationPhase = 0;
    }
`;
